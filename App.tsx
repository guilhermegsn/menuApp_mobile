import React, { useEffect } from 'react'
import UserProvider from './src/context/UserContext';
import AppBar from './src/Components/AppBar';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './src/Services/ThemeConfig';
import messaging from '@react-native-firebase/messaging';
import { Alert } from 'react-native';


const App = () => {

  // async function requestUserPermission() {
  //   const authStatus = await messaging().requestPermission();
  //   const enabled =
  //     authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
  //     authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  //   if (enabled) {
  //     console.log('Authorization status:', authStatus);
  //   }
  // }


  async function requestUserPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
    } else {
      console.log('Notification permissions not granted');
      Alert.alert(
        'Notifications Permission',
        'Please enable notifications for this app in settings.',
        [{ text: 'OK' }]
      );
    }
  }

  const getToken = async () => {
    const fcmToken = await messaging().getToken()
    if (fcmToken) {
      console.log('rainbowFcmToken', { data: fcmToken });
    }else{
      console.log('nao foi possível obter o token.')
    }
  }

  useEffect(() => {
    requestUserPermission()
    getToken()
  }, [])


  return (
    <PaperProvider theme={theme}>
      <UserProvider>
        <AppBar />
      </UserProvider>
    </PaperProvider>
  );
};

export default App;
