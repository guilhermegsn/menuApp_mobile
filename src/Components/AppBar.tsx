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
import { getCurrentDate, printThermalPrinter } from '../Services/Functions';

export default function AppBar() {

  const Drawer = createDrawerNavigator();
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
    const expires =  moment(date).format('DD/MM/YYYY')
    const text =
      `[C]<u><font size='big'>HAMBURGUER</font></u>\n` +
      `[L]\n\n\n` +
      `[L]<font size='tall'>Data: ${moment(getCurrentDate()).format('DD/MM/YYYY')}\n` +
      `[L]Validade: ${expires}\n</font>` 
      // `[C]--------------------------------\n`
    printThermalPrinter(text)
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
        initialRouteName={userContext?.isAuthenticated ? 'Home' : 'Login'}
      //initialRouteName={'Login'}
      >
        {userContext?.isAuthenticated ?
          <>
            <Drawer.Screen name="Home"
              component={Home}
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                title: userContext?.estabName || "wise menu",
                drawerIcon: ({ color, size }) => (
                  <MaterialIcons name="store" size={size} color={theme.colors.background} />
                ),
              }}
            />
            {userContext?.estabId !== "" && <>
              <Drawer.Screen name="EstablishmentMenu"
                component={EstablishmentMenu}
                options={{
                  headerStyle: { backgroundColor: theme.colors.primary },
                  headerTitleStyle: { color: theme.colors.onBackground },
                  title: "Cardápio",
                  drawerIcon: ({ color, size }) => (
                    <Icon source="book-open-variant" size={size} color={theme.colors.background} />
                  ),
                }}
              />
              <Drawer.Screen name="Orders"
                component={Orders}
                options={{
                  headerStyle: { backgroundColor: theme.colors.primary },
                  headerTitleStyle: { color: theme.colors.onBackground },
                  title: "Pedidos",
                  drawerIcon: ({ color, size }) => (
                    <Icon source="circle-slice-8" size={size} color={theme.colors.background} />
                  ),
                }}
              />
              <Drawer.Screen name="Tickets"
                component={Tickets}
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
                    title: "Configurações",
                    drawerIcon: ({ color, size }) => (
                      <Icon source="cog" size={size} color={theme.colors.background} />
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
            <Drawer.Screen
              name="Imprimir"
              options={{
                headerStyle: { backgroundColor: theme.colors.primary },
                headerTitleStyle: { color: theme.colors.onBackground },
                title: 'Imprimir',
                drawerIcon: ({ color, size }) => (
                  <Icon source="account-circle" size={size} color={theme.colors.background} />
                ),
              }}
            >
              {() => <Button onPress={()=>printExpirationDate(4)}>Imprimir </Button>}
            </Drawer.Screen>
          </> :
          <>
            <Drawer.Screen name="Login"
              component={Login}
              options={{
                title: "wise menu",
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