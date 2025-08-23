const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { executeDirectPayment, saveDirectPayment } = require('../Payments/MercadoPago/EstablishmentPayments');
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

const getUpdatedCartItems = async (shoppingCart, idEstablishment) => {
  const promises = shoppingCart.map(async (item) => {
    const produtoSnap = await db
      .collection("Establishment")
      .doc(idEstablishment)
      .collection("Menu")
      .doc(item.idMenu)
      .collection("items")
      .doc(item.idItem)
      .get()

    const data = produtoSnap.data()

    return {
      idItem: item.idItem,
      idMenu: item.idMenu,
      qty: item.qty,
      name: data?.name ?? "",
      price: data?.price ?? 0,
    }
  })

  const updatedItems = await Promise.all(promises)
  return updatedItems
}

const calculateCartTotal = (updatedCartItems) => {
  if (!Array.isArray(updatedCartItems)) return 0

  return updatedCartItems.reduce((sum, item) => {
    const price = item.price ?? 0
    const qty = item.qty ?? 1
    return sum + price * qty
  }, 0)
}


const saveDirectOrder = async (idEstablishment, shoppingCart, dataAddress, dataTicket, paymentId, orderNumber, totalOrder) => {
  console.log('salvando ordem')
  try {
    const dataOrder = {
      orderNumber,
      date: admin.firestore.FieldValue.serverTimestamp(),
      establishment: idEstablishment,
      items: shoppingCart,
      local:
        dataTicket.type === 3
          ? `${dataAddress?.address}, ${dataAddress?.number} ${dataAddress?.complement} - ${dataAddress?.neighborhood} - ${dataAddress.city}/${dataAddress.state}`
          : dataTicket?.local,
      status: 1,
      name: dataAddress?.name || "",
      phone: dataAddress?.phoneNumber || "",
      type: dataTicket?.type,
      obs: dataAddress?.obs || "",
      operator: dataTicket?.name || "",
      paymentId,
      totalOrder,
      paymentType: 'CRD',
      isOnlinePayment: true,
      userEmail: dataAddress?.email
    }

    console.log('dataorder', dataOrder)

    const orderId = await saveItemsOrder(idEstablishment, dataOrder)
    return {
      success: true,
      orderId
    }

  } catch (e) {
    return { success: false, error: e }
  }
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

      if (dataTicket?.type === 3 || dataTicket?.type === 5) {//Delivery ou autoatendimento
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


exports.getOrderStatus = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    const { idEstablishment, orderId } = req.body;

    if (!idEstablishment || !orderId) {
      return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
      const docRef = db.collection('Establishment').doc(idEstablishment).collection('Orders').doc(orderId);
      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        return res.status(404).json({ error: 'Invalid Order' });
      }

      const data = snapshot.data()

      if (data?.status === 0)
        return res.status(404).json({ error: 'Invalid Order' })
     
      return res.status(200).json({ status: data?.status, orderNumber: data?.orderNumber })

    } catch (e) {
      console.error('Erro ao buscar Order:', e);
      return res.status(500).json({ error: 'Internal Error' });
    }
  })
});



exports.sendSimplifiedOrder = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {
      const {
        idEstablishment,
        dataTicket,
        shoopingCart,
        dataAddress,
        clientIdUrl,
        cardToken
      } = req.body;

      if (!idEstablishment || !dataTicket || !shoopingCart || !clientIdUrl || !cardToken) {
        return res.status(400).json({ error: 'Incomplete data.' });
      }

      //Gerando Número do pedido
      const orderNumber = await generateOrderNumber(idEstablishment)

      //Atualizo os dados com o Firebase (preço, nome, etc), evitando manipulação dos dados
      const updatedDataCart = await getUpdatedCartItems(shoopingCart, idEstablishment)
      console.log('updatedDataCart:', updatedDataCart)

      //calculando total
      const totalOrder = calculateCartTotal(updatedDataCart)
      console.log('totalOrder:', totalOrder)
      if (totalOrder > 0) {
        //Criando pagamento
        const payment = await executeDirectPayment(
          idEstablishment,
          totalOrder,
          'test_user_942569659@testuser.com',
          'WMenu',
          cardToken
        )
        console.log('payment:', payment)
        if (payment.success) {

          const paymentData = {
            id: payment?.data?.id.toString(),
            establishmentId: idEstablishment || "",
            status: payment?.data?.status || "",
            status_detail: payment?.data?.status_detail || "",
            transaction_amount: payment?.data?.transaction_amount || "",
            description: payment?.data?.description || "",
            payment_method_id: payment?.data?.payment_method_id || "",
            date_approved: payment?.data?.date_approved || "",
            payer_email: payment?.data?.payer?.email || "",
            authorization_code: payment?.data?.authorization_code || "",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          }

          try {
            const [saveDirectPaymentResult, saveDirectOrderResult] = await Promise.all([
              saveDirectPayment(paymentData, idEstablishment),
              saveDirectOrder(idEstablishment, updatedDataCart, dataAddress, dataTicket, payment?.data?.id, orderNumber, totalOrder)
            ])


            if (saveDirectOrderResult.error) {
              return res.status(400).json({ error: 'Erro ao finalizar pedido.' })
            }

            if (saveDirectPaymentResult.error) {
              console.error('Erro ao salvar pagamento:', saveDirectPaymentResult.error)
              return res.status(400).json({ error: 'Erro ao salvar pagamento.' })
            }

            return res.status(200).json({ success: true, orderNumber: orderNumber, orderId: saveDirectOrderResult?.orderId })

          } catch (e) {
            console.error('Erro ao finalizar pedido:', e);
            return res.status(400).json({ error: 'Erro ao finalizar pedido.' })
          }

        } else {
          return res.status(400).json({ error: 'Não foi possível processar o pagamento.' })
        }
      } else {
        return res.status(400).json({ error: 'Dados inválidos.' })
      }


    } catch (e) {
      console.error('Erro na sendOrderSecure:', e)
      return res.status(500).json({ error: 'Erro interno no servidor.' })
    }
  })
})
