import { Alert, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { useNavigation } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { ActivityIndicator, Button, DataTable, Dialog, Divider, IconButton, Menu, Portal, Text, TextInput } from 'react-native-paper';
import { DocumentData, addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { theme } from '../Services/ThemeConfig';
import { formatCurrencyInput, formatToCurrencyBR, formatToDoubleBR, printThermalPrinter } from '../Services/Functions'
import ThermalPrinterModule from 'react-native-thermal-printer'
import { ScrollView } from 'react-native';
import moment from 'moment';
import { UserContext } from '../context/UserContext';
import { PaymentMethod } from '../Interfaces/PaymentMethod_interface';
import QRCode from 'react-native-qrcode-svg';
import { base_url } from '../Services/config';
interface RouteParams {
  id: string
  local: string
  openingDate: Date
  name: string,
  status: number,
  type: number,
  amountReceived: number
}

export default function CloseOrder() {

  const userContext = useContext(UserContext);
  const navigation = useNavigation();
  const route = useRoute();
  const { id, local, openingDate, name, status, type, amountReceived } = route.params as RouteParams || {};
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  const [data, setData] = useState<DocumentData[]>([]);
  const [isCloseOrder, setIsCloeOrder] = useState(false)
  const [totalOrder, setTotalOrder] = useState(0)
  const [isDiscount, setIsDiscount] = useState(false)
  const [isTax, setIsTax] = useState(false)
  const [discountValue, setDiscountValue] = useState<string>('0')
  const [percentTax, setPercentTax] = useState<string>('')
  const [taxValue, setTaxValue] = useState<string>('0')
  const [resultTotal, setResultTotal] = useState<number>(0)
  const [paramAmountedReceived, setParamAmmountReceived] = useState<string>('0')
  const [changeValueOrder, setChangeValueOorder] = useState('0')
  const [isOpenMenu, setIsOpenMenu] = useState(false)
  const [isOpenQrCode, setIsOpenQrCode] = useState(false)
  const [ticketData, setTicketData] = useState<DocumentData>({})

  useEffect(() => {
    fetchData()
  }, [])

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [paymentMethod, setPaymentMethod] = useState("")

  // Função para carregar métodos de pagamento
  const loadPaymentMethods = () => {
    const methods: PaymentMethod[] = [
      { name: 'Crédito', id: 'CRD' },
      { name: 'Débito', id: 'DBT' },
      { name: 'Cripto', id: 'CRT' },
      { name: 'Dinheiro', id: 'CASH' },
      { name: 'Cheque', id: 'CHK' },
      { name: 'Pix', id: 'PIX' },
    ];
    setPaymentMethods(methods);
  };

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const fetchData = async () => {
    const q = query(
      collection(db, 'Establishment', userContext?.estabId, 'Orders'),
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

      setTicketData(orderItems)
      ordersData.forEach((order) => {
        const items = order.items.map((item: DocumentData) => ({
          ...item,
          date: order.date,
          operator: order.operator
        }))
        orderItems.push(items)
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

  const getInfoTicket = async () => {
    const docRef = doc(db, "Establishment", userContext?.estabId, 'Tickets', id)
    //verifico se já existe este uniqueName 
    const docSnapshot = await getDoc(docRef)
    if (docSnapshot.exists()) {
      setTicketData(docSnapshot.data())
    }
  }

  useEffect(() => {
    if (status === 2) {
      getInfoTicket()
    }
  }, [status])

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
    const docRef = doc(db, 'Establishment', userContext?.estabId, 'Tickets', id)
    const data = {
      status: 0,
      closingDate: serverTimestamp(),
      totalValue: resultTotal,
      paymentMethod: paymentMethod,
      amountReceived: parseFloat(paramAmountedReceived)
    }
    const save = async (data: DocumentData) => {
      setIsLoadingSave(true)
      try {
        await updateDoc(docRef, data)
        setIsCloeOrder(false)
        navigation.goBack();
      } catch {
        console.log('erro ao fechar')
      }finally{
        setIsLoadingSave(false)
        fetchData()
      }
    }
    let received = parseFloat(paramAmountedReceived.replace(".", "").replace(",", "."))
    if (status === 2) {
      received = received + amountReceived
    }
    if (received < totalOrder) {
      Alert.alert(
        "Comanda em débito!",
        `O Valor recebido é menor que o valor total da comanda. \n\nA comanda passará para o status 'Em débito'.\n\nDeseja continuar?`,
        [
          {
            text: "Não",
            onPress: () => null,
            style: "cancel",
          },
          {
            text: "Sim",
            onPress: async () => {
              const newData = { ...data, status: 2, amountReceived: received}
              save(newData)
            },
          },
        ],
        { cancelable: false }
      );
    }else{
      if(status === 2){//somo os valores 
        data.amountReceived = received
      }
      save(data)
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
      status: 3 //3 = cancelado
    }

    try {
      const orderRef = collection(db, 'Establishment', userContext?.estabId, 'Orders');
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

  const printTicket = async () => {
    const text =
      `[L]\n` +
      `[L]\n` +
      `[C]<u><font size='tall'>${userContext?.estabName}</font></u>\n` +
      `[L]\n` +
      `[C]COMANDA DIGITAL DE CONSUMO\n` +
      `[L]\n` +
      `[C]Acesse o QR Code para pedir:\n` +
      `[L]\n` +
      `[L]<qrcode>${base_url}/${userContext?.estabId}/1/${id}</qrcode>\n` +
      `[L]\n` +
      `[L]\n` +
      // `[C]<barcode type='ean13' height='10'>${gerarCodigoComanda()}</barcode>\n` +
      `[L]\n` +
      `[L]<b>Dados desta comanda:</b>\n` +
      `[L]<font size='tall'>Nome: ${name}</font>\n` +
      `[L]Local: ${local}\n` +
      `[L]\n` +
      `[C]<b><font size='tall'>ATENCAO</font></b>\n` +
      `[L]Este ticket deve ser armazenado em local seguro.\n` +
      `[L]A perda deste ticket pode acarretar prejuizo financeiro.\n`
    await printThermalPrinter(text)
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
              <Text>Abertura: {moment(openingDate).format('DD/MM/YYYY HH:mm')}</Text>
              <Divider style={{ marginTop: 10 }} />
              <Text variant="titleLarge" style={{ marginTop: 10 }}>Total: {formatToCurrencyBR(resultTotal)}</Text>
              {status === 2 &&
                <View>
                  <Text>Pago: {formatToCurrencyBR(amountReceived)}</Text>
                  <Text>À Pagar: {formatToCurrencyBR(totalOrder - amountReceived)}</Text>
                </View>
              }
            </View>

            {/* View da Direita */}
            <View style={{ flex: 1, justifyContent: 'flex-end', alignItems: 'flex-start', flexDirection: 'row' }}>
              <IconButton
                icon="cash-check"
                iconColor={theme.colors.primary}
                size={30}
                disabled={status === 0}
                onPress={() => setIsCloeOrder(true)}
              />
              <IconButton
                icon="printer"
                iconColor={theme.colors.primary}
                size={30}
                onPress={() => print()}
              />
              {type === 1 && status !== 0 &&//Menu de Reimpressao de ticker e QrCode apenas para comandas individuais.
                <View>
                  <Menu
                    visible={isOpenMenu}
                    onDismiss={() => setIsOpenMenu(!isOpenMenu)}
                    anchor={<IconButton icon="dots-vertical" onPress={() => setIsOpenMenu(true)} />}
                  >
                    <Menu.Item
                      onPress={() => {
                        setIsOpenQrCode(true)
                        setIsOpenMenu(false)
                      }}
                      title="Exibir QrCode"
                      leadingIcon="qrcode"
                    />
                    <Menu.Item
                      onPress={() => {
                        printTicket()
                        setIsOpenMenu(false)
                      }}
                      title="Reimprimir Ticket"
                      leadingIcon="printer"
                    />
                  </Menu>
                </View>
              }
            </View>
          </View>

          <DataTable style={{ marginTop: 10 }}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 2 }}>It</DataTable.Title>
              <DataTable.Title style={{ flex: 5 }}>Produto</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 1 }}>Qtd</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 1 }}>x</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 3 }}>Preço</DataTable.Title>
              <DataTable.Title numeric style={{ flex: 4 }}>Total</DataTable.Title>
            </DataTable.Header>

            {data.map((item, index) => (
              <DataTable.Row
                key={`row-${index}`}
                onLongPress={() => confirmItemCancel(index)}
                onPress={() => Alert.alert(
                  "Detalhes do pedido",
                  `${item?.qty} x ${item?.name}\n${moment(item?.date.toDate()).utcOffset(-3).format('DD/MM/YYYY HH:mm')}` +
                  `\n\n\nOperador: ${item?.operator || ""}`
                )}
              >
                <DataTable.Cell style={{ flex: 2 }}>{index + 1}</DataTable.Cell>
                <DataTable.Cell style={{ flex: 5 }}>{item?.name}</DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 1 }}>{item?.qty}</DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 1 }}>x</DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 3 }}>{formatToDoubleBR(item?.price)}</DataTable.Cell>
                <DataTable.Cell numeric style={{ flex: 4 }}>{formatToDoubleBR(item?.qty * item?.price)}</DataTable.Cell>
              </DataTable.Row>
            ))}

            <DataTable.Row key="subtotal">
              <DataTable.Cell style={{ flex: 4 }}>Subtotal</DataTable.Cell>
              <DataTable.Cell numeric style={{ flex: 4 }}>{formatToCurrencyBR(totalOrder)}</DataTable.Cell>
            </DataTable.Row>

            <DataTable.Row key="tax" onPress={() => setIsTax(true)}>
              <DataTable.Cell style={{ flex: 4 }}>
                <Text>Taxa</Text>
              </DataTable.Cell>
              <DataTable.Cell numeric style={{ flex: 4 }}>{formatToCurrencyBR(parseFloat(taxValue))}</DataTable.Cell>
            </DataTable.Row>

            <DataTable.Row key="discount" onPress={() => setIsDiscount(true)}>
              <DataTable.Cell style={{ flex: 4 }}>Desconto</DataTable.Cell>
              <DataTable.Cell numeric style={{ flex: 4 }}>
                -{!isNaN(parseFloat(discountValue)) ? formatToCurrencyBR(parseFloat(discountValue)) : formatToCurrencyBR(0)}
              </DataTable.Cell>
            </DataTable.Row>

            <DataTable.Row key="total">
              <DataTable.Cell style={{ flex: 4 }}>TOTAL</DataTable.Cell>
              <DataTable.Cell numeric style={{ flex: 4 }}>
                <Text style={{ fontWeight: 'bold' }}>
                  {resultTotal !== null ? formatToCurrencyBR(resultTotal) : formatToCurrencyBR(0)}
                </Text>
              </DataTable.Cell>
            </DataTable.Row>
          </DataTable>
          {/* Mensagem confirmação / fechar comanda */}
          <Portal>
            <Dialog visible={isCloseOrder} onDismiss={() => setIsCloeOrder(false)}>
              <Dialog.Title>Fechar comanda</Dialog.Title>
              <Dialog.Content>
                <Text variant="bodyMedium" style={{ marginBottom: 10 }}>Forma de pagamento:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>

                  {paymentMethods.map(pay => (
                    <Button key={`button${pay.id}`} style={{ margin: 2 }}
                      mode={paymentMethod === pay.id ? 'contained' : 'outlined'}
                      onPress={() => {
                        if (pay.id === 'CASH') {
                          setChangeValueOorder(formatToDoubleBR(0))
                        }
                        setPaymentMethod(pay.id)
                        if (status !== 2)
                          setParamAmmountReceived(pay.id === 'CASH' ? formatToDoubleBR(0) : formatToDoubleBR(totalOrder))
                      }}>{pay.name}
                    </Button>
                  ))}
                </View>

                <Text variant="titleLarge" style={{ margin: 10 }}>
                  À pagar:
                  {status === 2 ?
                    formatToCurrencyBR(totalOrder - amountReceived)
                    :
                    formatToDoubleBR(resultTotal || 0)}</Text>
                <TextInput
                  style={{ margin: 5 }}
                  label="Valor recebido"
                  keyboardType='numeric'
                  value={paramAmountedReceived}
                  onChangeText={(e) => setParamAmmountReceived(formatCurrencyInput(e))}
                />
                {paymentMethod === 'CASH' &&
                  <View>
                    <TextInput
                      style={{ margin: 5 }}
                      label="Troco"
                      disabled
                      keyboardType='numeric'
                      value={changeValueOrder}
                    />
                    <Button
                      onPress={() => {
                        const result = parseFloat(paramAmountedReceived) - resultTotal
                        setChangeValueOorder(formatToDoubleBR(result))
                      }}
                    >Calcular</Button>
                  </View>
                }
              </Dialog.Content>
              <Dialog.Actions>
                <Button onPress={() => setIsCloeOrder(false)}>Cancelar</Button>
                <Button loading={isLoadingSave} onPress={() => closeOrder()}>Finalizar</Button>
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
        </ScrollView>}


      {/* Dialog QRCode  */}
      <Portal>
        <Dialog visible={isOpenQrCode} dismissable={false} onDismiss={() => setIsOpenQrCode(false)}>
          <Dialog.Title>{name}</Dialog.Title>
          <Dialog.Content style={{ margin: -10 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ textAlignVertical: 'center' }}>{`Aponto a câmera do celular e acesse o cardápio digital\n`}</Text>
              <QRCode
                value={`${base_url}/${userContext?.estabId}/1/${id}`}
                size={120}
              />
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsOpenQrCode(false)}>Fechar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
        {/* <Button onPress={() => console.log(data)}>data</Button>
        <Button onPress={() => console.log(ticketData)}>ticker</Button>
        <Button onPress={() => console.log(route.params)}>parmas</Button>
        <Button onPress={() => console.log(openingDate)}>openingDate</Button> */}

    </View>
  )
}