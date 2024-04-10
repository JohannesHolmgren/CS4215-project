// var parse2 = require("./Parser/javascript2.js")
var parser = require("./Parser/javascript.js")

let tests = [
  ["5", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"lit","val":5}]}}'],
  ["x", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"nam","sym":"x"}]}}'],
  ["if (10 > 5){}", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"cond","pred":{"tag":"binop","sym":">","frst":{"tag":"lit","val":10},"scnd":{"tag":"lit","val":5}},"cons":{"tag":"blk","body":[]},"alt":null}]}}'],
  ["10 + 5", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"binop","sym":"+","frst":{"tag":"lit","val":10},"scnd":{"tag":"lit","val":5}}]}}'],
  ["func()", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"app","fun":{"tag":"nam","sym":"func"},"arguments":[]}]}}'],
  ["var x = 10", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"var","sym":"x","expr":{"tag":"lit","val":10}}]}}'],
  ["const x = 10", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"const","sym":"x","expr":{"tag":"lit","val":10}}]}}'],
  ["go func()", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"GoRoutine","function":{"tag":"app","fun":{"tag":"nam","sym":"func"},"arguments":[]}}]}}'],
  ["c = make(chan)", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"assmt","sym":"=","left":{"tag":"nam","sym":"c"},"right":{"tag":"MakeChannel"}}]}}'],
  ["c <- 5", '{"tag":"blk","body":{"tag":"seq","stmts":[{"tag":"Arrow","left":{"tag":"nam","sym":"c"},"right":{"tag":"lit","val":5}}]}}']
]

// Loop through and parse tests
for (let t of tests) {
  let parsed_expression = parser.parse(t[0])
  parsed_expression = JSON.stringify(parsed_expression)
  let expected_expression = t[1]
  if (parsed_expression === expected_expression) {
    console.log("Test passed")
  }
  else {
    console.log("Test failed")
    console.log("Expected: " + expected_expression)
    console.log("Got: " + parsed_expression)
  }
}

