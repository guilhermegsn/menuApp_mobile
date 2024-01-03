import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { DocumentData, collection, doc, getDocs, limit, onSnapshot, orderBy, query, startAfter, updateDoc, where } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import { db } from '../Services/FirebaseConfig';
import { ActivityIndicator, Button, Card, Dialog, Icon, Portal, RadioButton, Text } from 'react-native-paper';
import ThermalPrinterModule from 'react-native-thermal-printer'
import { OrderData } from '../Interfaces/Order_interface';
import moment from 'moment-timezone'
import 'moment/locale/pt-br'
import Loading from '../Components/Loading';
import Sound from 'react-native-sound';

export default function OrderItems() {


  const userContext = useContext(UserContext)
  const [orders, setOrders] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMoreData, setIsLoadingMoreData] = useState(false)
  const [isChangeStatus, setIsChangeStatus] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<DocumentData | undefined>({})
  const [isLoadingSaveStatus, setIsLoadingSaveStatus] = useState(false)

  const [relativeTimeOrders, setRelativeTimeOrders] = useState<DocumentData[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'OrderItems'),
      where("establishment", "==", userContext?.estabId),
      orderBy('date', 'desc'),
      limit(15)
    );
    setIsLoading(true);
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData: DocumentData[] = [];
      try {
        for (const change of querySnapshot.docChanges()) {
          if (change.type === "added") {
            const newItemData = change.doc.data();
            // printOrder(newItemData)
            break;
          }
        }
        querySnapshot.forEach((doc) => {
          ordersData.push({ id: doc.id, ...doc.data() });
        });
        setOrders(ordersData.map((item) => ({
          ...item,
          elapsedTime: moment(item.date.toDate()).fromNow()
        })));
      } catch (e) {
        console.log('error: ', e);
      } finally {
        setIsLoading(false);
      }
    }, (error) => {
      console.log('Error in onSnapshot:', error);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);


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
        collection(db, 'OrderItems'),
        where("establishment", "==", userContext?.estabId),
        orderBy('date', 'desc'),
        limit(15),
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
          dat.forEach((item) => {
            orders.push(item)
          })
          setOrders(prevOrders => [...prevOrders, ...dat])
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
    newOrder?.items.forEach((item: string | any) => {
      itemsText = itemsText + `[L]${item?.qty} x ${item?.name}\n`
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
    const fullText = initialText + itemsText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase() + finalText
    try {
      await ThermalPrinterModule.printBluetooth({
        payload: fullText,
        printerNbrCharactersPerLine: 30
      });
    } catch {
      Alert.alert(
        "Não foi possível estabalecer comunicação com a impressora.\nVerifique a conexão e tente novamente."
      )
    }

  }

  const playSound = () => {
    const sound = new Sound('test.mp3', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log('Erro ao carregar o som', error);
        return;
      }
      // Reproduz o som
      sound.play((success) => {
        if (success) {
          console.log('O som foi reproduzido com sucesso');
        } else {
          console.log('Falha ao reproduzir o som');
        }
        // Libera os recursos do som
        sound.release();
      });
    });
  };


  const styles = StyleSheet.create({
    scrollView: {
      marginTop: "3%",
      // margin: "3%",
    },
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
    const docRef = doc(db, 'OrderItems', id);
    setIsChangeStatus(false)
    try {
      await updateDoc(docRef, { status: status });
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

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? <Loading /> :
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
          {orders?.map((order, index) => (
            <View key={index}>
              <Card key={index}
                style={{
                  backgroundColor: order.status === '1' ? 'green' : order.status === '2' ? '#F39C12' : 'gray',
                  margin: 8,
                  paddingRight: 7,
                }}

              >
                <Card style={{ backgroundColor: '#EAECEE', borderBottomRightRadius: 0, borderTopRightRadius: 0 }} onPress={() => selectOrder(order.id)}>
                  <Card.Title title={`${order?.local}`} subtitle={""}
                    //  left={(props) => <Avatar.Icon {...props} icon={ order.status === 1 ?"alert-decagram" : "check-circle-outline"} />} 
                    right={() => <View>
                      <Text style={{ textAlign: 'right', marginRight: 10 }}> {moment(order.date.toDate()).format('HH:mm') + `\n` + order.elapsedTime}
                      </Text>
                      <View style={{ alignItems: "flex-end", marginTop: 15, marginEnd: 10 }}>
                        <Icon
                          source="circle-slice-8"
                          color={order.status === '1' ? 'green' :
                            order.status === '2' ? '#F39C12' : 'gray'}
                          size={18}
                        />
                      </View>
                    </View>}
                  />
                  <Card.Content>

                    {order.items.map((item: string | any, index: number) => (

                      <Text key={index}>{item.qty} x {item?.name}</Text>
                    ))}
                  </Card.Content>
                </Card>
              </Card>
              {/* {order.items.map((item: string | any) => (
              <Text>{item?.name}</Text>
            ))} */}
            </View>
          ))}
          {isLoadingMoreData ? <ActivityIndicator size={20} style={{margin: 20}}/> :
            <Button
              style={{ marginBottom: 20, margin: "2%" }}
              mode='contained'
              onPress={() => loadMoreData()}>
              Carregar mais
            </Button>}
        </ScrollView>}



      <Portal>
        <Dialog visible={isChangeStatus} onDismiss={() => setIsChangeStatus(false)}>
          {isLoadingSaveStatus && <Loading />}
          <Dialog.Title>{selectedOrder?.local}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Selecione o status:</Text>

            <RadioButton.Group
              value={selectedOrder?.status ? selectedOrder?.status.toString() : "1"}
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
            <Button
              disabled={isLoadingSaveStatus}
              icon={'printer'}
              onPress={() => [selectedOrder && printOrder(selectedOrder), setIsChangeStatus(false)]}>
              Imprimir
            </Button>
            <Button
              disabled={isLoadingSaveStatus}
              icon={'close-circle-outline'}
              onPress={() => setIsChangeStatus(false)}>
              Fechar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>


    </View>
  )
}