// server/queries.js
const { connect } = require('./mongodb');

(async () => {
  const db = await connect();
  const deals = db.collection('deals');
  const sales = db.collection('sales');

  console.log('📌 1. Best discount deals');
  console.log(await deals.find({ discount: { $ne: null } }).sort({ discount: -1 }).limit(5).toArray());

  console.log('\n📌 2. Most commented deals');
  console.log(await deals.find({ commentsCount: { $ne: null } }).sort({ commentsCount: -1 }).limit(5).toArray());

  console.log('\n📌 3. Deals sorted by price');
  console.log(await deals.find({ price: { $ne: null } }).sort({ price: 1 }).limit(5).toArray());

  console.log('\n📌 4. Deals sorted by date (si tu as une date)');
  console.log(await deals.find({ date: { $exists: true } }).sort({ date: -1 }).limit(5).toArray());

  console.log('\n📌 5. Sales for a given lego set id (ex: 42156)');
  console.log(await sales.find({ title: /42156/ }).toArray());

  console.log('\n📌 6. Sales scraped less than 3 weeks ago (si tu as scrapedAt)');
  const threeWeeksAgo = new Date(Date.now() - 21 * 24 * 60 * 60 * 1000);
  console.log(await sales.find({ scrapedAt: { $gte: threeWeeksAgo } }).toArray());

  process.exit(0);
})();
