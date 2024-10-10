import React, { useEffect } from 'react';
import messaging from '@react-native-firebase/messaging';
import { printThermalPrinter } from './Functions';

const NotificationHandler = () => {
  useEffect(() => {
    // Configurar o manipulador de mensagens de segundo plano
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      // Aqui você pode processar a mensagem de segundo plano
      console.log('Mensagem de segundo plano recebida:', remoteMessage);

        const text = `[L]Novo pedido!\n`;
        //await printThermalPrinter(text);
      
    });

    // Configurar o manipulador de mensagens em primeiro plano
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      if (remoteMessage.data.orderId) {
        // Imprima o pedido
        const text = `[L]Novo pedido!\n`;
        //printThermalPrinter(text);
      } else {
        // Exiba a notificação normalmente
        // ...
      }
    });

    return unsubscribe;
  }, []);

  return null; // O componente não renderiza nada na tela
};

export default NotificationHandler;
