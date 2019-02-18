const MongoClient = require('mongodb').MongoClient;
const port = 27017;
const url = 'mongodb://localhost:' + port;

exports.copyMongoDb = (oldDbName, newDbName) => {
  return new Promise((resolve, reject) => {
    MongoClient.connect(url, function(err, db) {
      if (err) {
        reject(err);
      } else {
        var mongoCommand = {
          copydb: 1,
          fromhost: "localhost",
          fromdb: oldDbName,
          todb: newDbName
        };
        var admin = db.admin();

        admin.command(mongoCommand, function(commandErr, data) {
          if (!commandErr) {
            console.log(data);
            resolve(data)
          } else {
            reject(commandErr.errmsg);
          }
          db.close();
        });
      }
    });
  });
}

exports.dbExists = (dbName) => {
  var url = 'mongodb://localhost:27017';

  return new Promise((resolve, reject) => {
    MongoClient.connect(url, (err, db) => {
      console.log('---> err', err);

      if (err) {
        reject(err);
      } else {
        var adminDb = db.admin();
        console.log('---> adminDb', adminDb);

        // List all the available databases
        adminDb.listDatabases(function(err, dbs) {
          console.log('---> err', err);

          console.log('---> dbs.dbName', dbName);
          console.log('---> dbs.databases', dbs.databases);
          const found = dbs.databases.find(name => dbName === name);
          db.close();
          resolve(!!found)
        });
      }
    });
  });
}
