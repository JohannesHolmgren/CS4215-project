var parse = require("./javascript.js")

let x = parse.parse("var sum = 0 \n for var i = 0; i < 10; i++{sum += i} \n sum")

console.log(x.body[2].expression)

