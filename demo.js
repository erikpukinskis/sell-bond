var library = require("module-library")(require)

library.using(
  [".", "issue-bond"],
  function(sellBond, issueBond, character) {

    var kitchenBond = issueBond("kitchen", "Falafel Kitchen", "Erik Pukinskis")

    kitchenBond.tasks([
      "Make poulish",
      "Make dough",
      "Make falafel sandwich"])

    kitchenBond.expenses({
      "Flat top griddle station": "$263",
      "50 lb bag of flour": "$20",
      "Toaster oven": "$90",
      "Card table": "$30",
    })

    sellBond(kitchenBond)
  }
)