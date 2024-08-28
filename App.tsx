import React, { useEffect } from 'react'
import UserProvider from './src/context/UserContext';
import AppBar from './src/Components/AppBar';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './src/Services/ThemeConfig';
import NotificationService from './src/Services/NotificationService';
import NotificationHandler from './src/Services/NotificationHandler';


const App = () => {
  useEffect(() => {
    NotificationService.registerForPushNotifications();
  }, [])

  return (
    <PaperProvider theme={theme}>
      <UserProvider>
        <NotificationHandler />
        <AppBar />
      </UserProvider>
    </PaperProvider>
  )
}

export default App;
