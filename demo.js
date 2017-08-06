var library = require("module-library")(require)

library.using(
  [".", "issue-bond"],
  function(sellBond, issueBond, character) {

    var kitchenBond = issueBond("kitchen", "Falafel Kitchen", "Erik Pukinskis")

  issueBond.registerInvestor("5ua7", "ZOOO", "8")
  issueBond.orderShare("09t5", "kitchen", "5ua7", 18509, 16827)

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