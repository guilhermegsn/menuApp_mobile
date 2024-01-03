import { StyleSheet, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { ActivityIndicator, Button, DataTable, Dialog, IconButton, Portal, Text } from 'react-native-paper';
import { DocumentData, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { theme } from '../Services/ThemeConfig';
import { formatToCurrencyBR, formatToDoubleBR } from '../Services/Functions'
import ThermalPrinterModule from 'react-native-thermal-printer'
import { ScrollView } from 'react-native';
import moment from 'moment';
interface RouteParams {
  id: string
  local: string
  openingDate: Date
}

export default function CloseOrder() {
  const navigation = useNavigation();
  const route = useRoute();
  const { id, local, openingDate } = route.params as RouteParams || {};
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<DocumentData[]>([]);
  const [isCloseOrder, setIsCloeOrder] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const q = query(
        collection(db, "OrderItems"),
        where("order_id", "==", id)
      );
      try {
        setIsLoading(true)
        const querySnapshot = await getDocs(q)
        const ordersData: DocumentData[] = [];
        querySnapshot.forEach((doc) => {
          ordersData.push(doc.data())
        });
        let orderItems: Array<DocumentData> = [];
        ordersData.forEach((order) => {
          orderItems.push(order?.items)
        })
        // Extrair os itens e criar um array plano
        const flattenedArray = orderItems.flatMap(array => array);

        setData(flattenedArray)
      } catch (e) {
        console.log(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const print = async () => {
    let total = 0
    const headerText =
      `[C]<u><font size='big'>${local}</font></u>\n` +
      `[L]\n` +
      `[L]Data impressao: ${moment().format('DD/MM/YYYY HH:mm')}\n` +
      `[C]================================\n` +
      `[L]<b>${("#").padEnd(3)}${("PRODUTO").padEnd(13)}${("QT.").padEnd(2)}${("PRC").padEnd(7)}${("TOTAL").padEnd(5)}</b>\n` +
      `[C]--------------------------------\n`
    const itemText = data
      .map((item, index) => {
        total = total + (item.qty * item.price)
        const itemNumber = (index + 1).toString().padEnd(3);
        const itemName = item.name.slice(0, 12).padEnd(13);
        const itemQty = item.qty.toString().padEnd(2);
        const itemPrice = formatToDoubleBR(item.price).toString().padStart(6, " ");
        const itemTotal = formatToDoubleBR(item.qty * item.price).toString().padStart(8, " ");
        return `[L]<font size='small'>${itemNumber}${itemName}${itemQty}${(itemPrice)}${itemTotal}</font>\n`;
      })
      .join('').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

    const footerText =
      `[C]================================\n` +
      `[L]<font size='small'>TOTAL:  R$${formatToDoubleBR(total)}</font>\n` +
      `[L]<font size='small'>Cliente: ${local}</font>\n`
    const completeText = headerText + itemText + footerText;

    await ThermalPrinterModule.printBluetooth({
      payload: completeText,
      printerNbrCharactersPerLine: 30
    });

    console.log(completeText);
  };

  const styles = StyleSheet.create({
    scrollView: {
      marginTop: "3%",
      margin: "3%",
    },
    scrollViewContent: {
      flexGrow: 1,
    },

  })




  const closeOrder = async () => {
    const docRef = doc(db, "Order", id)
    const close = await setDoc(docRef, { status: 0 }).then(() => {
      console.log('ok. fechou')
      setIsCloeOrder(false)
      navigation.goBack();
    }).catch((e) => console.log(e))

  }



  return (
    <View style={{ flex: 1 }}>
      {isLoading ?
        <View
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
        :

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>


          {/* <View style={{ flexDirection: 'row'  }}>
            <View style={{ marginRight: 10 }}>
              <Text variant="headlineSmall">{local}</Text>
            </View>
            <View >
              <Button
            style={{justifyContent: 'flex-end', alignItems: 'flex-end'}}
                //style={styles.button}
                mode="contained"
                icon="printer"
                onPress={() => setIsCloeOrder(true)}>
                Imprimir
              </Button>
            </View>
          </View> */}

          <View style={{ flexDirection: 'row' }}>
            {/* View da Esquerda */}
            <View style={{ flex: 1, justifyContent: 'flex-start' }}>
              <Text variant="headlineSmall">{local}</Text>
              <Text>Abertura: {moment(openingDate).format('DD/MM/YYYY HH:mm')}</Text>
            </View>

            {/* View da Direita */}
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end', flexDirection: 'row' }}>
              {/* <Button
                style={styles.button}
                mode="contained"
                icon="printer"
                onPress={() => setIsCloeOrder(true)}>
                Imprimir
              </Button> */}

              {/* <Button
                style={styles.button}
                mode="contained"
                icon="close-circle"
                onPress={() => setIsCloeOrder(true)}>
                Fechar
              </Button> */}
              <IconButton
                icon="cash-check"
                iconColor={theme.colors.primary}
                size={30}
                onPress={() => setIsCloeOrder(true)}
              />
              <IconButton
                icon="printer"
                iconColor={theme.colors.primary}
                size={30}
                onPress={() => print()}
              />
            </View>
          </View>

          <DataTable style={{ marginTop: 10 }}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 1 }}>It</DataTable.Title>
              <DataTable.Title style={{ flex: 5 }}>Produto</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 1 }}>Qtd</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 1 }}>x</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 3 }}>Preço</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 3 }}>Total</DataTable.Title>
            </DataTable.Header>

            {data.map((item, index) => (
              // <Text>{item?.qty} x {item?.name} R$ {item?.price}</Text>
              <DataTable.Row key={index}>
                <DataTable.Cell style={{ flex: 1 }}>{index + 1}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 5 }}>{item?.name}</DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 1 }}>{item?.qty}</DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 1 }}>x</DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 3 }}>{formatToCurrencyBR(item?.price)}</DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 3 }}>{formatToCurrencyBR(item?.qty * item?.price)}</DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>

          {/* Mensagem confirmação / fechar comanda */}
          <Portal>
            <Dialog visible={isCloseOrder} onDismiss={() => setIsCloeOrder(false)}>
              <Dialog.Title>Atenção</Dialog.Title>
              <Dialog.Content>
                <Text variant="bodyMedium">Finalizar a comanda?</Text>
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setIsCloeOrder(false)}>Cancelar</Button>
                <Button onPress={() => closeOrder()}>Finalizar</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>


              <Button onPress={()=> console.log(openingDate)}>openingDate</Button>
        </ScrollView>}
    </View>
  )
}