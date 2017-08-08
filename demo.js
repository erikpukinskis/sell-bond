var library = require("module-library")(require)

library.using(
  [".", "issue-bond"],
  function(sellBond, issueBond, character) {

    issueBond("kitchen", "Falafel Kitchen", "Erik Pukinskis")

    issueBond.tasks("kitchen", [
      "Make poulish",
      "Make dough",
      "Make falafel sandwich"])

    issueBond.expenses("kitchen", {
      "Flat top griddle station": "$263",
      "50 lb bag of flour": "$20",
      "Toaster oven": "$90",
      "Card table": "$30",
    })

    sellBond("kitchen")
  }
)