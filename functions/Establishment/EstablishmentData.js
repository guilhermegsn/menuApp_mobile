const functions = require('firebase-functions');
const admin = require('firebase-admin');

const cors = require("cors")({ origin: true });

const db = admin.firestore();


exports.getMenuData = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {

    const { idEstablishment } = req.body;

    if (!idEstablishment) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
      const collectionRef = db
        .collection('Establishment')
        .doc(idEstablishment)
        .collection("Menu");

      const snapshot = await collectionRef.get();

      if (snapshot.empty) {
        return res.status(404).json({ error: 'Menu not found' });
      }

      const menu = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return res.status(200).json({ menu });
    } catch (e) {
      console.error('Erro ao buscar menu:', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  })

});



exports.getMenuItems = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const { idEstablishment, menuId } = req.body;

      if (!idEstablishment || !menuId) {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

      const itemsRef = db
        .collection('Establishment')
        .doc(idEstablishment)
        .collection('Menu')
        .doc(menuId)
        .collection('items');

      const snapshot = await itemsRef.get();

      if (snapshot.empty) {
        return res.status(404).json({ error: 'No items found' });
      }

      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json({ items });
    } catch (error) {
      console.error('Error fetching information', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  })
});