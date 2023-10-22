import React from 'react';
import { View, Text, StatusBar, useWindowDimensions } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import Teste from './src/Views/Teste';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
      <Text>Home Screenn</Text>
    </View>
  );
}

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      {/* <StatusBar barStyle="light-content" backgroundColor="#6a51ae" /> */}
      <Text style={{ color: "red" }}>Details Screen</Text>
    </View>
  );
}

//const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const optionsDrawer = {

}
const App = () => {
  return (

    <NavigationContainer>
      <Drawer.Navigator
        screenOptions={{
          drawerStyle: { marginTop: '14.5%' },
          overlayColor: 'transparent',
        }}
      >
        <Drawer.Screen name="Home"
          component={HomeScreen}
          options={{
            headerStyle: { backgroundColor: '#6a51ae' },
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="home" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen name="Comandas"
          component={DetailsScreen}
          options={{
            headerStyle: { backgroundColor: '#6a51ae' },
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="list-alt" size={size} color={color} />
            ),
          }}
        />
        <Drawer.Screen name="Cardápio"
          component={Teste}
          options={{
            headerStyle: { backgroundColor: '#6a51ae' },
            drawerIcon: ({ color, size }) => (
              <MaterialIcons name="summarize" size={size} color={color} />
            ),
          }}
        />
      </Drawer.Navigator>
    </NavigationContainer>

  );
};


export default App;
