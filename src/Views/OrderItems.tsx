import { View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { DocumentData, collection, onSnapshot, query, where } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import { db } from '../Services/FirebaseConfig';
import { Button, Text } from 'react-native-paper';
import ThermalPrinterModule from 'react-native-thermal-printer'
import { OrderItemsData } from '../Interfaces/OrderItems_Interface';

export default function OrderItems() {


  const userContext = useContext(UserContext)
  const [orders, setOrders] = useState<DocumentData[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'OrderItems'),
      where("establishment", "==", userContext?.estabId)
    );
  
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData: DocumentData[] = [];
      for (const change of querySnapshot.docChanges()) {
        if (change.type === "added") {
          const newItemData = change.doc.data()
          printOrder(newItemData);
          break;
        }
      }
      querySnapshot.forEach((doc) => {
        ordersData.push(doc.data());
      });
      setOrders(ordersData);
    });
    // O retorno de useEffect é utilizado para realizar a limpeza do ouvinte quando o componente é desmontado
    return () => unsubscribe();
  }, []);
  



  const printOrder = async (newOrder: DocumentData) => {
    let itemsText = ""
    newOrder?.items.forEach((item: string | any) => {
      itemsText = itemsText + `[L]<b>${item?.qty} x ${item?.name}</b>\n`
    })
    const initialText =
      `[C]<u><font size='big'>Pedido</font></u>\n` +
      `[L]\n` +
      `[C]================================\n` +
      // `[L]  + Size : S\n` +
      // `[L]<b>12 CERVEJA EISENBAHN 600ML</b>[R]12.99\n` +
      `[L]<b>Qtd. [R]Descricao</b>\n`
    // `[L]<b>12 x CERVEJA EISENBAHN 600ML</b>\n` +
    // `[L]<b>1 x PORCAO TILAPIA </b>\n` +

    // await ThermalPrinterModule.printBluetooth({
    //   payload: text,
    //   printerNbrCharactersPerLine: 30
    // });
    const finalText =
      `[C]================================\n` +
      "[L]<font size='tall'>Cliente :</font>\n" +
      // `[L]Guilherme Nunes\n` +
      `[L]MESA: ${newOrder?.local}\n` 
      // `[L]Tel : +5518981257015\n`
    const fullText = initialText + itemsText + finalText
    console.log(fullText)
    await ThermalPrinterModule.printBluetooth({
      payload: fullText,
      printerNbrCharactersPerLine: 30
    });

  }



  return (
    <View>
      {orders?.map((order, index) => (
        <View key={index}>
          <Text>{order?.order_id}</Text>
          {order.items.map((item: string | any) => (
            <Text>{item?.name}</Text>
          ))}
        </View>
      ))}


      <Button onPress={() => console.log(orders)}>DATA</Button>
    </View>
  )
}