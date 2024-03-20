var parse = require("./javascript.js")

let x = parse.parse("const a = 10 \n for var i = 0; i < a; i++{}")
console.log(x.body[1].test.right)


