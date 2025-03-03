// avenuedelabrique.js

const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Récupère et extrait les deals depuis la page spécifiée.
 * @param {string} url - L'URL de la page à scraper.
 * @returns {Promise<Array<Object>>} - Une promesse qui résout en un tableau d'objets deal.
 */
async function scrape(url) {
  try {
    // Récupérer le contenu HTML de la page
    const { data: html } = await axios.get(url);

    // Charger le HTML avec Cheerio en activant xmlMode (comme dans la version du prof)
    const $ = cheerio.load(html, { xmlMode: true });

    // Sélectionner tous les liens contenant les deals dans div.prods
    const deals = $('div.prods a')
      .map((i, element) => {
        // Extraire le prix (converti en nombre flottant)
        const price = parseFloat(
          $(element)
            .find('span.prodl-prix span')
            .text()
        );

        // Extraire le discount (converti en entier positif)
        const discount = Math.abs(
          parseInt(
            $(element)
              .find('span.prodl-reduc')
              .text()
          )
        );

        // Récupérer le titre depuis l'attribut 'title'
        const title = $(element).attr('title');

        // Récupérer le lien (et en faire un lien absolu si nécessaire)
        let link = $(element).attr('href');
        if (link && !link.startsWith('http')) {
          link = new URL(link, url).href;
        }

        return { title, price, discount, link };
      })
      .get();

    return deals;
  } catch (error) {
    console.error("Erreur lors du scraping :", error);
    return [];
  }
}

// Exporter la fonction pour pouvoir l'utiliser dans d'autres fichiers
module.exports = { scrape };
