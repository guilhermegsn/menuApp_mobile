import { StatusBar, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer';
import { UserContext } from '../context/UserContext';
import Home from '../Views/Home';
import Login from '../Views/Login';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import ProductMenu from '../Views/ProductMenu';
import { createStackNavigator } from '@react-navigation/stack';
import { theme } from '../Services/ThemeConfig';
import { CardStyleInterpolators } from '@react-navigation/stack';
import Orders from '../Views/Orders';
import OrderItems from '../Views/OrderItems';
import CloseOrder from '../Views/CloseOrder';
import { Button, Icon, Text } from 'react-native-paper';
import ShoppingCart from '../Views/ShoppingCart';
import QrCodeReader from '../Views/QrCodeReader';
import ProductMenuItens from '../Views/ProductMenuItens';
import UserConfig from '../Views/UserConfig';
import auth from '@react-native-firebase/auth'

export default function AppBar() {

  const Drawer = createDrawerNavigator();
  const Stack = createStackNavigator();
  const userContext = useContext(UserContext);

  const signOut = () => {
    userContext?.setEstabName("MenuPédia")
    userContext?.setUser(null)
    userContext?.setEstabId("")
    userContext?.setShoppingCart([])
    userContext?.setDataEstablishment([])
    auth().signOut();
  }

  const DrawerNavigator = () => {
    return (
      <Drawer.Navigator
        screenOptions={{
          // drawerStyle: { marginTop: '14.5%' },
          drawerStyle: { backgroundColor: theme.colors.primary },
          //     overlayColor: 'transparent',
          headerTintColor: theme.colors.onBackground,
          drawerLabelStyle: {
            color: theme.colors.background,
          },
        }}
        // initialRouteName={userContext?.isAuthenticated ? 'Home' : 'Login'}
        initialRouteName={'Login'}
      >
        {userContext?.isAuthenticated ?
          <>
            <Drawer.Screen name="Home"
              component={Home}
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                title: userContext?.estabName || "MenuPédia",
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="store" size={size} color={theme.colors.background} />
                ),
              }}
            />
            {userContext?.estabId !== "" && <>
              <Drawer.Screen name="ProductMenu"
                component={ProductMenu}
                options={{
                  headerStyle: { backgroundColor: theme.colors.primary },
                  headerTitleStyle: { color: theme.colors.onBackground },
                  title: "Cardápio",
                  drawerIcon: ({ color, size }) => (
                    <Icon source="book-open-variant" size={size} color={theme.colors.background} />
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
                    <Icon source="circle-slice-8" size={size} color={theme.colors.background} />
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
                    <Icon source="credit-card-multiple-outline" size={size} color={theme.colors.background} />
                  ),
                }}
              />
              {userContext.userRole === 'ADM' &&
                <Drawer.Screen name="UserConfig"
                  component={UserConfig}
                  options={{
                    headerStyle: { backgroundColor: theme.colors.primary },
                    headerTitleStyle: { color: theme.colors.onBackground },
                    title: "Usuários",
                    drawerIcon: ({ color, size }) => (
                      <Icon source="account-supervisor" size={size} color={theme.colors.background} />
                    ),
                  }}
                />
              }
            </>}

            <Drawer.Screen
              name="Logoff"
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                title: 'Logoff',
                drawerIcon: ({ color, size }) => (
                  <Icon source="logout" size={size} color={theme.colors.background} />
                ),
              }}
            >
              {() => <Button onPress={signOut}>sair</Button>}
            </Drawer.Screen>
          </> :
          <>
            <Drawer.Screen name="Login"
              component={Login}
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="account-circle" size={size} color={theme.colors.background} />
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
            title: "Itens da comanda",
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTitleStyle: { color: theme.colors.onBackground },
            headerTintColor: theme.colors.onBackground,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
        <Stack.Screen
          name="ProductMenuItens"
          component={ProductMenuItens}
          options={{
            title: "Produtos",
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTitleStyle: { color: theme.colors.onBackground },
            headerTintColor: theme.colors.onBackground,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
        <Stack.Screen
          name="ShoppingCart"
          component={ShoppingCart}
          options={{
            title: "Carrinho",
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTitleStyle: { color: theme.colors.onBackground },
            headerTintColor: theme.colors.onBackground,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
        <Stack.Screen
          name="QrCodeReader"
          component={QrCodeReader}
          options={{
            title: "Ler comanda",
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