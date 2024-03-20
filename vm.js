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
    constructor(first, second){
        this.first = first;
        this.second = second;
    }

    get head(){
        return this.first;
    }

    get tail(){
        return this.second;
    }

    set head(val){
        this.first = val;
    }

    set tail(val){
        this.second = val;
    }
}

/* ================ COMPILER ================ */
INSTRUCTIONS = [];
wc = 0;

function compile_component(component) {
    if (component.tag === "Literal"){
        INSTRUCTIONS[wc++] = {tag: "LDC", val: component.value}
    }
    else if (component.tag === 'BinOp'){
        compile_component(component.first);
        compile_component(component.second);
        INSTRUCTIONS[wc++] = {tag: 'BINOP', sym: component.sym}
    }
    else if (component.tag === 'UnOp'){
        compile_component(component.first);
        INSTRUCTIONS[wc++] = {tag: 'UNOP', sym: component.sym}
    }
    else if (component.tag === 'Seq'){
        sequence = component.stmts
        if (sequence.length === 0){
            INSTRUCTIONS[wc++] = {tag: "LDC", val:undefined}
        }
        let first = true;
        for (let seq_part of sequence){
            first ? first = false : INSTRUCTIONS[wc++] = {tag: "POP"}
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
        throw Error("Unbound name");
    }
    if(environment.head.hasOwnProperty(symbol)){
        return environment.head[symbol];
    }
    return lookup(symbol, environment.tail);
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
        // Switch routine
    }
}
/* ============= RUN AND TESTS ============== */
function compile_and_display(testcase) {
    compile_component(testcase);
    console.log(INSTRUCTIONS)
}

/* === Test Cases === */
test_binop = {tag: "BinOp", sym: "+", first: {tag: "Literal", value: 1}, second: {tag: "Literal", value: 1}}
test_unop = {tag: "UnOp", sym: "!", first: {tag: "Literal", value: true}}
test_seq = {tag: "Seq", stmts: [{tag: "Literal", value: 1}, {tag: "Literal", value: 2}]}
test_ld = {tag: "Nam", sym: "y"}
test_cond = {tag: 'Cond', pred: {tag: "BinOp", sym: "&&", first: {tag: "Literal", value: true}, second: {tag: "Literal", value: false}}, cons: {tag: undefined}, alt: {tag:undefined}}

/* ==== Run test ==== */
test = test_cond;
compile_program(test);
run();
console.log(OS);
// console.log(OS[OS.length-1]);

/* ============= PLAYGROUND ============== */
