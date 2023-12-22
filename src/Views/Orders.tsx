import { ScrollView, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { Button, Card, FAB, Text } from 'react-native-paper'
import { collection, getDoc, getDocs, query, where, DocumentData, onSnapshot, orderBy } from 'firebase/firestore';
import auth from '@react-native-firebase/auth'
import { db } from '../Services/FirebaseConfig';
import { UserContext } from '../context/UserContext';
import ThermalPrinterModule from 'react-native-thermal-printer'
import { theme } from '../Services/ThemeConfig';
import { CommonActions, useNavigation,  } from '@react-navigation/native';

export default function Orders() {

  const userContext = useContext(UserContext)

  const [orders, setOrders] = useState<DocumentData[]>([]);
  const navigation = useNavigation();

  const closeOrder = (id: string, local: string) => {
    navigation.navigate('CloseOrder',  { id: id, local: local})
  };

  useEffect(() => {
    const q = query(
      collection(db, 'Order'),
      where("establishment", "==", userContext?.estabId),
      where('status', '==', 1),
      orderBy('openingDate', 'desc'),
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData: DocumentData[] = [];
      querySnapshot.forEach((doc) => {
        ordersData.push({id: doc.id, ...doc.data()})
      });
      setOrders(ordersData);
    });
    // O retorno de useEffect é utilizado para realizar a limpeza do ouvinte quando o componente é desmontado
    return () => unsubscribe();
  }, []);


  const print = async () => {
    const text =
      `[C]<u><font size='big'>Pedido N. 1587</font></u>\n` +
      `[L]\n` +
      `[C]================================\n` +
      // `[L]  + Size : S\n` +
      // `[L]<b>12 CERVEJA EISENBAHN 600ML</b>[R]12.99\n` +
      `[L]<b>Qtd. [R]Descricao</b>\n` +
      `[L]<b>12 x CERVEJA EISENBAHN 600ML</b>\n` +
      `[L]<b>1 x PORCAO TILAPIA </b>\n` +

      `[C]================================\n` +
      "[L]<font size='tall'>Cliente :</font>\n" +
      `[L]Guilherme Nunes\n` +
      `[L]MESA: 10\n` +
      `[L]Tel : +5518981257015\n`
    await ThermalPrinterModule.printBluetooth({
      payload: text,
      printerNbrCharactersPerLine: 30
    });
  }

  const styles = StyleSheet.create({
    scrollView: {
      marginTop: "5%",
      margin: "3%",
    },
    scrollViewContent: {
      flexGrow: 1,
    },
    fab: {
      position: 'absolute',
      margin: 12,
      right: 10,
      bottom: 10,
      backgroundColor: theme.colors.primary
    }
  })

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <Text>Orders</Text>
        {orders.map((order, index) => (
          <View key={index}>
            {/* <Text>{order?.username}</Text>
            <Text>{order?.local}</Text> */}

            <Card style={{ marginBottom: "2%", paddingRight: 10 }}>
              <Card.Title title={`${order?.local}`} subtitle={order.id}
                // left={(props) => <Avatar.Icon {...props} icon="folder" />} 
                right={() => <Text>{(order?.date)}</Text>}
              />
               <Card.Actions>
                  <Button onPress={()=> closeOrder(order.id, order.local)} mode="outlined">Fechar</Button>
                </Card.Actions>
            </Card>
           

          </View>
        ))}
        <Button onPress={() => console.log(orders)}>DATA</Button>
        <Button onPress={() => console.log(orders)}>DATA</Button>
      </ScrollView>

      <FAB
          color={theme.colors.background}
          style={styles.fab}
          icon="plus"
          // onPress={() => [
          //   setRegStage(2),
          //   setProductData({ id: "", name: "", description: "", price: 0 }),
          //   setIsEditing(false),
          // ]}
        />

    </View>
  )
}