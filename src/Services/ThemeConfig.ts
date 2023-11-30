import { DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  roundness: 2,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6a51ae', // Cor principal
    accent: '#FF0266', // Cor de destaque
    background: '#FFFFFF', // Cor de fundo
    surface: '#F5F5F5', // Cor da superfície
    text: '#000000', // Cor do texto
    onBackground: '#FFFFFF', // Cor do texto sobre o fundo
    onSurface: '#6a51ae', // Cor do texto sobre a superfície
  },
};