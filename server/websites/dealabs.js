const fetch = require('node-fetch');
const cheerio = require('cheerio');

/**
 * Parse webpage data response
 * @param {String} data - HTML response
 * @return {Array} deals
 */
const parse = data => {
  const $ = cheerio.load(data);

  return $('.js-vue2[data-vue2]').map((i, element) => {
    const jsonData = $(element).attr('data-vue2');
    if (!jsonData) return null;

    try {
      const parsedData = JSON.parse(jsonData);
      if (!parsedData.props || !parsedData.props.thread) return null;

      const thread = parsedData.props.thread;
      const price = thread.price;
      const originalPrice = thread.nextBestPrice;

      if (!price || price === 0) return null;

      let discount = null;
      if (originalPrice && originalPrice > price) {
        discount = Number((((originalPrice - price) * 100) / originalPrice).toFixed(0));
      }

      let imageUrl = null;
      if (thread.mainImage) {
        const { path, name, ext } = thread.mainImage;
        imageUrl = `https://static.dealabs.com/${path}/${name}.${ext}`;
      }

      const title = thread.title;
      const legoIdMatch = title.match(/\d{4,6}/); // ID LEGO = 4 à 6 chiffres
      const legoId = legoIdMatch ? legoIdMatch[0] : null;

      return {
        title: title,
        legoId: legoId, 
        price: price,
        originalPrice: originalPrice,
        discount: discount,
        post_date: new Date(thread.publishedAt * 1000).toLocaleString(),
        temperature: thread.temperature,
        nb_comments: thread.commentCount,
        link: thread.link,
        image: imageUrl
      };
    } catch (error) {
      console.error("Erreur de parsing JSON :", error);
      return null;
    }
  }).get().filter(deal => deal !== null && deal.legoId); // N'avoir que des set avec legoId dans le titre (éviter les jeux ps4/switch)
};


/**
 * Scrape a given URL
 * @param {String} url - URL to parse
 * @returns {Array|null} Deals
 */
module.exports.scrape = async url => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
    }
  });

  if (response.ok) {
    const body = await response.text();
    return parse(body);
  }

  console.error("Erreur de requête :", response.status);
  return null;
};