//import messaging from '@react-native-firebase/messaging';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './FirebaseConfig';

const registerForPushNotifications = async (userId: string, token: string) => {
  try {
    const docRef = doc(db, "User", userId);
    await updateDoc(docRef, {
      token: token, // Adiciona o novo token ao array
    });
    console.log('Token FCM adicionado ao array com sucesso!', token);
  } catch (error) {
    console.error('Erro ao registrar para notificações push ou ao atualizar o documento:', error);
  }
};

export default {
  registerForPushNotifications,
};
