import messaging from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in the background!', remoteMessage);
  // Aqui você pode chamar a função de impressão ou qualquer outra lógica necessária
  handlePrintOrder(remoteMessage.data);
});
