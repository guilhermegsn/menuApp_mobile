const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require("cors")({ origin: true });

const db = admin.firestore();



const generateOrderNumber = async (idEstablishment) => {
  const counterRef = db.collection('Establishment').doc(idEstablishment).collection('Configs').doc('orderCounter');

  const newNumber = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);

    if (!counterDoc.exists) {
      transaction.set(counterRef, { lastNumber: 1 });
      return 1;
    }

    const data = counterDoc.data();
    const nextNumber = (data?.lastNumber || 0) + 1;
    transaction.update(counterRef, { lastNumber: nextNumber });
    return nextNumber;
  });

  return newNumber;
}

const getTicketNumber = async (idEstablishment, local) => {
  const ticketsRef = db.collection('Establishment').doc(idEstablishment).collection('Tickets');
  const snapshot = await ticketsRef
    .where('local', '==', local)
    .where('status', '==', 1)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    return snapshot.docs[0].id;
  }

  return null;
}

const saveItemsOrder = async (idEstablishment, dataOrder) => {
  const orderRef = await db.collection('Establishment').doc(idEstablishment).collection('Orders').add(dataOrder)
  return orderRef.id;
}

exports.sendOrderSecure = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const {
        idEstablishment,
        dataTicket,
        shoopingCart,
        dataAddress,
        clientIdUrl,
        totalOrder
      } = req.body;

      if (!idEstablishment || !dataTicket || !shoopingCart || !clientIdUrl || !totalOrder) {
        return res.status(400).json({ error: 'Incomplete data.' });
      }

      // Timestamp da abertura
      dataTicket.openingDate = admin.firestore.FieldValue.serverTimestamp()
      // Gera número do pedido
      const orderNumber = await generateOrderNumber(idEstablishment)
      // ID padrão (QRCode / NFC)
      let orderId = clientIdUrl.id

      // Comanda fixa (mesa)
      if (dataTicket?.type === 2) {
        const ticketId = await getTicketNumber(idEstablishment, dataTicket?.local);
        if (!ticketId) {
          const ticketRef = await db
            .collection('Establishment')
            .doc(idEstablishment)
            .collection('Tickets')
            .add(dataTicket);
          orderId = ticketRef.id;
        } else {
          orderId = ticketId;
        }
      }

      // Delivery
      console.log('clientIdUrl.typeId', clientIdUrl.typeId)
      console.log('dataTicket?.type', dataTicket?.type)

      if (clientIdUrl.typeId === '3' || clientIdUrl.typeId === '5') {
        console.log('aq deu.. hehe')
      }

      if (dataTicket?.type === 3 || dataTicket?.type === 5) {
        console.log('entrei. dataTicket = 3 ou 5')
        // Prepara dados personalizados para o endereço
        let deliveryLocal = ""
        if (dataTicket?.type === 3)
          deliveryLocal = `${dataAddress?.address}, ${dataAddress?.number} - ${dataAddress?.neighborhood} - ${dataAddress?.complement} - ${dataAddress.city}/${dataAddress.state}`;
        else
          deliveryLocal = 'Autoatendimento'
        const deliveryName = dataAddress?.name;
        const deliveryPhone = dataAddress?.phoneNumber;

        if (dataTicket?.isOnlinePayment && dataTicket?.paymentId) {

          const paymentRef = db.collection("Establishment").doc(idEstablishment)
            .collection("Payments").doc(String(dataTicket?.paymentId))

          const paymentSnap = await paymentRef.get()

          if (!paymentSnap.exists) {
            return res.status(400).send("Payment not found.")
          }

          const paymentData = paymentSnap.data()

          if (paymentData?.status !== 'approved') {
            return res.status(400).send("Payment not approved.")
          }

          const maxDelayInSeconds = 120 //2min
          const now = admin.firestore.Timestamp.now();
          const limit = admin.firestore.Timestamp.fromMillis(now.toMillis() - maxDelayInSeconds * 1000);

          console.log('ordersValue', totalOrder, paymentData?.transaction_amount)

          //Valido se o as informações do pagamento correspondem e se o pagamento foi feito a menos de 2min
          if (paymentData?.transaction_amount !== totalOrder || paymentData?.createdAt.toMillis() < limit.toMillis()) {
            return res.status(400).send("Invalid payment.")
          }
        }

        // Atualiza dataTicket com dados do cliente
        const copyDataTicket = {
          ...dataTicket,
          status: dataTicket?.isOnlinePayment && dataTicket?.paymentId ? 0 : 1, //Pagamento online fecha a comanda automaticamente.
          local: deliveryLocal,
          name: deliveryName,
          phone: deliveryPhone,
        };

        const ticketRef = await db
          .collection('Establishment')
          .doc(idEstablishment)
          .collection('Tickets')
          .add(copyDataTicket);
        orderId = ticketRef.id;
      } 

      // Monta pedido com dados atualizados
      const dataOrder = {
        orderNumber,
        date: admin.firestore.FieldValue.serverTimestamp(),
        establishment: idEstablishment,
        items: shoopingCart,
        local:
          dataTicket.type === 3
            ? `${dataAddress?.address}, ${dataAddress?.number} - ${dataAddress?.neighborhood} - ${dataAddress?.complement} - ${dataAddress.city}/${dataAddress.state}`
            : dataTicket?.local,
        order_id: orderId,
        status: 1,
        name: dataTicket.type === 3 || dataTicket.type === 5 ? dataAddress?.name : dataTicket?.name,
        phone: dataTicket.type === 3 || dataTicket.type === 5 ? dataAddress?.phoneNumber : "",
        type: dataTicket?.type,
        obs: dataAddress?.obs || "",
        operator: dataTicket?.name || "",
        paymentId: dataTicket?.paymentId || null,
        isOnlinePayment: dataTicket?.isOnlinePayment || false,
      };

      await saveItemsOrder(idEstablishment, dataOrder);

      return res.status(200).json({ success: true, orderNumber: orderNumber });
    } catch (e) {
      console.error('Erro na sendOrderSecure:', e);
      return res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  });
});


exports.getTicketData = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const { idEstablishment, ticketId } = req.body;

    if (!idEstablishment || !ticketId) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
      const docRef = db.collection('Establishment').doc(idEstablishment).collection('Tickets').doc(ticketId);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return res.status(404).json({ error: 'Ticket não encontrado' });
      }

      return res.status(200).json({ ticket: snapshot.data() });
    } catch (e) {
      console.error('Erro ao buscar ticket:', e);
      return res.status(500).json({ error: 'Erro interno' });
    }
  })
});
