// var parse2 = require("./Parser/javascript2.js")
var parse2 = require("./Parser/javascript.js")

// let s = "function(x){}"
// let s = "make( chan )"
let s = "a = make(  chan    )"

let y = parse2.parse(s)
console.log(JSON.stringify(y, null, 2))
