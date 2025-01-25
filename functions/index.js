const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

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
      // Consulta a coleção 'User' para encontrar usuários relacionados ao estabelecimento
      const usersSnapshot = await admin.firestore()
        .collection('User')
        .where('establishmentId', 'array-contains', establishmentId)
        .get();

      if (usersSnapshot.empty) {
        console.error(`Nenhum usuário encontrado para o estabelecimento ID ${establishmentId}.`);
        return null;
      }

      // Para cada usuário encontrado, envia uma notificação
      const notifications = [];
      usersSnapshot.forEach(userDoc => {

        const userData = userDoc.data()
        if (userData?.receiveNotifications) {

          const token = userData?.token;
          if (token) {
            console.log('enviando notificação para: ', token)
            // Configura a mensagem de notificação
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
