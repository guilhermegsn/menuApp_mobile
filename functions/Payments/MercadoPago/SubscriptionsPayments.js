const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require("node-fetch");

const db = admin.firestore();

const cors = require("cors")({ origin: true });

const ACCESS_TOKEN = functions.config().mercadopago.access_token;

exports.createSubscription = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
    try {                                                   
      const { establishmentId, email, planId, cardToken } = req.body;
      console.log('Recebendo dados:', { establishmentId, email, planId });

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
})


exports.unsubscribe = functions.https.onRequest(async (req, res) => {
  cors(req, res, async () => {
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

      //Buscar detalhes do pagamento na API do Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
      })

      const payment = await paymentResponse.json()

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
