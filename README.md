**sell-bond** is a web application that will sell a bond for you so you can get a piece of work done.
```javascript
var issueBond = require("issue-bond")
var sellBond = require("sell-bond")

var bond = issueBond("bakery")

bond.expense (
  "50 lb bag of flour",
  "$40")

bond.expense (
  "Toaster oven",
  "$60")

bond.expense (
  "Parchment",
  "$5")

bond.tasks([
  "Make poulish and let sit for 25 minutes",
  "Knead in flour to dough",
  "Let bread rise 4 hours, stretching every hour",
  "Bake"])

sellBond(bond)
// web site should be started now. check your terminal for the address 
```
