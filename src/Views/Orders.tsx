import { Alert, ScrollView, StyleSheet, View, SafeAreaView, RefreshControl } from 'react-native'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { DocumentData, collection, doc, getDocs, limit, onSnapshot, orderBy, query, startAfter, updateDoc, where } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import { db } from '../Services/FirebaseConfig';
import { ActivityIndicator, Avatar, Button, Card, Dialog, Icon, IconButton, Portal, RadioButton, SegmentedButtons, Text } from 'react-native-paper';
import { OrderData } from '../Interfaces/Order_interface';
import { formatToDoubleBR, getInitialsName, playSound, printThermalPrinter, removeAccents, vibrate } from '../Services/Functions'
import moment from 'moment-timezone'
import 'moment/locale/pt-br'
import Loading from '../Components/Loading';
import KeepAwake from 'react-native-keep-awake';
import { useStorage } from '../context/StorageContext';

export default function Orders() {

  const { hasPrinter, autoPrint } = useStorage();
  const userContext = useContext(UserContext)
  const [orders, setOrders] = useState<DocumentData[]>([]);
  const [closedOrders, setClosedOrders] = useState<DocumentData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMoreData, setIsLoadingMoreData] = useState(false)
  const [isChangeStatus, setIsChangeStatus] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<DocumentData | undefined>({})
  const [isLoadingSaveStatus, setIsLoadingSaveStatus] = useState(false)
  const [refreshing, setRefreshing] = useState(false);

  const [filteredBy, setFilteredBy] = useState("open")

  const numOpeningTicket = orders.filter((item) => item.status === 1)?.length || 0
  const numProgressTicket = orders.filter((item) => item.status === 2)?.length || 0

  const data = filteredBy === 'open' ? orders : closedOrders;

  //Deixando a tela sempre ativa.
  useEffect(() => {
    KeepAwake.activate();
    return () => KeepAwake.deactivate();
  }, []);

  useEffect(() => {
    if (filteredBy === 'open')
      fetchData()
    else
      getClosedTickets()
  }, [userContext?.estabId, filteredBy]);


  const fetchData = async () => {
    setIsLoading(true);

    const q = query(
      collection(db, 'Establishment', userContext?.estabId, 'Orders'),
      where('status', 'in', [1, 2]),
      orderBy('date', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        try {
          setOrders((prevOrders) => {
            const updatedOrders = [...prevOrders];

            querySnapshot.docChanges().forEach((change) => {
              const docData = change.doc.data();
              const docId = change.doc.id;

              // Ignora pedidos cancelados (status 3)
              //if (docData.status === 3) return;

              const existingIndex = updatedOrders.findIndex((o) => o.id === docId);

              if (change.type === 'added') {
                // Evita duplicatas
                if (existingIndex === -1) {
                  if (docData.status === 1 && isNewOrder(docData.date.toDate())) {
                    if (hasPrinter && autoPrint) {
                      console.log('imprimindo...')
                      printOrder(docData)
                    } else {
                      console.log('nao--->>>', hasPrinter, autoPrint)
                    }
                    vibrate();
                    playSound('deskbell.wav');
                  }

                  updatedOrders.push({
                    id: docId,
                    ...docData,
                    elapsedTime: moment(docData.date.toDate()).fromNow(),
                  });
                }

              } else if (change.type === 'modified') {
                if (existingIndex !== -1) {
                  updatedOrders[existingIndex] = {
                    id: docId,
                    ...docData,
                    elapsedTime: moment(docData.date.toDate()).fromNow(),
                  };
                }
              } else if (change.type === 'removed') {
                if (existingIndex !== -1) {
                  updatedOrders.splice(existingIndex, 1);
                }
              }
            });

            // Reordenar por data (caso a ordem mude com update)
            return updatedOrders
              .sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
          });
        } catch (error) {
          console.log('Erro ao atualizar pedidos:', error);
        } finally {
          setIsLoading(false);
        }
      },
      (error) => {
        console.log('Erro no onSnapshot:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  };


  const getClosedTickets = async () => {
    const q = query(
      collection(db, 'Establishment', userContext?.estabId, 'Orders'),
      where("status", "==", 0),
      orderBy('date', 'desc'),
      limit(50)
    );


    if (closedOrders.length <= 0)
      setIsLoading(true)
    try {
      const res = await getDocs(q)
      if (!res.empty) {
        const data = res.docs.map(item => ({
          ...item.data(),
          id: item.id, // Adiciona o ID do documento
        }));
        setClosedOrders(data)
      }
    } catch {
      Alert.alert('Erro', 'Erro ao obter os dados.')
      setClosedOrders([])
    } finally {
      setIsLoading(false)
    }
  }


  const isNewOrder = (date: Date): boolean => {
    const now = new Date()
    const dateOrder = new Date(date)
    if (dateOrder.getDate() === now.getDate()) {
      // Calcula a diferença em milissegundos
      const diffMs = Math.abs(now.getTime() - dateOrder.getTime())
      // Converte a diferença de milissegundos para minutos
      const diffMin = Math.floor(diffMs / (1000 * 60))
      // Retorna true se a diferença for maior ou igual a 5 minutos, caso contrário, retorna false
      return diffMin <= 5;
    }
    return false
  }


  // useEffect para atualizar o tempo
  useEffect(() => {
    const interval = setInterval(() => {
      if (orders) {
        setOrders(orders.map((item) => ({
          ...item,
          elapsedTime: moment(item.date.toDate()).fromNow()
        })));
      }
    }, 60000); // Atualiza a cada minuto
    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(interval);
  }, [orders]);


  const loadMoreData = async () => {
    if (orders) {
      const q = query(
        collection(db, 'Establishment', userContext?.estabId, 'Orders'),
        where("status", "==", 0),
        orderBy('date', 'desc'),
        limit(50),
        startAfter(orders[orders.length - 1].date),
      );
      try {
        setIsLoadingMoreData(true)
        const querySnapshot = await getDocs(q)
        let dat: Array<OrderData> = [];
        querySnapshot.forEach((item) => {
          dat.push(item.data() as OrderData)
        })
        if (dat) {
          setClosedOrders(prevOrders => [...prevOrders, ...dat])
        }
      } catch (e) {
        console.log(e)
      } finally {
        setIsLoadingMoreData(false)
      }
    };
  }


  const printOrder = async (newOrder: DocumentData) => {

    let itemsText = ""
    newOrder?.items.forEach((item: string | any, index: number) => {
      const itemName = item?.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      itemsText = itemsText + `[L]<font size='small'>${(index + 1).toString().padEnd(0)} ${item?.qty.toString().padStart(4)} ${itemName.padStart(6)} </font>\n`
    })
    const initialText =
      `[C]<u><font size='tall'>Pedido ${String(newOrder.orderNumber).padStart(4, '0')}</font></u>\n` +
      `[L]\n` +
      `[L]Data: ${moment(newOrder.date.toDate()).format('DD/MM/YYYY HH:mm')}\n` +
      `[C]================================\n` +
      `[L]<b># ${("Qtd.").padEnd(2)} ${("Produto").padEnd(10)}</b>\n` +
      `[C]--------------------------------\n`


    const finalText =
      `[C]================================\n` +
      `[L]<font size='small'>${newOrder?.name}</font>\n` +
      `[C]--------------------------------\n` +
      `[L]<font size='small'>${newOrder.type !== 2 ? newOrder?.local.replaceAll(" - ", "\n") : ""}</font>\n`

    const deliveryText = `[C]--------------------------------\n` +
      `[L]TOTAL ${formatToDoubleBR(newOrder?.totalOrder)}\n` +
      `[L]Pagamento: ${newOrder?.paymentType === 'CASH' ? 'Dinheiro' : newOrder?.paymentType === 'CRD' ? 'Credito' : 'Debito'}\n` +
      `[L]${newOrder?.obs}\n` +
      `[C]${newOrder?.isOnlinePayment ? `*** PAGO ONLINE ***\n*** NAO RECEBER DO CLIENTE ***` : ""}\n`


    let fullText = ""
    console.log('newOrder', newOrder)
    if (newOrder?.type === 3) {
      fullText = initialText + itemsText + finalText + deliveryText
    } else {
      fullText = initialText + itemsText + finalText
    }

    console.log(fullText)
    console.log(newOrder)

    printThermalPrinter(removeAccents(fullText))
  }

  const styles = StyleSheet.create({
    scrollViewContent: {
      flexGrow: 1,
    },
    card: {
      marginLeft: 8,
      marginRight: 8,
      marginBottom: 10,
      paddingRight: 6,
      backgroundColor: 'green'
    }
  })


  const changeStatusOrder = async (id: string, status: string) => {
    const docRef = doc(db, 'Establishment', userContext?.estabId, 'Orders', id);
    setIsChangeStatus(false)
    try {
      await updateDoc(docRef, { status: parseInt(status) });
    } catch {
      Alert.alert(
        `Ocorreu um erro. Por favor, tente novamente`,
      )
    }
  }


  const selectOrder = (id: string) => {
    setSelectedOrder((orders.find((item) => item.id === id)))
    setIsChangeStatus(true)
  }

  // Atualizar dados ao puxar para baixo
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);


  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={{ alignItems: 'center', margin: 10 }}>
        <SegmentedButtons
          value={filteredBy}
          onValueChange={(value) => setFilteredBy(value)}
          buttons={[
            {
              value: 'open',
              label: 'Abertos',
              icon: 'lock-open-variant-outline'

            },
            {
              value: 'closed',
              label: 'Finalizados',
              icon: 'lock-open-variant-outline'
            },
          ]}
        />
      </SafeAreaView>
      <View style={{ flexDirection: 'row', alignItems: 'center', margin: 12 }}>

        {filteredBy === 'open' &&
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 30 }}>
              <Icon source="circle" color={'green'} size={18} />
              <Text variant="bodyLarge" style={{ marginLeft: 5, marginRight: 12 }}>
                {`Em aberto: (${numOpeningTicket})`}
              </Text>

              <Icon source="circle" color={'orange'} size={18} />
              <Text variant="bodyLarge" style={{ marginLeft: 5 }}>{`Em preparo: (${numProgressTicket})`}</Text>
            </View>
          </View>
        }
      </View>

      {isLoading ? <Loading /> :
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.scrollViewContent}>
          {data?.map((order, index) => (
            <View key={index}>
              <Card key={index}
                style={{
                  backgroundColor: order.status === 1 ? 'green' : order.status === 2 ? '#F39C12' : 'gray',
                  margin: 8,
                  paddingRight: 7,
                }}
              >
                <Card style={{ backgroundColor: '#EAECEE', borderBottomRightRadius: 0, borderTopRightRadius: 0 }}
                  onPress={() => selectOrder(order.id)}>
                  <Card.Title
                    titleStyle={{ marginBottom: -10 }}
                    title={order?.name}
                    subtitleVariant={'bodySmall'}
                    titleVariant='titleMedium'
                    subtitle={order.type !== 2 ? order?.local : ""}
                    left={(props) =>

                      <View style={{ marginTop: 10 }}>
                        {order?.type === 1 ?
                          <Avatar.Text size={40} label={getInitialsName(order?.name)} /> :
                          <Avatar.Icon {...props} icon={order?.type === 3 ? "moped-outline" :
                            order?.type === 2 ? "account-group" : "account"} />}
                        <Text
                          variant='labelMedium'
                          style={{ marginLeft: 3, marginTop: 4 }}>
                          {`${order.orderNumber ? String(order?.orderNumber).padStart(5, '0') : "00000"}`}
                        </Text>
                      </View>

                    }

                    right={() =>

                      <View>
                        <Text style={{ textAlign: 'right', marginRight: 10 }}> {moment(order.date.toDate()).utcOffset(-3).format('HH:mm') + `\n`
                          + (order.elapsedTime ? order.elapsedTime : moment(order.date.toDate()).utcOffset(-3).format('DD/MM/YYYY'))}
                        </Text>

                        <View style={{ alignItems: "flex-end", marginTop: 15, marginEnd: 10 }}>
                          <Icon
                            source="circle-slice-8"
                            color={order.status === 1 ? 'green' :
                              order.status === 2 ? '#F39C12' : 'gray'}
                            size={18}
                          />
                        </View>
                      </View>}
                  />
                  <Card.Content>
                    <View style={{ marginLeft: 3, marginTop: 10 }}>
                      {order?.items.map((item: string | any, index: number) => (
                        <Text variant='titleMedium' key={index}>{item?.qty} x {item?.name}</Text>
                      ))}
                    </View>
                  </Card.Content>
                </Card>
              </Card>
            </View>
          ))}

          {isLoadingMoreData ? <ActivityIndicator size={20} style={{ margin: 20 }} /> : filteredBy === 'closed' &&
            <View style={{ marginBottom: 20, marginTop: 10, alignItems: 'center' }}>
              <IconButton
                icon="dots-horizontal"
                size={25}
                mode='contained'
                onPress={() => loadMoreData()}
              />
            </View>
          }
        </ScrollView>}


      <Portal>
        <Dialog visible={isChangeStatus} onDismiss={() => setIsChangeStatus(false)}>
          {isLoadingSaveStatus && <Loading />}
          <Dialog.Title>
            {String(selectedOrder?.orderNumber).padStart(5, '0')}&nbsp;-&nbsp;
            {selectedOrder?.local !== selectedOrder?.name ? selectedOrder?.name : selectedOrder?.local}
          </Dialog.Title>
          <Dialog.Content>

            <Text style={{ marginTop: -20 }}>{selectedOrder?.local !== selectedOrder?.name && selectedOrder?.local || ""}</Text>

            <Text style={{ marginTop: 25 }} variant="titleMedium">Selecione o status:</Text>

            <RadioButton.Group
              value={selectedOrder?.status ? selectedOrder?.status.toString() : "0"}
              onValueChange={(e) => {
                setSelectedOrder((items) => ({
                  ...items, status: e
                }))
                changeStatusOrder(selectedOrder?.id, e)
              }}
            >
              <RadioButton.Item label="Aberto" color='green' value="1" />
              <RadioButton.Item label="Em preparo" color='#F39C12' value="2" />
              <RadioButton.Item label="Finalizado" color='black' value="0" />
            </RadioButton.Group>

          </Dialog.Content>
          <Dialog.Actions>
            {hasPrinter &&
              <Button
                disabled={isLoadingSaveStatus}
                icon={'printer'}
                onPress={() => [selectedOrder && printOrder(selectedOrder), setIsChangeStatus(false)]}>
                Imprimir
              </Button>
            }
            <Button
              disabled={isLoadingSaveStatus}
              icon={'close-circle-outline'}
              onPress={() => setIsChangeStatus(false)}>
              Fechar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Button onPress={() => console.log(hasPrinter, autoPrint)}>log</Button>
    </View>
  )
}