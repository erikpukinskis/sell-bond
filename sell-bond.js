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

    character("k2zy", "bloko")

    function purchaseForm(bond, myInvestorId) {

      var status = issueBond.getStatus(bond.id)
      var shareId = issueBond.myOrderOn(bond.id, myInvestorId)
      var orderStatus = shareId && issueBond.getOrderStatus(shareId)

      if (orderStatus == "pending" || orderStatus == "paid") {
        return [
          element("p", "You bought this!"),
          share(shareId, bond.outcome, issueBond.getOrderStatus(shareId)),
        ]
      } else if (status != "available") {
        return element("p", "Bond has already been sold")
      }

      var form = element("form", {method: "post", action: "/bond-catalog/"+bond.id+"/orders"})

      var buyButtonLabel = "Buy "+bond.outcome+" bond - "+toDollarString(bond.totalExpenses())

      form.addChildren([
        element("p", element("input", {type: "text", name: "name", placeholder: "Purchaser name"})),
        element("p", element("input", {type: "text", name: "phoneNumber", placeholder: "Contact number"})),
        element("input", {type: "submit", value: buyButtonLabel})
      ])

      return form
    }

    function renderBondCatalog(header, request, response) {

      var meId = someoneIsAPerson.getIdFrom(request)

      if (meId) {
        var avatar = someoneIsAPerson(baseBridge, meId)
      } else {
        someoneIsAPerson.getIdentityFrom(response, "/bond-catalog")
        return
      }

      var page = element([
        avatar])
      if (header) {
        page.addChild(header)
      }
      page.addChild(element("h1", "Bond Catalog"))

      for(var id in bondsForSale) {
        var bond = bondsForSale[id]
        page.addChild(element("p", element("a", {href: "/bond-catalog/"+bond.id}, bond.outcome), " issued by "+bond.issuerName))
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
        element("p", "Expected value: "+toDollarString(bond.faceValue())),
        element("p", "Bondholder profit after sale: "+toDollarString(bond.profit())),
        element("h1", "Purchase"),
        purchaseForm(bond, myInvestorId),
        element(element.style({"height": "100px"}))
      ])

      bridge.send(page)
    }

    var freshOrders = {}

    function orderBond(request, response) {

      var name = request.body.name
      var number = request.body.phoneNumber
      var bondId = request.params.bondId
      var bond = issueBond.get(bondId)
      var faceValue = bond.faceValue()
      var quote = bond.totalExpenses()

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
        var signature = request.body.paymentReceivedBy
        var order = issueBond.getOrder(orderId)
        var price = parseMoney(request.body.price)

        issueBond.markPaid(orderId, price, signature)

        bondUniverse.do("issueBond.markPaid", orderId, price, signature)

        baseBridge.forResponse(response).send("Shares signed")
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



    //  Design inspo:
    
    // https://s-media-cache-ak0.pinimg.com/originals/a2/e1/d2/a2e1d24828893d94ec225e5c31cd0a90.jpg

    // http://i.telegraph.co.uk/multimedia/archive/01124/PF-PremiumBond_1124949c.jpg

    var pink = "#f46658"
    var white = "#fffbf4"
    var dirtyPink = "#da7a71"
    var linkPink = "#ee988b"
    var black = "#322e34"
    var midGray = "#8b8681"
    var darkGray = "#6e6860"

    var certStyle = element.style(".certificate", {

      "background": white,
      "color": darkGray,
      "padding": "10px",
      "max-width": "450px",
      "font-size": "12pt",

      " .inner": {
        "border": "20px solid pink",
        "padding": "30px",
      },

      " .date": {
        "margin": "1em 0",
      },

      " .box-value": {
        "display": "inline-block",
        "color": white,
        "background": midGray,
        "padding": "10px 20px",
        "font-family": "Courier",
        "margin": "20px 0",
      },

      " .label": {
        "text-align": "center",
        "font-weight": "bold",
        "color": darkGray,
      },

      " .typed": {
        "font-family": "Courier",
        "color": midGray,
      },

      " .no": {
        "margin-bottom": "1em",
        "font-weight": "bold",
      },

      " .title": {
        "font-weight": "bold",
        "text-transform": "uppercase",
        "font-size": "20pt",
        "font-family": "Georgia",
        "color": darkGray,
        "margin-top": "1em",
      },

      " .number-field": {
        "margin": "1em 0",
      },

      " .address": {
        "margin": "1em 0",
      },

      " .signature-stuff": {
        "font-weight": "bold",
      },

      " .rate-advertisement": {
        "float": "right",
        "font-weight": "bold",
      },

      " .rate-advertisement .percentage": {
        "font-weight": "normal",
        "text-align": "center",
        "font-size": "24pt",
      },
    })

    var cert = element(".certificate", [
      element(".inner", [
        element(".label", "Bond Certificate"),
        element(".box-value", "**$170**"),
        element(".title", "Collective Magic Co"),
        element(".no", "No. 10001"),
        element(".typed", "5% NOTE DUE: DECEMBER 15, 2017"),

        element(".typed.address", [
          "SO-AND-SO<br>",
          "12 SUCHANDSUCH ST<br>",
          "BOSTON, MA 02101<br>",
        ]),

        element(".rate-advertisement", [
          element(".percentage", "5%"),
          element("Due 2017"),
        ]),

        element(".typed.number-field", [
          "*170*****<br>",
          "**170****<br>",
          "***170***<br>",
          "****170**<br>",
        ]),

        element(".typed", "**ONE HUNDRED SEVENTY**"),

        element(".typed.date", "DATED: AUG 05,2017"),

        element(".signature-stuff", [
          element("By"),
          element("img", {src: "/sell-bond/signature.png", "height": "80px"}),
          element("President"),
        ]),
        element(".box-value", "**$170**"),
      ]),
    ])

    function renderUnsignedShare(bridge, outcome, orderId, purchaserName, phoneNumber, faceValue, price) {

      var form = element("form.lil-page", {method: "post", action: "/bond-orders/"+orderId+"/mark-paid"}, [

        element("h1", "Bond Sale Receipt"),
        element("p", "Order #"+orderId),
        element("p", purchaserName+"<br>"+phoneNumber),
        lineItem(outcome+" bond, 1 share", price),
        element("p", element.style({"margin-top": "2em"}), "Signature:"),
        element("input", {type: "text", placeholder: "sign here"}),
        element("p", element("input", {type: "submit", value: "Payment received"})),

      ])

      bridge.send([
        cert,
        element.stylesheet(certStyle),
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

