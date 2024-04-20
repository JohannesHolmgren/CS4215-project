This is a project for the course Programming Language Implementation (CS4215). Overall all the goals which were set up were reached. The implementation has support for all of the basic sequential constructs except for for-loops, which were not added due to time constraints. For the concurrent constructs channels were used to enable concurrency control, Go statements were added to start concurrent parts of the program. A full list of all constructs available can be seen below. 

* Variable declaration, both using var and const
* Variable assignment, current supported types are numbers, Booleans and strings
* Function declaration
* Blocks
* If, else if and else statements
*  Go calls for starting concurrent thread
*  Channels for concurrency control, channels can be both read from and written to

To run the program simply open up the index.html file in a browser of choice. For a number of example programs check out the testCases.txt file. The code for creating the parser is available in Parser/javascript.js, the parser is available in Parser/javascript.js. The code for the heap is available in heap.js and the code for the compiler and virtual machine can be seen in vm.js.