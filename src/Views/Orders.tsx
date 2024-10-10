import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Avatar, Button, Card, Dialog, Icon, IconButton, Portal, SegmentedButtons, Text, TextInput } from 'react-native-paper'
import { collection, query, where, DocumentData, onSnapshot, orderBy, addDoc, serverTimestamp, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { UserContext } from '../context/UserContext';
import ThermalPrinterModule from 'react-native-thermal-printer'
import { theme } from '../Services/ThemeConfig';
import { useNavigation, useRoute, } from '@react-navigation/native';
import Loading from '../Components/Loading';
import { OrderItemsData } from '../Interfaces/OrderItems_Interface';
import moment from 'moment';
import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
import { NfcReader } from '../Components/NfcReader';
import { getDataNfcTicket, readTagNfc, printThermalPrinter } from '../Services/Functions';


interface RouteParams {
  qrCodeData: string
}


export default function Orders() {

  const userContext = useContext(UserContext)
  const [ticketType, setTicketType] = useState(1) //1-QrCode 2-Mesa 3-Delivey 4-Nfc

  const route = useRoute()
  const { qrCodeData } = route.params as RouteParams || {}

  const [orders, setOrders] = useState<DocumentData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpenNewTicket, setIsOpenNewTicket] = useState(false)
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  const navigation = useNavigation()
  const [emptyParamsTicket] = useState<DocumentData>({
    name: "",
    document: "",
    phone: "",
    local: "",
    establishment: userContext?.estabId,
    openingDate: serverTimestamp(),
    closingDate: "",
    status: 1,
    type: 1,
    idTag: ""
  })
  const [paramsTicket, setParamsTicket] = useState<DocumentData>(emptyParamsTicket)
  const [statusTicket, setStatusTicket] = useState('1')
  const [isLoadingMoreData, setIsLoadingMoreData] = useState(false)
  const [isOpenNFC, setIsOpenNFC] = useState(false)

  useEffect(() => {
    return () => {
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.setEventListener(NfcEvents.SessionClosed, null);
    };
  }, []);


  useEffect(() => {
    //Ao fazer leitura do QrCode, direciona para tela de fechamento.
    if (qrCodeData) {
      const urlSplit = qrCodeData.split("/")
      const ticketNumber = urlSplit[urlSplit.length - 1]
      const selectedTicket = orders.find((item) => item.id === ticketNumber)
      if (selectedTicket) {
        closeOrder(selectedTicket?.id, selectedTicket?.local, selectedTicket?.openingDate.toDate(), selectedTicket?.name)
        //limpo o qrCode
        navigation.setParams({ qrCodeData: '' });
      }
    }
  }, [qrCodeData])

  const handleCancelTechnologyRequest = () => {
    console.log('cancelando..')
    NfcManager.cancelTechnologyRequest()
  }

  const closeOrder = (id: string, local: string, openingDate: Date, name: string) => {
    navigation.navigate('CloseOrder', { id: id, local: local, openingDate: openingDate.toISOString(), name: name })
  }

  const closeOrderNFC = async () => {
    const tag = await readTagNfc(setIsOpenNFC)
    if (tag?.id) {
      const data = await getDataNfcTicket(tag.id)
      if (data) {
        const selectedTicket = orders.find((item) => item.id === data.id)
        if (selectedTicket) {
          closeOrder(selectedTicket?.id, selectedTicket?.local, selectedTicket?.openingDate.toDate(), selectedTicket?.name)
        }
      } else {
        Alert.alert('Comanda inválida.')
      }
    }
  }

  useEffect(() => {
    const q = query(
      collection(db, 'Ticket'),
      where("establishment", "==", userContext?.estabId),
      where('status', '==', parseInt(statusTicket)),
      orderBy('name'),
      limit(20),
    );
    setIsLoading(true)
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const ordersData: DocumentData[] = [];
        querySnapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() })
        });
        setOrders(ordersData);
      } catch {
        Alert.alert('Erro ao carregar os dados. tente novamente.')
      } finally {
        setIsLoading(false)
      }
    });
    // O retorno de useEffect é utilizado para realizar a limpeza do ouvinte quando o componente é desmontado
    return () => unsubscribe();
  }, [statusTicket]);

  const isValidTicket = async (idTag: string) => {
    try {
      const q = query(
        collection(db, "Ticket"),
        where("idTag", "==", idTag),
        where("status", "==", 1)
      )
      const querySnapshot = await getDocs(q)
      if (querySnapshot.empty) {
        return true
      }
    } catch {
      return false
    }
    return false
  }

  const readNFC = async () => {
    setIsOpenNFC(true)
    try {
      const tag = await readTagNfc(setIsOpenNFC)
      if (tag?.id) {
        const validTicket = await isValidTicket(tag?.id)
        if (validTicket) {
          setParamsTicket((prevData) => ({
            ...prevData,
            idTag: tag?.id
          }))
        } else {
          Alert.alert('Comanda em uso.', `Comanda com dados cadastrados.\nPor favor, verifique.`)
          setTicketType(1)
        }
      }
    } catch (ex) {
      console.log(ex);
    } finally {
      setIsOpenNFC(false)
      // Parar a sessão de leitura NFC
      NfcManager.cancelTechnologyRequest();
    }
  };


  const openNewTicket = async () => {
    console.log('salvando...')
    setIsLoadingSave(true)
    try {
      const ticketRef = collection(db, "Ticket");
      paramsTicket.type = ticketType
      const saveTicket = await addDoc(ticketRef, paramsTicket)
      if (saveTicket) {
        setIsOpenNewTicket(false)
        if (ticketType === 1) {
          console.log('imprimindo...')
          printTicket({
            id: saveTicket.id,
            name: paramsTicket.name,
            local: paramsTicket.local,
            document: paramsTicket.document,
            phone: paramsTicket.phone
          })
        }
      }
    } catch (error) {
      console.log('erro....')
      console.error(error);
    } finally {
      setIsLoadingSave(false);
    }
  }


  const printTicket = async (params: DocumentData) => {
    const text =
      `[L]\n` +
      `[L]\n` +
      `[C]<u><font size='tall'>${userContext?.estabName}</font></u>\n` +
      `[L]\n` +
      `[C]COMANDA DIGITAL DE CONSUMO\n` +
      `[L]\n` +
      `[C]Acesse o QR Code para pedir:\n` +
      `[L]\n` +
      `[L]<qrcode>http://192.168.1.114:3000/menu/${userContext?.estabId}/1/${params.id}</qrcode>\n` +
      `[L]\n` +
      `[L]\n` +
      // `[C]<barcode type='ean13' height='10'>${gerarCodigoComanda()}</barcode>\n` +
      `[L]\n` +
      `[L]<b>Dados desta comanda:</b>\n` +
      `[L]<font size='tall'>Nome: ${params.name}</font>\n` +
      `[L]Documento: ${params.document}\n` +
      `[L]Local: ${params.local}\n` +
      `[L]\n` +
      `[C]<b><font size='tall'>ATENCAO</font></b>\n` +
      `[L]Este ticket deve ser armazenado em local seguro.\n` +
      `[L]A perda deste ticket pode acarretar prejuizo financeiro.\n`
    await printThermalPrinter(text)
  }

  const printDelivery = async () => {
    const text3 =
      `[C]<u><font size='tall'>${userContext?.estabName} DELIVERY</font></u>\n` +
      `[L]\n` +
      `[C]Peca de onde estiver.\n` +
      `[C]Acesse o QR Code para pedir:\n` +
      `[L]\n` +
      `[L]<qrcode size='20'>http://192.168.1.114:3000/menu/${userContext?.estabId}/3/Delivery</qrcode>\n\n` +
      `[C]Agradecemos a preferencia!\n`
    printThermalPrinter(text3)
  }

  const printLocalTicket = async () => {
    const text =
      `[C]<u><font size='tall'>CARDAPIO DIGITAL</font></u>\n` +
      `[L]\n` +
      `[C]Acesse o QR Code para pedir:\n` +
      `[L]\n` +
      `[L]<qrcode size='20'>http://192.168.1.114:3000/menu/${userContext?.estabId}/2/${encodeURIComponent(paramsTicket.name.trim())}</qrcode>\n` +
      `[L]${paramsTicket.name}\n`
    printThermalPrinter(text)
  }

  const loadMoreData = async () => {
    if (orders) {
      const q = query(
        collection(db, 'Ticket'),
        where("establishment", "==", userContext?.estabId),
        where('status', '==', parseInt(statusTicket)),
        orderBy('name'),
        //  orderBy('id'),
        limit(20),
        startAfter(orders[orders.length - 1].name),
      );
      try {
        setIsLoadingMoreData(true)
        const querySnapshot = await getDocs(q)
        let dat: Array<OrderItemsData> = [];
        querySnapshot.forEach((item) => {
          dat.push(item.data() as OrderItemsData)
        })
        if (dat) {
          setOrders(prevOrders => [...prevOrders, ...dat])
        }
      } catch (e) {
        console.log(e)
      } finally {
        setIsLoadingMoreData(false)
      }
    };
  }

  const getInitialsName = (name: string) => {
    const splitName = name.split(' ')
    // Pega as iniciais de cada parte do nome
    const initial = splitName.map((part) => part.charAt(0));
    // Verifica o número de partes
    let initialsName = ''
    if (splitName.length === 1) {
      // Se houver apenas um nome, pegue a primeira inicial
      initialsName = initial[0]
    } else {
      // Se houver mais de um nome, pegue as duas primeiras iniciais
      initialsName = initial.slice(0, 2).join('')
    }
    return initialsName.toUpperCase()
  }

  const openQrCodeReader = () => {
    navigation.navigate('QrCodeReader', { backPage: 'Orders' });
  }

  const styles = StyleSheet.create({
    scrollViewContent: {
      flexGrow: 1,
    },
    fab: {
      position: 'absolute',
      margin: 12,
      right: 10,
      bottom: 10,
      backgroundColor: theme.colors.primary
    },
    card: {
      marginLeft: 8,
      marginRight: 8,
      marginBottom: 10,
      paddingRight: 6,
    }
  })

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? <Loading /> :
        <ScrollView contentContainerStyle={styles.scrollViewContent}>
          <View style={{ flexDirection: 'row', marginBottom: 10, margin: 5 }}>
            <View style={{ width: '40%', padding: 10 }}>
              <SegmentedButtons
                value={statusTicket}
                onValueChange={setStatusTicket}
                buttons={[
                  {
                    value: '1',
                    label: '',
                    icon: 'lock-open-variant-outline'
                  },
                  {
                    value: '0',
                    label: '',
                    icon: 'lock'
                  },
                ]}
              />
            </View>
            <View style={{ width: '60%', flexDirection: 'row', justifyContent: 'flex-end', padding: 5 }}>
              <IconButton
                icon={'magnify'}
                size={22}
                mode='outlined'
                onPress={() => console.log(qrCodeData)}
              />
              <IconButton
                icon={'contactless-payment'}
                size={22}
                mode='outlined'
                onPress={() => closeOrderNFC()}
              />
              <IconButton
                icon={'qrcode-scan'}
                size={22}
                mode='outlined'
                onPress={() => openQrCodeReader()}
              />
              <IconButton
                icon={'plus'}
                size={22}
                mode='outlined'
                onPress={() => setIsOpenNewTicket(true)}
              />
            </View>
          </View>
          {/* {orders.map((order, index) => (
            <View key={index}>
              <Card style={{ margin: "2%", marginTop: 0, paddingRight: 10 }}>
                <Card.Title title={`${order?.local}`} subtitle={""}
                  left={(props) => <Avatar.Icon {...props} icon="table-chair" />}
                
                />
                <Card.Actions>
                  <Button onPress={() => closeOrder(order.id, order.local, order.openingDate)} mode="outlined">Fechar</Button>
                </Card.Actions>
              </Card>
            </View>
          ))} */}



          {orders.map((item, index) => (
            <Card key={index}
              style={[styles.card, { backgroundColor: item.status === 1 ? '#196F3D' : '#C0392B' }]}
            >
              <Card style={{ backgroundColor: '#EBEDEF' }}
                onPress={() => [closeOrder(item.id, item.local, item.openingDate.toDate(), item.name)]}
                onLongPress={() => Alert.alert(
                  'Reimprimir Ticket?',
                  item.name,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Sim',
                      onPress: () => {
                        printTicket({
                          id: item.id,
                          name: item.name,
                          document: item.document,
                          local: item.local
                        })
                      },
                    },
                  ],
                  { cancelable: true } // Define se o Alert pode ser fechado ao tocar fora dele
                )}
              >
                <Card.Title
                  title={`${item?.name}`}
                  subtitleStyle={{ fontSize: 10, marginTop: -10, color: 'gray' }}
                  subtitle={item.type === 1 || item.type === 4 ? //QrCode || NFC
                    item.status === 1 && item.openingDate !== '' && item.openingDate !== undefined ?
                      `Aberta em: ${moment(item?.openingDate?.toDate()).format('DD/MM/YY HH:mm')}` :
                      item.status === 0 && `Fechada em: ${moment(item?.closingDate.toDate()).format('DD/MM/YY HH:mm')}` :
                    item.type === 3 && item.local
                  }
                  left={() =>
                    <View >
                      {item?.type === 1 || item?.type === 4 ? //QrCode || NFC
                        <View style={{ alignItems: 'center' }}>
                          {/* <Icon
                            source="account"
                            color={theme.colors.primary}
                            size={30}
                          /> */}
                          <Avatar.Text size={40} label={getInitialsName(item.name)} />
                          <Text style={{ fontSize: 10, color: theme.colors.primary }}>{item.local}</Text>
                        </View> : item.type === 2 ?
                          <View style={{ alignItems: 'center' }}>
                            <Icon
                              source="account-group"
                              color={theme.colors.primary}
                              size={30}
                            />
                            <Text style={{ fontSize: 10 }}>{item.local}</Text>
                          </View> : item.type === 3 && //Delivery
                          <View style={{ alignItems: 'center' }}>
                            <Icon
                              source="moped-outline"
                              color={theme.colors.primary}
                              size={30}
                            />
                            <Text style={{ fontSize: 10 }}>Delivery</Text>
                          </View>

                      }

                    </View>}
                />
                {/* <Card.Content>
                  <Text style={{ marginRight: -5 }}>
                    {item.local}
                  </Text>
                </Card.Content> */}













              </Card>
            </Card>
          ))}

          {/* <DataTable style={{ marginTop: 10 }}>
            {orders.map((item, index) => (
              <>
                <DataTable.Row key={index} onPress={() => [closeOrder(item.id, item.local, item.openingDate.toDate(), item.name)]}>
                  <DataTable.Cell key={1} style={{ flex: 1 }}>{item?.type === 1 ?
                    <Icon
                      source="account"
                      //color={'gray'}
                      size={18}
                    /> : item.type === 2 ?
                      <Icon
                        source="account-group"
                        //  color={'gray'}
                        size={18}
                      /> :
                      <Icon
                        source="moped-outline"
                        // color={'gray'}
                        size={18}
                      />

                  }</DataTable.Cell>
                  <DataTable.Cell key={2} style={{ flex: 7 }}>
                    {item?.name}
                  </DataTable.Cell>
                  <DataTable.Cell key={3} numeric style={{ flex: 5 }}>
                    <Text>{item.type === 1 && item?.local}</Text>
                  </DataTable.Cell>
                </DataTable.Row>
              </>
            ))}
          </DataTable> */}

          {/* <Button onPress={() => console.log(orders)}>orders</Button>
          <Button onPress={() => printTicket('tezste')}>print</Button> */}

          <View style={{ marginBottom: 20, marginTop: 20, alignItems: 'center' }}>
            {isLoadingMoreData ? <ActivityIndicator size={20} style={{ margin: 20 }} /> :
              orders.length >= 3 &&
              // <Button
              //   style={{ marginBottom: 20, width: 180 }}
              //   mode='contained'
              //   onPress={() => loadMoreData()}>
              //   Carregar mais
              // </Button>

              <IconButton
                icon="dots-horizontal"
                iconColor={ticketType === 3 ? theme.colors.primary : theme.colors.secondary}
                size={25}
                mode='contained'
                onPress={() => loadMoreData()}
              />

            }
          </View>

          {/* <Button onPress={() => console.log(orders)}>data</Button> */}

        </ScrollView>}

      {/* <FAB
        color={theme.colors.background}
        style={styles.fab}
        icon="plus"
        onPress={() => setIsOpenNewTicket(true)}
      /> */}


      <Portal>
        <Dialog visible={isOpenNewTicket} onDismiss={() => setIsOpenNewTicket(false)}>
          <Dialog.Title>{"Abertura de comanda"}</Dialog.Title>
          <Dialog.Content style={{ margin: -10 }}>
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                iconColor={ticketType === 1 ? theme.colors.primary : theme.colors.secondary}
                icon="qrcode"
                size={25}
                onPress={() => [setParamsTicket(emptyParamsTicket), setTicketType(1)]}
              />
              <IconButton
                iconColor={ticketType === 4 ? theme.colors.primary : theme.colors.secondary}
                icon="contactless-payment"
                size={25}
                onPress={() => [setParamsTicket(emptyParamsTicket), setTicketType(4), readNFC()]}
              />
              <IconButton
                icon="account-group"
                iconColor={ticketType === 2 ? theme.colors.primary : theme.colors.secondary}
                size={25}
                onPress={() => [setParamsTicket(emptyParamsTicket), setTicketType(2)]}
              />
              <IconButton
                icon="moped-outline"
                iconColor={ticketType === 3 ? theme.colors.primary : theme.colors.secondary}
                size={25}
                onPress={() => [setParamsTicket(emptyParamsTicket), setTicketType(3)]}
              />
            </View>
            {ticketType !== 3 &&
              <TextInput
                style={{ margin: 5, marginTop: 10 }}
                label="Nome"
                value={paramsTicket.name}
                onChangeText={(text) => setParamsTicket((prevData) => ({ ...prevData, name: text }))}
              />
            }
            {ticketType !== 2 && ticketType !== 3 &&
              <>
                <TextInput
                  style={{ margin: 5, marginTop: 10 }}
                  label="Telefone"
                  keyboardType='phone-pad'
                  value={paramsTicket.phone}
                  onChangeText={(text) => setParamsTicket((prevData) => ({ ...prevData, phone: text }))}
                />
                <TextInput
                  style={{ margin: 5, marginTop: 10 }}
                  label="Documento"
                  keyboardType='numeric'
                  value={paramsTicket.document}
                  onChangeText={(text) => setParamsTicket((prevData) => ({ ...prevData, document: text }))}
                />
              </>
            }
            {ticketType !== 3 &&
              <>
                <TextInput
                  style={{ margin: 5, marginTop: 10 }}
                  label={ticketType === 2 ? "Referencia" : "Local"}
                  keyboardType='default'
                  value={paramsTicket.local}
                  onChangeText={(text) => setParamsTicket((prevData) => ({ ...prevData, local: text }))}
                />
                {ticketType === 4 && paramsTicket.idTag &&
                  <View style={{ flexDirection: 'row', marginLeft: 5 }}>
                    <Icon
                      source="contactless-payment"
                      size={15}
                    />
                    <Text variant='labelSmall'> {paramsTicket?.idTag}</Text>
                  </View>
                }
              </>
            }
            {ticketType === 3 &&
              <Button style={{ margin: 15 }} mode='contained' onPress={() => printDelivery()}>Imprimir Ticket Delivery</Button>
            }
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => [setIsOpenNewTicket(false), setParamsTicket(emptyParamsTicket)]}>Cancelar</Button>
            <Button
              // disabled={isLoadingSave}
              loading={isLoadingSave}
              onPress={() => ticketType === 2 ? printLocalTicket() : openNewTicket()}>
              Salvar
            </Button>
          </Dialog.Actions>
          <NfcReader
            isOpenNFC={isOpenNFC}
            setIsOpenNFC={setIsOpenNFC}
            cancelTechnologyRequest={handleCancelTechnologyRequest}
          />
        </Dialog>

      </Portal>

      <NfcReader
        isOpenNFC={isOpenNFC}
        setIsOpenNFC={setIsOpenNFC}
        cancelTechnologyRequest={handleCancelTechnologyRequest}
      />
    </View>
  )
}