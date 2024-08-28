const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendNewOrderNotification = functions.firestore
    .document('OrderItems/{orderId}')
    .onCreate((snapshot, context) => {
      const orderData = snapshot.data();
      const token = 'dcM9PztSR3CygB5D7kdhHM:APA91bHXw6MAOtMAB1g30C9EMRCebAn_5-2cPqDpkuaiTxOIP1ZP4MwGjw_Kl8NY9_vDPx7CoIvR-kXNfk24rQd1MVEwknHMV87g1QHZJZBk6XGqlOvXb9FPX6SaRuQYgt_rgoymBKgq'
      const message = {
        token: token,
        notification: {
          title: 'Novo pedido!',
          body: 'Você tem um novo pedido no seu app.',
        },
      };

      return admin.messaging().send(message)
          .then((response) => {
            console.log('Notificação enviada com sucesso:', response);
          })
          .catch((error) => {
            console.error('Erro ao enviar notificação:', error);
          });
    });
