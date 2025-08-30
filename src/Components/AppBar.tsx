import { StatusBar } from 'react-native'
import React, { useContext } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createDrawerNavigator } from '@react-navigation/drawer';
import { UserContext } from '../context/UserContext';
import Home from '../Views/Home';
import Login from '../Views/Login';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'
import { createStackNavigator } from '@react-navigation/stack';
import { theme } from '../Services/ThemeConfig';
import { CardStyleInterpolators } from '@react-navigation/stack';
import Tickets from '../Views/Tickets';
import Orders from '../Views/Orders';
import CloseOrder from '../Views/CloseOrder';
import { Button, Icon } from 'react-native-paper';
import ShoppingCart from '../Views/ShoppingCart';
import QrCodeReader from '../Views/QrCodeReader';
import UserConfig from '../Views/UserConfig';
import EstablishmentMenu from '../Views/EstablishmentMenu';
import ItemsMenu from '../Views/ItemsMenu';
import { auth } from '../Services/FirebaseConfig'
import moment from 'moment';
import { printThermalPrinter } from '../Services/Functions';
import GenerateQrCodes from '../Views/GenerateQrCodes';
import OrderDetails from '../Views/OrderDetails';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

export default function AppBar() {

  const Drawer = createDrawerNavigator();
  const Tab = createBottomTabNavigator()
  const Stack = createStackNavigator();
  const userContext = useContext(UserContext);

  const signOut = () => {
    userContext?.setEstabName("wise menu")
    userContext?.setUser(null)
    userContext?.setEstabId("")
    userContext?.setShoppingCart([])
    userContext?.setDataEstablishment([])
    auth.signOut();
  }

  const printExpirationDate = async (month: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() + month);
    const expires = moment(date).format('DD/MM/YYYY')
    const text =
      `[C]<u><font size='big'>HAMBURGUER</font></u>\n` +
      `[L]\n\n\n` +
      `[L]<font size='tall'>Data: ${moment().format('DD/MM/YYYY')}\n` +
      `[L]Validade: ${expires}\n</font>`
    // `[C]--------------------------------\n`
    printThermalPrinter(text)
  }

  const DrawerNavigator = () => {
    return (
      <Tab.Navigator
      >

        <Tab.Screen name="Home"
          component={Home}
          options={{
            headerShown: false,
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTitleStyle: { color: theme.colors.onBackground },
            title: userContext?.estabName || "wise menu",
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="store" size={size} color={theme.colors.primary} />
            ),
          }}
        />

        <Tab.Screen name="EstablishmentMenu"
          component={EstablishmentMenu}
          options={{
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTitleStyle: { color: theme.colors.onBackground },
            title: "Cardápio",
            tabBarIcon: ({ color, size }) => (
              <Icon source="book-open-variant" size={size} color={theme.colors.primary} />
            ),
          }}
        />
        <Tab.Screen name="Orders"
          component={Orders}
          options={{
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTitleStyle: { color: theme.colors.onBackground },
            title: "Pedidos",
            tabBarIcon: ({ color, size }) => (
              <Icon source="circle-slice-8" size={size} color={theme.colors.primary} />
            ),
          }}
        />

      </Tab.Navigator>
    )
  }

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={'dark-content'}
        backgroundColor={theme.colors.surface}
      />
      <Stack.Navigator initialRouteName="DrawerNavigator">
        <Stack.Screen name="DrawerNavigator" component={DrawerNavigator} options={{ headerShown: false }} />
        <Stack.Screen
          name="CloseOrder"
          component={CloseOrder}
          options={{
            title: "Conferência de consumo",
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTitleStyle: { color: theme.colors.onBackground },
            headerTintColor: theme.colors.onBackground,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
        <Stack.Screen
          name="OrderDetails"
          component={OrderDetails}
          options={{
            title: "Conferência de consumo",
            headerStyle: { backgroundColor: theme.colors.primary },
            headerTitleStyle: { color: theme.colors.onBackground },
            headerTintColor: theme.colors.onBackground,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
          }}
        />
        <Stack.Screen
          name="ItemsMenu"
          component={ItemsMenu}
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