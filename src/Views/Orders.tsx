import { Alert, Dimensions, FlatList, Image, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Avatar, Button, Card, Dialog, Icon, IconButton, Portal, SegmentedButtons, Text, TextInput } from 'react-native-paper'
import { collection, query, where, DocumentData, onSnapshot, orderBy, addDoc, serverTimestamp, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { UserContext } from '../context/UserContext';
import { theme } from '../Services/ThemeConfig';
import { useNavigation, useRoute, } from '@react-navigation/native';
import Loading from '../Components/Loading';
import { OrderItemsData } from '../Interfaces/OrderItems_Interface';
import moment from 'moment';
import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
import { NfcReader } from '../Components/NfcReader';
import { getDataNfcTicket, readTagNfc, printThermalPrinter } from '../Services/Functions';
import QRCode from 'react-native-qrcode-svg';
import 'text-encoding';
import { base_url } from '../Services/config';


interface RouteParams {
  qrCodeData: string
}


export default function Orders() {
  const { width } = Dimensions.get('window');
  const userContext = useContext(UserContext)
  const [ticketType, setTicketType] = useState(1) //1-QrCode 2-Mesa 3-Delivey 4-Nfc

  const route = useRoute()
  const { qrCodeData } = route.params as RouteParams || {}

  const [orders, setOrders] = useState<DocumentData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpenNewTicket, setIsOpenNewTicket] = useState(false)
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  const [savedNewTicket, setSavedNewTicket] = useState("")
  const [idNewTicket, setIdNewTicket] = useState("")
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

  const [isOpenSearchConsumer, setIsOpenSearchConsumer] = useState(false)
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false);

  const numberTickets = orders.length || 0

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
        closeOrder(selectedTicket?.id, selectedTicket?.local, selectedTicket?.openingDate.toDate(), selectedTicket?.name, selectedTicket?.status, selectedTicket?.type)
        //limpo o qrCode
        navigation.setParams({ qrCodeData: '' });
      }
    }
  }, [qrCodeData])

  const handleCancelTechnologyRequest = () => {
    console.log('cancelando..')
    NfcManager.cancelTechnologyRequest()
  }

  const closeOrder = (id: string, local: string, openingDate: Date, name: string, status: string, type: string) => {
    navigation.navigate('CloseOrder', { id: id, local: local, openingDate: openingDate.toISOString(), name: name, status: status, type: type })
  }

  const closeOrderNFC = async () => {
    const tag = await readTagNfc(setIsOpenNFC)
    if (tag?.id) {
      const data = await getDataNfcTicket(tag.id, userContext?.estabId || "")
      if (data) {
        const selectedTicket = orders.find((item) => item.id === data.id)
        if (selectedTicket) {
          closeOrder(selectedTicket?.id, selectedTicket?.local, selectedTicket?.openingDate.toDate(), selectedTicket?.name, selectedTicket?.status, selectedTicket?.type)
        }
      } else {
        Alert.alert('Comanda inválida.')
      }
    }
  }

  useEffect(() => {
    fetchData()
  }, [statusTicket]);

  const fetchData = () => {
    const q = query(
      collection(db, 'Ticket'),
      where("establishment", "==", userContext?.estabId),
      where('status', '==', parseInt(statusTicket)),
      orderBy('openingDate', 'desc'),
      limit(200),
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
  }

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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

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
    setIsLoadingSave(true)
    try {
      const ticketRef = collection(db, "Ticket");
      paramsTicket.type = ticketType
      const saveTicket = await addDoc(ticketRef, paramsTicket)
      if (saveTicket) {
        setIdNewTicket(saveTicket?.id)
        if (ticketType === 1) {
          setSavedNewTicket(`${base_url}/${userContext?.estabId}/1/${saveTicket.id}`)
          // printTicket({
          //   id: saveTicket.id,
          //   name: paramsTicket.name,
          //   local: paramsTicket.local,
          //   document: paramsTicket.document,
          //   phone: paramsTicket.phone
          // })
        }
      }
    } catch (error) {
      console.log('erro....')
      console.error(error);
    } finally {
      setIsLoadingSave(false);
    }
  }

  const filteredData = orders.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const searchConsumer = () => {
    setIsOpenSearchConsumer(true)
  }

  const selectConsumer = (item: DocumentData) => {
    setIsOpenSearchConsumer(false)
    closeOrder(item.id, item.local, item.openingDate.toDate(), item.name, item.status, item.type)
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
      `[L]<qrcode>${base_url}${userContext?.estabId}/1/${params.id}</qrcode>\n` +
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
      `[L]<qrcode size='20'>${base_url}/${userContext?.estabId}</qrcode>\n\n` +
      `[C]Agradecemos a preferencia!\n`
    printThermalPrinter(text3)
  }

  const printLocalTicket = async () => {
    const text =
      `[C]<u><font size='tall'>CARDAPIO DIGITAL</font></u>\n` +
      `[L]\n` +
      `[C]Acesse o QR Code para pedir:\n` +
      `[L]\n` +
      `[L]<qrcode size='20'>${base_url}/${userContext?.estabId}/2/${encodeURIComponent(paramsTicket.name.trim())}</qrcode>\n` +
      `[L]${paramsTicket.name}\n`
    printThermalPrinter(text)
  }

  const loadMoreData = async () => {
    if (orders) {
      const q = query(
        collection(db, 'Ticket'),
        where("establishment", "==", userContext?.estabId),
        where('status', '==', parseInt(statusTicket)),
        orderBy('openingDate', 'desc'),
        //  orderBy('id'),
        limit(200),
        startAfter(orders[orders.length - 1].openingDate),
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

  const openQrCodeReader = () => {
    navigation.navigate('QrCodeReader', { backPage: 'Orders' });
  }

  const closeDialogNewTicket = () => {
    setIsOpenNewTicket(false)
    setParamsTicket(emptyParamsTicket)
    setSavedNewTicket("")
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
    grid: {
       flexDirection: 'row',
       flexWrap: 'wrap',
    },
    card: {
      width: width * 0.46,
      margin: width * 0.02,
      
    },
    container: {
      maxHeight: 350,
      borderStyle: 'solid',
      borderWidth: 0.3,
      marginBottom: 10
    },
    item: {
      padding: 4,
      marginLeft: 10,
    },
  })

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? <Loading /> :
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollViewContent}>
          <View style={{ flexDirection: 'row', marginBottom: 5, margin: 5 }}>
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
                onPress={searchConsumer}
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
                onPress={() => {
                  if (userContext?.expiredSubscription) {
                    Alert.alert("Wise Menu", "Não é possível abrir nova comanda.")
                  } else {
                    setIsOpenNewTicket(true)
                  }
                }}
              />
            </View>
          </View>
          {statusTicket !== "0" ?
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
              <Icon source="circle" color={'green'} size={17} />
              <Text variant="bodyLarge" style={{ marginLeft: 5 }}>{`Em aberto: (${numberTickets})`}</Text>
            </View>
            :
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
              <Icon source="circle" color={'red'} size={17} />
              <Text variant="bodyLarge" style={{ marginLeft: 5 }}>{`Fechadas: (${numberTickets})`}</Text>
            </View>
          }



          <View style={styles.grid}>
            {orders.map((item, index) => (
              <Card key={index}
                style={[styles.card, { backgroundColor: item.status === 1 ? '#196F3D' : '#C0392B' }]}
              >
                <Card style={{ backgroundColor: '#EBEDEF', height: 225 }}
                  onPress={() => [closeOrder(item.id, item.local, item.openingDate.toDate(), item.name, item.status, item.type)]}
                // onLongPress={() => Alert.alert(
                //   'Reimprimir Ticket?',
                //   item.name,
                //   [
                //     { text: 'Cancelar', style: 'cancel' },
                //     {
                //       text: 'Sim',
                //       onPress: () => {
                //         printTicket({
                //           id: item.id,
                //           name: item.name,
                //           document: item.document,
                //           local: item.local
                //         })
                //       },
                //     },
                //   ],
                //   { cancelable: true } // Define se o Alert pode ser fechado ao tocar fora dele
                // )}
                >
                  <Card.Title
                    title={`${item?.name}`}
                    titleStyle={{ fontSize: 14, fontWeight: 'bold' }}
                    subtitleStyle={{ fontSize: 10, marginTop: -10, color: 'gray' }}
                    subtitle={ //QrCode || NFC
                      item.status === 1 && item.openingDate !== '' && item.openingDate !== undefined ?
                        `${moment(item?.openingDate?.toDate()).format('DD/MM/YY HH:mm')}` :
                        item.status === 0 && `Fechada em: ${moment(item?.closingDate.toDate()).format('DD/MM/YY HH:mm')}`
                    }
                  />
                  <Card.Content>
                    <View style={{ marginTop: 10 }}>
                      {item?.type === 1 || item?.type === 4 ? //QrCode || NFC
                        <View style={{ alignItems: 'center' }}>
                          <Icon
                            source="account"
                            color={theme.colors.primary}
                            size={40}
                          />
                          <Text style={{ fontSize: 10, color: theme.colors.primary }}>{item.local}</Text>
                        </View> : item.type === 2 ?
                          <View style={{ alignItems: 'center' }}>
                            <Icon
                              source="account-group"
                              color={theme.colors.primary}
                              size={40}
                            />
                            <Text style={{ fontSize: 10 }}>{item.local}</Text>
                          </View> : item.type === 3 && //Delivery
                          <View style={{ alignItems: 'center' }}>
                            <Icon
                              source="moped-outline"
                              color={theme.colors.primary}
                              size={40}
                            />
                            <Text style={{ fontSize: 10 }}>Delivery</Text>
                          </View>
                      }
                    </View>
                  </Card.Content>
                </Card>
                <View style={{ position: 'absolute', bottom: 10, left: 10, right: 10 }}>
                  <Text style={{ fontSize: 12, color: theme.colors.text }}>{item?.local}</Text>
                </View>
              </Card>
            ))}
          </View>



          <View style={{ marginBottom: 20, marginTop: 20, alignItems: 'center' }}>
            {isLoadingMoreData ? <ActivityIndicator size={20} style={{ margin: 20 }} /> :
              orders.length >= 3 &&
              <IconButton
                icon="dots-horizontal"
                iconColor={ticketType === 3 ? theme.colors.primary : theme.colors.secondary}
                size={25}
                mode='contained'
                onPress={() => loadMoreData()}
              />

            }
          </View>
        </ScrollView>
      }


      <Portal>
        <Dialog visible={isOpenNewTicket} onDismiss={() => setIsOpenNewTicket(false)}>
          <Dialog.Title>{savedNewTicket ? paramsTicket.name : "Abertura de comanda"}</Dialog.Title>
          {savedNewTicket ?
            <Dialog.Content>
              <View style={{ alignItems: 'center' }}>
                <Text style={{ textAlignVertical: 'center' }}>{`Aponto a câmera do celular e acesse o cardápio digital\n`}</Text>
                <QRCode
                  value={savedNewTicket}
                  size={120}
                />
              </View>
            </Dialog.Content> :
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
            </Dialog.Content>}
          <Dialog.Actions>
            <Button onPress={closeDialogNewTicket}>Fechar</Button>
            {!savedNewTicket ?
              <Button
                // disabled={isLoadingSave}
                loading={isLoadingSave}
                onPress={() => ticketType === 2 ? printLocalTicket() : openNewTicket()}>
                Salvar
              </Button> :
              <Button
                icon="printer"
                onPress={() => {
                  printTicket({
                    id: idNewTicket,
                    name: paramsTicket.name,
                    local: paramsTicket.local,
                    document: paramsTicket.document,
                    phone: paramsTicket.phone
                  })
                }}>
                Imprimir Ticket
              </Button>
            }
          </Dialog.Actions>
          <NfcReader
            isOpenNFC={isOpenNFC}
            setIsOpenNFC={setIsOpenNFC}
            cancelTechnologyRequest={handleCancelTechnologyRequest}
          />
        </Dialog>
      </Portal>


      <Portal>
        <Dialog visible={isOpenSearchConsumer} onDismiss={() => [setIsOpenSearchConsumer(false)]}>
          <Dialog.Title >Buscar cliente</Dialog.Title>
          <Dialog.Content style={{ marginTop: 10 }}>
            <View style={styles.container}>
              <TextInput
                label="Pesquisar por nome"
                keyboardType='default'
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {isLoadingSearch ?
                <View style={{ padding: 20 }}>
                  <ActivityIndicator />
                </View> :
                <FlatList
                  data={filteredData}
                  keyExtractor={item => item?.id?.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => selectConsumer(item)}>
                      <Text variant="titleLarge" style={styles.item}>{item.name}</Text>
                    </TouchableOpacity>
                  )}

                // renderItem={({ item }) => <Text style={styles.item}>{item.name}</Text>}
                />}
            </View>



            <Dialog.Actions>
              <Button onPress={() => setIsOpenSearchConsumer(false)}>
                Cancelar
              </Button>
            </Dialog.Actions>
          </Dialog.Content>
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