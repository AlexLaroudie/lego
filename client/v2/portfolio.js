'use strict';

// ======= URL DE TON API SUR VERCEL =======
const API_BASE = 'https://lego-sandy.vercel.app'; 
// <-- Utilise l'URL où tu obtiens {ack:true} quand tu tapes sur "/"

// ========== VARIABLES GLOBALES ==========
let currentDeals = [];
let currentPagination = {};
let favorites = [];

// ========== SELECTEURS ==========
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals = document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');
const selectPrice = document.querySelector('#sort-select');

// ========== UTILS ==========
const getIdsFromDeals = (deals) => {
  return Array.from(new Set(deals.map(deal => deal.legoId))).filter(Boolean);
};

const setCurrentDeals = ({ result, meta }) => {
  currentDeals = result;
  currentPagination = meta;
};

// ========== FETCH ==========
const fetchDeals = async (page = 1, size = 6, filterBy = '') => {
  try {
    // On appelle ton API déployée sur lego-sandy.vercel.app
    const response = await fetch(`${API_BASE}/deals/search?limit=${size}&page=${page}&filterBy=${filterBy}`);
    const body = await response.json();

    return {
      result: body.results,
      meta: {
        count: body.total,
        currentPage: page,
        pageCount: Math.ceil(body.total / size)
      }
    };
  } catch (error) {
    console.error(error);
    return { result: [], meta: {} };
  }
};

const fetchSales = async (legoSetId, limit = 50) => {
  try {
    // On appelle /sales/search sur ton API
    const response = await fetch(`${API_BASE}/sales/search?legoSetId=${legoSetId}&limit=${limit}`);
    const body = await response.json();

    return body.results.map(sale => ({
      title: sale.title,
      price: parseFloat(sale.price?.amount || 0),
      published: parsePublishedTime(sale.published_time),
      link: sale.url
    }));
  } catch (error) {
    console.error('Error fetching sales:', error);
    return [];
  }
};

const fetchIndicators = async (legoSetId) => {
  try {
    // On appelle /sales/indicators sur ton API
    const response = await fetch(`${API_BASE}/sales/indicators?legoSetId=${legoSetId}`);
    const data = await response.json();

    document.querySelector('#nbSales').textContent = data.count || 0;
    document.querySelector('#p5Price').textContent = data.p5?.toFixed(2) || '0';
    document.querySelector('#p25Price').textContent = data.p25?.toFixed(2) || '0';
    document.querySelector('#p50Price').textContent = data.p50?.toFixed(2) || '0';
    document.querySelector('#lifetimeValue').textContent = `${Math.floor(data.lifetimeDays || 0)} days`;
  } catch (err) {
    console.error('Erreur fetchIndicators:', err);
  }
};

const parsePublishedTime = (str) => {
  if (!str || typeof str !== 'string') return null;

  const [datePart, timePart] = str.split(' ');
  const [day, month, year] = datePart.split('/');
  const isoString = `${year}-${month}-${day}T${timePart}`;
  const date = new Date(isoString);

  return isNaN(date.getTime()) ? null : date;
};

// ========== RENDER ==========
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  div.classList.add('deal-container');

  const template = deals.map(deal => {
    const isFavorite = favorites.includes(deal.legoId);
    return `
      <div class="deal-card" data-id="${deal.legoId}">
        <img src="${deal.image}" alt="${deal.title}" />
        <h3>${deal.title}</h3>
        <p><strong>ID:</strong> ${deal.legoId}</p>
        <p><strong>Price:</strong> €${deal.price}</p>
        <p><strong>Discount:</strong> ${deal.discount}%</p>
        <p><strong>NbComments:</strong> ${deal.nb_comments}</p>
        <p><strong>Date:</strong> ${deal.post_date}</p>
        <a href="${deal.link}" target="_blank">View</a>
        <button class="favorite-btn" data-id="${deal.legoId}">${isFavorite ? '✓ Added' : 'Add to Favorites'}</button>
      </div>`;
  }).join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);
};

const renderPagination = pagination => {
  const { currentPage, pageCount } = pagination;
  const options = Array.from({ length: pageCount }, (_, index) => `<option value="${index + 1}">${index + 1}</option>`).join('');
  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = [`<option disabled selected value="">Select an id</option>`]
    .concat(ids.map(id => `<option value="${id}">${id}</option>`))
    .join('');
  selectLegoSetIds.innerHTML = options;
};

const renderIndicators = pagination => {
  spanNbDeals.textContent = pagination.count;
};

const renderSales = (sales, legoSetId) => {
  let salesContainer = document.querySelector('#vinted-sales-section');
  salesContainer.innerHTML = `<h2>Vinted Sales for Set ID: ${legoSetId}</h2>`;

  if (!sales.length) {
    document.querySelector('#nbSales').textContent = '0';
    salesContainer.innerHTML += '<p>No sales available</p>';
    return;
  }

  sales.sort((a, b) => new Date(a.published) - new Date(b.published));
  const salesHTML = sales.map(sale => `
    <div class="sale">
      <span><strong>${sale.title}</strong></span>
      <span>Price: <strong>€${sale.price}</strong></span>
      <span>Date: ${new Date(sale.published).toLocaleDateString()}</span>
      <a href="${sale.link}" target="_blank">View Sale</a>
    </div>
  `).join('');

  salesContainer.innerHTML += salesHTML;
  fetchIndicators(legoSetId);
};

const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals);
};

// ========== EVENTS ==========

// Filtre "Show: x"
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));
  setCurrentDeals(deals);
  render(currentDeals.result, currentDeals.meta);
});

// Pagination
selectPage.addEventListener('change', async (event) => {
  const goToPage = parseInt(event.target.value);
  const deals = await fetchDeals(goToPage, parseInt(selectShow.value));
  setCurrentDeals(deals);
  render(currentDeals.result, currentDeals.meta);
});

// Tri par prix ou date
selectPrice.addEventListener('change', async () => {
  const sortValue = selectPrice.value;
  const filterMap = {
    'price-asc': 'price-asc',
    'price-desc': 'price-desc',
    'date-asc': 'date-asc',
    'date-desc': 'date-desc'
  };
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(selectShow.value), filterMap[sortValue]);
  setCurrentDeals(deals);
  render(deals.result, deals.meta);
});

// Tri par "best discount"
document.querySelector('#best-discount').addEventListener('click', async () => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(selectShow.value), 'best-discount');
  setCurrentDeals(deals);
  render(deals.result, deals.meta);
});

// Tri par "most commented"
document.querySelector('#most-commented').addEventListener('click', async () => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(selectShow.value), 'most-commented');
  setCurrentDeals(deals);
  render(deals.result, deals.meta);
});

// Tri par "hot deals"
document.querySelector('#hot-deals').addEventListener('click', async () => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(selectShow.value), 'hot-deals');
  setCurrentDeals(deals);
  render(deals.result, deals.meta);
});

// Au chargement de la page
document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();
  setCurrentDeals(deals);
  render(deals.result, deals.meta);
});

// Quand on clique sur une "deal-card"
document.addEventListener('click', async (event) => {
  const card = event.target.closest('.deal-card');
  if (card) {
    const legoId = card.getAttribute('data-id');
    document.querySelectorAll('.deal-card').forEach(c => c.classList.remove('selected-card'));
    card.classList.add('selected-card');
    const sales = await fetchSales(legoId);
    renderSales(sales, legoId);
  }
});

// Quand on change l'id LEGO dans la liste
selectLegoSetIds.addEventListener('change', async () => {
  const selectedId = selectLegoSetIds.value;
  if (selectedId) {
    const sales = await fetchSales(selectedId);
    renderSales(sales, selectedId);
  }
});
