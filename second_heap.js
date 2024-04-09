/*
This file defines the behaviour of a heap, used as a memory model.
It is very heavily based on the model in Source Academy, given in
    the course CS4246 at National University of Singapore, ay23/24.

    The heap is represented by an ArrayBuffer, accessed via a Dataview
    object.

    Each entry in the heap consists of at least one word, which holds
    among other some metadata regarding the entry:
    // Byte 0:      Tag - what kind of entry
    // Byte 1-4:    Payload. See each entry type
    // Byte 5-6:    Number of children i.e. size in words of entry
    // Byte 7:      Unused 

*/


/* ====== Constants ======= */
const MEGA = 2 ** 20;       // For convenience
const WORD_SIZE = 5;        // (in bytes)
const HEAP_SIZE = 16;       // (in bytes)
const SIZE_OFFSET = 5;      // 

/* ==== Heap Creation ===== */
// The heap is represented by an ArrayBuffer, 
// accessed via a Dataview object.
function heap_make(bytes) {
    if (bytes % 8 !== 0) throw new Error("Heap bytes must be divisible by 8");
    const data = new ArrayBuffer(bytes);
    const view = new DataView(data);
    return view;
}

/* ====== Variables ======= */
let free = 0;                       // Next free word
const HEAP = heap_make(HEAP_SIZE);  // Our global heap

/* ====== Debugging ======= */
// Display all bits of the heap
const heap_display = () => {
	console.log("", "heap:");
	for (let i = 0; i < free; i++) {
		console.log(`${word_to_string(heap_get(i))},
			${stringify(i) + " " + stringify(heap_get(i)) + " "}`);
	}
};

// Return a string that shows the bits of a given word
const word_to_string = (word) => {
	const buf = new ArrayBuffer(8);
	const view = new DataView(buf);
	view.setFloat64(0, word);
	let binStr = "";
	for (let i = 0; i < 8; i++) {
		binStr += ("00000000" + view.getUint8(i).toString(2)).slice(-8) + " ";
	}
	return binStr;
};

/* ==== Heap Allocator ==== */
// Each entry in the heap consists of at least one word, which holds
// among other some metadata regarding the entry:
//  Byte 0:      Tag - what kind of entry
//  Byte 1-4:    Payload. See each entry type
//  Byte 5-6:    Number of children i.e. size in words of entry
//  Byte 7:      Unused 
const heap_allocate = (tag, size) => {
	const address = free;
	free += size;
	HEAP.setUint8(address * WORD_SIZE, tag);
	HEAP.setUint16(address * WORD_SIZE + SIZE_OFFSET, size);
	return address;
};




/* ====== Run code ======= */
heap_display();
