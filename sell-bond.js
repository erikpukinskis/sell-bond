var library = require("module-library")(require)



library.define(
  "to-dollar-string",
  function() {
    return function toDollarString(cents) {
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
  }
)



library.define(
  "line-item",
  ["web-element", "to-dollar-string"],
  function(element, toDollarString) {
    var lineItemTemplate = element.template(
      ".line-item",
      element.style({
        "margin-top": "0.25em",
      }),
      function(description, total) {

        this.addChild(element(
          ".grid-12",
          description
        ))

        // this.addChild(element(
        //   ".grid-8",
        //   qty
        // ))

        this.addChild(element(
          ".grid-4",
          element.style({
            "border-bottom": "1px solid #666",
            "padding-left": "0.25em"
          }),
          toDollarString(total)
        ))
      }
    )

    return lineItemTemplate
  }
)



module.exports = library.export(
  "sell-bond",
  ["web-element", "basic-styles", "tell-the-universe", "issue-bond", "browser-bridge", "phone-person", "web-host", "someone-is-a-person", "line-item", "to-dollar-string"],
  function(element, basicStyles, aWildUniverseAppeared, issueBond, BrowserBridge, phonePerson, host, someoneIsAPerson, lineItem, toDollarString) {

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

    function purchaseForm(bond) {
      var buyButtonLabel = "Buy "+bond.outcome+" bond - "+toDollarString(bond.totalExpenses())

      var form = element("form", {method: "post", action: "/bond-catalog/"+bond.id+"/orders"}, [
        element("p", element("input", {type: "text", name: "name", placeholder: "Purchaser name"})),
        element("p", element("input", {type: "text", name: "phoneNumber", placeholder: "Contact number"})),
        element("input", {type: "submit", value: buyButtonLabel})
      ])

      return form
    }

    function renderBondCatalog(request, response) {

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
        page.addChild(element("p", element("a", {href: "/bond-catalog/"+bond.id}, bond.outcome), "issued by "+bond.issuerName))
      }

      baseBridge.forResponse(response).send(page)
    }

    function renderBond(request, response) {
      var bridge = baseBridge.forResponse(response)

      bridge.addToHead(element.stylesheet(lineItem))

      var bond = issueBond.get(request.params.id)
      var tasks = bond.getTasks()

      function li(task) {
        return element("li", task)
      }

      var expenses = element()

      bond.eachExpense(function(description, subtotal) {
        expenses.addChild(lineItem(description, subtotal))
      })

      var page = element(".lil-page", [
        element("h1", bond.outcome+" bond"),
        element("p", "Issued by "+bond.issuerName),
        element("h1", "Tasks required for maturation of bond"),
        tasks.length ? element("ol", tasks.map(li)) : element("p", "None"),
        element("h1", "Financials"),
        expenses,
        element("p", "Total costs: "+toDollarString(bond.totalExpenses())),
        element("p", "Sale price: "+toDollarString(bond.salePrice())),
        element("p", "Bondholder profit after sale: "+toDollarString(bond.profit())),
        element("h1", "Purchase"),
        purchaseForm(bond),
        element(element.style({"height": "100px"}))
      ])

      bridge.send(page)
    }

    function orderBond(request, response) {

      var bridge = baseBridge.forResponse(response)

      var name = request.body.name
      var number = request.body.phoneNumber
      var bondId = request.params.bondId
      var bond = issueBond.get(bondId)

      var faceValue = bond.salePrice()

      var order = issueBond.order(null, name, number, bondId, faceValue)

      bondUniverse.do(
        "issueBond.order", order.id, name, number, bondId, faceValue)

      var buyer = phonePerson("18123201877")

      buyer.send(number+" ("+name+") wants to by a "+toDollarString(faceValue)+" bond: http://ezjs.co/bond-orders/"+order.id)

      bridge.send(element(".lil-page", element("p", "Thank you for your request. Erik will text/call you shortly to arrange payment!")))
    }

    function prepareSite(site) {

      someoneIsAPerson.prepareSite(site)

      if (site.remember("sell-bond")) {
        return
      }
      site.see("sell-bond")

      site.addRoute(
        "get",
        "/bond-catalog",
        renderBondCatalog
      )

      site.addRoute(
        "get",
        "/bond-catalog/:id",
        renderBond
      )

      // Request to buy a bond

      site.addRoute(
        "post",
        "/bond-catalog/:bondId/orders",
        orderBond
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

    return sellBond
  }
)



    // 25% goes to hourly pay for people like me and Bobby
    // 10% goes to bond holders
    // Any excess from arbitrage goes to good will bonds:
    //   Housing for new employees
    //   Food budget
    //   Community projects

