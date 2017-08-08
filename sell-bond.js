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
  ["web-element", "basic-styles", "tell-the-universe", "issue-bond", "browser-bridge", "phone-person", "web-host", "someone-is-a-person", "line-item", "to-dollar-string", "character", "post-button"],
  function(element, basicStyles, aWildUniverseAppeared, issueBond, BrowserBridge, phonePerson, host, someoneIsAPerson, lineItem, toDollarString, character, postButton) {

    var bondUniverse = aWildUniverseAppeared("bonds", {issueBond: "issue-bond"})

    var bondsForSale = []

    function sellBond(bondId) {
      host.onSite(prepareSite)
      bondsForSale.push(bondId)
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

    character("k2zy", "bloko")

    function purchaseForm(bondId, myInvestorId) {

      var status = issueBond.getStatus(bondId)
      var shareId = issueBond.myOrderOn(bondId, myInvestorId)
      var orderStatus = shareId && issueBond.getOrderStatus(shareId)
      var outcome = issueBond.getOutcome(bondId)
      var financials = issueBond.calculateFinancials(bondId)

      if (orderStatus == "pending" || orderStatus == "paid") {
        return [
          element("p", "You bought this!"),
          share(shareId, outcome, issueBond.getOrderStatus(shareId)),
        ]
      } else if (status != "available") {
        return element("p", "Bond has already been sold")
      }

      var form = element("form", {method: "post", action: "/bond-catalog/"+bondId+"/orders"})

      var buyButtonLabel = "Buy "+outcome+" bond - "+toDollarString(financials.totalExpenses)

      form.addChildren([
        element("p", element("input", {type: "text", name: "name", placeholder: "Purchaser name"})),
        element("p", element("input", {type: "text", name: "phoneNumber", placeholder: "Contact number"})),
        element("input", {type: "submit", value: buyButtonLabel})
      ])

      return form
    }

    var minutes = 60
    var hours = 60*minutes
    var days = 24*hours
    var years = 365*days

    function renderBondCatalog(header, request, response) {

      var meId = someoneIsAPerson.getIdFrom(request)

      var page = element()

      if (meId) {
        var avatar = someoneIsAPerson(baseBridge, meId)
        page.addChild(avatar)
      }

      if (header) {
        page.addChild(header)
      }

      page.addChild(element("h1", "Bond Catalog"))

      for(var i=0; i<bondsForSale.length; i++) {
        var bondId = bondsForSale[i]
        var outcome = issueBond.getOutcome(bondId)

        if (!outcome) {
          throw new Error(bondId+" bond has no outcome")
        }
        var link = element("a", {href: "/bond-catalog/"+bondId}, outcome)

        var p = element("p", link)
        page.addChild(p)
      }

      baseBridge.forResponse(response).send(page)
    }

    function renderBond(request, response) {
      var bridge = baseBridge.forResponse(response)

      var meId = someoneIsAPerson.getIdFrom(request)

      if (meId) {
        var myInvestorId = character.remember(meId, "investorId")
      }
      
      bridge.addToHead(element.stylesheet(lineItem, share))

      var bondId = request.params.id

      var outcome = issueBond.getOutcome(bondId)

      var financials = issueBond.calculateFinancials(bondId)

      if (!financials.totalExpenses) {
        throw new Error(outcome+" bond has no expenses")
      }
      var taskList = element("ol")

      issueBond.eachTask(bondId, function(task) {
        taskList.addChild(element("li", task))
      })

      var expenses = element()

      issueBond.eachExpense(bondId, function(description, subtotal) {
        expenses.addChild(lineItem(description, subtotal))
      })

      var page = element(".lil-page", [
        element("h1", issueBond.getOutcome(bondId)+" bond"),
        element("p", "Issued by "+issueBond.describeIssuer(bondId)),
        element("h1", "Tasks required for maturation of bond"),
        taskList,
        element("h1", "Financials"),
        expenses,
        element("p", "Total costs: "+toDollarString(financials.totalExpenses)),
        element("p", "Bond price: "+toDollarString(financials.faceValue)),
        element("p", "Rate: 5% ("+toDollarString(financials.profit)+" profit)"),
        element("p", "Total returned: "+toDollarString(financials.faceValue*1.05)),
        element("p", "Date of maturity: DEC 15, 2017"),
        element("h1", "Purchase"),
        purchaseForm(bondId, myInvestorId),
        element(element.style({"height": "100px"}))
      ])

      bridge.send(page)
    }

    var freshOrders = {}

    function orderBond(request, response) {

      var name = request.body.name
      var number = request.body.phoneNumber
      var bondId = request.params.bondId
      var financials = issueBond.calculateFinancials(bondId)
      var faceValue = financials.faceValue
      var quote = financials.totalExpenses

      var investorId = issueBond.registerInvestor(null, name, number)

      bondUniverse.do(
        "issueBond.registerInvestor", investorId, name, number)

      var meId = someoneIsAPerson.ensureMe(request, response)

      character.see(meId, "investorId", investorId)

      var orderId = issueBond.orderShare(null, bondId, investorId, faceValue, quote)

      bondUniverse.do(
        "issueBond.orderShare", orderId, bondId, investorId, faceValue, quote)

      var buyer = phonePerson("18123201877")

      buyer.send(number+" ("+name+") wants to by a "+toDollarString(faceValue)+" bond: http://ezjs.co/bond-orders/"+orderId)

      freshOrders[investorId] = orderId

      response.redirect("/investors/"+investorId)      
    }

    function investorDashboard(request, response) {

      var bridge = baseBridge.forResponse(response)

      var investorId = request.params.investorId
      
      var profile = issueBond.getInvestorProfile(investorId)

      var page = element(".lil-page", [
        element("h1", profile.name+" is an investor"),
        element.stylesheet(share),
      ])

      var freshOrder = freshOrders[investorId]

      if (freshOrder) {
        delete freshOrders[investorId]
        var outcome = issueBond.describeOrder(freshOrder)
        var message = element("p", "Thank you for your order. Erik will text/call you shortly to arrange payment for the "+outcome+" bond. Your investor id is <strong>"+investorId+"</strong> and your order id is <strong>"+freshOrder+"</strong> if you would like to note them for your records.")
        page.addChild(message)
      }

      page.addChild(element("h1", "Your shares"))

      issueBond.eachOfMyShares(investorId, function(shareId, outcome, status) {
        page.addChild(share(shareId, outcome, status))
      })

      bridge.send(page)
    }

    var share = element.template(
      ".share.container",
      function(shareId, outcome, status) {

        this.addChild(element("#"+shareId+" "+outcome))

        var buttons = element("Status: "+status+" ")

        if (status == "pending") {
          buttons.addChild(
            postButton("Cancel", "/bond-orders/"+shareId+"/cancel")
          )
        }

        this.addChild(buttons)
      }
    )

    var header

    sellBond.header = function(newHeader) {
      header = newHeader
    }

    function prepareSite(site) {

      site.addRoute("get", "/sell-bond/signature.png", site.sendFile(__dirname, "signature.png"))

      someoneIsAPerson.prepareSite(site)

      if (site.remember("sell-bond")) {
        return
      }
      site.see("sell-bond")

      site.addRoute(
        "get",
        "/bond-catalog",
        renderBondCatalog.bind(null, header)
      )

      site.addRoute(
        "get",
        "/bond-catalog/:id",
        renderBond
      )

      site.addRoute(
        "get",
        "/investors/:investorId",
        investorDashboard
      )

      // Request to buy a bond

      site.addRoute(
        "post",
        "/bond-catalog/:bondId/orders",
        orderBond
      )

      // Get an order to sign

      site.addRoute("get", "/bond-orders/:orderId", function(request, response) {

        var orderId = request.params.orderId
        var outcome = issueBond.describeOrder(orderId)
        var investorId = issueBond.getOwnerId(orderId)

        var profile = issueBond.getInvestorProfile(investorId)
        var purchaserName = profile.name
        var phoneNumber = profile.phoneNumber

        var faceValue = issueBond.getShareValue(orderId)
        var price = issueBond.getQuote(orderId)

        var bridge = baseBridge.forResponse(response)

        renderUnsignedShare(bridge, outcome, orderId, purchaserName, phoneNumber, faceValue, price)
      })


      // Mark shares paid

      site.addRoute("post", "/bond-orders/:orderId/mark-paid", function(request, response) {

        var orderId = request.params.orderId
        var signature = request.body.textSignature
        var meId = someoneIsAPerson.getIdFrom(request)

        var metadata = {characterId: meId, textSignature: signature}

        issueBond.markPaid(orderId, metadata)

        bondUniverse.do("issueBond.markPaid", orderId, metadata)

        baseBridge.forResponse(response).send([
          element("h1", "Share signed"),
          cert,
          element.stylesheet(certStyle)
        ])
      })

      site.addRoute("post", "/bond-orders/:orderId/cancel", function(request, response) {
        var meId = someoneIsAPerson.getIdFrom(request)
        var myInvestorId = character.remember(meId, "investorId")
        var orderId = request.params.orderId

        issueBond.cancelOrder(orderId)
        bondUniverse.do("issueBond.cancelOrder", orderId)

        response.redirect("/investors/"+myInvestorId)
      })

    }


    var certStyle = element.style(".certificate", {

      " .label": {
        "margin-top": "0.5em",
        "color": "#ff4441",
        "font-style": "italic",
        "font-family": "Georgia",
      },
    })

    var cert = element(".certificate", element.style({
        "background": "#ddf6fb",
        "color": "#403c19",
        "max-width": "350px",
        "margin-top": "2em",
      }),[
      element(".title", element.style({
      "color": "#c501ff",
        "font-weight": "bold",
        "font-size": "18pt",

      }), "Collective Magic Company"),
      element(".no", element.style({
        "font-weight": "bold",
      }), "Bond No. 10001<br>Payment Receipt"),

      element(".label", "Bond Value:"),
      element("$170"),
      element(".typed", "**ONE HUNDRED SEVENTY**"),
      element(".typed", "5% NOTE DUE: DECEMBER 15, 2017"),

      element(".label", "Project:"),
      element("Falafel Kitchen".toUpperCase()),

      element(".label", "Holder:"),
      element(".address", [
        "SO-AND-SO<br>",
        "12 SUCHANDSUCH ST<br>",
        "BOSTON, MA 02101<br>",
      ]),

      element(".label", "Dated:"),
      element("AUG 05, 2017"),

      element(".label", "By:"),

      element(element.style({
        "font-weight": "bold"
      }), [
        element("img", {src: "/sell-bond/signature.png", "height": "60px"}),
        element("President<br>Collective Magic Company<br>871 W MacArthur Blvd<br>Oakland, CA 94608"),
      ]),

      element(),
      element(".box-value", element.style({
        "display": "inline-block",
        "color": "#f1ddfb",
        "background": "#403c19",
        "padding": "10px 20px",
        "margin": "1em 0",
      }), "**$170**"),
    ])

    function renderUnsignedShare(bridge, outcome, orderId, purchaserName, phoneNumber, faceValue, price) {

      var form = element("form.lil-page", {method: "post", action: "/bond-orders/"+orderId+"/mark-paid"}, [

        element("h1", "Sign Receipt"),
        element("p", "Order #"+orderId),

        element("p", purchaserName+"<br>"+phoneNumber),
        lineItem(outcome+" bond, 1 share", price),
        element("p", element.style({"margin-top": "2em"}), "Signature:"),
        element("input", {type: "text", name: "textSignature", placeholder: "sign here"}),
        element("p", element("input", {type: "submit", value: "Payment received"})),

      ])

      bridge.send([
        form,
        cert,
        element.stylesheet(certStyle)
      ])
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

