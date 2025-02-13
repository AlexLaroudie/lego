// deallabs.js

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

/**
 * Scrape les deals Lego depuis Dealabs.
 * Le JSON contenant les données se trouve dans la variable globale window.__INITIAL_STATE__.
 * @param {string} url - L'URL de la page à scraper.
 * @returns {Promise<Array<Object>>} - Une promesse qui résout en un tableau d'objets deal.
 */
async function scrape(url) {
  try {
    // Récupérer le contenu HTML de la page
    const { data: html } = await axios.get(url);
    const $ = cheerio.load(html);

    // Chercher le <script> qui contient "window.__INITIAL_STATE__"
    let scriptContent = null;
    $('script').each((i, el) => {
      const content = $(el).html();
      if (content && content.includes('window.__INITIAL_STATE__')) {
        scriptContent = content;
        return false; // on sort de la boucle dès qu'on trouve le script
      }
    });
    if (!scriptContent) {
      console.error("Script contenant window.__INITIAL_STATE__ non trouvé.");
      return [];
    }

    // Extraire le JSON de la chaîne "window.__INITIAL_STATE__ = {...};"
    // On utilise une expression régulière qui récupère le contenu entre l'assignation et le point-virgule.
    const regex = /window\.__INITIAL_STATE__\s*=\s*(\{.*?\});/s;
    const match = regex.exec(scriptContent);
    if (!match) {
      console.error("Impossible d'extraire le JSON de window.__INITIAL_STATE__.");
      return [];
    }
    const jsonString = match[1];
    const initialState = JSON.parse(jsonString);

    // Localiser les deals dans l'objet initialState.
    // Dans l'exemple, les deals se trouvent dans initialState.widgets.hottestWidget.threads.
    const threads =
      initialState.widgets &&
      initialState.widgets.hottestWidget &&
      initialState.widgets.hottestWidget.threads;
    if (!threads) {
      console.error("Aucun deal trouvé dans l'objet initialState.");
      return [];
    }

    // Filtrer uniquement les deals Lego : on garde les threads dont le titre contient "lego" (sans tenir compte de la casse).
    const legoDeals = threads;//.filter(thread => {
      //return thread.title && thread.title.toLowerCase().includes('lego');
    //});

    // Reformater les deals avec les propriétés souhaitées.
    // Ici, nous récupérons le titre, le prix (ou displayPrice), le discount (priceDiscount) et le lien (url).
    const deals = legoDeals.map(deal => ({
      title: deal.title,
      price: deal.price,             // ou utilisez deal.displayPrice si besoin
      discount: deal.priceDiscount,  // ou un autre champ de remise si différent
      link: deal.url
    }));

    // Stocker le résultat dans un fichier JSON
    fs.writeFileSync('deallabs-lego-deals.json', JSON.stringify(deals, null, 2), 'utf-8');
    console.log("Nombre total de threads :", threads.length);
    console.log("Exemple de thread :", threads[0]);

    console.log(`Nombre de deals Lego trouvés : ${deals.length}`);

    return deals;
  } catch (error) {
    console.error("Erreur lors du scraping de Dealabs :", error);
    return [];
  }
}

module.exports = { scrape };

// Si ce module est exécuté directement, on lance une extraction de test.
if (require.main === module) {
  (async () => {
    const url = 'https://www.dealabs.com/'; // Vous pouvez préciser une URL de deals si nécessaire
    await scrape(url);
  })();
}
