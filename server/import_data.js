// server/import_data.js
const fs = require('fs');
const path = require('path');
const { connect } = require('./mongodb');

(async () => {
  const db = await connect();

  const deals = JSON.parse(fs.readFileSync(path.join(__dirname, '../Data/dealabs.json')));
  const sales = JSON.parse(fs.readFileSync(path.join(__dirname, '../Data/vinted.json')));

  const dealsCollection = db.collection('deals');
  const salesCollection = db.collection('sales');

  await dealsCollection.deleteMany({}); // Nettoie avant import
  await salesCollection.deleteMany({});

  await dealsCollection.insertMany(deals);
  await salesCollection.insertMany(sales);

  console.log('✅ Import terminé !');
  process.exit(0);
})();
