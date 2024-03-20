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
INSTRUCTIONS = [];
wc = 0;

function compile_component(component) {
    if (component.tag === "lit"){
        INSTRUCTIONS[wc++] = {tag: "LDC", val: component.val}
    }
    else if (component.tag === "binop"){
        compile_component(component.frst);
        compile_component(component.scnd);
        INSTRUCTIONS[wc++] = {tag: "BINOP", sym: component.sym}
    }
    else if (component.tag === "unop"){
        compile_component(component.frst);
        INSTRUCTIONS[wc++] = {tag: "UNOP", sym: component.sym}
    }
    else if (component.tag === "seq"){
        sequence = component.stmts
        if (sequence.length === 0){
            INSTRUCTIONS[wc++] = {tag: "LDC", val:undefined}
            console.log("MAYBE UNDEFINED");
        }
        let frst = true;
        for (let seq_part of sequence){
            frst ? frst = false : INSTRUCTIONS[wc++] = {tag: "POP"}
            compile_component(seq_part)
        }
    }
    else if (component.tag === "Nam"){
        INSTRUCTIONS[wc++] = {tag: "LD", sym: component.sym}
    }
    else if (component.tag === "Cond"){
        compile_component(component.pred);
        const jump_on_false_instr = {tag: "JOF"};
        INSTRUCTIONS[wc++] = jump_on_false_instr;
        compile_component(component.cons);
        const goto_instr = {tag: "GOTO"};
        INSTRUCTIONS[wc++] = goto_instr;
        const alternative_address = wc;
        jump_on_false_instr.addr = alternative_address;
        compile_component(component.alt);
        goto_instr.addr = wc;
    }
    else if (component.tag === "App"){
        compile_component(component.func);
        for (let arg of component.args){
            compile_component(arg);
        }
        INSTRUCTIONS[wc++] = {tag: "CALL", arity: component.args.length};
    }
    else if (component.tag === "Blk"){
        const locals = scan(component.body);
        INSTRUCTIONS[wc++] = {tag: "ENTER_SCOPE", syms: locals};
        compile_component(component.body);
        INSTRUCTIONS[wc++] = {tag: "EXIT_SCOPE"};
    }
    else if (component.tag === "Const"){
        compile_component(component.expr);
        INSTRUCTIONS[wc++] = {tag: "ASSIGN", sym: component.sym};
    }
    else {
        throw TypeError(component.tag);
    }

}
// Scan for declarations and return the names of all found
// The component is either a sequence => Scan all parts of it
// or a statement => Check to see if declaration ('const', 'var' or 'fun')
function scan(component){
    declarations = [];
    // Is sequence: Scan every entry
    if (component.tag === 'Seq'){
        for (comp of component.stmts){
            declarations.push(...scan(comp));
        }
    }
    // Is not sequence: add symbol if a declaration
    else if (['var', 'const', 'fun'].includes(component.tag)){
        declarations.push(component.sym);
    }
    return declarations
}

function compile_program(program) {
    // Reset instruction sequence
    INSTRUCTIONS = [];
    wc = 0;
    // Compile program and end the machine code with DONE instruction
    compile_component(program);
    INSTRUCTIONS[wc] = {tag: "DONE"};
}

/* ============= VIRTUAL MACHINE ============ */
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

function lookup(symbol, environment){
    if(environment === null){
        throw new Error(`Symbol ${symbol} does not exist in environment`);
    }
    if(environment.head.hasOwnProperty(symbol)){
        return environment.head[symbol];
    }
    return lookup(symbol, environment.tail);
}

function assign(symbol, value, environment){
    if(environment === null){
        throw new Error(`Symbol ${symbol} does not exist in environment`);
    }
    if(environment.head.hasOwnProperty(symbol)){
        environment.head[symbol] = value;
    }
    else {
        assign(symbol, value, environment.tail);
    }
}

function execute_instruction(instruction) {
    if(instruction.tag === "LDC"){
        OS.push(instruction.val);
    }
    else if(instruction.tag === "LD"){
        OS.push(lookup(instruction.sym, E))
    }
    else if(instruction.tag === "BINOP"){
        const op1 = OS.pop();
        const op2 = OS.pop();
        const operand = instruction.sym;
        res = binop_microcode[operand](op1, op2);
        OS.push(res);
    }
    else if(instruction.tag === "UNOP"){
        const op1 = OS.pop();
        const operand = instruction.sym;
        res = unop_microcode[operand](op1);
        OS.push(res);
    }
    else if(instruction.tag === "POP"){
        OS.pop();
    }
    else if (instruction.tag === "ASSIGN"){
        assign(instruction.sym, OS.slice(-1), E);
    }
    else {
        throw new Error(`Undefined instruction: ${instruction.tag}`);
    }
}

function initializeEmptyEnvironment(){
    return new Pair({}, null);
}

function run() {
    RTS = [];
    OS = [];
    E = initializeEmptyEnvironment();
    pc = 0;

    while (!(INSTRUCTIONS[pc].tag === "DONE")) {
        // Fetch next instruction and execute
        const instruction = INSTRUCTIONS[pc++];
        execute_instruction(instruction);
        console.log(instruction)
        // TODO: Switch routine
    }
}

/* ============= RUN AND TESTS ============== */
function compile_and_display(testcase) {
    compile_component(testcase);
    console.log(INSTRUCTIONS)
}

/* === Test Cases === */
test_binop = {"tag": "binop", "sym": "+", "frst": {"tag": "lit", "val": 1}, "scnd": {"tag": "lit", "val": 1}}   // 1 + 1
test_unop = {tag: "unop", sym: "!", frst: {tag: "lit", val: true}}  // !true
test_seq = {"tag": "seq", "stmts": [{"tag": "lit", "val": 1}, {"tag": "lit", "val": 2}]}    // 1; 2;
test_ld = {tag: "seq", stmts: [{tag: "Const", sym: "y", expr: {tag: "lit", val: 16}}, {tag: "Nam", sym: "y"}]}
test_cond = {tag: 'Cond', pred: {tag: "binop", sym: "&&", frst: {tag: "lit", val: true}, scnd: {tag: "lit", val: false}}, cons: {tag: undefined}, alt: {tag:undefined}}
test_blk = {"tag": "Blk", "body": {tag: "seq", stmts: [{tag: "Const", sym: "y", expr: {tag: "lit", val: 1}}]}}

/* ==== Run test ==== */
test = test_binop;
compile_program(test);
run();
console.log(OS);
// console.log(OS[OS.length-1]);

/* ============= PLAYGROUND ============== */
