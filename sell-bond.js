
var library = require("module-library")(require)


module.exports = library.export(
  "sell-bond",
  ["web-element", "basic-styles", "tell-the-universe", "issue-bond", "browser-bridge", "phone-person", "web-host", "someone-is-a-person"],
  function(element, basicStyles, aWildUniverseAppeared, issueBond, BrowserBridge, phonePerson, host, someoneIsAPerson) {

    var bondUniverse = aWildUniverseAppeared("bonds", {issueBond: "issue-bond"})

    var bondsForSale = {}

    function sellBond(bond) {
      host.onSite(prepareSite)
      bondsForSale[bond.id] = bond
    }

    function parseMoney(string) {
      var trimmed = string.replace(/[^0-9.-]*/g, "")
      var amount = parseFloat(trimmed)
      var dollars = Math.floor(amount)
      var remainder = amount - dollars
      var cents = Math.floor(remainder*100)

      return dollars*100 + cents
    }

    var baseBridge = new BrowserBridge()

    basicStyles.addTo(baseBridge)

    someoneIsAPerson.remember("x6xv", "Treeso")

    function prepareSite(site) {

      someoneIsAPerson.prepareSite(site)

      if (site.remember("sell-bond")) {
        return
      }
      site.see("sell-bond")

      site.addRoute(
        "get",
        "/bond-catalog",
        function(request, response) {

          var meId = someoneIsAPerson.getIdFrom(request)

          if (meId) {
            var avatar = someoneIsAPerson(baseBridge, meId)
          } else {
            someoneIsAPerson.getIdentityFrom(response, "/assignment")
            return
          }

          var page = element([
            avatar,
            element("h1", "Collective Magic Bond Co"),
            element("p", "est 2017"),
            element("h1", "Bond Catalog"),
          ])

          for(var id in bondsForSale) {
            var bond = bondsForSale[id]
            page.addChild(element(".button", bond.outcome))
          }

          baseBridge.forResponse(response).send(page)
        }
      )


      // Issue a bond

      site.addRoute(
        "post",
        "/housing-bonds",
        function(request, response) {

          var list = false
          var issuerName = request.body.issuerName
          var amount = parseMoney(request.body.amount)

          var repaymentSource = request.body.repaymentSource

          var bond = issueBond(
            null,
            amount,
            issuerName,
            repaymentSource,
            {
              listId: listId
            }
          )

          bondUniverse.do("issueBond", bond.id, amount, issuerName, repaymentSource, bond.data)

          response.redirect("/housing-bonds/"+bond.id)
        }
      )


      // Learn about an issued bond


      site.addRoute(
        "get",
        "/housing-bonds/:id",
        function(request, response) {
          var bridge = new BrowserBridge().forResponse(response)        
          var bond = issueBond.get(request.params.id)
          var list = bond.list

          bridge.send("[invoice here]")
        }
      )


      // Request to buy a bond

      site.addRoute(
        "post",
        "/housing-bonds/:bondId/buy",
        function(request, response) {

          var name = request.body.name
          var number = request.body.phoneNumber
          var bondId = request.params.bondId
          var bond = issueBond.get(bondId)
          var faceValue

          ;[20, 100, 500].forEach(function(dollars) {
            if (request.body["buy-"+dollars]) {
              faceValue = dollars*100
            }
          })

          var order = issueBond.order(null, name, number, bondId, faceValue)

          bondUniverse.do(
            "issueBond.order", order.id, name, number, bondId, faceValue)

          var buyer = phonePerson("18123201877")

          buyer.send(number+" ("+name+") wants to by a "+toDollarString(faceValue)+" bond: http://ezjs.co/bond-orders/"+order.id)

          var bridge = baseBridge.forResponse(response)

          bridge.send(element("p", "Thank you for your request. Erik will text/call you shortly to arrange payment!"))
        }
      )

      // Get an order to sign

      site.addRoute("get", "/bond-orders/:orderId", function(request, response) {

        var order = issueBond.getOrder(request.params.orderId)
        var bond = issueBond.get(order.bondId)
        var bridge = baseBridge.forResponse(response)

        renderUnsignedShare(bridge, bond, order)
      })


      // Mark shares paid

      site.addRoute("post", "/bond-orders/:orderId/mark-paid", function(request, response) {

        var orderId = request.params.orderId
        var signature = request.body.paymentReceivedBy
        var order = issueBond.getOrder(orderId)
        var price = parseMoney(request.body.price)

        issueBond.markPaid(orderId, price, signature)

        bondUniverse.do("issueBond.markPaid", orderId, price, signature)

        baseBridge.forResponse(response).send("Shares signed")
      })

    }

    function renderUnsignedShare(bridge, bond, order) {

      var price = order.faceValue / 1.05

      var form = element("form", {method: "post", action: "/bond-orders/"+order.id+"/mark-paid"}, [
        element("h1", "Receipt of payment for bond shares"),
        element("p", "To be repayed from "+bond.repaymentSource),
      ])

      form.addChildren(
        element("input", {type: "text", value: order.purchaserName, name: "purchaserName", placeholder: "Name of person buying shares"}),
        element("input", {type: "text", value: toDollarString(order.faceValue), name: "faceValue", placeholder: "Face value"}),
        element("input", {type: "text", value: toDollarString(price), name: "price", placeholder: "Price"}),
        element("input", {type: "text", value: order.phoneNumber, name: "contactNumber", placeholder: "Contact number"}),
        element("p", "Payment accepted by"),
        element("input", {type: "text", value: "Erik", name: "paymentReceivedBy", placeholder: "Signed"}),
        element("p", element("input", {type: "submit", value: "Mark paid"}))
      )

      bridge.send(form)
    }


    function toDollarString(cents) {
      if (cents < 0) {
        var negative = true
        cents = Math.abs(cents)
      }

      cents = Math.ceil(cents)

      var dollars = Math.floor(cents / 100)
      var remainder = cents - dollars*100
      if (remainder < 10) {
        remainder = "0"+remainder
      }

      var string = "$"+dollars+"."+remainder

      if (negative) {
        string = "-"+string
      }

      return string
    }

    return sellBond
  }
)



    // 25% goes to hourly pay for people like me and Bobby
    // 10% goes to bond holders
    // Any excess from arbitrage goes to good will bonds:
    //   Housing for new employees
    //   Food budget
    //   Community projects

