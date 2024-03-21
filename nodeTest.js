var parse = require("./Parser/javascript.js")
var parse2 = require("./Parser/javascript2.js")

let s = "if 10>5 {5;}"

// let y = parse2.parse(s)
// console.log(JSON.stringify(y, null, 2))

let x = parse.parse(s)
console.log(JSON.stringify(x, null, 2))
