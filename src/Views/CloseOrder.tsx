import { StyleSheet, View } from 'react-native'
import React, { ChangeEvent, useEffect, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { ActivityIndicator, Button, DataTable, Dialog, IconButton, Portal, Text, TextInput } from 'react-native-paper';
import { DocumentData, collection, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { theme } from '../Services/ThemeConfig';
import { formatToCurrencyBR, formatToDoubleBR, handleNumberInputChange } from '../Services/Functions'
import ThermalPrinterModule from 'react-native-thermal-printer'
import { ScrollView } from 'react-native';
import moment from 'moment';
import CurrencyInput from '../Components/CurrencyInput'
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
  const [totalOrder, setTotalOrder] = useState(0)
  const [isDiscount, setIsDiscount] = useState(false)
  const [isTax, setIsTax] = useState(false)
  const [taxDiscount, setTaxDiscount] = useState<string>('')
  const [taxPercent, setTaxPercent] = useState<string>('')
  const [resultTotal, setResultTotal] = useState<number | null>(0)

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

        let total = 0
        flattenedArray.forEach((item) => {
          total = total + (item.qty * item.price)
        })
        setTotalOrder(total)
        setResultTotal(total)
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
      `[L] *** Conferencia de Consumo ***\n` +
      // `[L]<font size='small'>Cliente: ${local}</font>\n` +
      `[L]Data impressao: ${moment().format('DD/MM/YYYY HH:mm')}\n` +
      `[C]================================\n` +
      `[L]<b>${("#").padEnd(3)}${("PRODUTO").padEnd(11)}${("QT.").padEnd(2)}${("VL.UN.").padStart(8)}${("TOTAL").padStart(7)}</b>\n` +
      `[C]--------------------------------\n`
    const itemText = data
      .map((item, index) => {
        total = total + (item.qty * item.price)
        const itemNumber = (index + 1).toString().padEnd(3);
        const itemName = item.name.slice(0, 10).padEnd(11);
        const itemQty = item.qty.toString().padEnd(2);
        const itemPrice = formatToDoubleBR(item.price).toString().replaceAll(".", "").padStart(8, " ");
        const itemTotal = formatToDoubleBR(item.qty * item.price).replaceAll(".", "").toString().padStart(8, " ");
        return `[L]<font size='smallest'>${itemNumber}${itemName}${itemQty}${(itemPrice)}${itemTotal}</font>\n`;
      })
      .join('').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

    const footerText =
      `[C]================================\n` +
      `[R]<b>Total da conta: R$ ${formatToDoubleBR(totalOrder)}</b>\n`+
      `[R]Desconto R$ ${taxDiscount !== '' ? formatToDoubleBR(parseFloat(taxDiscount)) : formatToDoubleBR(0)}\n` +
      `[R]Taxa R$ ${formatToDoubleBR(0)}\n` +
      `[R]<font size='tall'>TOTAL:  R$ ${resultTotal !== null ? formatToDoubleBR(resultTotal).toString() : formatToDoubleBR(totalOrder)}</font>\n`
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

  const [value, setValue] = useState<string>("0")

  const handleTextChange = (text: string) => {
    let formattedText = text.replace(/[^0-9]/g, '');
    let reversedText = formattedText.split('').reverse().join('');
    let finalText = reversedText.replace(/(\d{2})\d(?=\d)/g, '$1,').split('').reverse().join('');
    setValue(finalText);
  };

  const closeOrder = async () => {
    const docRef = doc(db, "Order", id)
    const close = await setDoc(docRef, { status: 0 }).then(() => {
      console.log('ok. fechou')
      setIsCloeOrder(false)
      navigation.goBack();
    }).catch((e) => console.log(e))
  }

  const calcTaxDiscount = (tax: number) => {
    setTaxPercent(tax.toString())
    const taxValue = (tax / 100) * totalOrder
    const result = totalOrder - taxValue
    setTaxDiscount(taxValue.toString())
    setResultTotal(result)
  }

  const handleBlurDiscount = () => {
    const taxDiscountValue = parseFloat(taxDiscount);
    if (!isNaN(taxDiscountValue)) {
      setTaxPercent('')
      setResultTotal(totalOrder - taxDiscountValue);
    } else {
      setResultTotal(totalOrder); 
    }
  }

  const handleBlurTotal = () => {
    if (resultTotal !== null) {
      const disc = totalOrder - resultTotal
      setTaxDiscount(disc.toString())
    }
  }

  const cancelTaxDiscount = () => {
    setResultTotal(totalOrder)
    setIsDiscount(false) 
    setIsTax(false) 
    setTaxDiscount('')
    setTaxPercent('')
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
                <DataTable.Cell key={1} style={{ flex: 1 }}>{index + 1}</DataTable.Cell>
                <DataTable.Cell key={2} style={{ flex: 4 }}>{item?.name}</DataTable.Cell>
                <DataTable.Cell key={3} numeric style={{ flex: 1 }}>{item?.qty}</DataTable.Cell>
                <DataTable.Cell key={4} numeric style={{ flex: 1 }}>x</DataTable.Cell>
                <DataTable.Cell key={5} numeric style={{ flex: 3 }}>{formatToDoubleBR(item?.price)}</DataTable.Cell>
                <DataTable.Cell key={6} numeric style={{ flex: 3 }}>{formatToDoubleBR(item?.qty * item?.price)}</DataTable.Cell>
              </DataTable.Row>
            ))}
            <DataTable.Row key={'subt'} >
              <DataTable.Cell key={7} style={{ flex: 4 }}>Subtotal</DataTable.Cell>
              <DataTable.Cell key={8} numeric style={{ flex: 4 }}>{formatToCurrencyBR(totalOrder)}</DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row key={'desc'} onPress={() => setIsDiscount(true)}>
              <DataTable.Cell key={9} style={{ flex: 4 }}>Desconto</DataTable.Cell>
              <DataTable.Cell key={10} numeric style={{ flex: 4 }}>{!isNaN(parseFloat(taxDiscount)) ? formatToCurrencyBR(parseFloat(taxDiscount)) : formatToCurrencyBR(0)}</DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row key={'tasx'}>
              <DataTable.Cell key={11} style={{ flex: 4 }}>

                <Text>Taxa</Text>




              </DataTable.Cell>
              <DataTable.Cell key={12} numeric style={{ flex: 4 }}>{formatToCurrencyBR(0)}</DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row key={'total'}>
              <DataTable.Cell key={13} style={{ flex: 4 }}>TOTAL</DataTable.Cell>
              <DataTable.Cell key={14} numeric style={{ flex: 4 }}>
                <Text style={{ fontWeight: 'bold' }}>{resultTotal !== null ? formatToCurrencyBR(resultTotal) : formatToCurrencyBR(0)}  </Text>
              </DataTable.Cell>

            </DataTable.Row>
          </DataTable>
          {/* <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' }}>
            <View  style={{ flex: 1, justifyContent: 'center', alignItems: 'center'}}>
              <IconButton  icon="percent" mode="contained" onPress={() => console.log('Pressed')}/>
             
             
               
            </View>
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-end' }}>
              <Text variant="bodyLarge" style={{ textAlign: 'right', margin: 10 }}>SUBTOTAL: {formatToCurrencyBR(totalOrder)}</Text>
              <Text variant="bodyMedium" style={{ textAlign: 'right', marginRight: 10 }}>TAXA SERVIÇO:  {formatToCurrencyBR(0)}</Text>
              <Text variant="bodyMedium" style={{ textAlign: 'right', marginRight: 10 }}>DESCONTO:  {formatToCurrencyBR(0)}</Text>
              <Text variant="bodyLarge" style={{ textAlign: 'right', margin: 10 }}>TOTAL:  {formatToCurrencyBR(totalOrder)}</Text>
            </View>
          </View> */}


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

          <Portal>
            <Dialog visible={isDiscount || isTax} onDismiss={() => [cancelTaxDiscount()]}>
              <Dialog.Title>{isDiscount ? "Desconto" : "Taxa adicional"}</Dialog.Title>
              <Dialog.Content style={{ margin: -10 }}>
                <Text style={{ marginTop: 10, marginBottom: 10 }}>Subtotal: {formatToCurrencyBR(totalOrder)}</Text>
                <View style={{ flexDirection: 'row' }}>
                  <Button style={{ margin: 2 }}
                    mode={taxPercent === '5' ? 'contained' : 'outlined'}

                    onPress={() => calcTaxDiscount(5)}>5%
                    </Button>
                  <Button style={{ margin: 2 }}
                    onPress={() => calcTaxDiscount(10)}
                    mode={taxPercent === '10' ? 'contained' : 'outlined'}>10%
                  </Button>
                  <Button style={{ margin: 2 }}
                    onPress={() => calcTaxDiscount(15)}
                    mode={taxPercent === '15' ? 'contained' : 'outlined'}>15%
                  </Button>
                  <Button style={{ margin: 2 }}
                    onPress={() => calcTaxDiscount(20)}
                    mode={taxPercent === '20' ? 'contained' : 'outlined'}>20%
                  </Button>
                </View>
                <TextInput
                  style={{margin: 5, marginTop: 10}}
                  label="Valor do desconto"
                  keyboardType='numeric'
                  value={taxDiscount}
                  onChangeText={(text) => setTaxDiscount(text)}
                  onBlur={handleBlurDiscount}
                />

                <TextInput
                style={{margin: 5}}
                  label="Valor final"
                  value={resultTotal?.toString()}
                  
                  //onBlur={handleBlurTotal}
                />

              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => cancelTaxDiscount()}>Cancelar</Button>
                <Button onPress={() => setIsDiscount(false)}>Salvar</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>


          <Button onPress={() => console.log(openingDate)}>openingDate</Button>
        </ScrollView>}
    </View>
  )
}