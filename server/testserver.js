require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect } = require('./mongodb'); // ton module

const app = express();
app.use(cors());

let db;

(async () => {
  db = await connect();
})();

// Ex. route /deals
app.get('/deals', async (req, res) => {
  try {
    const deals = await db.collection('deals').find().toArray();
    res.json({ results: deals });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Ex. route /sales
app.get('/sales', async (req, res) => {
  try {
    const sales = await db.collection('sales').find().toArray();
    res.json({ results: sales });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// On écoute sur un port local (3000)
app.listen(3000, () => {
  console.log('Serveur lancé sur http://localhost:3000');
});
