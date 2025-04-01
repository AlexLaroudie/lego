const { connect } = require('./mongodb');

(async () => {
  const db = await connect();
  const deals = db.collection('deals');
  const sales = db.collection('sales');

  // 1. 🔥 Les deals les plus chauds (par température)
  console.log('🔥 Deals les plus populaires (par température)');
  console.log(await deals.find({ temperature: { $ne: null } }).sort({ temperature: -1 }).limit(5).toArray());

  // 2. 📝 Les deals avec une description (filtrer ceux sans texte)
  console.log('\n📝 Deals avec description');
  console.log(await deals.find({ shortDescription: { $exists: true, $ne: "" } }).limit(5).toArray());

  // 3. 💬 Deals où il y a eu au moins 1 commentaire
  console.log('\n💬 Deals avec commentaires');
  console.log(await deals.find({ commentsCount: { $gte: 1 } }).sort({ commentsCount: -1 }).limit(5).toArray());

  // 4. 🛍️ Produits Vinted à moins de 5€ (filtrer sur Prix_1)
  console.log('\n🛍️ Produits Vinted à moins de 5€');
  console.log(await sales.find({ Prix_1: { $regex: /^([0-4],[0-9]{2}|5,00)/ } }).limit(5).toArray());

  // 5. 🔎 Rechercher un mot-clé dans les titres Dealabs (ex : "Star Wars")
  console.log('\n🔎 Deals contenant "Star Wars" dans le titre');
  console.log(await deals.find({ title: /Star Wars/i }).toArray());

  // 6. 🧱 Ventes Vinted avec images disponibles
  console.log('\n🧱 Ventes Vinted avec image');
  console.log(await sales.find({ Image_URL: { $exists: true, $ne: "" } }).limit(5).toArray());

  process.exit(0);
})();
