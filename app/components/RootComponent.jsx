const React = require("react");
const PoemDisplay = require("./PoemDisplay");

/* the main page for the index route of this app */
const RootComponent = function() {
  return (
    <div>
      <h1>Star Wars Ep. IV Rap Generator</h1>
      <p> Created using the script from Star Wars Ep IV and Ad Lib lines from modern rap songs</p>
      <p>(WARNING: There may be explicit language)</p>
      <h3>Read in your best rapping voice!</h3>
      <PoemDisplay />
    </div>
  );
}

module.exports = RootComponent;