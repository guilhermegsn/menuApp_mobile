import { StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { UserContext } from '../context/UserContext';
import { collection, doc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { Button, Card, FAB, Icon, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native'
import { theme } from '../Services/ThemeConfig'

export default function MenuProducts() {

  
  const navigation = useNavigation();
  const userContext = useContext(UserContext)
  const [dataMenu, setDataMenu] = useState([])

  useEffect(() => {
    getData()
  }, [])

  // const getData = async () => {
  //   try {
  //     const establishmentRef = doc(db, 'Establishment', userContext.estabId)
  //     const q = query(
  //       collection(db, 'Menus'),
  //       where('establishmentId', '==', establishmentRef)
  //     )
  //     const querySnapshot = await getDocs(q)
  //     const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
  //     setDataMenu(data)
  //   } catch (e) {
  //     console.log(e)
  //   }
  // }


  const getData = async () => {
    const q = query(
      collection(db, "Establishment"),
      where("owner", "==", auth().currentUser?.uid)
    );
    setIsLoading(true)
    await getDocs(q).then((res) => {
      if (!res.empty) {
        const doc = res.docs[0];
        if (doc.data().menu) {
          setDataMenu(doc.data()?.menu)
        }
      }
    }).catch((e) => console.log(e)).finally(() => setIsLoading(false))
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
      backgroundColor: theme.colors.primary,
      marginTop: 60
    },
  })

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flexWrap: "wrap" }}>
        {dataMenu?.map((menu, index) => (
          <Card key={index} style={{ width: "46%", margin: "2%", height: 240 }}
            //  onPress={() => [setMenuData(menu), setRegStage(3)]}
            onPress={() => [navigation.navigate('ProductMenuItens', { idMenu: menu?.id, menu: menu })]}
          >
            <Card.Cover source={{ uri: menu.urlImg !== null ? menu.urlImg : '' }} />
            <Card.Content style={{ marginTop: "2%" }}>
              <Text style={{ marginTop: "2%" }} variant="titleMedium">{menu.name}</Text>
            </Card.Content>
          </Card>
        ))}
        <Card style={{ width: "45%", margin: "2%", height: 240 }}
          onPress={() => []}>
          <Card.Content style={{ marginTop: "2%" }}>
            <Icon
              source="plus"
              size={75}
            />
            <Text
              style={{ bottom: 0 }}
              variant="titleLarge">{"Criar novo Menu"}
            </Text>
          </Card.Content>
        </Card>
        <Button onPress={getData}>Data</Button>
      </View>
    </View>
  )
}