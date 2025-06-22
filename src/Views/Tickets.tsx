import { Alert, Dimensions, FlatList, Image, RefreshControl, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Avatar, Button, Card, Dialog, Icon, Switch, IconButton, Portal, SegmentedButtons, Text, TextInput } from 'react-native-paper'
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


export default function Tickets() {
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
  const [fixedTicketType, setFixedTicketType] = useState('0')
  const [isPausedPrint, setIsPausedPrint] = useState(false)
  const [sequentialNumber, setSequentialNumber] = useState({
    start: '1',
    end: '5'
  })

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
        closeOrder(selectedTicket)
        //limpo o qrCode
        navigation.setParams({ qrCodeData: '' });
      }
    }
  }, [qrCodeData])

  const handleCancelTechnologyRequest = () => {
    NfcManager.cancelTechnologyRequest()
  }

  const closeOrder = (ticket: DocumentData) => {
    const formartDate = ticket?.openingDate?.toDate().toISOString()
    const formatTicket = { ...ticket, openingDate: formartDate }
    navigation.navigate('CloseOrder', formatTicket)
  }

  const closeOrderNFC = async () => {
    const tag = await readTagNfc(setIsOpenNFC)
    if (tag?.id) {
      const data = await getDataNfcTicket(tag.id, userContext?.estabId || "")
      if (data) {
        const selectedTicket = orders.find((item) => item.id === data.id)
        if (selectedTicket) {
          closeOrder(selectedTicket)
        }
      } else {
        Alert.alert('Comanda inválida.')
      }
    }
  }


  useEffect(() => {
    fetchData(statusTicket)
  }, [statusTicket]);


  const fetchData = async (statusTicket: string) => {
    const q = query(
      collection(db, 'Establishment', userContext?.estabId, 'Tickets'),
      where("establishment", "==", userContext?.estabId),
      where('status', '==', parseInt(statusTicket)),
      orderBy('openingDate', 'desc'),
      limit(200),
    );
    setIsLoading(true)
    try {
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(item => ({ id: item.id, ...item.data() }))
      setOrders(data)
    } catch {
      setOrders([])
    } finally {
      setIsLoading(false)
    }
  }

  const isValidTicket = async (idTag: string) => {
    try {
      const q = query(
        collection(db, 'Establishment', userContext?.estabId, 'Tickets'),
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData(statusTicket);
    setRefreshing(false);
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
    setIsLoadingSave(true)
    try {
      const ticketRef = collection(db, "Establishment", userContext.estabId, "Tickets");
      paramsTicket.type = ticketType
      const saveTicket = await addDoc(ticketRef, paramsTicket)
      if (saveTicket) {
        setIdNewTicket(saveTicket?.id)
        if (ticketType === 1) {
          console.log('url', `${base_url}/${userContext?.estabId}/1/${saveTicket.id}`)
          setSavedNewTicket(`${base_url}/${userContext?.estabId}/1/${saveTicket.id}`)
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
    closeOrder(item)
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
      `[L]<qrcode>${base_url}/${userContext?.estabId}/1/${params.id}</qrcode>\n` +
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
    if (fixedTicketType === '1' && ticketType === 2) {
      let start = parseInt(sequentialNumber.start)
      let end = parseInt(sequentialNumber.end)
      if (start < end) {
        for (let i = start; i <= end; i++) {
          const name = `${paramsTicket.name.trim()} ${i.toString()}`
          const text =
            `[L]<qrcode size='20'>${base_url}/${userContext?.estabId}/2/${encodeURIComponent(name)}</qrcode>\n` +
            `[L]${name}\n`
          if (isPausedPrint) {
            await new Promise<void>((resolve) => {
              setTimeout(async () => {
                await printThermalPrinter(text);
                resolve(); // Resolve a Promise quando a impressão terminar
              }, 1000); // Tempo de delay
            });
          } else {
            await printThermalPrinter(text);
          }
        }
      }
    } else {
      const text =
        `[C]<u><font size='tall'>CARDAPIO DIGITAL</font></u>\n` +
        `[L]\n` +
        `[C]Acesse o QR Code para pedir:\n` +
        `[L]\n` +
        `[L]<qrcode size='20'>${base_url}/${userContext?.estabId}/2/${encodeURIComponent(paramsTicket.name.trim())}</qrcode>\n` +
        `[L]${paramsTicket.name}\n`
      await printThermalPrinter(text)
    }
  }


  const loadMoreData = async () => {
    if (orders) {
      const q = query(
        collection(db, 'Establishment', userContext?.estabId, 'Tickets'),
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
      {isLoading && <Loading />}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollViewContent}>
        <View style={{ flexDirection: 'row', marginBottom: 5, margin: 5 }}>
          <View style={{ width: '50%', padding: 10, display: 'flex', flexDirection: 'row' }}>

            <IconButton style={{ margin: 4 }}
              icon={"lock-open-variant-outline"}
              mode={statusTicket === '1' ? 'contained' : 'outlined'}
              onPress={() => {
                setStatusTicket('1')
              }}
            />
            <IconButton style={{ margin: 4 }}
              icon={"lock"}
              mode={statusTicket === '0' ? 'contained' : 'outlined'}
              onPress={() => {
                setStatusTicket('0')
              }}
            />
            <IconButton style={{ margin: 4 }}
              icon={"cash-remove"}
              mode={statusTicket === '2' ? 'contained' : 'outlined'}
              onPress={() => {
                setStatusTicket('2')
              }}
            />
          </View>

          <View style={{ width: '50%', flexDirection: 'row', justifyContent: 'flex-end', padding: 5, marginTop: 5 }}>
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
                // if (userContext?.expiredSubscription) {
                //   Alert.alert("Wise Menu", "Não é possível abrir nova comanda.")
                // } else {
                  setIsOpenNewTicket(true)
                //}
              }}
            />
          </View>
        </View>
        {statusTicket === "1" && !isLoading ? //Aberto
          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
            <Icon source="circle" color={'green'} size={17} />
            <Text variant="bodyLarge" style={{ marginLeft: 5 }}>{`Em aberto: (${numberTickets})`}</Text>
          </View>
          : statusTicket === "0" && !isLoading ? //Fechada
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
              <Icon source="circle" color={'red'} size={17} />
              <Text variant="bodyLarge" style={{ marginLeft: 5 }}>{`Fechadas: (${numberTickets})`}</Text>
            </View> : !isLoading && //2 Em débito
            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
              <Icon source="circle" color={'orange'} size={17} />
              <Text variant="bodyLarge" style={{ marginLeft: 5 }}>{`Em Débito: (${numberTickets})`}</Text>
            </View>
        }



        {!isLoading &&
          <View style={styles.grid}>
            {orders.map((item, index) => (
              <Card key={index}
                style={[styles.card, { backgroundColor: item.status === 1 ? '#196F3D' : '#C0392B' }]}
              >
                <Card style={{ backgroundColor: '#EBEDEF', height: 225 }}
                  onPress={() => closeOrder(item)}
                >
                  <Card.Title
                    title={<Text variant='bodyLarge'>{`${item?.name}`}</Text>}
                    subtitleStyle={{ fontSize: 12, marginTop: -10, color: 'gray' }}
                    subtitle={ //QrCode || NFC
                      item.status === 1 && item.openingDate !== '' && item.openingDate !== undefined ?
                        `${moment(item?.openingDate?.toDate()).format('DD/MM/YY - HH:mm')}` :
                        item.status === 0 && `${moment(item?.closingDate?.toDate()).format('DD/MM/YY - HH:mm')}`
                    }
                  />
                  <Card.Content>
                    <View style={{ marginTop: 10 }}>
                      {item?.type === 1 || item?.type === 4 ? //QrCode || NFC
                        <View style={{ alignItems: 'center' }}>
                          <Icon
                            source="qrcode"
                            color={theme.colors.primary}
                            size={50}
                          />
                          <Text style={{ fontSize: 12, color: theme.colors.primary }}>{item.local}</Text>
                        </View> : item.type === 2 ?
                          <View style={{ alignItems: 'center' }}>
                            <Icon
                              source="account-group"
                              color={theme.colors.primary}
                              size={50}
                            />
                            <Text style={{ fontSize: 10 }}>{item.local}</Text>
                          </View> : item.type === 3 && //Delivery
                          <View style={{ alignItems: 'center' }}>
                            <Icon
                              source="moped-outline"
                              color={theme.colors.primary}
                              size={50}
                            />
                            <Text style={{ fontSize: 12 }}>Delivery</Text>
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
        }



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
              {ticketType === 2 &&
                <View style={{ padding: 5, marginTop: 8, marginBottom: 10, alignItems: 'center' }}>
                   <Text
                    style={{ marginBottom: 8 }}
                    variant='titleLarge'>
                    Comanda fixa
                  </Text>
                  <Text
                    style={{ marginBottom: 8 }}
                    variant='titleMedium'>
                    Imprimir Qr-Code Fixo
                  </Text>
                  <SegmentedButtons
                    value={fixedTicketType}
                    onValueChange={setFixedTicketType}
                    buttons={[
                      {
                        value: '0',
                        label: 'Individual',
                      },
                      {
                        value: '1',
                        label: 'Sequencial',
                      },
                    ]}
                  />
                  <Text style={{ marginTop: 5 }}>
                    Obs: A comanda só irá aparecer na listagem após o primeiro pedido.
                  </Text>
                </View>
              }
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
                <View>
                  {ticketType !== 2 ?
                    <TextInput
                      style={{ margin: 5, marginTop: 10 }}
                      label={"Local"}
                      keyboardType='default'
                      value={paramsTicket.local}
                      placeholder={"Ex: Mesa 1"}
                      onChangeText={(text) => setParamsTicket((prevData) => ({ ...prevData, local: text }))}
                    />
                    : ticketType === 2 && fixedTicketType === '1' &&
                    <View>

                      <View style={{ display: 'flex', flexDirection: 'row' }}>
                        <View style={{ width: '50%' }}>
                          <TextInput
                            style={{ margin: 5, marginTop: 10 }}
                            label={"Início"}
                            keyboardType='default'
                            value={sequentialNumber.start}
                            onChangeText={(text) => setSequentialNumber((prevData) => ({ ...prevData, start: text }))}
                          />
                        </View>
                        <View style={{ width: '50%' }}>
                          <TextInput
                            style={{ margin: 5, marginTop: 10 }}
                            label={"Fim"}
                            keyboardType='default'
                            value={sequentialNumber.end}
                            onChangeText={(text) => setSequentialNumber((prevData) => ({ ...prevData, end: text }))}
                          />
                        </View>
                      </View>
                      <View style={{ marginTop: 20, marginLeft: 10 }}>
                        <Text>Imprimprir pausadamente</Text>
                        <Switch
                          style={{ marginRight: 'auto' }}
                          value={isPausedPrint}
                          onValueChange={(e) => setIsPausedPrint(e)}
                        />
                      </View>
                    </View>

                  }
                  {ticketType === 4 && paramsTicket.idTag &&
                    <View style={{ flexDirection: 'row', marginLeft: 5 }}>
                      <Icon
                        source="contactless-payment"
                        size={15}
                      />
                      <Text variant='labelSmall'> {paramsTicket?.idTag}</Text>
                    </View>
                  }

                </View>
              }
              {ticketType === 3 &&
                <Button style={{ margin: 15 }} mode='contained' onPress={() => printDelivery()}>Imprimir Ticket Delivery</Button>
              }
            </Dialog.Content>}
          <Dialog.Actions>
            <Button onPress={closeDialogNewTicket}>Fechar</Button>
            {!savedNewTicket ?
              <Button
                disabled={isLoadingSave || paramsTicket.name.length < 3}
                loading={isLoadingSave}
                onPress={() => ticketType === 2 ? printLocalTicket() : openNewTicket()}>
                {ticketType === 2 ? 'Imprimir' : 'Salvar'}
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

      <Button onPress={() => console.log(statusTicket)}>status</Button>
    </View>
  )
}