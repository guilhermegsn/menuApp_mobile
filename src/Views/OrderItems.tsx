import { ScrollView, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { DocumentData, Timestamp, collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import { db } from '../Services/FirebaseConfig';
import { Avatar, Button, Card, IconButton, Text } from 'react-native-paper';
import ThermalPrinterModule from 'react-native-thermal-printer'
import { OrderItemsData } from '../Interfaces/OrderItems_Interface';
import { getHourMinuteSecond } from '../Services/Functions';

export default function OrderItems() {


  const userContext = useContext(UserContext)
  const [orders, setOrders] = useState<DocumentData[]>([]);
  const [firstPrint, setFirstPrint] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'OrderItems'),
      where("establishment", "==", userContext?.estabId),
      orderBy('date', 'desc')
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
      setFirstPrint(false)
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
      `[L]<b>Qtd. [R]Descricao</b>\n`
    const finalText =
      `[C]================================\n` +
      "[L]<font size='tall'>Cliente :</font>\n" +
      // `[L]Guilherme Nunes\n` +
      `[L]MESA: ${newOrder?.local}\n`
    // `[L]Tel : +5518981257015\n`
    const fullText = initialText + itemsText + finalText
    console.log(fullText)
    try {
      await ThermalPrinterModule.printBluetooth({
        payload: fullText,
        printerNbrCharactersPerLine: 30
      });
    } catch {
      console.log('Erro ao imprimir')
    }

  }

  return (
    <View>
      <ScrollView>
        {orders?.map((order, index) => (
          <View key={index}>
            <Card style={{ marginBottom: "2%", paddingRight: 10 }}>
              <Card.Title title={`${order?.local}`} subtitle={""}
                // left={(props) => <Avatar.Icon {...props} icon="folder" />} 
                right={() => <Text>{getHourMinuteSecond(order.date.toDate())}</Text>}
              />
              <Card.Content>
                {order.items.map((item: string | any) => (
                  <Text>{item.qty} x {item?.name}</Text>
                ))}
              </Card.Content>
            </Card>
            {/* {order.items.map((item: string | any) => (
              <Text>{item?.name}</Text>
            ))} */}
          </View>
        ))}
        <Button onPress={() => console.log(orders[0].date)}>DATA</Button>
        <Button onPress={() => getHourMinuteSecond(orders[0].date.toDate())}>Hora</Button>
      </ScrollView>
    </View>
  )
}