// var parse2 = require("./Parser/javascript2.js")
var parse2 = require("./Parser/javascript.js")

// let s = "function(x){}"
// let s = "make( chan )"
let s = "if (10 > 1){}"

let y = parse2.parse(s)
console.log(JSON.stringify(y, null, 2))
