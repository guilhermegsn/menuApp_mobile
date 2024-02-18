import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Avatar, Button, Card, DataTable, Dialog, FAB, Icon, IconButton, Portal, SegmentedButtons, Text, TextInput } from 'react-native-paper'
import { collection, query, where, DocumentData, onSnapshot, orderBy, addDoc, serverTimestamp, limit, startAfter, getDocs } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { UserContext } from '../context/UserContext';
import ThermalPrinterModule from 'react-native-thermal-printer'
import { theme } from '../Services/ThemeConfig';
import { useNavigation, } from '@react-navigation/native';
import Loading from '../Components/Loading';
import { OrderItemsData } from '../Interfaces/OrderItems_Interface';
import moment from 'moment';

export default function Orders() {

  const userContext = useContext(UserContext)
  const [ticketType, setTicketType] = useState(1)

  const [orders, setOrders] = useState<DocumentData[]>([]);
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
    type: 1
  })
  const [paramsTicket, setParamsTicket] = useState<DocumentData>(emptyParamsTicket)
  const [statusTicket, setStatusTicket] = useState('1')
  const [isLoadingMoreData, setIsLoadingMoreData] = useState(false)



  const closeOrder = (id: string, local: string, openingDate: Date, name: string) => {
    navigation.navigate('CloseOrder', { id: id, local: local, openingDate: openingDate.toISOString(), name: name })
  };

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

  const openNewTicket = async () => {
    setIsLoadingSave(true)
    try {
      const ticketRef = collection(db, "Ticket");
      paramsTicket.type = ticketType
      const saveTicket = await addDoc(ticketRef, paramsTicket)
      if (saveTicket) {
        printTicket({
          id: saveTicket.id,
          name: paramsTicket.name,
          local: paramsTicket.local,
          document: paramsTicket.document,
          phone: paramsTicket.phone
        })
        setIsOpenNewTicket(false)
      }
    } catch (error) {
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
      `[L]<qrcode size='20'>http://192.168.1.113:3000/menu/${userContext?.estabId}/${params.id}</qrcode>\n` +
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
    try{
      await ThermalPrinterModule.printBluetooth({
        payload: text,
        printerNbrCharactersPerLine: 30
      });
      setParamsTicket(emptyParamsTicket)
    }catch{
      Alert.alert("Erro", "Erro ao imprimir")
    }
  }

  const printDelivery = async () => {
    const text3 =
      `[C]<u><font size='tall'>${userContext?.estabName} DELIVERY</font></u>\n` +
      `[L]\n` +
      `[C]Acesse o QR Code para pedir:\n` +
      `[L]\n` +
      `[L]<qrcode size='20'>http://192.168.1.113:3000/menu</qrcode>\n` +
      `[L]\n` +
      `[L]\n` +
      `[R]__o\n` +
      `[R] _ \\_\n` +
      `[R](_)/(_)\n`
    await ThermalPrinterModule.printBluetooth({
      payload: text3,
      printerNbrCharactersPerLine: 30
    });
  }

  const printLocalTicket = async () => {
    const text =
      `[C]<u><font size='tall'>${userContext?.estabName}</font></u>\n` +
      `[L]\n` +
      `[C]Acesse o QR Code para pedir:\n` +
      `[L]\n` +
      `[L]<qrcode size='20'>http://192.168.1.113:3000/menu/${userContext?.estabId}/${'fix01' + encodeURIComponent(paramsTicket.name)}</qrcode>\n` +
      `[L]${paramsTicket.name}\n`
    await ThermalPrinterModule.printBluetooth({
      payload: text,
      printerNbrCharactersPerLine: 30
    })
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

  const styles = StyleSheet.create({
    scrollView: {
      marginTop: 10,
      //margin: "%",
    },
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
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
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


          <View style={{ margin: 10, marginBottom: 20 }}>
            <SegmentedButtons
              value={statusTicket}
              onValueChange={setStatusTicket}
              buttons={[
                {
                  value: '1',
                  label: 'Abertas',
                  icon: 'lock-open-variant-outline'
                },
                {
                  value: '0',
                  label: 'Fechadas',
                  icon: 'lock'
                },
              ]}
            />
          </View>

          {orders.map((item, index) => (
            <Card key={index}
              style={[styles.card, {backgroundColor: item.status === 1 ? '#196F3D' : '#C0392B'}]}
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
                  subtitleStyle={{fontSize: 10, marginTop: -10, color: 'gray'}}
                  subtitle={item.type === 1 &&
                    item.status === 1 && item.openingDate !== '' && item.openingDate !== undefined ?
                    `Aberta em: ${moment(item?.openingDate?.toDate()).format('DD/MM/YY HH:mm')}` : item.status === 0 && `Fechada em: ${moment(item?.closingDate.toDate()).format('DD/MM/YY HH:mm')}`}
                  left={() =>
                    <View >
                      {item?.type === 1 ?
                        <View style={{ alignItems: 'center' }}>
                          <Icon
                            source="account"
                            color={theme.colors.primary}
                            size={30}
                          />
                          <Text style={{ fontSize: 10, color: theme.colors.primary }}>{item.local}</Text>
                        </View> : item.type === 2 &&
                        <View style={{ alignItems: 'center' }}>
                          <Icon
                            source="account-group"
                            color={theme.colors.primary}
                            size={30}
                          />
                            <Text style={{ fontSize: 10 }}>{item.local}</Text>
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
              <Button
                style={{ marginBottom: 20, width: 180 }}
                mode='contained'
                onPress={() => loadMoreData()}>
                Carregar mais
              </Button>}
          </View>

          {/* <Button onPress={() => console.log(orders)}>data</Button> */}

        </ScrollView>}

      <FAB
        color={theme.colors.background}
        style={styles.fab}
        icon="plus"
        onPress={() => setIsOpenNewTicket(true)}
      />


      <Portal>
        <Dialog visible={isOpenNewTicket} onDismiss={() => setIsOpenNewTicket(false)}>
          <Dialog.Title>{"Abertura de comanda"}</Dialog.Title>
          <Dialog.Content style={{ margin: -10 }}>
            <View style={{ flexDirection: 'row' }}>
              <IconButton
                iconColor={ticketType === 1 ? theme.colors.primary : theme.colors.secondary}
                icon="account"
                size={25}
                onPress={() => [setParamsTicket(emptyParamsTicket), setTicketType(1)]}
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
            {ticketType === 1 &&
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
              <TextInput
                style={{ margin: 5, marginTop: 10 }}
                label={ticketType === 2 ? "Referencia" : "Local"}
                keyboardType='default'
                value={paramsTicket.local}
                onChangeText={(text) => setParamsTicket((prevData) => ({ ...prevData, local: text }))}
              />
            }
            {ticketType === 3 &&
              <Button style={{ margin: 15 }} mode='contained' onPress={() => printDelivery()}>Imprimir Ticket Delivery</Button>
            }
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsOpenNewTicket(false)}>Cancelar</Button>
            <Button
              // disabled={isLoadingSave}
              loading={isLoadingSave}
              onPress={() => ticketType === 1 ? openNewTicket() : printLocalTicket()}>
              Salvar
            </Button>
          </Dialog.Actions>
        </Dialog>

      </Portal>

    </View>
  )
}