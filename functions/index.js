const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendNewOrderNotification = functions.firestore
  .document('OrderItems/{orderId}')
  .onCreate((snapshot, context) => {
    const orderData = snapshot.data();
    const token = orderData?.token
    const message = {
      token: token,
      notification: {
        title: 'Novo pedido!',
        body: `${orderData?.items.map(item => (`${item?.qty} ${item?.name}\n`))}\n${orderData?.name}\n${orderData?.local !== orderData?.name ? orderData?.local : ""}`.replaceAll(",", "")
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
