const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { MongoClient } = require('mongodb');

const PORT = 8092;

// Configuration MongoDB
const MONGODB_URI = 'mongodb+srv://satinetms:IloveWebDesign8@cluster0.108zm.mongodb.net/lego?retryWrites=true&writeConcern=majority';
const DB_NAME = 'lego';


const app = express();

// Middlewares
app.use(require('body-parser').json());
app.use(cors());
app.use(helmet());
app.options('*', cors());

let db; // On va y stocker l’accès à la base

//  Connexion à MongoDB
// Connexion à MongoDB
async function connectDB() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(" Connected to MongoDB");
}

// Fermer la connexion MongoDB
async function closeDB() {
  if (db) {
      await db.client.close();
      console.log("MongoDB connection closed.");
  }
}

// Route racine de test
app.get('/', (req, res) => {
  res.send({ ack: true });
});


// Récupérer deals spécifiques avec des conditions (limit, price, date, filterby...)
app.get('/deals/search', async (req, res) => {
  const {
    limit = 30,
    page = 1,
    price,
    date,
    filterBy
  } = req.query;

  const query = {};
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Filtrer par prix max
  if (price) {
    query.price = { $lte: parseFloat(price) };
  }

  // Filtrer par date
  if (date) {
    try {
      const userDate = new Date(date);
      const day = userDate.getDate().toString().padStart(2, '0');
      const month = (userDate.getMonth() + 1).toString().padStart(2, '0');
      const year = userDate.getFullYear();
      const regexDate = `${day}/${month}/${year}`;
      query.post_date = { $regex: `^${regexDate}` };
    } catch (err) {
      console.warn('Date invalide');
    }
  }

  // Définir les tris selon le paramètre `filterBy`
  let sort = {};
  switch (filterBy) {
    case 'best-discount':
      sort = { discount: -1 };
      break;
    case 'most-commented':
      sort = { nb_comments: -1 };
      break;
    case 'hot-deals':
      sort = { temperature: -1 };
      break;
    case 'price-asc':
      sort = { price: 1 };
      break;
    case 'price-desc':
      sort = { price: -1 };
      break;
    case 'date-asc':
      sort = { post_date: 1 };
      break;
    case 'date-desc':
      sort = { post_date: -1 };
      break;
    default:
      sort = {}; // Pas de tri explicite
  }

  try {
    const collection = db.collection('deals');
    const total = await collection.countDocuments(query);

    const results = await collection
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    res.json({
      limit: limitNum,
      total,
      page: pageNum,
      results
    });
  } catch (err) {
    console.error('Erreur deals/search :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


/*Exemple de commandes dans INSOMNIA
GET http://localhost:8092/deals/search?filterBy=most-commented&limit=5
GET http://localhost:8092/deals/search?filterBy=best-discount
GET http://localhost:8092/deals/search?price=30&date=2025-03-18
GET http://localhost:8092/deals/search?price=25
*/


app.get('/sales/search', async (req, res) => {
  const { limit = 700, legoSetId } = req.query; //limite 12 d'office mais on peut modifier quand on search
  const query = {}; // remplissage selon filtres demandés

  if (legoSetId) {
    query.lego_id = legoSetId; //recherche dans valeur lego_id de MongoDB
  }

  try {
    const results = await db.collection('sales')
      .find(query)
      .sort({ published_time: -1 }) // Tri décroissant par date
      .limit(parseInt(limit)) // limite nb résultats
      .toArray();

    res.json({ //envoi de la réponse json
      limit: parseInt(limit), //la limite
      total: results.length, //cb on en a trouvé
      results //liste des sales
    });
  } catch (err) {
    console.error('Erreur dans /sales/search :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour récupérer un deal spécifique par ID
app.get('/deals/:id', async (req, res) => {
  const dealId = req.params.id;

  try {
    const deal = await db.collection('deals').findOne({ legoId: dealId });

    if (!deal) {
      return res.status(404).json({ error: 'Deal non trouvé' });
    }

    res.json(deal);
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

//Route pour les favoris
app.get('/favorites', async (req, res) => {
  try {
    const favorites = await db.collection('favorites').find({}).toArray();
    res.json({ favorites: favorites.map(f => f.legoId) });
  } catch (err) {
    res.status(500).json({ error: 'Erreur lors de la récupération des favoris' });
  }
});


//Route pour ajouter/retirer un favoris
app.post('/favorites/toggle', async (req, res) => {
  const { legoId } = req.body;

  if (!legoId) {
    return res.status(400).json({ error: 'legoId requis' });
  }

  try {
    const existing = await db.collection('favorites').findOne({ legoId });

    if (existing) {
      // Supprimer
      await db.collection('favorites').deleteOne({ legoId });
      return res.json({ message: 'Retiré des favoris' });
    } else {
      // Ajouter
      await db.collection('favorites').insertOne({ legoId });
      return res.json({ message: 'Ajouté aux favoris' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});


// Route pour les indicateurs statistiques des ventes
app.get('/sales/indicators', async (req, res) => {
  const { legoSetId } = req.query;

  if (!legoSetId) {
    return res.status(400).json({ error: 'legoSetId requis' });
  }

  try {
    const rawSales = await db.collection('sales')
      .find({
        lego_id: legoSetId,
        "price.amount": { $ne: null }
      })
      .toArray();

    if (!rawSales.length) {
      return res.json({
        count: 0,
        p5: 0,
        p25: 0,
        p50: 0,
        lifetimeDays: 0
      });
    }

    // Fonction pour parser les dates "DD/MM/YYYY HH:mm:ss"
    const parseFrDate = (str) => {
      if (!str || typeof str !== 'string') return null;
      const [datePart, timePart = '00:00:00'] = str.split(' ');
      const [day, month, year] = datePart.split('/');
      return new Date(`${year}-${month}-${day}T${timePart}`);
    };

    // Transforme les ventes en objets propres
    const sales = rawSales
      .map(s => ({
        price: parseFloat(s.price?.amount || 0),
        published: parseFrDate(s.published_time)
      }))
      .filter(s => !isNaN(s.price) && !isNaN(s.published?.getTime()))
      .sort((a, b) => a.published - b.published);

    const prices = sales.map(s => s.price);
    const count = prices.length;

    const getPercentile = (arr, percentile) => {
      const index = Math.floor(percentile * arr.length);
      return arr[index] || 0;
    };

    const firstDate = sales[0].published;
    const lastDate = sales[sales.length - 1].published;
    const lifetimeDays = Math.max(0, Math.floor((lastDate - firstDate) / (1000 * 60 * 60 * 24)));

    res.json({
      count,
      p5: getPercentile(prices, 0.05),
      p25: getPercentile(prices, 0.25),
      p50: getPercentile(prices, 0.5),
      lifetimeDays
    });

  } catch (err) {
    console.error('Erreur /sales/indicators :', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});



// Démarrer le serveur pour 8092
//app.listen(PORT, () => {
//  console.log(`📡 Serveur Express lancé sur http://localhost:${PORT}`);
//});

// Lancer le serveur et connecter à MongoDB
async function startServer() {
  try {
      await connectDB();

      app.listen(PORT, () => {
          console.log("Serveur en cours d'exécution sur le port ${PORT}");
      });

  } catch (error) {
      console.error('Erreur de connexion à MongoDB:', error);
      process.exit(1);
  }
}

// Exporter le handler pour Vercel
module.exports = async (req, res) => {
  if (!db) {
      await connectDB();
  }
  return app(req, res);
};

// Arrêt propre de la connexion MongoDB
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

startServer();