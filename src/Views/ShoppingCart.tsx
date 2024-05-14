import { View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Button, Card, IconButton, Text, TextInput } from 'react-native-paper'
import { UserContext } from '../context/UserContext';
import { ItemCartData } from '../Interfaces/ProductMenu_Interface';
import { useNavigation, useRoute } from '@react-navigation/native';
import { DocumentData, addDoc, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { OrderData } from '../Interfaces/Order_interface';

interface RouteParams {
  newData: string
}

export default function ShoppingCart() {

  const userContext = useContext(UserContext)
  const navigation = useNavigation<any>()
  const [dataTicket, setDataTicket] = useState<DocumentData>([])
  const [ticket, setTicket] = useState('')
  const [isLoading, setIsLoading] = useState(false)


  const route = useRoute();
  const { newData } = route.params as RouteParams || {};

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
    navigation.navigate('QrCodeReader')
  }

  useEffect(() => {
    getDataTicket()
  }, [newData])

  const getDataTicket = async () => {
    const urlSplit = newData.split("/")
    const ticketUrl = urlSplit[urlSplit.length - 1]
    setTicket(ticketUrl)
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
        console.log('Sucesso!')
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
    <View>
      {isLoading ?
        <View>
          <ActivityIndicator animating />
        </View>
        :
        <View>
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: '50%' }}>
              <View style={{ marginTop: 25, marginLeft: 10 }}>
                {dataTicket.name ?
                  <Text>{dataTicket.name}</Text>
                  :
                  <Text>{`Identifique o consumidor`}</Text>
                }
              </View>
            </View>
            <View style={{ flexDirection: 'row', width: '50%', justifyContent: 'flex-end' }}>
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
          </View>
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
          {/* <Button onPress={() => console.log(userContext?.shoppingCart)}>cart</Button>
      <Button onPress={() => openQrCodeReader()}>QRCODE</Button>
      <Button onPress={() => console.log('newData: ', newData)}>URL</Button>
      <Button onPress={() => sendOrder()}>SEND</Button>
  
      {dataTicket ? <Text>{dataTicket?.name}</Text> : null} */}
        </View>
      }
    </View>
  )
}