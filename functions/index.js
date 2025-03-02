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
    const { establishmentId, email, planId } = req.body;
    console.log('Recebendo dados:', { establishmentId, email, planId });

    if (!establishmentId || !email || !planId) {
      console.log('Parâmetros inválidos!');
      return res.status(400).send({ error: "Parâmetros inválidos." });
    }

    // Verifica se o estabelecimento existe no Firestore
    const userRef = db.collection('Establishment').doc(establishmentId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      console.log(`Usuário com ID ${establishmentId} não encontrado!`);
      return res.status(404).send({ error: "Usuário não encontrado." });
    }

    console.log(`Estabelecimento ${establishmentId} encontrado.`);

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

    if (subscriptionSnap.exists) {
      const subscriptionData = subscriptionSnap.data();

      if (subscriptionData.status === 'active') {
        console.log(`Assinatura já está ativa para ${establishmentId}`);
        return res.status(409).send({
          error: "Assinatura já ativa.",
          status: subscriptionData.status,
          mercadoPagoSubscriptionId: subscriptionData.mercadoPagoSubscriptionId,
        });
      }

      console.log(`Assinatura existente com status ${subscriptionData.status}, gerando novo pagamento...`);
    } else {
      console.log('Criando nova assinatura...');
    }

    // Criação do pagamento recorrente no Mercado Pago
    console.log('Iniciando criação de pagamento no Mercado Pago...');
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        payer_email: email,
        back_url: 'https://google.com',
        reason: `Assinatura do plano ${planData?.name}`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: planData?.price,
          currency_id: 'BRL',
        },
      }),
    });

    const result = await response.json();
    console.log('Resposta do Mercado Pago:', result);

    if (!result.id) {
      console.log('Erro ao criar pagamento no Mercado Pago!');
      return res.status(500).send({ error: "Erro ao criar assinatura no Mercado Pago." });
    }

    const mercadoPagoPlanId = result.id;
    const subscriptionUrl = result.init_point || null;

    // Se a assinatura já existia, apenas atualiza no Firestore
    if (subscriptionSnap.exists) {
      await subscriptionRef.update({
        mercadoPagoSubscriptionId: mercadoPagoPlanId,
        status: 'pending',
        nextBillingDate: result?.next_payment_date || null,
        subscriptionUrl,
      });

      console.log('Assinatura existente atualizada.');
    } else {
      // Criar nova assinatura no Firestore
      await subscriptionRef.set({
        establishmentId,
        planId,
        mercadoPagoSubscriptionId: mercadoPagoPlanId,
        status: 'pending',
        nextBillingDate: result?.next_payment_date || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionUrl,
      });

      console.log('Nova assinatura criada com sucesso.');
    }

    return res.status(200).send({
      message: "Pagamento pendente. Complete o pagamento.",
      subscriptionUrl,
      status: "pending",
      mercadoPagoSubscriptionId: mercadoPagoPlanId,
    });

  } catch (error) {
    console.error('Erro na função createSubscription:', error);
    return res.status(500).send({ error: "Erro interno do servidor." });
  }
});



exports.mercadoPagoWebhook = functions.https.onRequest(async (req, res) => {
  try {
    console.log('Recebido webhook:', req.body); // Imprime a solicitação recebida

    const { action, data } = req.body;

    // Verifica se o evento é "payment.created" ou "payment.updated"
    if (action !== "payment.created" && action !== "payment.updated" && action !== "subscription.updated") {
      console.log("Evento ignorado:", action);
      return res.status(200).send("Evento ignorado");
    }

    const paymentId = data.id;

    // Buscar detalhes do pagamento no Mercado Pago
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    });

    const payment = await response.json();

    if (!payment && !payment.metadata.preapproval_id) {
      console.log("Pagamento ou metadata.preapproval_id não encontrados:", payment);
      return res.status(400).send("Pagamento não encontrado.");
    }

    // Encontrar a assinatura no Firestore usando metadata.preapproval_id ou outro identificador
    const userQuery = await db.collection("Subscriptions").where("mercadoPagoSubscriptionId", "==", payment.metadata.preapproval_id).get();

    if (userQuery.empty) {
      console.log("Assinatura não encontrada para o pagamento:", payment.metadata.preapproval_id);
      return res.status(400).send("Assinatura não encontrada.");
    }

    const subscriptionRef = userQuery.docs[0].ref;

    console.log('payment---------->>>>>>>>>>>>>>>>>>', payment)

    // Atualizar status da assinatura no Firestore
    const status = payment.status === "approved" ? "active" : "pending";
    const nextBillingDate = payment.date_of_expiration || null;

    // Atualiza o status da assinatura
    await subscriptionRef.update({
      status: status,
      lastPaymentStatus: payment.status,
      lastPaymentDate: admin.firestore.FieldValue.serverTimestamp(),
      nextBillingDate: nextBillingDate,
      ...(payment.status === "approved" && { lastPaymentApproved: admin.firestore.FieldValue.serverTimestamp() })
    });

    console.log(`Pagamento atualizado para a assinatura: ${payment.metadata.preapproval_id}`);

    // Agora, criamos um registro de pagamento na coleção Payments
    await db.collection("Payments").add({
      establishmentId: userQuery.docs[0].data().establishmentId, // A partir da assinatura
      paymentId: payment.id,
      transactionAmount: payment.transaction_amount,
      receivedAmount: payment.transaction_details?.net_received_amount,
      status: payment.status,
      date: payment.date_approved || new Date().toISOString(),
      paymentMethod: payment.payment_method_id,
      payerEmail: payment.payer.email,
      preapprovalId: payment.metadata.preapproval_id, // Associe o pagamento à assinatura
      ipAddress: payment?.additional_info?.ip_address
    });

    console.log("Pagamento registrado na coleção 'Payments'");

    return res.status(200).send("Pagamento atualizado!");
  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(500).send(error.message);
  }
})


