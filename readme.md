This is a project for the course Programming Language Implementation (CS4215). The goal of this project was to create a language which is a subset of Go. The implementation contains a parser, compiler and virtual machine. The language has support for concurrency and the implementing language is JavaScript.

A full list of all constructs available can be seen below. 

* Variable declaration, both using var and const
* Variable assignment, current supported types are numbers, Booleans and strings
* Function declaration
* Blocks
* If, else if and else statements
*  Go calls for starting concurrent thread
*  Channels for concurrency control, channels can be both read from and written to

To run the program simply open up the index.html file in a browser of choice. For a number of example programs check out the testCases.txt file. The code for creating the parser is available in Parser/javascript.js, the parser is available in Parser/javascript.js. The code for the heap is available in heap.js and the code for the compiler and virtual machine can be seen in vm.js.
