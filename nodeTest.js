var parse = require("./Parser/javascript.js")
var parse2 = require("./Parser/javascript2.js")

let s = "10;10"

// let y = parse2.parse(s)
// console.log(JSON.stringify(y, null, 2))

let x = parse.parse(s)
console.log(JSON.stringify(x, null, 2))
