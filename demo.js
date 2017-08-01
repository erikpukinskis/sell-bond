var library = require("module-library")(require)

library.using(
  [".", "issue-bond"],
  function(sellBond, issueBond) {

    var kitchen = issueBond(
      "Falafel Kitchen", [
      "Make poulish",
      "Make dough",
      "Make falafel sandwich"])

    kitchen.addExpense([
      ["Flat top griddle station", 1, "$263"],
      ["50 lb bag of flour", "$20"],
      ["Toaster oven", "$90"],
      ["Card table", "$30"],
    ])

    sellBond(kitchen)
  }
)