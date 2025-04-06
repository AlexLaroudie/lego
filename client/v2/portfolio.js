'use strict';

// ===================== URL DE TON API =====================
const API_BASE = 'https://lego-sandy.vercel.app';

// ===================== VARIABLES GLOBALES =====================
let currentDeals = [];
let currentPagination = {};
// On gère un tableau local pour les favoris
let favorites = [];

// ===================== SELECTEURS =====================
const selectShow = document.querySelector('#selection-affichage');
const selectPage = document.querySelector('#selection-page');
const selectLegoSetIds = document.querySelector('#selection-id-lego');
const sectionDeals = document.querySelector('#annonces');
const sectionSales = document.querySelector('#ventes-vinted');

// Indicateurs
const spanNbDeals = document.querySelector('#nbAnnonces');
const spanNbSales = document.querySelector('#nbVentes');
const spanP5 = document.querySelector('#prixP5');
const spanP25 = document.querySelector('#prixP25');
const spanP50 = document.querySelector('#prixP50');
const spanLifetime = document.querySelector('#dureeVie');

// Boutons tri
const btnBestDiscount = document.querySelector('#meilleure-promo');
const btnMostCommented = document.querySelector('#plus-commente');
const btnHotDeals = document.querySelector('#plus-hot');
const selectPrice = document.querySelector('#tri-selection');

// Bouton “Meilleures affaires”
const btnBestDeals = document.querySelector('#best-deals-button');

// Bouton “Voir les favoris”
const btnShowFavorites = document.querySelector('#bouton-favoris');

// ===================== UTILS =====================

function setCurrentDeals({ result, meta }) {
  currentDeals = Array.isArray(result) ? result : [];
  currentPagination = meta ?? { count: 0, currentPage: 1, pageCount: 1 };
}

/**
 * Petit parse "published_time" -> Date
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
 * Petit calcul local d'un "score" hypothétique
 * plus c'est élevé, mieux c'est
 */
function computeDealScore(deal) {
  let score = 0;

  // par exemple, un deal plus discounté a un meilleur score
  if (deal.discount >= 20) score += 2;
  else if (deal.discount >= 10) score += 1;

  // si le prix est < 30€, +1
  if (deal.price && deal.price < 30) score += 1;

  // plus il y a de commentaires, plus c'est hot
  if (deal.nb_comments && deal.nb_comments > 2) score += 1;

  // on peut inventer d'autres règles...
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
      meta: {
        count: 0,
        currentPage: 1,
        pageCount: 1
      }
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

    spanNbSales.textContent = data.count ?? 0;
    spanP5.textContent = data.p5?.toFixed(2) ?? '0';
    spanP25.textContent = data.p25?.toFixed(2) ?? '0';
    spanP50.textContent = data.p50?.toFixed(2) ?? '0';
    spanLifetime.textContent = `${Math.floor(data.lifetimeDays || 0)} jours`;
  } catch (err) {
    console.error('Erreur fetchIndicators:', err);
  }
}

// ===================== RENDER =====================

function renderDeals(deals) {
  const dealContainer = document.createElement('div');
  dealContainer.classList.add('deal-container');

  // On va d'abord calculer le score de chaque deal si on veut potentiellement marquer
  // un "best-deal"
  const scoredDeals = deals.map(d => {
    return {
      ...d,
      myScore: computeDealScore(d) // on stocke un champ "myScore"
    };
  });

  const template = scoredDeals
    .map(deal => {
      const isFav = favorites.includes(deal.legoId);
      // si on a besoin d'indiquer "best-deal", on le fera plus tard
      // On va injecter data-score pour debug
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
          <button class="favorite-btn" data-id="${deal.legoId}">
            ${isFav ? '✓ Favori' : 'Ajouter en favori'}
          </button>
        </div>
      `;
    })
    .join('');

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

function renderIndicators(pagination) {
  spanNbDeals.textContent = pagination.count ?? 0;
}

function renderLegoSetIds(deals) {
  // getIdsFromDeals est défini dans utils.js
  const ids = getIdsFromDeals(deals);
  const opts = ['<option disabled selected value="">Choisir un ID</option>']
    .concat(ids.map(id => `<option value="${id}">${id}</option>`))
    .join('');

  selectLegoSetIds.innerHTML = opts;
}

function renderSales(sales, legoSetId) {
  sectionSales.innerHTML = `<h2>Ventes Vinted pour ID: ${legoSetId}</h2>`;

  if (!Array.isArray(sales) || !sales.length) {
    spanNbSales.textContent = '0';
    sectionSales.innerHTML += '<p>Aucune vente trouvée</p>';
    return;
  }

  // tri par date
  sales.sort((a, b) => (a.published || 0) - (b.published || 0));
  const salesHTML = sales
    .map(s => `
      <div class="sale">
        <strong>${s.title}</strong>
        <span>Prix: €${s.price}</span>
        <span>Date: ${
          s.published ? new Date(s.published).toLocaleDateString() : ''
        }</span>
        <a href="${s.link || '#'}" target="_blank">Voir l'annonce</a>
      </div>
    `)
    .join('');

  sectionSales.innerHTML += salesHTML;
  fetchIndicators(legoSetId);
}

function render(deals, pagination) {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals);
}

// ===================== LOGIQUE "MEILLEURES AFFAIRES" =====================
function highlightBestDeals(n = 5) {
  // On cherche la .deal-container
  const container = document.querySelector('.deal-container');
  if (!container) return;

  // On récupère toutes les .deal-card
  const cards = Array.from(container.querySelectorAll('.deal-card'));
  // On trie par data-score
  cards.sort((a, b) => {
    const scoreA = parseInt(a.getAttribute('data-score') || '0', 10);
    const scoreB = parseInt(b.getAttribute('data-score') || '0', 10);
    return scoreB - scoreA; // tri descendant
  });

  // on met .best-deal sur les n premières
  cards.forEach((card, index) => {
    card.classList.remove('best-deal');
    if (index < n) {
      card.classList.add('best-deal');
    }
  });
}

// ===================== ÉVÈNEMENTS =====================

// 1) Au chargement
document.addEventListener('DOMContentLoaded', async () => {
  const dealsData = await fetchDeals(1, 6, '');
  setCurrentDeals(dealsData);
  render(currentDeals, currentPagination);
});

// 2) Sélection “Afficher : 6/12/24”
selectShow.addEventListener('change', async (evt) => {
  const size = parseInt(evt.target.value, 10) || 6;
  const page = currentPagination.currentPage || 1;
  const dealsData = await fetchDeals(page, size, '');
  setCurrentDeals(dealsData);
  render(currentDeals, currentPagination);
});

// 3) Pagination
selectPage.addEventListener('change', async (evt) => {
  const goToPage = parseInt(evt.target.value, 10) || 1;
  const size = parseInt(selectShow.value, 10) || 6;
  const dealsData = await fetchDeals(goToPage, size, '');
  setCurrentDeals(dealsData);
  render(currentDeals, currentPagination);
});

// 4) Tri par prix / date
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
  render(currentDeals, currentPagination);
});

// 5) Bouton “Par remise”
btnBestDiscount.addEventListener('click', async () => {
  const page = currentPagination.currentPage || 1;
  const size = parseInt(selectShow.value, 10) || 6;
  const dealsData = await fetchDeals(page, size, 'best-discount');
  setCurrentDeals(dealsData);
  render(currentDeals, currentPagination);
});

// 6) Bouton “Par commentaires”
btnMostCommented.addEventListener('click', async () => {
  const page = currentPagination.currentPage || 1;
  const size = parseInt(selectShow.value, 10) || 6;
  const dealsData = await fetchDeals(page, size, 'most-commented');
  setCurrentDeals(dealsData);
  render(currentDeals, currentPagination);
});

// 7) Bouton “Par popularité”
btnHotDeals.addEventListener('click', async () => {
  const page = currentPagination.currentPage || 1;
  const size = parseInt(selectShow.value, 10) || 6;
  const dealsData = await fetchDeals(page, size, 'hot-deals');
  setCurrentDeals(dealsData);
  render(currentDeals, currentPagination);
});

// 8) Bouton “Meilleures affaires”
btnBestDeals.addEventListener('click', () => {
  // on ne refetch pas, on réutilise currentDeals
  // on met la classe .best-deal sur les 5 (ou n=5) premiers deals
  highlightBestDeals(5);
});

// 9) Click sur une deal-card -> on affiche les ventes
document.addEventListener('click', async (evt) => {
  const card = evt.target.closest('.deal-card');
  if (!card) return;

  // On enlève l’ancienne sélection
  document
    .querySelectorAll('.deal-card')
    .forEach(c => c.classList.remove('selected-card'));

  card.classList.add('selected-card');
  const legoId = card.getAttribute('data-id');

  // On fetch les ventes
  const sales = await fetchSales(legoId);
  renderSales(sales, legoId);
});

// 10) Sélection d'un ID lego => on fetch les ventes
selectLegoSetIds.addEventListener('change', async () => {
  const legoId = selectLegoSetIds.value;
  if (!legoId) return;

  const sales = await fetchSales(legoId);
  renderSales(sales, legoId);
});

// 11) Bouton “Voir les favoris”
btnShowFavorites.addEventListener('click', () => {
  // on filtre les deals dont legoId est dans favorites
  const favDeals = currentDeals.filter(d => favorites.includes(d.legoId));
  render(favDeals, {
    count: favDeals.length,
    currentPage: 1,
    pageCount: 1
  });
});

// ===================== GÉRER LE CLIC SUR “Ajouter en favori” =====================

document.addEventListener('click', (evt) => {
  const favBtn = evt.target.closest('.favorite-btn');
  if (!favBtn) return;

  const legoId = favBtn.getAttribute('data-id');
  // Si déjà en favoris => on retire
  if (favorites.includes(legoId)) {
    favorites = favorites.filter(id => id !== legoId);
  } else {
    favorites.push(legoId);
  }

  // On redessine la liste courante pour mettre à jour l’état du bouton
  render(currentDeals, currentPagination);
});
