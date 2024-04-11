// var parse2 = require("./Parser/javascript2.js")
var parser = require("./Parser/javascript.js")

let tests = [
  //'{"tag":"blk","body":{"tag":"seq","stmts":[]}}'
  // ["1+1", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"binop","sym":"+","frst":{"tag":"lit","val":1},"scnd":{"tag":"lit","val":1}}]}}'],
  // ["1 \n 2", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"lit","val":1},{"tag":"lit","val":2}]}}'],
  // ["const y = 16 \n y", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"const","sym":"y","expr":{"tag":"lit","val":16}},{"tag":"nam","sym":"y"}]}}'],
  // ["var y = 16 \n y", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"var","sym":"y","expr":{"tag":"lit","val":16}},{"tag":"nam","sym":"y"}]}}'],
  // //["if (true){true}", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"cond","pred":{"tag":"lit","val":true},"cons":{"tag":"lit","val":true},"alt":{"tag":"seq","stmts":[]}}]}}']
  ["func x(){ \n const a = 10 \n 1}", '']


]

// Loop through and parse tests
for (let t of tests) {
  let parsed_expression = parser.parse(t[0])
  parsed_expression = JSON.stringify(parsed_expression, null ,2)
  console.log(parsed_expression)
  // let expected_expression = t[1]
  // if (parsed_expression === expected_expression) {
  //   console.log("Test passed")
  // }
  // else {
  //   console.log("Test failed")
  //   console.log(expected_expression)
  //   console.log(parsed_expression)
  // }
}

