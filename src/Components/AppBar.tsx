import { View, Text } from 'react-native'
import React, { useContext, useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer';
import { UserContext } from '../context/UserContext';
import Home from '../Views/Home';
import Teste from '../Views/Teste';
import Login from '../Views/Login';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'

export default function AppBar() {

  const Drawer = createDrawerNavigator();

  const userContext = useContext(UserContext);

  console.log("userContext:", userContext);

  useEffect(() => {
    console.log('hello App')
    console.log(userContext?.globalState)
    console.log('isAuthenticated: '+ userContext?.isAuthenticated)
  }, [userContext])

  return (
      <NavigationContainer>
        <Drawer.Navigator
          screenOptions={{
            drawerStyle: { marginTop: '14.5%' },
            overlayColor: 'transparent',
          }}
          initialRouteName={userContext?.user ? 'Home' : 'Login'}
        >
          {userContext?.isAuthenticated ?
            <>
              <Drawer.Screen name="Home"
                component={Home}
                options={{
                  headerStyle: { backgroundColor: '#6a51ae' },
                  headerTitleStyle: { color: 'white' },
                  drawerIcon: ({ color, size }) => (
                    <MaterialIcons name="home" size={size} color={color} />
                  ),
                }}
              />
              <Drawer.Screen name="Cardápio"
                component={Teste}
                options={{
                  headerStyle: { backgroundColor: '#6a51ae' },
                  headerTitleStyle: { color: 'white' },
                  drawerIcon: ({ color, size }) => (
                    <MaterialIcons name="summarize" size={size} color={color} />
                  ),
                }}
              />

            </> : null}
          <Drawer.Screen name="Login"
            component={Login}
            options={{
              headerStyle: { backgroundColor: '#6a51ae' },
              headerTitleStyle: { color: 'white' },
              drawerIcon: ({ color, size }) => (
                <MaterialIcons name="summarize" size={size} color={color} />
              ),
            }}
          />
        </Drawer.Navigator>
      </NavigationContainer>
  )
}