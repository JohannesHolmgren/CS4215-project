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
/* ============= DEPENDENCIES =============== */
import {StartRules, SyntaxError, parse} from "./Parser/javascript.js";
//var parser = require("./Parser/javascript.js")

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

function compile_component(component) {
    console.log(component);
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
        const sequence = component.stmts
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
    else if (component.tag === "nam"){
        INSTRUCTIONS[wc++] = {tag: "LD", sym: component.sym}
    }
    else if (component.tag === "cond"){
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
    else if (component.tag === "app"){
        compile_component(component.fun);
        for (let arg of component.args){
            compile_component(arg);
        }
        INSTRUCTIONS[wc++] = {tag: "CALL", arity: component.args.length};
    }
    else if (component.tag === "blk"){
        const locals = scan(component.body);
        INSTRUCTIONS[wc++] = {tag: "ENTER_SCOPE", syms: locals};
        compile_component(component.body);
        INSTRUCTIONS[wc++] = {tag: "EXIT_SCOPE"};
    }
    else if (component.tag === "const"){
        compile_component(component.expr);
        INSTRUCTIONS[wc++] = {tag: "ASSIGN", sym: component.sym};
    }
    else if (component.tag === "var"){
        compile_component(component.expr);
        INSTRUCTIONS[wc++] = {tag: "ASSIGN", sym: component.sym};
    }
    else if (component.tag === "ret"){
        compile_component(component.expr);
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
            });
    }
    else if (component.tag === "lam"){
        INSTRUCTIONS[wc++] = {tag: "LDF", prms: component.prms, addr: wc+1};
        const goto_instr = {tag: "GOTO"};
        INSTRUCTIONS[wc++] = goto_instr;
        compile_component(component.body);
        INSTRUCTIONS[wc++] = {tag: "LDC", val: undefined};
        INSTRUCTIONS[wc++] = {tag: "RESET"};
        goto_instr.addr = wc;
    }
    // Possibly add assignment if needed by anything later
    else if (component.tag === undefined){
        // Do nothing
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
    INSTRUCTIONS = [];
    wc = 0;
    // Compile program and end the machine code with DONE instruction
    compile_component(program);
    INSTRUCTIONS[wc] = {tag: "DONE"};
}

/* ============= VIRTUAL MACHINE ============ */
/* Define Data structures */
let RTS = [];
let OS = [];
let E = initializeEmptyEnvironment();
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

function extendEnvironment(names, values, env){
    const newFrame = {};
    for (let i=0; i<names.length;i++){
        newFrame[names[i]] = values[i];
    }
    return new Pair(newFrame, env)
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
        assign(instruction.sym, OS.slice(-1), E);
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
        RTS.push({tag: "BLOCK_FRAME", env: E});
        const locals = instruction.syms;
        const new_frame = {};
        for(let i=0; i<locals.length;i++){
            new_frame[locals[i]] = {tag: "unassigned"};
        }
        E = new Pair(new_frame, E);
    }
    else if (instruction.tag === "EXIT_SCOPE"){
        // Reset the previous environment from RTS
        E = RTS.pop().env;
    }
    else if (instruction.tag === "LDF"){
        const closureTag = {tag: "CLOSURE", prms: instruction.prms, addr: instruction.addr, env: E};
        OS.push(closureTag);
    }
    else if (instruction.tag === "CALL"){
        // On OS: all arguments above function itself
        // Load arguments backwards since pushed so
        const args = [];
        for (let i=instruction.arity; i>=0; i--){
            args[i] = OS.pop();
        }
        const funcToCall = OS.pop();
        RTS.push({tag: "CALL_FRAME", addr: pc+1, env: E});
        E = extendEnvironment(funcToCall.prms, args, E);
        pc = funcToCall.addr;
    }
    else if (instruction.tag === "RESET"){
        const topFrame = RTS.pop();
        if (topFrame.tag === "CALL_FRAME"){
            pc = topFrame.addr;
            E = topFrame.env;
        }
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

    console.log(INSTRUCTIONS);
    while (!(INSTRUCTIONS[pc].tag === "DONE")) {
        // Fetch next instruction and execute
        const instruction = INSTRUCTIONS[pc++];
        execute_instruction(instruction);
        // console.log(instruction)
        // TODO: Switch routine
        console.log(`OS length: ${OS.length} with ${OS.slice(-1)}`);
    }
}

/* ============= RUN AND TESTS ============== */
function compile_and_display(testcase) {
    compile_component(testcase);
    console.log(INSTRUCTIONS)
}

/* === Test Cases === */
const test_binop = {"tag": "binop", "sym": "+", "frst": {"tag": "lit", "val": 1}, "scnd": {"tag": "lit", "val": 1}};  // 1 + 1
const test_unop = {tag: "unop", sym: "!", frst: {tag: "lit", val: true}};  // !true
const test_seq = {"tag": "seq", "stmts": [{"tag": "lit", "val": 1}, {"tag": "lit", "val": 2}]};    // 1; 2;
const test_ld = {tag: "seq", stmts: [{tag: "const", sym: "y", expr: {tag: "lit", val: 16}}, {tag: "nam", sym: "y"}]};
const test_blk = {"tag": "blk", "body": {tag: "seq", stmts: [{tag: "const", sym: "y", expr: {tag: "lit", val: 1}}]}};
const test_cond2 = {"tag": "blk", "body": {"tag": "cond", "pred": {"tag": "binop", "sym": "||", "frst": {"tag": "lit", "val": true}, "scnd": {"tag": "lit", "val": false}}, "cons": {"tag": "lit", "val": 1}, "alt": {"tag": "lit", "val": 2}}}
const test_cond = {tag: "seq", stmts: [{tag: "cond", pred: {tag: "binop", sym: "||", frst: {tag: "lit", val: true}, scnd: {tag: "lit", val: false}}, cons: {tag: "lit", val: 1}, alt: {tag: "lit", val: 5}}, {tag: "lit", val: 3}]};
const test_func = {"tag": "blk", "body": {"tag": "seq", "stmts": [{"tag": "fun", "sym": "f", "prms": [], "body": {"tag": "ret", "expr": {"tag": "lit", "val": 1}}}, {"tag": "app", "fun": {"tag": "nam", "sym": "f"}, "args": []}]}};


/* ==== Run test ==== */
function test(testcase, expected){
    compile_program(testcase);
    run();
    if (OS.slice(-1) == expected){
        console.log(`SUCCESS! Got ${OS.slice(-1)} of type ${typeof OS.slice(-1)}. Expected ${expected} of type ${typeof expected}`)
    }
    else {
        console.error(`FAILURE! Expected ${expected} got ${OS.slice(-1)}`)
    }
}


/* === Function called from webpage === */
export function parseInput(){
    const testcase = test_func;
    test(testcase, 1);

    /*
    // Get text input
    const input = document.getElementById("editor").value;
    console.log(input);
    // Parse input
    let parsedInput = parse(input);
    console.log(parsedInput);
    */
}

/* ============= PLAYGROUND ============== */
