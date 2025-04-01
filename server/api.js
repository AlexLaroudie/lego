require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect } = require('./mongodb');
const { ObjectId } = require('mongodb');

const app = express(); // ✅ déclare app d'abord
    // ✅ puis utilise app

const PORT = 8092;




// Middleware JSON
app.use(cors());
app.use(express.json());

let db;

// Connexion MongoDB
(async () => {
  db = await connect();
})();

app.get('/', (req, res) => {
  res.send('🚀 API Lego - Bienvenue !');
});

/**
 * 🔍 Recherche de deals (mettre AVANT la route /:id)
 */
app.get('/deals/search', async (req, res) => {
  const { limit = 12, price, date, filterBy } = req.query;

  let query = {};

  if (date) {
    const afterDate = new Date(date);
    query.published = { $gte: afterDate.getTime() / 1000 };
  }

  let sort = {};
  if (filterBy === 'best-discount') sort = { discountValue: -1 };
  else if (filterBy === 'most-commented') sort = { commentsCount: -1 };
  else sort = { priceValue: 1 };

  try {
    const deals = await db.collection('deals').find(query).toArray();

    const cleanedDeals = deals.map(deal => {
      let priceValue = null;
      if (typeof deal.price === 'string') {
        priceValue = parseFloat(deal.price.replace('€', '').replace(',', '.').trim());
      }

      let discountValue = null;
      if (typeof deal.discount === 'string') {
        discountValue = parseInt(deal.discount.replace('%', '').replace('-', '').trim());
      }

      return {
        ...deal,
        priceValue,
        discountValue
      };
    });

    const filtered = cleanedDeals.filter(deal => {
      if (price && deal.priceValue !== null && deal.priceValue > parseFloat(price)) {
        return false;
      }
      return true;
    });

    const sorted = filtered.sort((a, b) => {
      const key = Object.keys(sort)[0];
      const aVal = a[key] ?? 0;
      const bVal = b[key] ?? 0;
      return sort[key] > 0 ? aVal - bVal : bVal - aVal;
    });

    const limited = sorted.slice(0, parseInt(limit));

    res.json({ limit: parseInt(limit), total: limited.length, results: limited });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * 🧱 Route pour obtenir un deal spécifique
 */
function isValidObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id;
}

app.get('/deals/:id', async (req, res, next) => {
  const id = req.params.id;

  if (!isValidObjectId(id)) return next();

  try {
    const deal = await db.collection('deals').findOne({ _id: new ObjectId(id) });

    if (!deal) {
      return res.status(404).json({ message: 'Deal not found' });
    }

    res.json(deal);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * 🔎 Route recherche ventes Vinted
 */
app.get('/sales/search', async (req, res) => {
  const { limit = 12, legoSetId } = req.query;

  let query = {};
  if (legoSetId) {
    query.title = new RegExp(legoSetId, 'i');
  }

  try {
    const sales = await db.collection('sales')
      .find(query)
      .sort({ published: -1 })
      .limit(parseInt(limit))
      .toArray();

    res.json({ limit: parseInt(limit), total: sales.length, results: sales });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
