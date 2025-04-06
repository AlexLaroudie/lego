const fs = require('fs');
const dealabs = require('./websites/dealabs');

async function sandbox(website = 'https://www.dealabs.com/groupe/lego') {
  try {
    console.log(`Browsing ${website} website...`);

    const deals = await dealabs.scrape(website);

    if (!deals || deals.length === 0) {
      console.log('No deals found.');
    } else {
      console.log(deals);
      
      
      fs.writeFileSync('dealabs.json', JSON.stringify(deals, null, 2), 'utf-8');
      console.log('Deals saved to deals.json');
    }

    console.log('Done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

const [, , eshop] = process.argv;
sandbox(eshop);