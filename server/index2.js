// index.js
const {
    connect,
    insertDeals,
    insertSales,
    findBestDiscountDeals,
    // ... etc
  } = require('./mongodb.js');
  
  // Exemple de fonction "main" qu'on exécute
  async function main() {
    // 1) Connexion à MongoDB
    await connect();
  
    // 2) Supposons que tu as scrapé des deals avant...
    const dealsScrap = [
      {
        legoSetId: '42156',
        title: 'Ford GT',
        price: 99,
        discount: 30, // -30% par exemple
        date: new Date(),
        commentsCount: 12
        // ... etc
      },
      // ... + d’autres deals
    ];
  
    // 3) Insertion des deals
    console.log('Inserting deals...');
    await insertDeals(dealsScrap);
  
    // 4) Récupération de certains deals (exemple "best discount deals")
    const bestDiscounts = await findBestDiscountDeals();
    console.log('Best discount deals:', bestDiscounts);
  
    // 5) etc.
  }
  
  main()
    .then(() => console.log('Done'))
    .catch((error) => console.error(error));
  