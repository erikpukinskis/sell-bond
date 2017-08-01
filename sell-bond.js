
var library = require("module-library")(require)

    // "module-library": "*",
    // "house-plan": "*",
    // "house-panels": "*",
    // "building-materials": "*",
    // "web-element": "*",
    // "release-checklist": "*",
    // "browser-bridge": "*",
    // "basic-styles": "*",
    // "tell-the-universe": "*",
    // "identifiable": "*",
    // "plivo": "*",
    // "build-house": "*",
    // "make-it-checkable": "*",
    // "show-source": "*",
    // "phone-person": "*",
    // "issue-bond": "*"

// Holy shit, this is a "component" in the old Nrtv sense! issueBond is a model/data store, with no deps and a well defined API. sell-bond pulls in dependenceis from everywhere and essentially acts as an interface between issueBond and the universe.

// Eventually it'll be broken down into several components, as they make sense in isolation.



module.exports = library.export(
  "render-invoice",
  ["web-element", "basic-styles", "tell-the-universe", "issue-bond", "browser-bridge", "phone-person", "./render-invoice", "./render-pitch", "./render-checklist"],
  function(element, basicStyles, tellTheUniverse, issueBond, BrowserBridge, phonePerson, renderInvoice, buildingMaterials, invoiceMaterials, renderChecklist) {


    var tellTheUniverse = tellTheUniverse.called("bonds").withNames({issueBond: "issue-bond"})

    tellTheUniverse.load()

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


    function prepareSite(site) {

      // Issue a bond

      site.addRoute("get", "/checklist/:listId", function(request, response) {
        var bridge = baseBridge.forResponse(response)
        var list = releaseChecklist.get(request.params.listId)
        renderChecklist(bridge, list)
      })

      site.addRoute(
        "post",
        "/housing-bonds",
        function(request, response) {

          var listId = request.body.checklistId
          var list = releaseChecklist.get(listId)
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

          tellTheUniverse("issueBond", bond.id, amount, issuerName, repaymentSource, bond.data)

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

          var invoice = invoiceMaterials(bond)

          var invoicePartial = bridge.partial()

          if (!invoicePartial.__isNrtvBrowserBridge) {
            throw new Error("no bridge?")
          }

          renderInvoice(invoicePartial, invoice, materials.hours)
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

          tellTheUniverse(
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

        tellTheUniverse("issueBond.markPaid", orderId, price, signature)

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


    function issueBondForm(bridge, list, invoice) {

      var form = element("form", {method: "post", action: "/housing-bonds"}, [
        element("p", "Who is issuing this bond?"),
        element("p",
          element("input", {
            type: "text",
            name: "issuerName",
            placeholder: "Issuer name",
          })
        ),

        element("p", "Total bonded amount"),
        element("p",
          element("input", 
            {
              type: "text", 
              value: toDollarString(invoice.total),
              name: "amount",
              placeholder: "Amount"
            },
            element.style({"max-width": "5em"})
          )
        ),

        element("p", "To be repayed from"),
        element("p",
          element("input", {
            type: "text",
            name: "repaymentSource",
            value: "Completion of release checklist "+list.story,
            placeholder: "Source of repayment funds",
          })
        ),

        element("input", {
          type: "hidden",
          name: "checklistId",
          value: list.id
        }),

        element("input.button", {type: "submit", value: "Issue bond"}),
      ])

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

    return {}
  }
)



    // 25% goes to hourly pay for people like me and Bobby
    // 10% goes to bond holders
    // Any excess from arbitrage goes to good will bonds:
    //   Housing for new employees
    //   Food budget
    //   Community projects

