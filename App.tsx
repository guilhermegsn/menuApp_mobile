import React from 'react'
import UserProvider from './src/context/UserContext';
import AppBar from './src/Components/AppBar';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './src/Services/ThemeConfig';
import NotificationHandler from './src/Services/NotificationHandler';


const App = () => {
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
