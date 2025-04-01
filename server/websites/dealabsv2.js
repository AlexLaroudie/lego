const fetch = require('node-fetch');
const cheerio = require('cheerio');

const parse = data => {
  const $ = cheerio.load(data);
  
  
    return $('div.prods a')
      .map((i, element) => {
        const price = parseFloat(
          $(element)
            .find('span.prodl-prix span')
            .text()
        );
  
        const discount = Math.abs(parseInt(
          $(element)
            .find('span.prodl-reduc')
            .text()
        ));
  
        return {
          discount,
          price,
          'title': $(element).attr('title'),
        };
      })
      .get();
  return /* tableau d’objets { title, price, discount, link } */;
};

module.exports.scrape = async url => {
  const response = await fetch(url);
  if (!response.ok) {
    console.error(response);
    return null;
  }
  const body = await response.text();
  return parse(body);
};
