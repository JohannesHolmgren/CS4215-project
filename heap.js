/* *************************
 * HEAP
 * *************************/

// add values destructively to the end of
// given array; return the array
const push = (array, ...items) => {
	// fixed by Liew Zhao Wei, see Discussion 5
	for (let item of items) {
		array.push(item);
	}
	return array;
};

// return the last element of given array
// without changing the array
const peek = (array, address) => array.slice(-1 - address)[0];

// HEAP is an array of bytes (JS ArrayBuffer)

const word_size = 8;
const mega = 2 ** 20;

// heap_make allocates a heap of given size
// (in megabytes)and returns a DataView of that,
// see https://www.javascripture.com/DataView
const heap_make = (bytes) => {
	if (bytes % 8 !== 0) error("heap bytes must be divisible by 8");
	const data = new ArrayBuffer(bytes);
	const view = new DataView(data);
	return view;
};

// we randomly pick a heap size of 1000000 bytes
let HEAP = heap_make(1000000);

// free is the next free index in HEAP
// we keep allocating as if there was no tomorrow
let free = 0;

// Initialize new heap
function init_heap(size) {
	free = freeStart;
}


// for debugging: display all bits of the heap
const heap_display = () => {
	console.log("heap:");
	for (let i = 0; i < free; i++) {
		console.log(`
			${word_to_string(heap_get(i))},
			${i} + " " + ${heap_get(i)} `);
	}
};

// heap_allocate allocates a given number of words
// on the heap and marks the first word with a 1-byte tag.
// the last two bytes of the first word indicate the number
// of children (addresses) that follow the tag word:
// [1 byte tag, 4 bytes payload (depending on node type),
//  2 bytes #children, 1 byte unused]
// Note: payload depends on the type of node
const size_offset = 5;
const heap_allocate = (tag, size) => {
	const address = free;
	free += size;
	HEAP.setUint8(address * word_size, tag);
	HEAP.setUint16(address * word_size + size_offset, size);
	return address;
};

// get and set a word in heap at given address
const heap_get = (address) => HEAP.getFloat64(address * word_size);

const heap_set = (address, x) => HEAP.setFloat64(address * word_size, x);

// child index starts at 0
const heap_get_child = (address, child_index) =>
	heap_get(address + 1 + child_index);

const heap_set_child = (address, child_index, value) =>
	heap_set(address + 1 + child_index, value);

const heap_get_tag = (address) => HEAP.getUint8(address * word_size);

const heap_get_size = (address) =>
	HEAP.getUint16(address * word_size + size_offset);

// the number of children is one less than the size
// except for number nodes:
//                 they have size 2 but no children
// const heap_get_number_of_children = (address) =>
// 	heap_get_tag(address) === Number_tag ? 0 : get_size(address) - 1;

const heap_get_number_of_children = (address) =>
	heap_get_tag(address) === Number_tag
		? 0
		:  heap_get_size(address) - 1;

// access byte in heap, using address and offset
const heap_set_byte_at_offset = (address, offset, value) =>
	HEAP.setUint8(address * word_size + offset, value);

const heap_get_byte_at_offset = (address, offset, value) =>
	HEAP.getUint8(address * word_size + offset);

// access byte in heap, using address and offset
const heap_set_2_bytes_at_offset = (address, offset, value) =>
	HEAP.setUint16(address * word_size + offset, value);

const heap_get_2_bytes_at_offset = (address, offset, value) =>
	HEAP.getUint16(address * word_size + offset);

// ADDED CHANGE
const heap_set_4_bytes_at_offset = (address, offset, value) =>
	HEAP.setUint32(address * word_size + offset, value);

// ADDED CHANGE
const heap_get_4_bytes_at_offset = (address, offset, value) =>
	HEAP.getUint32(address * word_size + offset);

// for debugging: return a string that shows the bits
// of a given word
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

// values

// All values are allocated on the heap as nodes. The first
// word of the node is a header, and the first byte of the
// header is a tag that identifies the type of node

const False_tag = 0;
const True_tag = 1;
const Number_tag = 2;
const Null_tag = 3;
const Unassigned_tag = 4;
const Undefined_tag = 5;
const Blockframe_tag = 6;
const Callframe_tag = 7;
const Closure_tag = 8;
const Frame_tag = 9;
const Environment_tag = 10;
const Pair_tag = 11;
const Builtin_tag = 12;
const String_tag = 13; // ADDED CHANGE
const Channel_tag = 14;

// Record<string, tuple(number, string)> where the key is the hash of the string
// and the value is a tuple of the address of the string and the string itself
let stringPool = {}; // ADDED CHANGE

// all values (including literals) are allocated on the heap.

// We allocate canonical values for
// true, false, undefined, null, and unassigned
// and make sure no such values are created at runtime

// boolean values carry their value (0 for false, 1 for true)
// in the byte following the tag
const False = heap_allocate(False_tag, 1);
const is_False = (address) => heap_get_tag(address) === False_tag;
const True = heap_allocate(True_tag, 1);
const is_True = (address) => heap_get_tag(address) === True_tag;

const is_Boolean = (address) => is_True(address) || is_False(address);

const Null = heap_allocate(Null_tag, 1);
const is_Null = (address) => heap_get_tag(address) === Null_tag;

const Unassigned = heap_allocate(Unassigned_tag, 1);
const is_Unassigned = (address) => heap_get_tag(address) === Unassigned_tag;

const Undefined = heap_allocate(Undefined_tag, 1);
const is_Undefined = (address) => heap_get_tag(address) === Undefined_tag;

// ADDED CHANGE
// strings:
// [1 byte tag, 4 byte hash to stringPool,
// 2 bytes #children, 1 byte unused]
// Note: #children is 0

// Hash any string to a 32-bit unsigned integer
const hashString = (str) => {
	let hash = 5381;
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i);
		hash = (hash << 5) + hash + char;
		hash = hash & hash;
	}
	return hash >>> 0;
};

// const result = hashString("hello");
// display(result, "hash of hello:");
// const result2 = hashString("hello world");
// display(result2, "hash of hello world:");

const String = heap_allocate(String_tag, 1);
const is_String = (address) => heap_get_tag(address) === String_tag;

const heap_allocate_String = (str) => {
	const hash = hashString(str);
	const address_or_undefined = stringPool[hash];

	if (address_or_undefined !== undefined) {
		return address_or_undefined[0];
	}

	const address = heap_allocate(String_tag, 1);
	heap_set_4_bytes_at_offset(address, 1, hash);

	// Store the string in the string pool
	stringPool[hash] = [address, str];

	return address;
};

const heap_get_string_hash = (address) =>
	heap_get_4_bytes_at_offset(address, 1);

const heap_get_string = (address) =>
	stringPool[heap_get_string_hash(address)][1];

// builtins: builtin id is encoded in second byte
// [1 byte tag, 1 byte id, 3 bytes unused,
//  2 bytes #children, 1 byte unused]
// Note: #children is 0

const is_Builtin = (address) => heap_get_tag(address) === Builtin_tag;

const heap_allocate_Builtin = (id) => {
	const address = heap_allocate(Builtin_tag, 1);
	heap_set_byte_at_offset(address, 1, id);
	return address;
};

const heap_get_Builtin_id = (address) => heap_get_byte_at_offset(address, 1);

// closure
// [1 byte tag, 1 byte arity, 2 bytes pc, 1 byte unused,
//  2 bytes #children, 1 byte unused]
// followed by the address of env
// note: currently bytes at offset 4 and 7 are not used;
//   they could be used to increase pc and #children range

const heap_allocate_Closure = (arity, pc, env) => {
	const address = heap_allocate(Closure_tag, 2);
	heap_set_byte_at_offset(address, 1, arity);
	heap_set_2_bytes_at_offset(address, 2, pc);
	heap_set(address + 1, env);
	return address;
};

const heap_get_Closure_arity = (address) => heap_get_byte_at_offset(address, 1);

const heap_get_Closure_pc = (address) => heap_get_2_bytes_at_offset(address, 2);

const heap_get_Closure_environment = (address) => heap_get_child(address, 0);

const is_Closure = (address) => heap_get_tag(address) === Closure_tag;

// block frame
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]

const heap_allocate_Blockframe = (env) => {
	const address = heap_allocate(Blockframe_tag, 2);
	heap_set(address + 1, env);
	return address;
};

const heap_get_Blockframe_environment = (address) => heap_get_child(address, 0);

const is_Blockframe = (address) => heap_get_tag(address) === Blockframe_tag;

// call frame
// [1 byte tag, 1 byte unused, 2 bytes pc,
//  1 byte unused, 2 bytes #children, 1 byte unused]
// followed by the address of env
// Added: set first unused byte (at offset 1) to 0
// to always distinguish from gocallframe

const heap_allocate_Callframe = (env, pc) => {
	const address = heap_allocate(Callframe_tag, 2);
	heap_set_2_bytes_at_offset(address, 2, pc);
	heap_set_byte_at_offset(address, 1, 0); // Added to make sure it is set to not gocall
	heap_set(address + 1, env);
	return address;
};

// Same as above but set first unused byte (at offset 1)
// to 1 to show it's a gocall frame. 0 means normal frame
const heap_allocate_Gocallframe = (env, pc) => {
	const address = heap_allocate(Callframe_tag, 2);
	heap_set_2_bytes_at_offset(address, 2, pc);
	heap_set_byte_at_offset(address, 1, 1); // Set unused byte to 1 to show gocall
	heap_set(address + 1, env);
	return address;
};

const heap_get_Callframe_environment = (address) => heap_get_child(address, 0);

const heap_get_Callframe_pc = (address) =>
	heap_get_2_bytes_at_offset(address, 2);

const is_Callframe = (address) => heap_get_tag(address) === Callframe_tag;

const is_Gocallframe = (address) => heap_get_tag(address) === Callframe_tag && heap_get_byte_at_offset(address, 1, 1) === 1;

// environment frame
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the addresses of its values

const heap_allocate_Frame = (number_of_values) =>
	heap_allocate(Frame_tag, number_of_values + 1);

const is_Frame = (address) => heap_get_tag(address) === Frame_tag;

const heap_Frame_display = (address) => {
	console.log("Frame: ");
	const size = heap_get_number_of_children(address);
	console.log(`frame size: ${size}`);
	for (let i = 0; i < size; i++) {
		console.log(`value address: ${i}`);
		const value = heap_get_child(address, i);
		console.log(`value: ${value}`);
		console.log(`value word: ${word_to_string(value)}`);
	}
};

// environment
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the addresses of its frames

const heap_allocate_Environment = (number_of_frames) =>
	heap_allocate(Environment_tag, number_of_frames + 1);

// access environment given by address
// using a "position", i.e. a pair of
// frame index and value index
const heap_get_Environment_value = (env_address, position) => {
	const [frame_index, value_index] = position;
	const frame_address = heap_get_child(env_address, frame_index);
	return heap_get_child(frame_address, value_index);
};

const heap_set_Environment_value = (env_address, position, value) => {
	//display(env_address, "env_address:")
	const [frame_index, value_index] = position;
	const frame_address = heap_get_child(env_address, frame_index);
	heap_set_child(frame_address, value_index, value);
};

// extend a given environment by a new frame:
// create a new environment that is bigger by 1
// frame slot than the given environment.
// copy the frame Addresses of the given
// environment to the new environment.
// enter the address of the new frame to end
// of the new environment
const heap_Environment_extend = (frame_address, env_address) => {
	const old_size = heap_get_size(env_address);
	const new_env_address = heap_allocate_Environment(old_size);
	let i;
	for (i = 0; i < old_size - 1; i++) {
		heap_set_child(new_env_address, i, heap_get_child(env_address, i));
	}
	heap_set_child(new_env_address, i, frame_address);

	return new_env_address;
};

const display_Environment = (env) => {
	const n_children = heap_get_number_of_children(env);
	const tag = heap_get_tag(env);
	console.log(`======= Environment information =======`);
	console.log(`Address: ${env}`)
	console.log(`Tag: ${tag}`)
	console.log(`Number of frames: ${n_children}`)
	console.log(`Frame information`)
	for (let i=0; i < n_children; i++){
		const addr = heap_get_child(env, i);
		console.log(`	Frame ${i}`);
		display_Frame(addr)
	}
	console.log(`=======================================`);
}

const display_Frame = (frame) => {
	console.log(`		Address: ${frame}`)
	console.log(`		Tag: ${heap_get_tag(frame)}`)
	console.log(`		Frame size: ${heap_get_number_of_children(frame)}`);
	console.log(`		Children: `);
	for (let i=0; i < heap_get_number_of_children(frame);i ++){
		const child = heap_get_child(frame, i);
		console.log(`			Child ${i}`);
		console.log(`			Address: ${child}`);
		console.log(`			Tag: ${heap_get_tag(child)}`);
		if (is_Number(child)){
			console.log(`			Value: ${heap_get(child+1)}`);
		}
	}
}

// Added to handle goroutines
// Copy an environment by doing like the above 
// but without extending it
const heap_Environment_copy = (env_address) => {
	const old_size = heap_get_size(env_address);
	const new_env_address = heap_allocate_Environment(old_size - 1);
	let i;
	for (i = 0; i < old_size - 1; i++) {
		heap_set_child(new_env_address, i, heap_get_child(env_address, i));
	}
	return new_env_address;
}

// for debuggging: display environment
const heap_Environment_display = (env_address) => {
	const size = heap_get_number_of_children(env_address);
	console.log("Environment: ");
	console.log(`environment size: ${size}`);
	for (let i = 0; i < size; i++) {
		(`frame index: ${i}`);
		const frame = heap_get_child(env_address, i);
		heap_Frame_display(frame);
	}
};

// pair
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by head and tail addresses, one word each
const heap_allocate_Pair = (hd, tl) => {
	const pair_address = heap_allocate(Pair_tag, 3);
	heap_set_child(pair_address, 0, hd);
	heap_set_child(pair_address, 1, tl);
	return pair_address;
};

const is_Pair = (address) => heap_get_tag(address) === Pair_tag;

// number
// [1 byte tag, 4 bytes unused,
//  2 bytes #children, 1 byte unused]
// followed by the number, one word
// note: #children is 0

const heap_allocate_Number = (n) => {
	const number_address = heap_allocate(Number_tag, 2);
	heap_set(number_address + 1, n);
	return number_address;
};

const is_Number = (address) => heap_get_tag(address) === Number_tag;


// channel
// [1 byte tag, 1 byte ready to read, 1 byte ready to write,
// 2 bytes #children (unused), 1 byte unused]
// followed by the value sent on the channel
// followed by the index of a dormant routine
// note: children is 0
const heap_allocate_Channel = () => {
	const channel_address = heap_allocate(Channel_tag, 3);
	// Set ready to read and written to to 0 (false)
	heap_set_byte_at_offset(channel_address, 1, 0)
	heap_set_byte_at_offset(channel_address, 2, 0)
	return channel_address;
};

const is_Channel = (address) => heap_get_tag(address) === Channel_tag;

const heap_write_to_channel = (channel_address, value) => {
	// Set written to and write value
	heap_set_byte_at_offset(channel_address, 2, 1)
	heap_set(channel_address + 1, value)
}

const heap_set_channel_read = (channel_address) => {
	// Set channel to ready to read
	heap_set_byte_at_offset(channel_address, 1, 1)
}

const heap_read_channel = (channel_address) => {
	// Set ready to read from and read value
	return heap_get(channel_address + 1)

}

const heap_is_channel_read = (channel_address) => {
	// Check if channel is ready to read from
	const status = heap_get_byte_at_offset(channel_address, 1);
	return (status === 1)
}

const heap_is_channel_written = (channel_address) => {
	// Check if channel has been written to
	const status = heap_get_byte_at_offset(channel_address, 2);
	return (status === 1)
}

const heap_set_channel_dormant_routine = (channel, routine) => {
	heap_set_child(channel, 1, routine);
}

const heap_get_channel_dormant_routine = (channel) => {
	return heap_get_child(channel, 1);
}

//
// conversions between addresses and JS_value
//

const address_to_JS_value = (x) =>
	is_Boolean(x)
		? is_True(x)
			? true
			: false
		: is_Number(x)
		? heap_get(x + 1)
		: is_Undefined(x)
		? undefined
		: is_Unassigned(x)
		? "<unassigned>"
		: is_Null(x)
		? null
		: is_String(x) // ADDED CHANGE
		? heap_get_string(x) // ADDED CHANGE
		: is_Pair(x)
		? [
				address_to_JS_value(heap_get_child(x, 0)),
				address_to_JS_value(heap_get_child(x, 1)),
		  ]
		: is_Closure(x)
		? "<closure>"
		: is_Builtin(x)
		? "<builtin>"
		: "unknown word tag: " + word_to_string(x);

const is_boolean = (value) => typeof(value) === "boolean"
const is_number = (value) => typeof(value) === "number"
const is_undefined = (value) => typeof(value) === "undefined"
const is_null = (value) => value == null
const is_string = (value) => typeof(value) === "string"
const is_pair = (value) => typeof(value) === pair

const JS_value_to_address = (x) =>
	is_boolean(x)
		? x
			? True
			: False
		: is_number(x)
		? heap_allocate_Number(x)
		: is_undefined(x)
		? Undefined
		: is_null(x)
		? Null
		: is_string(x) // ADDED CHANGE
		? heap_allocate_String(x) // ADDED CHANGE
		: is_pair(x)
		? heap_allocate_Pair(
				JS_value_to_address(head(x)),
				JS_value_to_address(tail(x)),
		  )
		: "unknown word tag: " + word_to_string(x);

/* ************************
 * compile-time environment
 * ************************/

// a compile-time environment is an array of
// compile-time frames, and a compile-time frame
// is an array of symbols

// find the position [frame-index, value-index]
// of a given symbol x
const compile_time_environment_position = (env, x) => {
	let frame_index = env.length;
	while (value_index(env[--frame_index], x) === -1) {}
	return [frame_index, value_index(env[frame_index], x)];
};

const value_index = (frame, x) => {
	for (let i = 0; i < frame.length; i++) {
		if (frame[i] === x) return i;
	}
	return -1;
};

// in this machine, the builtins take their
// arguments directly from the operand stack,
// to save the creation of an intermediate
// argument array
const builtin_object = {
	display: () => {
		const address = OS.pop();
		display(address_to_JS_value(address));
		return address;
	},
	get_time: () => JS_value_to_address(get_time()),
	error: () => error(address_to_JS_value(OS.pop())),
	is_number: () => (is_Number(OS.pop()) ? True : False),
	is_boolean: () => (is_Boolean(OS.pop()) ? True : False),
	is_undefined: () => (is_Undefined(OS.pop()) ? True : False),
	is_string: () => (is_String(OS.pop()) ? True : False), // ADDED CHANGE
	is_function: () => is_Closure(OS.pop()),
	math_sqrt: () =>
		JS_value_to_address(math_sqrt(address_to_JS_value(OS.pop()))),
	pair: () => {
		const tl = OS.pop();
		const hd = OS.pop();
		return heap_allocate_Pair(hd, tl);
	},
	is_pair: () => (is_Pair(OS.pop()) ? True : False),
	head: () => heap_get_child(OS.pop(), 0),
	tail: () => heap_get_child(OS.pop(), 1),
	is_null: () => (is_Null(OS.pop()) ? True : False),
	set_head: () => {
		const val = OS.pop();
		const p = OS.pop();
		heap_set_child(p, 0, val);
	},
	set_tail: () => {
		const val = OS.pop();
		const p = OS.pop();
		heap_set_child(p, 1, val);
	},
};

const primitive_object = {};
/* const builtin_array = [];
{
	let i = 0;
	for (const key in builtin_object) {
		primitive_object[key] = {
			tag: "BUILTIN",
			id: i,
			arity: arity(builtin_object[key]),
		};
		builtin_array[i++] = builtin_object[key];
	}
} */

/* const constants = {
	undefined: Undefined,
	math_E: math_E,
	math_LN10: math_LN10,
	math_LN2: math_LN2,
	math_LOG10E: math_LOG10E,
	math_LOG2E: math_LOG2E,
	math_PI: math_PI,
	math_SQRT1_2: math_SQRT1_2,
	math_SQRT2: math_SQRT2,
};

for (const key in constants) primitive_object[key] = constants[key];
 */

const compile_time_environment_extend = (vs, e) => {
	//  make shallow copy of e)
	return push([...e], vs);
};

/* // compile-time frames only need synbols (keys), no values
const global_compile_frame = Object.keys(primitive_object);
const global_compile_environment = [global_compile_frame];
*/

const freeStart = free;
