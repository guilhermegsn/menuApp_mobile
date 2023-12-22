import { ScrollView, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { DocumentData, Timestamp, collection, getDocs, limit, onSnapshot, orderBy, query, startAfter, where } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import { db } from '../Services/FirebaseConfig';
import { Avatar, Button, Card, IconButton, Text } from 'react-native-paper';
import ThermalPrinterModule from 'react-native-thermal-printer'
import { OrderItemsData } from '../Interfaces/OrderItems_Interface';
import { getHourMinuteSecond } from '../Services/Functions';
import { OrderData } from '../Interfaces/Order_interface';
import { theme } from '../Services/ThemeConfig';

export default function OrderItems() {


  const userContext = useContext(UserContext)
  const [orders, setOrders] = useState<DocumentData[]>([]);
  const [firstPrint, setFirstPrint] = useState(true)

  useEffect(() => {
    const q = query(
      collection(db, 'OrderItems'),
      where("establishment", "==", userContext?.estabId),
      orderBy('date', 'desc'),
    
      limit(15)
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
        ordersData.push({id: doc.id, ...doc.data()});
      });
      setOrders(ordersData);
    });
    // O retorno de useEffect é utilizado para realizar a limpeza do ouvinte quando o componente é desmontado
    return () => unsubscribe();
  }, []);


  const loadMoreData = async () => {
    if (orders) {
      const q = query(
        collection(db, 'OrderItems'),
        where("establishment", "==", userContext?.estabId),
        orderBy('date', 'desc'),
        limit(15),
        startAfter(orders),
      );

      const querySnapshot = await getDocs(q);

      let dat: Array<OrderData> = [];
      querySnapshot.forEach((item) => {
        dat.push(item.data() as OrderData)
      })

      if (dat) {
        console.log(dat)
      }
    };
  }




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

  const styles = StyleSheet.create({
    scrollView: {
      marginTop: "3%",
      margin: "3%",
    },
    scrollViewContent: {
      flexGrow: 1,
    },
  })

  const handleCompleteOrder = (id: string) => {
    console.log(id)
    const order = orders.find((item) => item.id === id)
    if(order){
      if(order.status === 1)
        order.status = 0
      else
        order.status = 1
    }
    setOrders([...orders])
  }
  


  return (
    <View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {orders?.map((order, index) => (
          <View key={index}>
            <Card style={{ marginBottom: "2%", paddingRight: 10}}
            onPress={()=> handleCompleteOrder(order.id)}
            >
              <Card.Title title={`${order?.local}`} subtitle={""}
                 left={(props) => <Avatar.Icon {...props} icon={ order.status === 1 ?"alert-decagram" : "check-circle-outline"} />} 
                 right={() => <Text>{getHourMinuteSecond(order.date.toDate())}</Text>}
              />
              <Card.Content>
               <Text> {order.id}</Text>
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
        <Button onPress={() => loadMoreData()}>Load more</Button>
        <Button onPress={() => console.log(orders)}>DATA</Button>
        <Button onPress={() => getHourMinuteSecond(orders[0].date.toDate())}>Hora</Button>
      </ScrollView>
    </View>
  )
}