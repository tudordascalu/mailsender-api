
/* jshint ignore:start */
/* eslint-disable */

// conn = new Mongo();
// db = connect("localhost:27017/nodetest1");

print("\nUpdate MongoDB\n");

// var query = {fbID: "23842590209720359"};
var query = {caseNumber: "DK88895"};
var update =
{
    budget: 27771, requests: []
};
var options = {new: false, upsert: true};
db.campaigns.findOneAndUpdate(query, {$set: update}, options);

// printjson(users.count());
print("\nDone");
