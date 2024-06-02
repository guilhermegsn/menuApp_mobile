import { Alert, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { Card, Dialog, Icon, IconButton, Portal, Text } from 'react-native-paper'
import { UserContext } from '../context/UserContext';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DocumentData, addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import Loading from '../Components/Loading';
import NfcManager, { NfcEvents } from 'react-native-nfc-manager';
import { getDataNfcTicket, readTagNfc } from '../Services/Functions';

interface RouteParams {
  qrCodeData: string
}

export default function ShoppingCart() {

  const userContext = useContext(UserContext)
  const navigation = useNavigation<any>()
  const [dataTicket, setDataTicket] = useState<DocumentData>([])
  const [ticket, setTicket] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTicket, setIsLoadingTicket] = useState(false)
  const [isOpenNFC, setIsOpenNFC] = useState(false)


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
        const data = await getDataNfcTicket(tag.id)
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
    getDataTicket()
  }, [qrCodeData])

  const getDataTicket = async () => {
    const urlSplit = qrCodeData.split("/")
    const ticketUrl = urlSplit[urlSplit.length - 1]
    setTicket(ticketUrl)
    setIsLoadingTicket(true)
    try {
      const docRef = doc(db, 'Ticket', ticketUrl);
      const docSnapshot = await getDoc(docRef);
      const dataTicket = docSnapshot.data()
      if (dataTicket) {
        setDataTicket(dataTicket)
      }
    }
    catch {
      console.log('erro')
    } finally {
      setIsLoadingTicket(false)
    }

  }

  const sendOrder = async () => {
    setIsLoading(true)
    try {
      const items = userContext?.shoppingCart.map((item) => ({
        idItem: item.product.id,
        name: item.product.name,
        price: item.product.price,
        qty: item.qty
      }))

      const dataOrder = {
        date: new Date(),
        establishment: userContext?.estabId,
        items: items,
        local: dataTicket?.local,
        order_id: ticket,
        status: 1,
        name: dataTicket?.name
      }

      const orderItemsRef = collection(db, "OrderItems");
      const saveOrder = await addDoc(orderItemsRef, dataOrder)
      if (saveOrder) {
        Alert.alert('Pedido enviado.')
        navigation.goBack()
        userContext?.setShoppingCart([])
      } else {
        console.log('nao entyrou aq')
      }
    } catch {
      console.log('erro...')
    } finally {
      setIsLoading(false)
    }
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
                  {dataTicket.name ?
                    <Text>{dataTicket.name}</Text>
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
                  icon={'contactless-payment'}
                  size={25}
                  mode='outlined'
                  style={{ marginTop: 15, marginRight: 15 }}
                  onPress={() => readNFC()}
                />
                <IconButton
                  icon={'qrcode-scan'}
                  size={25}
                  mode='outlined'
                  style={{ marginTop: 15, marginRight: 15 }}
                  onPress={() => openQrCodeReader()}
                />
                <IconButton
                  icon={'send'}
                  disabled={!dataTicket?.name}
                  size={25}
                  mode='outlined'
                  style={{ marginTop: 15, marginRight: 15 }}
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
                title={item.product.name}
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
    </View>


  )
}