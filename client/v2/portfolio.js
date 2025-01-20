// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/

// current deals on the page
let currentDeals = [];
let currentPagination = {};

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals= document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {currentDeals, currentPagination};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {currentDeals, currentPagination};
  }
};

/**
 * Render list of deals
 * @param  {Array} deals
 */
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = deals
    .map(deal => {
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}">${deal.title}</a>
        <span>${deal.price}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const {currentPage, pageCount} = pagination;
  const options = Array.from(
    {'length': pageCount},
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id => 
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};
selectLegoSetIds.addEventListener('change', async () => {
  const legoSetId = selectLegoSetIds.value;
  if (!legoSetId) return; // no id, no fetch

  const sales = await fetchSales(legoSetId);

  // Now do something with the sales: store them or display them
  renderSalesIndicators(sales);
});


/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const {count} = pagination;

  spanNbDeals.innerHTML = count;
};

const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals)
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});


// FEATURE 1
selectPage.addEventListener('change', async (event) => {
  
  const page = parseInt(event.target.value);
  const size = parseInt(selectShow.value);
  const deals = await fetchDeals(page, size);
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});



//FEATURE 2 
const selectSort = document.querySelector('#sort-select');

selectSort.addEventListener('change', () => {
  let sortedDeals = [...currentDeals];

  switch (selectSort.value) {
    case 'price-asc':
      sortedDeals.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      sortedDeals.sort((a, b) => b.price - a.price);
      break;
    case 'date-asc':
      sortedDeals.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case 'date-desc':
      sortedDeals.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    default:
      break;
  }
  render(sortedDeals, currentPagination);
});

//FEATURE 3
const bestDiscountCheckbox = document.querySelector('#best-discount-checkbox');
const mostCommentedCheckbox = document.querySelector('#most-commented-checkbox');
const hotDealsCheckbox = document.querySelector('#hot-deals-checkbox');
function applyFilters(deals) {
  let filtered = [...deals];

  // 1) Filter by best discount (assume we have deal.retail)
  if (bestDiscountCheckbox.checked) {
    filtered = filtered.filter(deal => {
      if (!deal.retail) return false; 
      const discountRate = 1 - (deal.price / deal.retail);
      return discountRate > 0.5;
    });
  }

  // 2) Filter by most commented (assume we have deal.commentsCount)
  if (mostCommentedCheckbox.checked) {
    filtered = filtered.filter(deal => deal.commentsCount > 15);
  }

  // 3) Filter by hot deals (assume we have deal.temperature)
  if (hotDealsCheckbox.checked) {
    filtered = filtered.filter(deal => deal.temperature > 100);
  }

  return filtered;
}
[bestDiscountCheckbox, mostCommentedCheckbox, hotDealsCheckbox].forEach(checkbox => {
  checkbox.addEventListener('change', () => {

    let filteredDeals = applyFilters(currentDeals);

    render(filteredDeals, currentPagination);
  });
});

// FEATURE 4
/**
 * Fetch sales for a given set id
 */
const fetchSales = async (legoSetId) => {
  try {
    const response = await fetch(`https://lego-api-blue.vercel.app/sales?id=${legoSetId}`);
    const body = await response.json();
    if (body.success !== true) {
      console.error(body);
      return [];
    }
    return body.data;  // array of sales
  } catch (error) {
    console.error(error);
    return [];
  }
};



// references to your spans:
const spanNbSales = document.querySelector('#nbSales');
// For p5, p25, p50, you can either add IDs in HTML or use the nth-child approach:
const spanP5 = document.querySelector('#indicators div:nth-child(3) span:last-child'); 
const spanP25 = document.querySelector('#indicators div:nth-child(4) span:last-child');
const spanP50 = document.querySelector('#indicators div:nth-child(5) span:last-child');
const spanLifetime = document.querySelector('#indicators div:nth-child(6) span:last-child');

function renderSalesIndicators(sales) {
  spanNbSales.innerHTML = sales.length;

  // compute stats
  const stats = computeSalesStats(sales);
  spanP5.innerHTML = stats.p5.toFixed(2);
  spanP25.innerHTML = stats.p25.toFixed(2);
  spanP50.innerHTML = stats.p50.toFixed(2);
  spanLifetime.innerHTML = `${stats.lifetime} days`;
}

// define computeSalesStats
function computeSalesStats(sales) {
  if (!sales.length) {
    return { p5: 0, p25: 0, p50: 0, lifetime: 0 };
  }

  // sort by price
  const prices = [...sales].map(s => s.price).sort((a,b) => a-b);
  const n = prices.length;

  const percentile = (arr, p) => {
    const idx = Math.floor((p/100)*arr.length);
    return arr[idx] || arr[arr.length-1];
  };

  const p5 = percentile(prices, 5);
  const p25 = percentile(prices, 25);
  const p50 = percentile(prices, 50);

  // lifetime: difference between earliest & latest sale date
  const sortedByDate = [...sales].sort((a,b) => new Date(a.date) - new Date(b.date));
  const earliest = new Date(sortedByDate[0].date);
  const latest = new Date(sortedByDate[sortedByDate.length - 1].date);
  const lifetimeDays = Math.round((latest - earliest)/(1000*3600*24));

  return {
    p5,
    p25,
    p50,
    lifetime: lifetimeDays
  };
}


document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});
