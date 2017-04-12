var library = require("module-library")(require)

module.exports = library.export(
  "sell-bond",
  ["web-element"],
  function(element) {
    return function(bond) { 
      return function(bridge) {
        var page = element([
          element("h2", element.style({"text-transform": "capitalize"}), "Buy "+bond.id+ " bond"),
          element("p", bond.rateOfReturn+" return in "+bond.termLength+" (estimated)"),
          element(".button", "Buy")
        ])

        bridge.send(page)
      }
    }

    // 25% goes to hourly pay for people like me and Bobby
    // 10% goes to bond holders
    // Any excess from arbitrage goes to good will bonds:
    //   Housing for new employees
    //   Food budget
    //   Community projects

  }
)