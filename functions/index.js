const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

const ACCESS_TOKEN = functions.config().mercadopago.access_token;

exports.sendNewOrderNotification = functions.firestore
  .document('OrderItems/{orderId}')
  .onCreate(async (snapshot, context) => {
    const orderData = snapshot.data();

    if (!orderData) {
      console.error('Dados do pedido não encontrados.');
      return null;
    }

    const establishmentId = orderData.establishment;

    if (!establishmentId) {
      console.error('ID do estabelecimento não encontrado no pedido.');
      return null;
    }

    try {
      // Consulta a coleção 'User' buscando usuários associados ao estabelecimento correto
      const usersSnapshot = await admin.firestore()
        .collection('User')
        .where('association.establishmentId', '==', establishmentId)
        .get();

      if (usersSnapshot.empty) {
        console.error(`Nenhum usuário encontrado para o estabelecimento ID ${establishmentId}.`);
        return null;
      }

      // Para cada usuário encontrado, envia uma notificação
      const notifications = [];
      usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();

        if (userData?.association?.receiveNotifications && userData?.association?.enabled) {
          const token = userData?.token;
          if (token) {
            console.log('Enviando notificação para:', token);

            // Configuração da mensagem de notificação
            const message = {
              token: token,
              notification: {
                title: 'Novo pedido!',
                body: `${orderData?.items.map(item => (`${item?.qty} ${item?.name}\n`))}\n${orderData?.name}\n${orderData?.local !== orderData?.name ? orderData?.local : ""}`.replaceAll(",", "")
              },
            };

            // Adiciona o envio da notificação à lista de promessas
            notifications.push(admin.messaging().send(message));
          } else {
            console.error(`Token não encontrado para o usuário ${userDoc.id}.`);
          }
        }
      });

      // Aguarda todas as notificações serem enviadas
      const responses = await Promise.all(notifications);
      console.log('Notificações enviadas com sucesso:', responses);

      return responses;

    } catch (error) {
      console.error('Erro ao processar as notificações:', error);
      return null;
    }
  });


exports.setCustomClaims = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;

  try {
    // Buscar o usuário no Firestore para pegar o idEstablishment e role
    const userDoc = await admin.firestore().collection("User").doc(uid).get();

    if (!userDoc.exists) {
      console.log("Usuário não encontrado no Firestore.");
      return;
    }

    const userData = userDoc.data();
    const establishmentId = userData.association?.establishmentId || null;
    const role = userData.association?.role || "USER"; // Padrão "USER"

    // Definir as custom claims no token do usuário
    await admin.auth().setCustomUserClaims(uid, {
      establishmentId: establishmentId,
      role: role,
    });

    console.log(`Custom claims definidas para ${uid}:`, { establishmentId, role });

  } catch (error) {
    console.error("Erro ao definir custom claims:", error);
  }
});


exports.updateUserClaimsOnEstablishmentCreate = functions.firestore
  .document("Establishment/{establishmentId}")
  .onCreate(async (snap, context) => {
    const establishmentData = snap.data();
    const establishmentId = context.params.establishmentId
    const userId = establishmentData.owner

    if (!userId) {
      console.error("Nenhum userId encontrado no estabelecimento.")
      return;
    }

    try {
      // Busca o usuário no Firebase Authentication
      const user = await admin.auth().getUser(userId);
      if (!user) {
        console.error("Usuário não encontrado no Firebase Auth.")
        return;
      }

      // Define as novas claims no token do usuário
      await admin.auth().setCustomUserClaims(userId, {
        role: "ADM", // O usuário que cria o estabelecimento será um ADM por padrão
        establishmentId: establishmentId,
      });

      //await admin.auth().revokeRefreshTokens(uid);

      console.log(`Claims atualizadas para ${userId}: { role: 'ADM', establishmentId: '${establishmentId}' }`);
    } catch (error) {
      console.error("Erro ao atualizar claims:", error);
    }
  });

exports.updateUserClaims = functions.https.onCall(async (data, context) => {
  console.log("Iniciando updateUserClaims...");
  const { uid, newRole, newEstablishment } = data;
  console.log("Recebido:", uid, newRole, newEstablishment);

  if (!context.auth || context.auth.token.role !== "ADM") {
    console.log("Erro: Usuário sem permissão.");
    throw new functions.https.HttpsError("permission-denied", "Acesso negado");
  }

  try {
    console.log(`Atualizando claims para UID: ${uid}`);
    await admin.auth().setCustomUserClaims(uid, {
      role: newRole,
      establishmentId: newEstablishment,
    });

    const user = await admin.auth().getUser(uid);
    console.log(`Claims definidas para ${uid}:`, user.customClaims);

    console.log("Claims atualizadas com sucesso!");
    return { message: "Claims atualizadas com sucesso!" };
  } catch (error) {
    console.error("Erro ao atualizar claims:", error);
    throw new functions.https.HttpsError("internal", "Erro ao atualizar claims", error);
  }
})


exports.createSubscription = functions.https.onRequest(async (req, res) => {
  try {
    const { establishmentId, email, planId, cardToken } = req.body;
    console.log('Recebendo dados:', { establishmentId, email, planId, cardToken });

    if (!establishmentId || !email || !planId || !cardToken) {
      console.log('Parâmetros inválidos!');
      return res.status(400).send({ error: "Parâmetros inválidos." });
    }

    // Busca o plano no Firestore
    const planRef = db.collection('Plans').doc(planId);
    const planSnap = await planRef.get();
    if (!planSnap.exists) {
      console.log(`Plano com ID ${planId} não encontrado!`);
      return res.status(404).send({ error: "Plano não encontrado." });
    }

    const planData = planSnap.data();
    console.log('Plano encontrado:', planData);

    // Verifica se a assinatura já existe
    const subscriptionRef = db.collection('Subscriptions').doc(establishmentId);
    const subscriptionSnap = await subscriptionRef.get();
    const subscriptionData = subscriptionSnap.exists ? subscriptionSnap.data() : null;

    if (subscriptionData) {
      console.log('Atualizando assinatura existente...');
      const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionData.mercadoPagoSubscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          back_url: 'https://google.com',
          reason: `Atualização de assinatura - Plano ${planData.name}`,
          card_token_id: cardToken,
          auto_recurring: {
            transaction_amount: planData.price,
            currency_id: 'BRL',
          },
          status: 'authorized'
        }),
      })

      const result = await response.json()
      console.log('Resposta do Mercado Pago (update):', result)

      if (!result || !result.status) {
        console.error('Erro ao atualizar assinatura no Mercado Pago:', result)
        return res.status(500).send({ error: "Erro ao atualizar assinatura no Mercado Pago." })
      }

      if (result.status === 'authorized') {
        await subscriptionRef.update({
          status: 'active',
          planId: planId,
          nextBillingDate: result?.next_payment_date || null,
          lastAuthorizedPayment: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.status(200).send({message: "Assinatura atualizada com sucesso.", status: 'active'});
      } else {
        console.log('pagamento nao autorizado.')
        return res.status(400).send({message: 'Pagamento nâo autorizado.', status: result.status})
      }
    } else {
      console.log('Criando nova assinatura no Mercado Pago...');
      const response = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          payer_email: email,
          back_url: 'https://google.com',
          reason: `Assinatura do plano ${planData.name}`,
          card_token_id: cardToken,
          auto_recurring: {
            frequency: planData.frequency,
            frequency_type: planData.frequency_type,
            transaction_amount: planData.price,
            currency_id: 'BRL',
          },
          status: 'authorized'
        }),
      });

      const result = await response.json();
      console.log('Resposta do Mercado Pago (create):', result);

      if (!result || !result.id) {
        console.error('Erro ao criar pagamento no Mercado Pago:', result);
        return res.status(500).send({ error: "Erro ao criar assinatura no Mercado Pago.", details: result })
      }

      const mercadoPagoPlanId = result.id;

      await subscriptionRef.set({
        establishmentId,
        planId,
        mercadoPagoSubscriptionId: mercadoPagoPlanId,
        status: result.status === 'authorized' ? 'active' : 'pending',
        nextBillingDate: result?.next_payment_date || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        ...(result.status === 'authorized' && { lastAuthorizedPayment: admin.firestore.FieldValue.serverTimestamp() })
      })

      console.log('Nova assinatura criada com sucesso.')

      return res.status(200).send({
        message: "Assinatura criada com sucesso.",
        mercadoPagoSubscriptionId: mercadoPagoPlanId,
        status: result.status === 'authorized' ? 'active' : 'pending',
        nextBillingDate: result?.next_payment_date || null,
      });
    }

  } catch (error) {
    console.error('Erro na função createSubscription:', error)
    return res.status(500).send({ error: "Erro interno do servidor.", details: error.message })
  }
})


exports.unsubscribe = functions.https.onRequest(async (req, res) => {
  try {
    const { establishmentId } = req.body;
    const subscriptionRef = db.collection('Subscriptions').doc(establishmentId);
    const subscriptionSnap = await subscriptionRef.get();
    const subscriptionData = subscriptionSnap.exists ? subscriptionSnap.data() : null;

    try {
      const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionData.mercadoPagoSubscriptionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          reason: `Cancelamento de assinatura`,
          status: 'paused'
        }),
      });

      try {
        await subscriptionRef.update({
          status: 'paused',
          pausedDate: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch {
        console.log('erro ao atualizar os dados da assinatura no firebase.')
        return res.status(500).send('erro ao atualizar os dados da assinatura no firebase.');
      }

      const result = await response.json();
      console.log('Resposta do Mercado Pago (cancel):', result);
      return res.status(200).send("Assinatura cancelada.")
    } catch (e) {
      console.log('Erro ao cancelar assinatura')
      return res.status(500).send('Erro ao cancelar assinatura.');
    }

  } catch (e) {
    console.log('Erro ao ober os dados da assinatura.')
    return res.status(500).send('Erro ao obter os dados da assinatura.');
  }
})


exports.mercadoPagoWebhook = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Recebido webhook:', JSON.stringify(req.body, null, 2))

    const { type, data, action } = req.body

    if (type !== 'payment') {
      console.log("Evento ignorado:", type)
      return res.status(200).send("Evento ignorado")
    }

    const paymentId = data.id
    console.log('paymentId:', paymentId)

    //Buscar detalhes do pagamento na API do Mercado Pago
    const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    })

    const payment = await paymentResponse.json()

    // Registrar pagamento na coleção Payments
    await db.collection("Payments").add({
      paymentId: payment.id,
      amount: payment.transaction_amount,
      status: payment.status,
      date: admin.firestore.FieldValue.serverTimestamp(),
      method: payment.payment_method_id,
      payerEmail: payment.payer.email
    });


    const preapprovalId = payment.metadata.preapproval_id
    console.log('preapprovalId:', preapprovalId)

    // Buscar assinatura no Firestore usando o preapprovalId
    const subQuery = await db.collection("Subscriptions")
      .where("mercadoPagoSubscriptionId", "==", preapprovalId)
      .get()

    if (subQuery.empty) {
      console.log("Assinatura não encontrada:", preapprovalId)
      return res.status(404).send("Assinatura não encontrada")
    }

    const subscriptionRef = subQuery.docs[0].ref

    // Atualizar a assinatura no Firestore
    await subscriptionRef.update({
      status: payment.status === 'approved' ? 'active' : 'pending',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
      ...(payment.status === 'approved' && { lastAuthorizedPayment: admin.firestore.FieldValue.serverTimestamp() }),
    })

    console.log(`Assinatura ${preapprovalId} atualizada para status: ${payment.status}`)
    return res.status(200).send("Assinatura atualizada com sucesso")

  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(500).send("Erro interno no servidor")
  }
})