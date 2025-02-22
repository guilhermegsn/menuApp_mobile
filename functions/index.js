const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require("node-fetch");

admin.initializeApp();
const db = admin.firestore();

//mercado pago
const ACCESS_TOKEN = "APP_USR-5315530852638570-022214-84db690c2581bb36df87c2c934452d04-2282945678";

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
    const { userId, email, planId } = req.body;

    console.log('Recebendo dados:', { userId, email, planId });

    // Verifica se os parâmetros necessários estão presentes
    if (!userId || !email || !planId) {
      console.log('Parâmetros inválidos!');
      return res.status(400).send({ error: "Parâmetros inválidos." });
    }

    // Verificar se o userId existe no Firestore
    const userRef = db.collection('User').doc(userId); // Ou onde os dados dos usuários estão armazenados
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      console.log(`Usuário com ID ${userId} não encontrado!`);
      return res.status(404).send({ error: "Usuário não encontrado." });
    }

    console.log(`Usuário ${userId} encontrado.`);

    // Busca o plano no Firestore
    const planRef = db.collection('Plans').doc(planId);
    const planSnap = await planRef.get();

    if (!planSnap.exists) {
      console.log(`Plano com ID ${planId} não encontrado!`);
      return res.status(404).send({ error: "Plano não encontrado." });
    }

    const planData = planSnap.data();
    console.log('Plano encontrado:', planData);

    // Criação do pagamento recorrente no Mercado Pago utilizando fetch
    // Criar uma data de início no futuro (próximo dia)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1); // Definir o próximo dia
    const startDateISOString = startDate.toISOString();
   
    console.log('Iniciando criação de pagamento no Mercado Pago...');
    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`, // Token de acesso do Mercado Pago
      },
      body: JSON.stringify({
        payer_email: email, // E-mail do usuário
        back_url: 'https://google.com', // URL de redirecionamento
        reason: `Assinatura do plano ${planData?.name}`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: planData?.price,
          currency_id: 'BRL',
          start_date: startDateISOString,
          end_date: null,
        },
      }),
    });

    const result = await response.json();
    console.log('Resposta do Mercado Pago:', result);

    if (!result.id) {
      console.log('Erro ao criar pagamento no Mercado Pago!');
      return res.status(500).send({ error: "Erro ao criar assinatura no Mercado Pago." });
    }

    const mercadoPagoPlanId = result.id; // ID retornado do Mercado Pago

    // Salvar a assinatura no Firestore
    console.log('Salvando assinatura no Firestore...');
    const subscriptionRef = db.collection('Subscriptions').doc(userId);
    await subscriptionRef.set({
      userId,
      planId, // O ID do plano do seu sistema
      mercadoPagoSubscriptionId: mercadoPagoPlanId, // ID do plano do Mercado Pago
      status: 'pending',
      nextBillingDate: result.auto_recurring?.next_payment_date || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Assinatura salva com sucesso!');
    return res.status(200).send({
      message: 'Assinatura iniciada!',
      subscriptionUrl: result.init_point, // URL para redirecionar o usuário para completar o pagamento
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
    if (action !== "payment.created" && action !== "payment.updated") {
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

    if (!payment || !payment.preapproval_id) {
      console.log("Pagamento ou preapproval_id não encontrados:", payment);
      return res.status(400).send("Pagamento não encontrado.");
    }

    // Encontrar a assinatura no Firestore usando preapproval_id ou outro identificador
    const userQuery = await db.collection("Subscriptions").where("mercadoPagoSubscriptionId", "==", payment.preapproval_id).get();

    if (userQuery.empty) {
      console.log("Assinatura não encontrada para o pagamento:", payment.preapproval_id);
      return res.status(400).send("Assinatura não encontrada.");
    }

    const subscriptionRef = userQuery.docs[0].ref;

    // Atualizar status da assinatura no Firestore
    const status = payment.status === "approved" ? "active" : "pending";
    const nextBillingDate = payment.date_of_expiration || null;

    await subscriptionRef.update({
      status: status,
      lastPaymentStatus: payment.status,
      nextBillingDate: nextBillingDate,
    });

    console.log(`Pagamento atualizado para a assinatura: ${payment.preapproval_id}`);

    return res.status(200).send("Pagamento atualizado!");
  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(500).send(error.message);
  }
});
