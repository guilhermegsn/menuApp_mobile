//import messaging from '@react-native-firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';

const registerForPushNotifications = async (idEstablishment, token) => {
  try {
    //const fcmToken = await messaging().getToken();
   // console.log('Token FCM:',)
    const docRef = doc(db, "Establishment", idEstablishment);
    await updateDoc(docRef, {
      token: token
    })
    console.log('Token FCM atualizado com sucesso!', token)
  } catch (error) {
    console.error('Erro ao registrar para notificações push ou ao atualizar o documento:', error)
  }
};


export default {
  registerForPushNotifications,
};
