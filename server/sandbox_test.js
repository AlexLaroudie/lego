/*********************************************
 * Dépendances :
 *   npm install puppeteer cheerio fs
 *********************************************/

const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');

(async () => {
  // 1) Lance le navigateur (headless:false pour observer)
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // 2) User-Agent réaliste
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.104 Safari/537.36'
  );

  // 3) Aller sur la page
  const url = 'https://www.dealabs.com/search?q=lego';
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // 4) Pauser ~10s pour laisser Cloudflare faire son challenge
  await new Promise(resolve => setTimeout(resolve, 10000));

  // 5) (Optionnel) Tenter de cliquer la bannière cookies
  try {
    await page.click('button[data-role="accept-consent"]');
  } catch (err) {
    console.log("Bannière cookies non trouvée, ou déjà fermée.");
  }

  // 6) Screenshot debug
  await page.screenshot({ path: 'debug.png' });

  // 7) Attendre la présence de <article.thread>
  await page.waitForSelector('article.thread', { timeout: 60000 });

  // 8) Récupérer le code HTML final
  const html = await page.content();
  console.log('Page chargée, on lance le scrap...');

  // 9) Fermer le navigateur (ou laissez ouvert si besoin de voir)
  await browser.close();

  // 10) Parse avec Cheerio
  const $ = cheerio.load(html);
  const results = [];

  // 11) Boucle sur chaque <article class="thread">
  $('article.thread').each((i, el) => {
    // a) Titre
    const title = $(el).find('.thread-title a.thread-link')
      .text()
      .trim();

    // b) Lien complet
    const relLink = $(el).find('.thread-title a.thread-link').attr('href');
    const link = relLink ? 'https://www.dealabs.com' + relLink : null;

    // c) Prix
    const price = $(el).find('.thread-price').text().trim() || null;

    // d) Description
    const shortDescription = $(el)
      .find('.userHtml.userHtml-content .overflow--wrap-break')
      .text()
      .trim() || null;

    // e) Réduction (ex. -30%)
    const discountEl = $(el).find('.threadListCard-body .textBadge--green');
    const discount = discountEl.length ? discountEl.text().trim() : null;

    // f) Température (ex. “169°”)
    const tempEl = $(el).find('.threadListCard-header .vote-box .overflow--wrap-off');
    const temperature = tempEl.length ? tempEl.text().trim() : null;

    // g) Nombre de commentaires
    //    On clone le <a> et on retire le <svg> pour ne garder que le texte
    let commentsCount = null;
    const commentsLink = $(el).find('a.button--type-text[href*="#comments"]');
    if (commentsLink.length) {
      const cloned = commentsLink.clone();
      cloned.children('svg').remove(); // retire l'icône <svg>
      commentsCount = cloned.text().trim();
    }

    // h) Image (via data-vue2, ou un <img>)
    let imageUrl = null;

    const vue2El = $(el).find('[data-vue2*="ThreadMainListItemNormalizer"]');
    if (vue2El.length) {
      const dataVue2 = vue2El.attr('data-vue2');
      try {
        const parsed = JSON.parse(dataVue2);
        const threadData = parsed.props.thread;
        if (threadData.mainImage && threadData.mainImage.path && threadData.mainImage.uid) {
          imageUrl =
            'https://static.dealabs.com/' +
            threadData.mainImage.path +
            '/' +
            threadData.mainImage.uid;
        }
      } catch (err) {
        console.log('Erreur parse dataVue2 :', err);
      }
    }

    results.push({
      title,
      link,
      price,
      shortDescription,
      discount,
      temperature,
      commentsCount,
      imageUrl,
    });
  });

  // 12) Affiche en console
  console.log(results);

  // 13) Sauvegarde en JSON
  fs.writeFileSync('lego-dealabs.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('Scrap terminé, lego-dealabs.json créé !');
})();
