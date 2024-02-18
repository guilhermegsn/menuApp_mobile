import { Alert, StyleSheet, View } from 'react-native'
import React, { ChangeEvent, useContext, useEffect, useRef, useState } from 'react'
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { ActivityIndicator, Button, DataTable, Dialog, IconButton, Portal, Text, TextInput } from 'react-native-paper';
import { DocumentData, addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { theme } from '../Services/ThemeConfig';
import { formatToCurrencyBR, formatToDoubleBR, handleNumberInputChange } from '../Services/Functions'
import ThermalPrinterModule from 'react-native-thermal-printer'
import { ScrollView } from 'react-native';
import moment from 'moment';
import CurrencyInput from '../Components/CurrencyInput'
import { UserContext } from '../context/UserContext';
interface RouteParams {
  id: string
  local: string
  openingDate: Date
  name: string,
}

export default function CloseOrder() {

  const userContext = useContext(UserContext);

  const navigation = useNavigation();
  const route = useRoute();
  const { id, local, openingDate, name } = route.params as RouteParams || {};
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<DocumentData[]>([]);
  const [isCloseOrder, setIsCloeOrder] = useState(false)
  const [totalOrder, setTotalOrder] = useState(0)
  const [isDiscount, setIsDiscount] = useState(false)
  const [isTax, setIsTax] = useState(false)
  const [discountValue, setDiscountValue] = useState<string>('0')
  const [percentTax, setPercentTax] = useState<string>('')
  const [taxValue, setTaxValue] = useState<string>('0')
  const [resultTotal, setResultTotal] = useState<number | null>(0)
  const [amountReceived, setAmmountReceived] = useState<string>('0')
  const [changeAmmount, setChangeAmmount] = useState<string>('0')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const q = query(
      collection(db, "OrderItems"),
      where("order_id", "==", id),
      orderBy('date')
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

  const print = async () => {
    let total = 0
    const headerText =
      `[C]<u><font size='tall'>${userContext?.estabName}</font></u>\n` +
      `[L]\n` +
      `[L] *** Conferencia de Consumo ***\n` +
      // `[L]<font size='small'>Cliente: ${local}</font>\n` +
      `[L]Data impressao: ${moment().format('DD/MM/YYYY HH:mm')}\n` +
      `[L]Cliente: ${name}\n` +
      `[C]================================\n` +
      `[L]<b>${("#").padEnd(3)}${("PRODUTO").padEnd(11)}${("QT.").padEnd(2)}${("VL.UN.").padStart(8)}${("TOTAL").padStart(7)}</b>\n` +
      `[C]--------------------------------\n`
    const itemText = data
      .map((item, index) => {
        total = total + (item.qty * item.price)
        const itemNumber = (index + 1).toString().padEnd(3);
        const itemName = item.name.slice(0, 11).padEnd(12);
        const itemQty = item.qty.toString().padStart(2);
        const itemPrice = formatToDoubleBR(item.price).toString().replaceAll(".", "").padStart(7, " ");
        const itemTotal = formatToDoubleBR(item.qty * item.price).replaceAll(".", "").toString().padStart(8, " ");
        return `[L]<font size='smallest'>${itemNumber}${itemName}${itemQty}${(itemPrice)}${itemTotal}</font>\n`;
      })
      .join('').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

    const footerText =
      `[C]================================\n` +
      `[R]<b>Total da conta: R$ ${formatToDoubleBR(totalOrder)}</b>\n` +
      `[R]Desconto -R$ ${discountValue !== '' ? formatToDoubleBR(parseFloat(discountValue)) : formatToDoubleBR(0)}\n` +
      `[R]Taxa R$ ${formatToDoubleBR(parseFloat(taxValue))}\n` +
      `[R]<font size='tall'>TOTAL:  R$ ${resultTotal !== null ? formatToDoubleBR(resultTotal).toString() : formatToDoubleBR(totalOrder)}</font>\n`
    const completeText = headerText + itemText + footerText;

    await ThermalPrinterModule.printBluetooth({
      payload: completeText,
      printerNbrCharactersPerLine: 30
    });
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
    const docRef = doc(db, "Ticket", id)
    try {
      await updateDoc(docRef, {
        status: 0,
        closingDate: serverTimestamp(),
        totalValue: resultTotal
      })
      setIsCloeOrder(false)
      navigation.goBack();
    } catch {
      console.log('erro ao fechar')
    }
  }

  const calcTax = (tax: number) => {
    setPercentTax(tax.toString())
    const taxValue = (tax / 100) * totalOrder
    if (isTax)
      setTaxValue(taxValue.toString())
    else
      setDiscountValue(taxValue.toString())
  }

  useEffect(() => {
    setResultTotal((totalOrder + parseFloat(taxValue)) - parseFloat(discountValue))
  }, [totalOrder, taxValue, discountValue])

  // const handleBlurDiscount = () => {
  //   const discountValueValue = parseFloat(discountValue);
  //   if (!isNaN(discountValueValue)) {
  //     setPercentTax('')
  //     setResultTotal(totalOrder - discountValueValue);
  //   } else {
  //     setResultTotal(totalOrder);
  //   }
  // }

  // const handleBlurTotal = () => {
  //   if (resultTotal !== null) {
  //     const disc = totalOrder - resultTotal
  //     setDiscountValue(disc.toString())
  //   }
  // }

  const cancelTaxDiscount = () => {
    setResultTotal(totalOrder)
    setIsDiscount(false)
    setIsTax(false)
    setIsTax(false)
    setDiscountValue('0')
    setTaxValue('0')
    setPercentTax('')
  }

  const confirmItemCancel = (index: number) => {
    // Exibe um Alert com uma pergunta e botões de resposta
    Alert.alert(
      'Cancelar item',
      'Deseja cancelar o item ' + (index + 1) + '?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sim',
          onPress: () => {
            cancelItem(index)
          },
        },
      ],
      { cancelable: true } // Define se o Alert pode ser fechado ao tocar fora dele
    );
  };

  const cancelItem = async (index: number) => {
    const dt = [...data]

    const item = { ...dt[index] }
    item.name = 'Canc it ' + (index + 1)
    item.qty = (item.qty)
    item.price = -(item.price)
    const cancelOrder = {
      establishment: userContext?.estabId,
      date: new Date(),
      items: [item],
      local: local,
      order_id: id,
      status: "3" //3 = cancelado
    }

    try {
      const orderRef = collection(db, "OrderItems");
      const saveOrder = await addDoc(orderRef, cancelOrder)
      if (saveOrder) {
        fetchData()
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }

    // dt.push(item)
    // setData(dt)
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
              <Text variant="titleMedium">{name}</Text>
              <Text>Abertura: {moment(new Date(openingDate)).format('DD/MM/YYYY HH:mm')}</Text>
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
              <DataTable.Title style={{ flex: 6 }}>Produto</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 1 }}>Qtd</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 1 }}>x</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 3 }}>Preço</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 3 }}>Total</DataTable.Title>
            </DataTable.Header>

            {data.map((item, index) => (
              // <Text>{item?.qty} x {item?.name} R$ {item?.price}</Text>
              <DataTable.Row key={index} onLongPress={() => confirmItemCancel(index)}>
                <DataTable.Cell key={1} style={{ flex: 1 }}>{index + 1}</DataTable.Cell>
                <DataTable.Cell key={2} style={{ flex: 6 }}>{item?.name}</DataTable.Cell>
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
            <DataTable.Row key={'tasx'} onPress={() => setIsTax(true)}>
              <DataTable.Cell key={11} style={{ flex: 4 }}>
                <Text>Taxa</Text>
              </DataTable.Cell>
              <DataTable.Cell key={12} numeric style={{ flex: 4 }}>{formatToCurrencyBR(parseFloat(taxValue))}</DataTable.Cell>
            </DataTable.Row>
            <DataTable.Row key={'desc'} onPress={() => setIsDiscount(true)}>
              <DataTable.Cell key={9} style={{ flex: 4 }}>Desconto</DataTable.Cell>
              <DataTable.Cell key={10} numeric style={{ flex: 4 }}>-{!isNaN(parseFloat(discountValue)) ? formatToCurrencyBR(parseFloat(discountValue)) : formatToCurrencyBR(0)}</DataTable.Cell>
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
              <Dialog.Title>Fechar comanda</Dialog.Title>
              <Dialog.Content>
                <Text variant="bodyMedium" style={{ marginBottom: 10 }}>Forma de pagamento:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Button style={{ margin: 2 }}
                    mode={'outlined'}
                    onPress={() => []}>Crédito
                  </Button>
                  <Button style={{ margin: 2 }}
                    mode={'outlined'}
                    onPress={() => []}>Débito
                  </Button>

                  <Button style={{ margin: 2 }}
                    mode={'outlined'}
                    onPress={() => []}>Cripto
                  </Button>
                  <Button style={{ margin: 2 }}
                    mode={'outlined'}
                    onPress={() => []}>Dinheiro
                  </Button>

                  <Button style={{ margin: 2 }}
                    mode={'outlined'}
                    onPress={() => []}>Cheque
                  </Button>
                  <Button style={{ margin: 2 }}
                    mode={'outlined'}
                    onPress={() => []}>Pix
                  </Button>
                </View>


               <Text style={{margin: 10}}>Valor a ser pago: {resultTotal?.toString()}</Text>
                 <TextInput
                  style={{ margin: 5 }}
                  label="Valor recebido"
                  keyboardType='numeric'
                  value={amountReceived}
                  onChangeText={(e)=> setAmmountReceived(e)}
                />
                 <TextInput
                  style={{ margin: 5 }}
                  label="Troco"
                  disabled
                  keyboardType='numeric'
                  value={resultTotal !== null  && !isNaN(resultTotal) && !isNaN(parseFloat(amountReceived)) ? (parseFloat(amountReceived) - resultTotal).toString() : '0'}
                />



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
                    mode={percentTax === '5' ? 'contained' : 'outlined'}

                    onPress={() => isDiscount ? calcTax(5) : calcTax(5)}>5%
                  </Button>
                  <Button style={{ margin: 2 }}
                    onPress={() => isDiscount ? calcTax(10) : calcTax(10)}
                    mode={percentTax === '10' ? 'contained' : 'outlined'}>10%
                  </Button>
                  <Button style={{ margin: 2 }}
                    onPress={() => isDiscount ? calcTax(15) : calcTax(15)}
                    mode={percentTax === '15' ? 'contained' : 'outlined'}>15%
                  </Button>
                  <Button style={{ margin: 2 }}
                    onPress={() => isDiscount ? calcTax(20) : calcTax(20)}
                    mode={percentTax === '20' ? 'contained' : 'outlined'}>20%
                  </Button>
                </View>
                <TextInput
                  style={{ margin: 5, marginTop: 10 }}
                  label="Valor"
                  keyboardType='numeric'
                  value={isTax ? taxValue : discountValue}
                  onChangeText={(text) => isTax ? setTaxValue(text) : setDiscountValue(text)}
                // onBlur={handleBlurDiscount}
                />

                <TextInput
                  style={{ margin: 5 }}
                  label="Valor final"
                  keyboardType='numeric'
                  value={resultTotal?.toString()}

                //onBlur={handleBlurTotal}
                />

              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => cancelTaxDiscount()}>Cancelar / Limpar</Button>
                <Button onPress={() => [setIsDiscount(false), setIsTax(false), setPercentTax('')]}>Salvar</Button>
              </Dialog.Actions>
            </Dialog>
          </Portal>


          <Button onPress={() => console.log(openingDate)}>openingDate</Button>
        </ScrollView>}
    </View>
  )
}