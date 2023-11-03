import React from 'react'
import UserProvider from './src/context/UserContext';
import AppBar from './src/Components/AppBar';
import { DefaultTheme, Provider as PaperProvider } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6a51ae', // Cor principal
    accent: '#FF0266', // Cor de destaque
    background: '#FFFFFF', // Cor de fundo
    surface: '#F5F5F5', // Cor da superfície
    text: '#000000', // Cor do texto
    onBackground: '#000000', // Cor do texto sobre o fundo
    onSurface: '#6a51ae', // Cor do texto sobre a superfície
  },
};


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
