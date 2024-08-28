 // NotificationService.js
import messaging from '@react-native-firebase/messaging';

const registerForPushNotifications = async () => {
  try {
    const fcmToken = await messaging().getToken();
    console.log('Token FCM:', fcmToken);
    // Envie o token FCM para o seu servidor para enviar notificações
  } catch (error) {
    console.error('Erro ao registrar para notificações push:', error);
  }
};


export default {
  registerForPushNotifications,
};
