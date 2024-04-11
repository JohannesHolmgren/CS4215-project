/*
    Virtual machine in Javascript for Go
    - Memory based on heap using an Arraybuffer

    - Divided into compiler & virtual machine

*/
/* 

Data structures:

INSTR stack:
- Used in virtual machine
- Add all instructions during compile time here

OPERAND stack:
- Only used in virtual machine
- Add operands on it

RTS stack:
- Used in virtual machine
- Add (some information (pc, env, ???))
- Push and pop when entering new scopes 

ENVIRONMENT:
- Used in virtual machine
- consists of frames

PC:
- Used in virtual machine
*/

/* ================ HELPERS ================= */
class Pair {
    constructor(frst, scnd){
        this.frst = frst;
        this.scnd = scnd;
    }

    get head(){
        return this.frst;
    }

    get tail(){
        return this.scnd;
    }

    set head(val){
        this.frst = val;
    }

    set tail(val){
        this.scnd = val;
    }
}

/* ================ COMPILER ================ */
let INSTRUCTIONS = [];
let wc = 0;

function compile_component(component, compile_environment) {
    if (component.tag === "lit"){
        INSTRUCTIONS[wc++] = {tag: "LDC", val: component.val}
    }
    else if (component.tag === "binop"){
        compile_component(component.frst, compile_environment);
        compile_component(component.scnd, compile_environment);
        INSTRUCTIONS[wc++] = {tag: "BINOP", sym: component.sym}
    }
    else if (component.tag === "unop"){
        compile_component(component.frst, compile_environment);
        INSTRUCTIONS[wc++] = {tag: "UNOP", sym: component.sym}
    }
    else if (component.tag === "seq"){
        const sequence = component.stmts
        if (sequence.length === 0){
            INSTRUCTIONS[wc++] = {tag: "LDC", val:undefined}
            console.log("MAYBE UNDEFINED");
        }
        let frst = true;
        for (let seq_part of sequence){
            frst ? frst = false : INSTRUCTIONS[wc++] = {tag: "POP"}
            compile_component(seq_part, compile_environment)
        }
    }
    else if (component.tag === "nam"){
        INSTRUCTIONS[wc++] = {
            tag: "LD", 
            sym: component.sym, 
            pos: compile_time_environment_position(compile_environment, component.sym)
        };
    }
    else if (component.tag === "assmt"){
        compile_component(component.right, compile_environment);
        INSTRUCTIONS[wc++] = {
            tag: "ASSIGN",
            pos: compile_time_environment_position(compile_environment, component.left.sym)
        };

    }
    else if (component.tag === "cond"){
        compile_component(component.pred, compile_environment);
        const jump_on_false_instr = {tag: "JOF"};
        INSTRUCTIONS[wc++] = jump_on_false_instr;
        compile_component(component.cons, compile_environment);
        const goto_instr = {tag: "GOTO"};
        INSTRUCTIONS[wc++] = goto_instr;
        const alternative_address = wc;
        jump_on_false_instr.addr = alternative_address;
        compile_component(component.alt, compile_environment);
        goto_instr.addr = wc;
    }
    else if (component.tag === "app"){ // Changed from 'args' to 'arguments' to match parser
        console.log(compile_environment)
        compile_component(component.fun, compile_environment);
        const args = component.arguments;
        for (let arg of args){
            compile_component(arg, compile_environment);
        }
        INSTRUCTIONS[wc++] = {tag: "CALL", arity: args.length};
    }
    else if (component.tag === "blk"){
        const locals = scan(component.body);
        INSTRUCTIONS[wc++] = {tag: "ENTER_SCOPE", num: locals.length, syms: locals};
        compile_component(component.body, compile_time_environment_extend(locals, compile_environment));
        INSTRUCTIONS[wc++] = {tag: "EXIT_SCOPE"};
    }
    else if (component.tag === "const"){
        compile_component(component.expr, compile_environment);
        INSTRUCTIONS[wc++] = {
            tag: "ASSIGN",
            pos: compile_time_environment_position(compile_environment, component.sym)};
    }
    else if (component.tag === "var"){
        compile_component(component.expr, compile_environment);
        INSTRUCTIONS[wc++] = {
            tag: "ASSIGN",
            pos: compile_time_environment_position(compile_environment, component.sym)};
    }
    else if (component.tag === "ReturnStatement"){ // Changed from 'ret' and 'component.argument' to match parser
        compile_component(component.argument, compile_environment);
        INSTRUCTIONS[wc++] = {tag: "RESET"};
    }
    else if (component.tag === "fun"){
        // Rewrite as a const declaration to a lambda function
        compile_component({
            tag: "const", 
            sym: component.sym, 
            expr: {
                    tag: "lam", 
                    prms: component.prms, 
                    body: component.body
                }
            }, compile_environment);
    }
    else if (component.tag === "lam"){
        INSTRUCTIONS[wc++] = {tag: "LDF", arity: component.arity, addr: wc+1};
        const goto_instr = {tag: "GOTO"};
        INSTRUCTIONS[wc++] = goto_instr;
        compile_component(component.body, compile_time_environment_extend(component.prms, compile_environment));
        INSTRUCTIONS[wc++] = {tag: "LDC", val: undefined};
        INSTRUCTIONS[wc++] = {tag: "RESET"};
        goto_instr.addr = wc;
    }
    else if (component.tag === "goroutine") {
        // Compile application call
        compile_component(component.function, compile_environment);
        // Change "CALL" to "GOCALL"
        INSTRUCTIONS[wc-1] = {tag: "GOCALL", arity: INSTRUCTIONS[wc-1].arity};
    }
    // Possibly add assignment if needed by anything later
    else if (component.tag === undefined){
        // Do nothing
    }
    else if (component.tag === "EmptyStatement"){
        throw new TypeError(`You have probably used a semicolon, which is not supported in this goslang`);
    }
    else {
        throw new TypeError(`Undefined tag: ${component.tag}`);
    }

}
// Scan for declarations and return the names of all found
// The component is either a sequence => Scan all parts of it
// or a statement => Check to see if declaration ('const', 'var' or 'fun')
function scan(component){
    const declarations = [];
    // Is sequence: Scan every entry
    if (component.tag === "seq"){
        for (let comp of component.stmts){
            declarations.push(...scan(comp));
        }
    }
    // Is not sequence: add symbol if a declaration
    else if (["var", "const", "fun"].includes(component.tag)){
        declarations.push(component.sym);
    }
    return declarations
}

function compile_program(program) {
    // Reset instruction sequence
    const primitive_frame = [];
    const compile_environment = [primitive_frame];
    INSTRUCTIONS = [];
    wc = 0;
    // Compile program and end the machine code with DONE instruction
    compile_component(program, compile_environment);
    INSTRUCTIONS[wc] = {tag: "DONE"};
}

/* ============= VIRTUAL MACHINE ============ */
/* Define Data structures */
let RTS;
let OS;
let E;
let pc = 0;

const binop_microcode = {
	"+": (x, y) => x + y,
	"*": (x, y) => x * y,
	"-": (x, y) => x - y,
	"/": (x, y) => x / y,
	"%": (x, y) => x % y,
	"<": (x, y) => x < y,
	"<=": (x, y) => x <= y,
	">=": (x, y) => x >= y,
	">": (x, y) => x > y,
	"===": (x, y) => x === y,
	"!==": (x, y) => x !== y,
    // Logical binary operators
    "&&": (x, y) => x && y,
    "||": (x, y) => x ||y,
};

const unop_microcode = {
	"-unary": (x) => -x,
	"!": (x) => !x,
};

function lookup(pos, environment){
    return heap_get_Environment_value(environment, pos);
}

function assign(pos, value, environment){
    heap_set_Environment_value(environment, pos, value);
}

function extendEnvironment(values, env){
    const arity = values.length;
    const newFrame = heap_allocate_Frame(arity);
    for (let i = 0; i < arity; i++){
        heap_set_child(newFrame, i, values[i]);
    }
    return heap_Environment_extend(newFrame, env);

    /*
    const newFrame = {};
    for (let i=0; i<names.length;i++){
        newFrame[names[i]] = values[i];
    }
    return new Pair(newFrame, env)
    */
}

function execute_instruction(instruction) {
    if(instruction.tag === "LDC"){
        OS.push(instruction.val);
    }
    else if(instruction.tag === "LD"){
        OS.push(lookup(instruction.pos, E))
    }
    else if(instruction.tag === "BINOP"){
        const op2 = OS.pop();
        const op1 = OS.pop();
        const operand = instruction.sym;
        const res = binop_microcode[operand](op1, op2);
        OS.push(res);
    }
    else if(instruction.tag === "UNOP"){
        const op1 = OS.pop();
        const operand = instruction.sym;
        const res = unop_microcode[operand](op1);
        OS.push(res);
    }
    else if(instruction.tag === "POP"){
        OS.pop();
    }
    else if (instruction.tag === "ASSIGN"){
        // Assign last element on OS to symbol in env E
        assign(instruction.pos, OS.slice(-1)[0], E);
    }
    else if (instruction.tag === "JOF"){
        if(!OS.pop()){
            pc = instruction.addr;  // Since we inc pc later, maybe -1?
        }
    }
    else if (instruction.tag === "GOTO"){
        pc = instruction.addr;
    }
    else if (instruction.tag === "ENTER_SCOPE"){
        // Extend environment with new frame that includes all locals 
        // assigned to unassigned
        RTS.push(heap_allocate_Blockframe(E));
        const new_frame = heap_allocate_Frame(instruction.num);
        E = heap_Environment_extend(new_frame, E);
        for (let i=0; i < instruction.num; i++){
            heap_set_child(new_frame, i, undefined);
        }

        /*
        const new_frame = {};
        for(let i=0; i<locals.length;i++){
            new_frame[locals[i]] = {tag: "unassigned"};
        }
        E = new Pair(new_frame, E);
        */
    }
    else if (instruction.tag === "EXIT_SCOPE"){
        // Reset the previous environment from RTS
        E = RTS.pop().env;
    }
    else if (instruction.tag === "LDF"){
        const arity = instruction.arity;
        const address = instruction.addr;
        const closure_address = heap_allocate_Closure(arity, address, E)
        OS.push(closure_address);
    }
    else if (instruction.tag === "CALL"){
        // On OS: all arguments above function itself
        // Load arguments backwards since pushed so
        const args = [];
        const frame_address = heap_allocate_Frame(instruction.arity);
        for (let i=instruction.arity-1; i>=0; i--){
            args[i] = OS.pop();
            heap_set_child(frame_address, i, args[i]);
        }
        const funcToCall = OS.pop();
        const callFrame = heap_allocate_Callframe(E, pc);
        RTS.push(callFrame);
        // E = extendEnvironment(args, heap_get_Closure_environment(funcToCall));
        E = heap_Environment_extend(frame_address, heap_get_Closure_environment(funcToCall));
        pc = heap_get_Closure_pc(funcToCall);
    }
    else if (instruction.tag === "GOCALL"){
        // Clone current E, RTS, OS, PC and do call with the new ones
        const routine = createNewGoRoutineFromCurrent();
        switchToRoutine(currentRoutine, routine);
        // execute_instruction({tag: "CALL", arity: instruction.arity});

        // On OS: all arguments above function itself
        // Load arguments backwards since pushed so
        const args = [];
        const frame_address = heap_allocate_Frame(instruction.arity);
        for (let i=instruction.arity-1; i>=0; i--){
            args[i] = OS.pop();
            heap_set_child(frame_address, i, args[i]);
        }
        const funcToCall = OS.pop();
        const callFrame = heap_allocate_Gocallframe(E, pc); // Different from above
        RTS.push(callFrame);
        // E = extendEnvironment(args, heap_get_Closure_environment(funcToCall));
        E = heap_Environment_extend(frame_address, heap_get_Closure_environment(funcToCall));        
        pc = heap_get_Closure_pc(funcToCall);

    }
    else if (instruction.tag === "RESET"){
        pc--;
        const topFrame = RTS.pop();
        if (is_Gocallframe(topFrame)){
            console.log("GOCALLFRAME FOUND");
            killRoutine(currentRoutine);
        }
        if (is_Callframe(topFrame)){
            pc = heap_get_Callframe_pc(topFrame);
            E = heap_get_Callframe_environment(topFrame);
        }
    }
    else {
        console.log(instruction);
        throw new Error(`Undefined instruction: ${instruction.tag}`);
    }
}

function initializeEmptyEnvironment(){
    return heap_allocate_Environment(0);
}

/* =============== GOROUTINES =============== */
let environments = [];
let runtimeStacks = [];
let operandStacks = [];
let pcs = [];
let nRoutines = 0;
let currentRoutine;
let activeRoutines = [];

function createNewGoRoutine(){
    const newEnv = initializeEmptyEnvironment();
    const newRTS = [];
    const newOS = [];
    const newPC = 0;
    environments[nRoutines] = newEnv;
    runtimeStacks[nRoutines] = newRTS;
    operandStacks[nRoutines] = newOS;
    pcs[nRoutines] = newPC;
    activeRoutines.push(nRoutines);
    return nRoutines++; // returns index of routine created
}

function createNewGoRoutineFromCurrent(){
    // HOW TO COPY ENVIRONMENT??
    const newEnv = heap_Environment_copy(E);
    const newRTS = [...RTS];
    const newOS = [...OS];
    const newPC = pc;
    environments[nRoutines] = newEnv;
    runtimeStacks[nRoutines] = newRTS;
    operandStacks[nRoutines] = newOS;
    pcs[nRoutines] = newPC;
    activeRoutines.push(nRoutines);
    return nRoutines++; // returns index of routine created
}

function switchToRoutine(from, to){
    /* Switch from routine with index 'from' to 
       routine with index 'to'. 
       pc and E are written back to 
       old routine. */

    // Write back state for from-routine
    environments[from] = E;
    runtimeStacks[from] = RTS;  // Currently passed by ref so this not needed
    operandStacks[from] = OS;  // Currently passed by ref so this not needed
    pcs[from] = pc;

    // Get state for to-routine
    E = environments[to];
    RTS = runtimeStacks[to];
    OS = operandStacks[to];
    pc = pcs[to];
    currentRoutine = to;
    // console.log(`Switches to routine ${currentRoutine}`);
}

function killRoutine(routine){
    /* Kills a routine by removing it from 
       active routines. */
    const index = activeRoutines.indexOf(routine);
    activeRoutines.splice(index, 1);
}

function initBaseRoutine(){
    /* Create program's base routine,
       i.e. the one running from the beginning.
    */
   initSystem();
   nRoutines = 0;
   const baseRoutine = createNewGoRoutine();
   E = environments[baseRoutine];
   RTS = runtimeStacks[baseRoutine];
   OS = operandStacks[baseRoutine];
   pc = pcs[baseRoutine];
   return baseRoutine;
}

function rotateRoutine(){
    /* Update to next routine in queue. */
    // if (isActive(currentRoutine)) {
    //    activeRoutines.push(currentRoutine);
    // }
    const newRoutine = activeRoutines.shift();
    activeRoutines.push(newRoutine);
    switchToRoutine(currentRoutine, newRoutine);
}

function isActive(routine){
    return activeRoutines.includes(routine);
}

function initSystem(){
    /* Initialize all data structures */
    environments = [];
    runtimeStacks = [];
    operandStacks = [];
    pcs = [];
    nRoutines = 0;
    currentRoutine;
    activeRoutines = [];
    init_heap(1000000);
}

/* ============= RUN AND TESTS ============== */
function run(){
    
    // Create routine that main program is run as
    currentRoutine = initBaseRoutine();
   
    console.log(INSTRUCTIONS);
    while (!(INSTRUCTIONS[pc].tag === "DONE")) {
        // Fetch next instruction and execute
        const instruction = INSTRUCTIONS[pc++];
        console.log(`Executes: ${instruction.tag} `);
        execute_instruction(instruction);
        console.log(pc);
        // console.log(OS);
        // console.log(activeRoutines);
        // console.log(instruction)
        // Switch routine
        rotateRoutine();
    }
}

/* === Test Cases === */
const test_binop = [{"tag": "binop", "sym": "+", "frst": {"tag": "lit", "val": 1}, "scnd": {"tag": "lit", "val": 1}}, 2];  // 1 + 1 Returns 2
const test_unop = [{tag: "unop", sym: "!", frst: {tag: "lit", val: true}}, false];  // !true Returns false
const test_seq = [{"tag": "seq", "stmts": [{"tag": "lit", "val": 1}, {"tag": "lit", "val": 2}]}, 2];    // 1; 2; Returns 2
const test_ld = [{tag: "blk", body: {tag: "seq", stmts: [{tag: "const", sym: "y", expr: {tag: "lit", val: 16}}, {tag: "nam", sym: "y"}]}}, 16]; // Returns 16
const test_blk = [{"tag": "blk", "body": {tag: "seq", stmts: [{tag: "const", sym: "y", expr: {tag: "lit", val: 1}}]}}, 1];   // Returns 1
const test_cond2 = [{"tag": "blk", "body": {"tag": "cond", "pred": {"tag": "binop", "sym": "||", "frst": {"tag": "lit", "val": true}, "scnd": {"tag": "lit", "val": false}}, "cons": {"tag": "lit", "val": 1}, "alt": {"tag": "lit", "val": 2}}}, 1]; // Retuns 1
const test_cond = [{tag: "seq", stmts: [{tag: "cond", pred: {tag: "binop", sym: "&&", frst: {tag: "lit", val: true}, scnd: {tag: "lit", val: false}}, cons: {tag: "lit", val: 1}, alt: {tag: "lit", val: 5}}, {tag: "lit", val: 3}]}, 3]; // Returns 3
const test_func = [{"tag": "blk", "body": {"tag": "seq", "stmts": [{"tag": "fun", "sym": "f", "prms": [], "body": {"tag": "ret", "expr": {"tag": "lit", "val": 1}}}, {"tag": "app", "fun": {"tag": "nam", "sym": "f"}, "args": []}]}}, 1]; // Returns 1
const test_func2 = [{"tag": "blk", "body": {"tag": "seq", "stmts": [{"tag": "fun", "sym": "f", "prms": ["n"], "body": {"tag": "ret", "expr": {"tag": "nam", "sym": "n"}}}, {"tag": "app", "fun": {"tag": "nam", "sym": "f"}, "args": [{"tag": "lit", "val": 2}]}]}}, 2]; // Returns 1
const test_go_create = [{"tag": "blk", "body": {"tag": "seq", "stmts": [{"tag": "fun", "sym": "f", "prms": [], "body": {"tag": "ret", "expr": {"tag": "lit", "val": 1}}}, {"tag": "goroutine", "function": {"tag": "app", "fun": {"tag": "nam", "sym": "f"}, "args": []}}, {"tag": "lit", "val": 1}]}}, 1]; //returns 1

/* ==== Run test ==== */
function test(testcase){
    const program = testcase[0];
    const expected = testcase[1];
    compile_program(program);
    console.log(program);
    run();
    const finalValue = operandStacks[0].slice(-1);
    console.log(`Final: ${finalValue}`);
    if (finalValue == expected){
        console.log(`SUCCESS! Got ${finalValue} of type ${typeof OS.slice(-1)}. Expected ${expected} of type ${typeof expected}`)
    }
    else {
        console.error(`FAILURE! Expected ${expected} got ${finalValue}`)
    }
}

function setV() {
  let code = document.getElementById("input_box").value;
  let parsed_code = parse(code);
  // parsed_code = {"tag": "blk", "body": {"tag": "seq", "stmts": [{"tag": "fun", "sym": "foo", "prms": [], "body": {"tag": "ReturnStatement", "argument": {"tag": "lit", "val": 1}}}, {"tag": "app", "fun": {"tag": "nam", "sym": "foo"}, "arguments": []}]}};
  console.log(parsed_code)
  compile_program(parsed_code);
  run();
  document.getElementById("output_div").innerHTML = OS.slice(-1)

}
