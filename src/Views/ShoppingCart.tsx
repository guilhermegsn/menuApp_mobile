import { Alert, FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Button, Card, DataTable, Dialog, Icon, IconButton, Portal, Text, TextInput } from 'react-native-paper'
import { UserContext } from '../context/UserContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DocumentData, addDoc, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import Loading from '../Components/Loading';
import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
import { getDataNfcTicket, readTagNfc } from '../Services/Functions';

interface RouteParams {
  qrCodeData: string
}

export default function ShoppingCart() {

  const styles = StyleSheet.create({
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
  });

  const userContext = useContext(UserContext)
  const navigation = useNavigation<any>()
  const [dataTicket, setDataTicket] = useState<DocumentData>([])
  const [ticket, setTicket] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTicket, setIsLoadingTicket] = useState(false)
  const [isOpenNFC, setIsOpenNFC] = useState(false)
  const [isOpenSearchConsumer, setIsOpenSearchConsumer] = useState(false)
  const [dataOpenTickets, setDataOpenTickets] = useState<DocumentData>([])
  const [isLoadingSearch, setIsLoadingSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('');


  const route = useRoute();
  const { qrCodeData } = route.params as RouteParams || {};

  useEffect(() => {
    return () => {
      NfcManager.setEventListener(NfcEvents.DiscoverTag, null);
      NfcManager.setEventListener(NfcEvents.SessionClosed, null);
    };
  }, []);

  const readNFC = async () => {
    setIsOpenNFC(true)
    try {
      const tag = await readTagNfc(setIsOpenNFC)
      if (tag?.id) {
        const data = await getDataNfcTicket(tag.id, userContext?.estabId || "")
        if (data) {
          setTicket(data?.id)
          setDataTicket(data)
        } else {
          Alert.alert('Comanda inválida.')
          setDataTicket({})
        }
      }
    } catch (ex) {
      console.warn(ex);
    } finally {
      setIsOpenNFC(false)
      // Parar a sessão de leitura NFC
      NfcManager.cancelTechnologyRequest();
    }
  };

  const add = (index: number) => {
    if (userContext) {
      let copyData = [...userContext.shoppingCart]
      copyData[index].qty = copyData[index].qty + 1
      userContext.setShoppingCart(copyData)
    }
  }

  const decrease = (index: number) => {
    if (userContext) {
      let copyData = [...userContext.shoppingCart]
      if (copyData) {
        if (copyData[index].qty > 1) {
          copyData[index].qty = copyData[index].qty - 1
          userContext?.setShoppingCart(copyData)
        } else {
          userContext?.setShoppingCart(prevItems => prevItems.filter((_, i) => i !== index));
        }
      }
    }
  }

  const openQrCodeReader = () => {
    navigation.navigate('QrCodeReader', { backPage: 'ShoppingCart' })
  }

  useEffect(() => {
    getDataTicketQrCode()
  }, [qrCodeData])

  const getDataTicketQrCode = async () => {
    if (qrCodeData) {
      const urlSplit = qrCodeData.split("/")
      const ticketId = urlSplit[urlSplit.length - 1]
      setTicket(ticketId)
      setIsLoadingTicket(true)
      try {
        const docRef = doc(db, 'Ticket', ticketId);
        const docSnapshot = await getDoc(docRef);
        const dataTicket = docSnapshot.data()
        if (dataTicket) {
          if (dataTicket?.establishment === userContext?.estabId) //valido se a comanda pertence a este estabelecimento
            setDataTicket(dataTicket)
          else
            Alert.alert('Comanda inválida!')
        } else {
          Alert.alert('Comanda inválida!')
        }
      }
      catch {
        console.log('erro')
      } finally {
        setIsLoadingTicket(false)
      }
    }
  }


  const sendOrder = async () => {
    setIsLoading(true)
    try {
      const items = userContext?.shoppingCart.map((item) => ({
        idItem: item.product.id,
        name: item?.product?.name,
        price: item?.product?.price,
        qty: item.qty
      }))

      const dataOrder = {
        date: new Date(),
        establishment: userContext?.estabId,
        items: items,
        local: dataTicket?.local,
        order_id: ticket,
        status: 1,
        name: dataTicket?.name,
        token: userContext?.estabTokenFCM
      }

      console.log('dataOrder-->>', dataOrder)

      const orderItemsRef = collection(db, "OrderItems");
      const saveOrder = await addDoc(orderItemsRef, dataOrder)

      if (saveOrder) {
        Alert.alert('Pedido enviado.')
        navigation.goBack()
        userContext?.setShoppingCart([])
      } else {
        console.log('nao entyrou aq')
      }
    } catch (e) {
      console.log('erro...', e)
    } finally {
      setIsLoading(false)
    }
  }

  const getOpenTickets = async () => {
    setIsLoadingSearch(true)
    try {
      const q = query(
        collection(db, "Ticket"),
        where("status", "==", 1),
        where("establishment", "==", userContext?.estabId),
      )
      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs.map(item => (item.data()))
        setDataOpenTickets(doc)
      }
    } catch (e) {
      console.log(e)
    } finally {
      setIsLoadingSearch(false)
    }
  }

  const filteredData = dataOpenTickets.filter((item: { name: string; }) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectConsumer = (item: DocumentData) => {
    setDataTicket(item)
    setIsOpenSearchConsumer(false)
  }

  const searchConsumer = () => {
    setIsOpenSearchConsumer(true)
    if (dataOpenTickets.length <= 0)
      getOpenTickets()
  }


  return (
    <View style={{ flex: 1 }}>
      {isLoading ?
        <Loading />
        :
        <View>
          {userContext?.shoppingCart && userContext?.shoppingCart.length > 0 &&
            <View style={{ flexDirection: 'row' }}>
              <View style={{ width: '50%' }}>
                <View style={{ marginTop: 25, marginLeft: 10 }}>
                  {dataTicket?.name ?
                    <Text style={{ display: 'flex', flexWrap: 'wrap', marginTop: -5 }}>{dataTicket?.name}</Text>
                    :
                    isLoadingTicket ?
                      <Text>Carregando...</Text>
                      :
                      <Text>{`Identifique o consumidor`}</Text>
                  }
                </View>
              </View>
              <View style={{ flexDirection: 'row', width: '50%', justifyContent: 'flex-end' }}>
                <IconButton
                  icon={'magnify'}
                  size={25}
                  mode='outlined'
                  style={{ marginTop: 15, marginRight: 5 }}
                  onPress={searchConsumer}
                />
                <IconButton
                  icon={'contactless-payment'}
                  size={25}
                  mode='outlined'
                  style={{ marginTop: 15, marginRight: 5 }}
                  onPress={() => readNFC()}
                />
                <IconButton
                  icon={'qrcode-scan'}
                  size={25}
                  mode='outlined'
                  style={{ marginTop: 15, marginRight: 5 }}
                  onPress={() => openQrCodeReader()}
                />
                <IconButton
                  icon={'send'}
                  disabled={!dataTicket?.name}
                  size={25}
                  mode='outlined'
                  style={{ marginTop: 15, marginRight: 5 }}
                  onPress={() => sendOrder()}
                />
              </View>
            </View>}
          {userContext?.shoppingCart.map((item, index) => (
            <Card
              key={index}
              style={{ marginLeft: 10, marginTop: 10, marginRight: 10 }}
            >
              <Card.Title
                titleVariant='titleMedium'
                title={item?.product?.name}
                //subtitle={item.description}
                right={() => (
                  <View style={{ flexDirection: 'row', marginRight: 15 }}>
                    <IconButton
                      icon={item.qty !== 1 ? "minus" : "trash-can"}
                      size={25}
                      mode='contained'
                      style={{ marginTop: 15, marginRight: 15 }}
                      onPress={() => decrease(index)}
                    />
                    <Text
                      variant="headlineSmall"
                      style={{ marginTop: 15 }}
                    >{item.qty}</Text>
                    <IconButton
                      icon="plus"
                      size={25}
                      mode='contained'
                      style={{ marginTop: 15, marginLeft: 15 }}
                      onPress={() => add(index)}
                    />
                  </View>
                )}
              />
            </Card>
          ))}

          {userContext?.shoppingCart && userContext.shoppingCart.length <= 0 &&
            <View style={{ alignItems: 'center', marginTop: '60%' }}>
              <Icon
                source="cart-off"
                size={40}
              />
              <Text>Carrinho vazio</Text>
            </View>
          }
          {/* <Button onPress={() => console.log(userContext?.shoppingCart)}>cart</Button>
      <Button onPress={() => openQrCodeReader()}>QRCODE</Button>
      <Button onPress={() => console.log('qrCodeData: ', qrCodeData)}>URL</Button>
      <Button onPress={() => sendOrder()}>SEND</Button>
  
      {dataTicket ? <Text>{dataTicket?.name}</Text> : null} */}
        </View>
      }


      <Portal>
        <Dialog visible={isOpenNFC} onDismiss={() => [setIsOpenNFC(false)]}>
          <Dialog.Title style={{ textAlign: 'center' }}>Aproxime o cartão</Dialog.Title>
          <View style={{ alignItems: "flex-end", marginTop: 15, marginEnd: 20, marginBottom: 30 }}>
            <Icon
              source="contactless-payment"
              size={80}
            />
          </View>
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
                      <Text style={styles.item}>{item.name}</Text>
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
    </View>


  )
}