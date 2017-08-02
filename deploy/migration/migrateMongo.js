
/* jshint ignore:start */
/* eslint-disable */

// conn = new Mongo();
// db = connect("localhost:27017/nodetest1");

print("\nMigrate MongoDB\n");

var collections =
["users", "projects"];

db.dropDatabase();

for (i = 0; i < collections.length; i++)
{
    name = collections[i];
    print("Generate collection " + name);
    db.createCollection(name);
}

// users = db.users;

// campaigns = db.campaigns;

// printjson(users.count());

print("\nDatabase migrated with collections:\n" + db.getCollectionNames() + "\n")
