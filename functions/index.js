const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require("node-fetch");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });

admin.initializeApp();
const db = admin.firestore();

const ACCESS_TOKEN = functions.config().mercadopago.access_token;
const CLIENT_ID = functions.config().mercadopago.client_id;
const CLIENT_SECRET = functions.config().mercadopago.client_secret;
const REDIRECT_URI = functions.config().mercadopago.redirect_uri;
const CRYPTO_SECRET = functions.config().crypto.secret_key;

//criptografia token mercado pago user
const algorithm = "aes-256-cbc";
const secretKey = Buffer.from(CRYPTO_SECRET, "hex");
const iv = crypto.randomBytes(16); // Vetor de Inicialização 


function encrypt(text) {
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(secretKey, "utf-8"), iv);
  let encrypted = cipher.update(text, "utf-8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decrypt(encryptedText) {
  const parts = encryptedText.split(":");
  const iv = Buffer.from(parts.shift(), "hex");
  const encryptedData = parts.join(":");
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(secretKey, "utf-8"), iv);
  let decrypted = decipher.update(encryptedData, "hex", "utf-8");
  decrypted += decipher.final("utf-8");
  return decrypted;
}

const generateUUID = () => {
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); // use high-precision timer if available
  }
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}

async function authenticateRequest(req, res) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).send("Token de autenticação não enviado.");
    return null;
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken.uid;
  } catch {
    res.status(401).send("Token inválido.");
    return null;
  }
}


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

    const uid = await authenticateRequest(req, res)
    if (!uid) return

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
        return res.status(200).send({ message: "Assinatura atualizada com sucesso.", status: 'active' });
      } else {
        console.log('pagamento nao autorizado.')
        return res.status(400).send({ message: 'Pagamento nâo autorizado.', status: result.status })
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
          reason: `Wise Menu ${planData.name}`,
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

    const uid = await authenticateRequest(req, res)
    if (!uid) return

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
          status: 'cancelled'
        }),
      });

      try {
        await subscriptionRef.update({
          status: 'cancelled',
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
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

    if (type !== 'payment' && type !== 'subscription_preapproval') {
      console.log("Evento ignorado:", type)
      return res.status(200).send("Evento ignorado")
    }

    // Responde imediatamente ao Mercado Pago para evitar timeout
    res.status(200).send("ok")

    if (type === 'payment') {
      const paymentId = data.id
      console.log('paymentId:', paymentId)

      //Buscar detalhes do pagamento na API do Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      })

      const payment = await paymentResponse.json()

      console.log('payment-> ', payment)

      if (payment.transaction_amount > 1) { //Tratando apenas pagamentos maiores que R$ 1,00
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
      } else {
        console.log('Transação menor que R$ 1')
      }
    }

    else if (type === 'subscription_preapproval') {
      const subscriptionId = data.id
      const paymentResponse = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      })

      const subscription = await paymentResponse.json()

      if (subscription.status === 'cancelled' || subscription.status === 'paused') {
        // Buscar assinatura no Firestore usando o preapprovalId
        const subQuery = await db.collection("Subscriptions")
          .where("mercadoPagoSubscriptionId", "==", subscriptionId)
          .get()

        if (subQuery.empty) {
          console.log("Assinatura não encontrada:", subscriptionId)
          return res.status(404).send("Assinatura não encontrada")
        }

        const subscriptionRef = subQuery.docs[0].ref

        // Atualizar a assinatura no Firestore
        await subscriptionRef.update({
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          status: subscription.status
        })

        console.log(`Assinatura ${subscriptionId} atualizada para status: ${subscription.status}`)
        return res.status(200).send("Assinatura atualizada com sucesso")
      }
    }
  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.status(500).send("Erro interno no servidor")
  }
})


//Armazenando dados do Mercado Pago do estabelecimento para Recebimentos em seu nome
exports.mercadoPagoOAuthCallback = functions.https.onRequest(async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code) {
      console.log("Código de autorização ausente.");
      return res.status(400).send("Código de autorização ausente.");
    }

    // Trocar o código pelo access token
    const tokenResponse = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
        test_token: true
      }),
    });

    const tokenData = await tokenResponse.json();
    //console.log("Resposta do Mercado Pago:", tokenData);

    if (!tokenData.access_token) {
      console.log("Erro ao obter access token.");
      return res.status(400).send("Erro ao obter access token.");
    }

    const expires_in_ms = tokenData.expires_in * 1000; // Converter para ms
    const expires_at = Date.now() + expires_in_ms; // Criar timestamp de expiração

    // Salvar no Firestore
    const establishmentId = state; // O state pode ser o ID do estabelecimento
    await admin.firestore().collection("AccessTokens").doc(establishmentId).set({
      token_data: encrypt(JSON.stringify(tokenData)),
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      expires_at: expires_at
    });

    return res.status(200).send("Autorização concluída com sucesso!");
  } catch (error) {
    console.error("Erro na autenticação OAuth:", error);
    return res.status(500).send("Erro interno ao processar a solicitação.");
  }
});



exports.renewTokensMercadoPago = functions.pubsub.schedule("every 24 hours").onRun(async () => {
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000; // 7 dias em milissegundos
  const nextSeveenDays = now + sevenDaysMs

  console.log("Agora:", now);
  console.log("7 dias a partir de agora:", nextSeveenDays);

  try {
    // Buscar tokens que expiram nos próximos 7 dias
    const tokensSnapshot = await admin.firestore().collection("AccessTokens")
      .where("expires_at", "<", (now + sevenDaysMs))
      .get();

    if (tokensSnapshot.empty) {
      console.log("Nenhum token a vencer.");
      return null;
    }

    console.log('tokensSnapshot->', tokensSnapshot.docs)

    for (const doc of tokensSnapshot.docs) {
      const { token_data } = doc.data();
      console.log(`Token do estabelecimento ${doc.id} está vencendo. Renovando...`);

      console.log('doc->', doc)
      console.log('token_data', token_data)

      try {
        const strToken = decrypt(token_data)
        const token = JSON.parse(strToken)

        if (!token.refresh_token) {
          console.error(`Refresh token ausente para ${doc.id}. Pulando...`);
          continue;
        }

        const response = await fetch("https://api.mercadopago.com/oauth/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            refresh_token: token.refresh_token
          }),
        });

        const data = await response.json();

        if (data.access_token) {
          console.log(`Novo token gerado para ${doc.id}`);

          const expiresInMs = data.expires_in * 1000; // Converter para ms
          const expiresAt = now + expiresInMs; // Nova data de expiração

          // Atualizar no Firestore
          await admin.firestore().collection("AccessTokens").doc(doc.id).update({
            token_data: encrypt(JSON.stringify(data)),
            expires_at: expiresAt,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        } else {
          console.error(`Erro ao renovar token para ${doc.id}:`, JSON.stringify(data));
        }
      } catch (error) {
        console.error(`Erro na renovação do token para ${doc.id}:`, error);
      }
    }

    console.log("Renovação concluída.");
    return null;

  } catch (error) {
    console.error("Erro ao renovar tokens:", error);
    return null;
  }
});

exports.getPublicMpKey = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { establishmentId } = req.body;
      if (!establishmentId) {
        return res.status(400).send("Parâmetro inválido")
      }
      const tokenDoc = await admin.firestore().collection("AccessTokens").doc(establishmentId).get();
      if (!tokenDoc.exists) {
        return res.status(400).send("Token do estabelecimento não encontrado")
      }
      const tokenData = tokenDoc.data();
      const accessToken = JSON.parse(decrypt(tokenData.token_data))
      console.log('accceeess::', accessToken)
      console.log('publickey', accessToken?.public_key)
      const public_key = accessToken?.public_key
      return res.status(200).json(public_key);
    } catch {
      return res.status(500).send('Ocorreu um erro inesperado.')
    }
  })
})


exports.executePaymentToEstablishment = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    try {
      const { establishmentId, transactionAmount, payerEmail, description, cardToken } = req.body;

      if (!establishmentId || !transactionAmount || !payerEmail || !cardToken) {
        throw new Error("Parâmetros inválidos");
      }

      const tokenDoc = await admin.firestore().collection("AccessTokens").doc(establishmentId).get();
      if (!tokenDoc.exists) {
        throw new Error("Token do estabelecimento não encontrado");
      }

      console.log('tokenDoc ->', tokenDoc.data())

      const tokenData = tokenDoc.data();
      const accessToken = JSON.parse(decrypt(tokenData.token_data));

      console.log('acces::', accessToken)

      const response = await fetch("https://api.mercadopago.com/v1/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken?.access_token}`,
          "X-Idempotency-Key": generateUUID()
        },
        body: JSON.stringify({
          installments: 1,
          transaction_amount: transactionAmount,
          application_fee: 4,
          description: description || "",
          payment_method_id: "master",
          payer: {
            email: payerEmail
          },
          token: cardToken || ""
        })
      });

      const paymentData = await response.json();
      console.log("Pagamento criado:", paymentData);

      if (response.ok) {
        return res.status(response.status).json(paymentData);
      } else {
        return res.status(response.status).json({
          error: paymentData.message || "Erro ao processar o pagamento",
          details: paymentData
        });
      }

    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      return res.status(500).send('Erro ao processar o pagamento.');
    }
  });
});

