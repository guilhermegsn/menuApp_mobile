import React from 'react';

import { createDrawerNavigator } from '@react-navigation/drawer';
import UserProvider from './src/context/UserContext';
import AppBar from './src/Components/AppBar';

const App = () => {
  return (
    <UserProvider>
      <AppBar />
    </UserProvider>
  );
};

export default App;
