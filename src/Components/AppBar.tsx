import { View, Text, StatusBar } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer';
import { UserContext } from '../context/UserContext';
import Home from '../Views/Home';
import Login from '../Views/Login';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import Orders from '../Views/Orders';
import ProductMenu from '../Views/ProductMenu';

export default function AppBar() {

  const Drawer = createDrawerNavigator();
  const [name, setName] = useState("Smart Menu")
  const userContext = useContext(UserContext);

  useEffect(() => {
    console.log('hello App')
    console.log(userContext?.globalState)
    console.log('isAuthenticated: ' + userContext?.isAuthenticated)
    if(userContext?.estabName){
      setName(userContext.estabName)
    }
  }, [userContext])

  return (
    <NavigationContainer>
       <StatusBar
        backgroundColor="#6a51ae"
        barStyle="light-content" // Define a cor do texto da barra de status (pode ser 'dark-content' ou 'light-content')
      />
      <Drawer.Navigator
        screenOptions={{
          drawerStyle: { marginTop: '14.5%' },
          overlayColor: 'transparent',
        }}
        initialRouteName={userContext?.isAuthenticated ? 'Home' : 'Login'}
      >
        {userContext?.isAuthenticated ?
          <>
            <Drawer.Screen name="Home"
              component={Home}
              options={{
                headerStyle: { backgroundColor: '#6a51ae' },
                headerTitleStyle: { color: 'white' },
                title: name,
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="store" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen name="ProductMenu"
              component={ProductMenu}
              options={{
                headerStyle: { backgroundColor: '#6a51ae' },
                headerTitleStyle: { color: 'white' },
                title: "Cardápio",
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="summarize" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen name="Print"
              component={Orders}
              options={{
                headerStyle: { backgroundColor: '#6a51ae' },
                headerTitleStyle: { color: 'white' },
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="print" size={size} color={color} />
                ),
              }}
            />
          </> :
          <>
            <Drawer.Screen name="Login"
              component={Login}
              options={{
                headerStyle: { backgroundColor: '#6a51ae' },
                headerTitleStyle: { color: 'white' },
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="account-circle" size={size} color={color} />
                ),
              }}
            />
          </>
        }
      </Drawer.Navigator>
    </NavigationContainer>
  )
}