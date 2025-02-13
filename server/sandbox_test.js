// sandbox.js

// Importer le module avenuedelabrique



const { scrape } = require('./websites/dealabs.js');

async function testScrape() {
  const url = 'https://www.avenuedelabrique.com/promotions-et-bons-plans-lego';
  const deals = await scrape(url);
  
  if (deals && deals.length > 0) {
    deals.forEach(deal => {
      console.log(`Titre : ${deal.title} | Prix : ${deal.price} | Remise : ${deal.discount} | Lien : ${deal.link}`);
    });
  } else {
    console.log("Aucun deal trouvé !");
  }
}

testScrape();