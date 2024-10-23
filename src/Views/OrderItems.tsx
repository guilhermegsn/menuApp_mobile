import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { DocumentData, collection, doc, getDocs, limit, onSnapshot, orderBy, query, startAfter, updateDoc, where } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import { db } from '../Services/FirebaseConfig';
import { ActivityIndicator, Avatar, Button, Card, Dialog, Icon, IconButton, Portal, RadioButton, Text } from 'react-native-paper';
import ThermalPrinterModule from 'react-native-thermal-printer'
import { OrderData } from '../Interfaces/Order_interface';
import { formatToDoubleBR, printThermalPrinter } from '../Services/Functions'
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


  useEffect(() => {
    const q = query(
      collection(db, 'OrderItems'),
      where("establishment", "==", userContext?.estabId),
      // orderBy('status'),
      //   where("status", "!=", "3"), //nao pego os cancelamentos de pedidos
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
            //imprimo apenas pedidos com status 1 (aberto)
            if (newItemData.status === 1) {
              //isNewOrder -> comparo se o pedido tem menos de 5min. Só imprime se tiver menos de 5min
              //Evitando impressao indevido em um reload no app
              if (isNewOrder(newItemData.date.toDate())) {
                printOrder(newItemData)
              }
            }
            break;
          }
        }
        querySnapshot.forEach((doc) => {
          //Não exibindo itens cancelados.
          if (doc.data().status !== 3)
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
    newOrder?.items.forEach((item: string | any, index: number) => {
      const itemName = item?.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()
      itemsText = itemsText + `[L]<font size='tall'>${(index + 1).toString().padEnd(0)} ${item?.qty.toString().padStart(4)} ${itemName.padStart(6)} </font>\n`
    })
    const initialText =
      `[C]<u><font size='tall'>Pedido</font></u>\n` +
      `[L]\n` +
      `[L]Data: ${moment(newOrder.date.toDate()).format('DD/MM/YYYY HH:mm')}\n` +
      `[C]================================\n` +
      `[L]<b># ${("Qtd.").padEnd(2)} ${("Produto").padEnd(10)}</b>\n` +
      `[C]--------------------------------\n`
   
   
      const finalText =
      `[C]================================\n` +
      `[L]<font size='tall'>${newOrder?.name}</font>\n` +
      `[C]--------------------------------\n` +
      `[L]<font size='tall'>${newOrder?.local.replaceAll(" - ", "\n")}\n</font>`

    const fullText = initialText + itemsText + finalText

    console.log(fullText)
    console.log(newOrder)

    printThermalPrinter(fullText)
    
    // try {
    //   await ThermalPrinterModule.printBluetooth({
    //     payload: fullText.normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
    //     printerNbrCharactersPerLine: 30
    //   });
    // } catch {
    //   Alert.alert(
    //     `Não foi possível estabalecer comunicação com a impressora.\nVerifique a conexão e tente novamente.`
    //   )
    // }

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

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? <Loading /> :
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
          {orders?.map((order, index) => (
            <View key={index}>
              <Card key={index}
                style={{
                  backgroundColor: order.status === 1 ? 'green' : order.status === 2 ? '#F39C12' : 'gray',
                  margin: 8,
                  paddingRight: 7,
                }}

              >
                <Card style={{ backgroundColor: '#EAECEE', borderBottomRightRadius: 0, borderTopRightRadius: 0 }} onPress={() => selectOrder(order.id)}>
                  <Card.Title title={`${order?.name}`} subtitle={order?.local}
                    //  left={(props) => <Avatar.Icon {...props} icon={ order?.type === 1 ? "account" : "account-group"} />} 
                    right={() => <View>
                      <Text style={{ textAlign: 'right', marginRight: 10 }}> {moment(order.date.toDate()).format('HH:mm') + `\n` + (order.elapsedTime ? order.elapsedTime : "")}
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

                    {order?.items.map((item: string | any, index: number) => (

                      <Text key={index}>{item?.qty} x {item?.name}</Text>
                    ))}
                  </Card.Content>
                </Card>
              </Card>
              {/* {order.items.map((item: string | any) => (
              <Text>{item?.name}</Text>
            ))} */}
            </View>
          ))}
          {isLoadingMoreData ? <ActivityIndicator size={20} style={{ margin: 20 }} /> :
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

      {/* <Button onPress={()=> console.log(orders)}>orders</Button> */}
    </View>
  )
}