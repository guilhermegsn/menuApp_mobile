import { View, Text, StatusBar } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { NavigationContainer, NavigationProp, ParamListBase  } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer';
import { UserContext } from '../context/UserContext';
import Home from '../Views/Home';
import Login from '../Views/Login';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import PrintTest from '../Views/PrintTest';
import ProductMenu from '../Views/ProductMenu';
import { createStackNavigator } from '@react-navigation/stack';
import { theme } from '../Services/ThemeConfig';
import { CardStyleInterpolators } from '@react-navigation/stack';
import Orders from '../Views/Orders';
import Tables from '../Views/Tables';
import OrderItems from '../Views/OrderItems';
import CloseOrder from '../Views/CloseOrder';
import { Icon } from 'react-native-paper';

export default function AppBar() {

  const Drawer = createDrawerNavigator();
  const Stack = createStackNavigator();
  const [name, setName] = useState("Smart Menu")
  const userContext = useContext(UserContext);

  

  useEffect(() => {
    console.log('hello App')
    console.log(userContext?.globalState)
    console.log('isAuthenticated: ' + userContext?.isAuthenticated)
    if (userContext?.estabName) {
      setName(userContext.estabName)
    }
  }, [userContext])

  const DrawerNavigator = () => {
    return (
      <Drawer.Navigator
        screenOptions={{
          drawerStyle: { marginTop: '14.5%' },
          overlayColor: 'transparent',
          headerTintColor: theme.colors.onBackground,
        }}
        initialRouteName={userContext?.isAuthenticated ? 'Home' : 'Login'}
      >
        {userContext?.isAuthenticated ?
          <>
            <Drawer.Screen name="Home"
              component={Home}
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                title: name,
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="store" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen name="ProductMenu"
              component={ProductMenu}
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                title: "Cardápio",
                drawerIcon: ({ color, size }) => (
                  <Icon source="book-open-variant" size={size} color={color} />
                ),
              }}
            />
             <Drawer.Screen name="OrderItems"
              component={OrderItems}
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                title: "Pedidos",
                drawerIcon: ({ color, size }) => (
                  <Icon source="circle-slice-8" size={size} color={color} />
                ),
              }}
            />
            <Drawer.Screen name="Orders"
              component={Orders}
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                title: "Comandas",
                drawerIcon: ({ color, size }) => (
                  <Icon source="credit-card-multiple-outline" size={size} color={color} />
                ),
              }}
            />
            {/* <Drawer.Screen name="Print"
              component={PrintTest}
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="print" size={size} color={color} />
                ),
              }}
            /> */}
          </> :
          <>
            <Drawer.Screen name="Login"
              component={Login}
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="account-circle" size={size} color={color} />
                ),
              }}
            />
          </>
        }
      </Drawer.Navigator>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar
        backgroundColor={theme.colors.primary}
      />
      <Stack.Navigator initialRouteName="DrawerNavigator">
        <Stack.Screen name="DrawerNavigator" component={DrawerNavigator} options={{ headerShown: false }} />
        <Stack.Screen
          name="CloseOrder"
          component={CloseOrder}
          options={{
            title: "Fechar comanda",
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTitleStyle: { color: theme.colors.onBackground },
            headerTintColor: theme.colors.onBackground,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,             
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  )
}