'use strict';

// ===================== URL DE TON API =====================
const API_BASE = 'https://lego-sandy.vercel.app';

// ===================== VARIABLES GLOBALES =====================
let currentDeals = [];
let currentPagination = {};
let favorites = [];

// Booléen pour savoir si l'on affiche les favoris ou non
let isShowingFavorites = false;

// ===================== SELECTEURS =====================
const selectShow = document.querySelector('#selection-affichage');
const selectPage = document.querySelector('#selection-page');
const selectLegoSetIds = document.querySelector('#selection-id-lego');
const sectionDeals = document.querySelector('#annonces');
const sectionSales = document.querySelector('#ventes-vinted');

// Ces éléments étaient utilisés pour les indicateurs, mais ils ne sont plus affichés
const spanNbDeals = document.querySelector('#nbAnnonces');
const spanNbSales = document.querySelector('#nbVentes');
const spanP5 = document.querySelector('#prixP5');
const spanP25 = document.querySelector('#prixP25');
const spanP50 = document.querySelector('#prixP50');
const spanLifetime = document.querySelector('#dureeVie');

// ===================== BOUTONS TRI =====================
const btnBestDiscount = document.querySelector('#meilleure-promo');
const btnMostCommented = document.querySelector('#plus-commente');
const btnHotDeals = document.querySelector('#plus-hot');
const selectPrice = document.querySelector('#tri-selection');

// Bouton “Meilleures affaires”
const btnBestDeals = document.querySelector('#best-deals-button');

// Bouton “Voir les favoris” (toggle)
const btnShowFavorites = document.querySelector('#bouton-favoris');

// ===================== UTILS =====================

/**
 * Construit un identifiant unique pour un deal,
 * afin de distinguer deux deals qui ont le même legoId
 * mais un prix, un lien, etc. différents.
 */
function getDealUniqueId(deal) {
  const legoIdPart = deal.legoId ?? '';
  const linkPart = encodeURIComponent(deal.link ?? '');
  const pricePart = deal.price ?? '';
  const postDatePart = encodeURIComponent(deal.post_date ?? '');
  return `${legoIdPart}__${linkPart}__${pricePart}__${postDatePart}`;
}

function setCurrentDeals({ result, meta }) {
  currentDeals = Array.isArray(result) ? result : [];
  currentPagination = meta ?? { count: 0, currentPage: 1, pageCount: 1 };
}

/**
 * Parse une date au format "dd/mm/yyyy hh:mm:ss" en objet Date
 */
function parsePublishedTime(str) {
  if (!str || typeof str !== 'string') return null;
  const [datePart, timePart = '00:00:00'] = str.split(' ');
  const [day, month, year] = datePart.split('/');
  const isoString = `${year}-${month}-${day}T${timePart}`;
  const date = new Date(isoString);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Calcule un score hypothétique pour un deal
 */
function computeDealScore(deal) {
  let score = 0;
  if (deal.discount >= 20) score += 2;
  else if (deal.discount >= 10) score += 1;
  if (deal.price && deal.price < 30) score += 1;
  if (deal.nb_comments && deal.nb_comments > 2) score += 1;
  return score;
}

// ===================== FETCH =====================

async function fetchDeals(page = 1, size = 6, filterBy = '') {
  try {
    const url = `${API_BASE}/deals/search?limit=${size}&page=${page}&filterBy=${filterBy}`;
    const resp = await fetch(url);
    const body = await resp.json();
    const results = Array.isArray(body.results) ? body.results : [];
    const total = Number(body.total) || 0;
    return {
      result: results,
      meta: {
        count: total,
        currentPage: page,
        pageCount: Math.ceil(total / size) || 1
      }
    };
  } catch (err) {
    console.error('Erreur fetchDeals:', err);
    return {
      result: [],
      meta: { count: 0, currentPage: 1, pageCount: 1 }
    };
  }
}

async function fetchSales(legoSetId, limit = 50) {
  try {
    const url = `${API_BASE}/sales/search?legoSetId=${legoSetId}&limit=${limit}`;
    const resp = await fetch(url);
    const body = await resp.json();
    const results = Array.isArray(body.results) ? body.results : [];
    return results.map(sale => ({
      title: sale.title,
      price: parseFloat(sale.price?.amount || 0),
      published: parsePublishedTime(sale.published_time),
      link: sale.url
    }));
  } catch (err) {
    console.error('Erreur fetchSales:', err);
    return [];
  }
}

async function fetchIndicators(legoSetId) {
  try {
    const url = `${API_BASE}/sales/indicators?legoSetId=${legoSetId}`;
    const resp = await fetch(url);
    const data = await resp.json();
    // Mise à jour conditionnelle si les éléments existent (ils ne sont plus affichés)
    if (spanNbSales) spanNbSales.textContent = data.count ?? 0;
    if (spanP5) spanP5.textContent = data.p5?.toFixed(2) ?? '0';
    if (spanP25) spanP25.textContent = data.p25?.toFixed(2) ?? '0';
    if (spanP50) spanP50.textContent = data.p50?.toFixed(2) ?? '0';
    if (spanLifetime) spanLifetime.textContent = `${Math.floor(data.lifetimeDays || 0)} jours`;
  } catch (err) {
    console.error('Erreur fetchIndicators:', err);
  }
}

// ===================== RENDER =====================

function renderDeals(deals) {
  const dealContainer = document.createElement('div');
  dealContainer.classList.add('deal-container');
  const scoredDeals = deals.map(d => ({
    ...d,
    myScore: computeDealScore(d)
  }));
  const template = scoredDeals.map(deal => {
    const uniqueId = getDealUniqueId(deal);
    const isFav = favorites.includes(uniqueId);
    return `
      <div class="deal-card" data-id="${deal.legoId}" data-score="${deal.myScore}">
        <img src="${deal.image || ''}" alt="${deal.title}" />
        <h3>${deal.title}</h3>
        <p><strong>ID:</strong> ${deal.legoId}</p>
        <p><strong>Prix:</strong> €${deal.price ?? 0}</p>
        <p><strong>Remise:</strong> ${deal.discount ?? 0}%</p>
        <p><strong>Commentaires:</strong> ${deal.nb_comments ?? 0}</p>
        <p><strong>Date:</strong> ${deal.post_date ?? ''}</p>
        <a href="${deal.link || '#'}" target="_blank">Voir</a>
        <button class="favorite-btn" data-unique-id="${uniqueId}">
          ${isFav ? '✓ Favori' : 'Ajouter en favori'}
        </button>
      </div>
    `;
  }).join('');
  dealContainer.innerHTML = template;
  sectionDeals.innerHTML = '<h2>Liste des Deals</h2>';
  sectionDeals.appendChild(dealContainer);
}

function renderPagination(pagination) {
  const { currentPage, pageCount } = pagination;
  const options = Array.from({ length: pageCount }, (_, idx) =>
    `<option value="${idx + 1}">${idx + 1}</option>`
  ).join('');
  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
}

// Ne plus appeler renderIndicators puisque les indicateurs ne sont plus affichés
function renderLegoSetIds(deals) {
  // getIdsFromDeals doit être défini dans utils.js
  const ids = getIdsFromDeals(deals);
  const opts = ['<option disabled selected value="">Choisir un ID</option>']
    .concat(ids.map(id => `<option value="${id}">${id}</option>`))
    .join('');
  selectLegoSetIds.innerHTML = opts;
}

function renderSales(sales, legoSetId) {
  sectionSales.innerHTML = `<h2>Ventes Vinted pour ID: ${legoSetId}</h2>`;
  if (!Array.isArray(sales) || !sales.length) {
    if (spanNbSales) spanNbSales.textContent = '0';
    sectionSales.innerHTML += '<p>Aucune vente trouvée</p>';
    return;
  }
  sales.sort((a, b) => (a.published || 0) - (b.published || 0));
  const salesHTML = sales.map(s => `
    <div class="sale">
      <strong>${s.title}</strong>
      <span>Prix: €${s.price}</span>
      <span>Date: ${s.published ? new Date(s.published).toLocaleDateString() : ''}</span>
      <a href="${s.link || '#'}" target="_blank">Voir l'annonce</a>
    </div>
  `).join('');
  sectionSales.innerHTML += salesHTML;
  fetchIndicators(legoSetId);
}

function render(deals, pagination) {
  renderDeals(deals);
  renderPagination(pagination);
  // renderIndicators n'est plus appelé car la section des indicateurs est remplacée par le tutoriel.
  renderLegoSetIds(deals);
}

// ===================== LOGIQUE "MEILLEURES AFFAIRES" =====================
function highlightBestDeals(n = 5) {
  const container = document.querySelector('.deal-container');
  if (!container) return;
  const cards = Array.from(container.querySelectorAll('.deal-card'));
  cards.sort((a, b) => {
    const scoreA = parseInt(a.getAttribute('data-score') || '0', 10);
    const scoreB = parseInt(b.getAttribute('data-score') || '0', 10);
    return scoreB - scoreA;
  });
  cards.forEach((card, index) => {
    card.classList.remove('best-deal');
    if (index < n) {
      card.classList.add('best-deal');
    }
  });
}

// ===================== ÉVÈNEMENTS =====================

document.addEventListener('DOMContentLoaded', async () => {
  const dealsData = await fetchDeals(1, 6, '');
  setCurrentDeals(dealsData);
  render(currentDeals, currentPagination);
});

selectShow.addEventListener('change', async (evt) => {
  const size = parseInt(evt.target.value, 10) || 6;
  const page = currentPagination.currentPage || 1;
  const dealsData = await fetchDeals(page, size, '');
  setCurrentDeals(dealsData);
  isShowingFavorites = false;
  btnShowFavorites.textContent = 'Voir les favoris';
  render(currentDeals, currentPagination);
});

selectPage.addEventListener('change', async (evt) => {
  const goToPage = parseInt(evt.target.value, 10) || 1;
  const size = parseInt(selectShow.value, 10) || 6;
  const dealsData = await fetchDeals(goToPage, size, '');
  setCurrentDeals(dealsData);
  isShowingFavorites = false;
  btnShowFavorites.textContent = 'Voir les favoris';
  render(currentDeals, currentPagination);
});

selectPrice.addEventListener('change', async () => {
  const filterMap = {
    'price-asc': 'price-asc',
    'price-desc': 'price-desc',
    'date-asc': 'date-asc',
    'date-desc': 'date-desc'
  };
  const sortValue = filterMap[selectPrice.value] || '';
  const page = currentPagination.currentPage || 1;
  const size = parseInt(selectShow.value, 10) || 6;
  const dealsData = await fetchDeals(page, size, sortValue);
  setCurrentDeals(dealsData);
  isShowingFavorites = false;
  btnShowFavorites.textContent = 'Voir les favoris';
  render(currentDeals, currentPagination);
});

btnBestDiscount.addEventListener('click', async () => {
  const page = currentPagination.currentPage || 1;
  const size = parseInt(selectShow.value, 10) || 6;
  const dealsData = await fetchDeals(page, size, 'best-discount');
  setCurrentDeals(dealsData);
  isShowingFavorites = false;
  btnShowFavorites.textContent = 'Voir les favoris';
  render(currentDeals, currentPagination);
});

btnMostCommented.addEventListener('click', async () => {
  const page = currentPagination.currentPage || 1;
  const size = parseInt(selectShow.value, 10) || 6;
  const dealsData = await fetchDeals(page, size, 'most-commented');
  setCurrentDeals(dealsData);
  isShowingFavorites = false;
  btnShowFavorites.textContent = 'Voir les favoris';
  render(currentDeals, currentPagination);
});

btnHotDeals.addEventListener('click', async () => {
  const page = currentPagination.currentPage || 1;
  const size = parseInt(selectShow.value, 10) || 6;
  const dealsData = await fetchDeals(page, size, 'hot-deals');
  setCurrentDeals(dealsData);
  isShowingFavorites = false;
  btnShowFavorites.textContent = 'Voir les favoris';
  render(currentDeals, currentPagination);
});

btnBestDeals.addEventListener('click', async () => {
  try {
    const allDealsData = await fetchDeals(1, 9999, '');
    setCurrentDeals(allDealsData);
    isShowingFavorites = false;
    btnShowFavorites.textContent = 'Voir les favoris';
    render(currentDeals, currentPagination);
    highlightBestDeals(5);
  } catch (err) {
    console.error('Erreur bestDeals:', err);
  }
});

document.addEventListener('click', async (evt) => {
  const card = evt.target.closest('.deal-card');
  if (!card) return;
  document.querySelectorAll('.deal-card').forEach(c => c.classList.remove('selected-card'));
  card.classList.add('selected-card');
  const legoId = card.getAttribute('data-id');
  const sales = await fetchSales(legoId);
  renderSales(sales, legoId);
});

selectLegoSetIds.addEventListener('change', async () => {
  const legoId = selectLegoSetIds.value;
  if (!legoId) return;
  const sales = await fetchSales(legoId);
  renderSales(sales, legoId);
});

btnShowFavorites.addEventListener('click', () => {
  if (!isShowingFavorites) {
    const favDeals = currentDeals.filter(d =>
      favorites.includes(getDealUniqueId(d))
    );
    render(favDeals, { count: favDeals.length, currentPage: 1, pageCount: 1 });
    btnShowFavorites.textContent = 'Voir tout';
    isShowingFavorites = true;
  } else {
    render(currentDeals, currentPagination);
    btnShowFavorites.textContent = 'Voir les favoris';
    isShowingFavorites = false;
  }
});

document.addEventListener('click', (evt) => {
  const favBtn = evt.target.closest('.favorite-btn');
  if (!favBtn) return;
  const uniqueId = favBtn.getAttribute('data-unique-id');
  if (!uniqueId) return;
  if (favorites.includes(uniqueId)) {
    favorites = favorites.filter(id => id !== uniqueId);
  } else {
    favorites.push(uniqueId);
  }
  if (isShowingFavorites) {
    const favDeals = currentDeals.filter(d => favorites.includes(getDealUniqueId(d)));
    render(favDeals, { count: favDeals.length, currentPage: 1, pageCount: 1 });
  } else {
    render(currentDeals, currentPagination);
  }
});
