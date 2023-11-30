import { ScrollView, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { Button, Text } from 'react-native-paper'
import { collection, getDoc, getDocs, query, where, DocumentData, onSnapshot } from 'firebase/firestore';
import auth from '@react-native-firebase/auth'
import { db } from '../Services/FirebaseConfig';
import { UserContext } from '../context/UserContext';
import ThermalPrinterModule from 'react-native-thermal-printer'
import { theme } from '../Services/ThemeConfig';

export default function Tables() {

  const userContext = useContext(UserContext)

  const [orders, setOrders] = useState<DocumentData[]>([]);

  // useEffect(() => {
  //   const q = query(
  //     collection(db, 'Order'),
  //     where("establishment", "==", userContext?.estabId),
  //     where('status', '==', 1)
  //   );
  //   const unsubscribe = onSnapshot(q, (querySnapshot) => {
  //     const ordersData: DocumentData[] = [];
  //     querySnapshot.forEach((doc) => {
  //       ordersData.push(doc.data())
  //     //  print()
  //     });
  //     setOrders(ordersData);
  //   });
  //   // O retorno de useEffect é utilizado para realizar a limpeza do ouvinte quando o componente é desmontado
  //   return () => unsubscribe();
  // }, []);


  useEffect(() => {
    const q = query(
      collection(db, 'Order'),
      where("establishment", "==", userContext?.estabId),
      where('status', '==', 1)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData: DocumentData[] = [];
      querySnapshot.forEach((doc) => {
        ordersData.push(doc.data())
        console.log(doc.data())
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

  // useEffect(() => {
  //   const getOrders = async () => {
  //     const q = query(
  //       collection(db, 'Order'),
  //       where("establishment", "==", userContext?.estabId),
  //       where('status', '==', 1)
  //     );

  //     try {
  //       const querySnapshot = await getDocs(q);

  //       const ordersData: DocumentData[] = []
  //       querySnapshot.forEach((doc) => {
  //         ordersData.push(doc.data());
  //       });
  //       setOrders(ordersData);
  //     } catch (error) {
  //       console.error("Erro ao obter documentos:", error);
  //     }
  //   };

  //   getOrders();
  // }, []);




  return (
    <View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <Text>Orders</Text>
        {orders.map((order, index) => (
          <View key={index}>
            <Text>{order?.username}</Text>
            <Text>{order?.local}</Text>
          </View>
        ))}
        <Button onPress={() => console.log(orders)}>DATA</Button>
        <Button onPress={() => console.log(orders)}>DATA</Button>
      </ScrollView>
    </View>
  )
}