const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require("node-fetch");
const crypto = require("crypto");
const cors = require("cors")({ origin: true });

const db = admin.firestore();

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

async function executeDirectPayment(establishmentId, transactionAmount, payerEmail, description, cardToken) {
  try {
    const tokenDoc = await admin.firestore().collection("AccessTokens").doc(establishmentId).get()
    if (!tokenDoc.exists) {
      throw new Error("Token do estabelecimento não encontrado");
    }


    const tokenData = tokenDoc.data()
    const accessToken = JSON.parse(decrypt(tokenData.token_data))

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
        application_fee: Number((transactionAmount * 0.04).toFixed(2)),
        description: description || "",
        payer: {
          email: payerEmail
        },
        token: cardToken || ""
      })
    });

    const paymentData = await response.json();
    if (response.ok) {
      if (paymentData.status === 'approved')
        return { success: true, data: paymentData }
      else
        return { success: false, data: paymentData }
    } else {
      return {
        error: paymentData.message || "Erro ao processar o pagamento",
        details: paymentData
      }
    }

  } catch (e) {
    console.error(e);
    return {
      success: false,
      error: "Erro interno ao processar pagamento",
      details: e.message
    };
  }
}

async function saveDirectPayment(paymentData, idEstablishment) {
  try {
    if (!paymentData?.id) {
      console.error("ID do pagamento ausente!", paymentData)
      return { error: 'ID do pagamento ausente.' }
    }

    const paymentsRef = db
      .collection('Establishment')
      .doc(idEstablishment)
      .collection('Payments')

    await paymentsRef.doc(paymentData.id).set(paymentData)

    console.log("Pagamento salvo com sucesso:", paymentData.id)

    return { success: true, message: 'Pagamento salvo com sucesso.' }
  } catch (error) {
    console.error('Erro ao salvar pagamento:', error);
    return { error: 'Erro interno do servidor.' }
  }
}


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


  try {
    // Buscar tokens que expiram nos próximos 7 dias
    const tokensSnapshot = await admin.firestore().collection("AccessTokens")
      .where("expires_at", "<", (nextSeveenDays))
      .get();

    if (tokensSnapshot.empty) {
      console.log("Nenhum token a vencer.");
      return null;
    }


    for (const doc of tokensSnapshot.docs) {
      const { token_data } = doc.data();
      console.log(`Token do estabelecimento ${doc.id} está vencendo. Renovando...`);

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

      const tokenData = tokenDoc.data();
      const accessToken = JSON.parse(decrypt(tokenData.token_data));

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
          application_fee: Number((transactionAmount * 0.04).toFixed(2)),
          description: description || "",
          payer: {
            email: payerEmail
          },
          token: cardToken || ""
        })
      });

      const paymentData = await response.json();

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


exports.savePayment = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    if (req.method !== 'POST') {
      return res.status(405).send({ error: 'Método não permitido' })
    }

    const payment = {
      ...req.body,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (!payment.establishmentId || !payment.status || !payment.id) {
      return res.status(400).send({ error: 'Dados inválidos ou incompletos.' })
    }

    try {
      const paymentsRef = db
        .collection('Establishment')
        .doc(payment.establishmentId)
        .collection('Payments')

      await paymentsRef.doc(payment.id.toString()).set(payment)

      return res.status(200).send({ success: true, message: 'Pagamento salvo com sucesso.' })
    } catch (error) {
      console.error('Erro ao salvar pagamento:', error);
      return res.status(500).send({ error: 'Erro interno do servidor.' })
    }
  })
})

exports.executeDirectPayment = executeDirectPayment;
exports.saveDirectPayment = saveDirectPayment;

