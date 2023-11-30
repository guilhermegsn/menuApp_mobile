import React from 'react'
import UserProvider from './src/context/UserContext';
import AppBar from './src/Components/AppBar';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from './src/Services/ThemeConfig';

const App = () => {
  return (
    <PaperProvider theme={theme}>
      <UserProvider>
        <AppBar />
      </UserProvider>
    </PaperProvider>
  );
};

export default App;
