import { Alert, View } from 'react-native'
import React, { useContext, useState } from 'react'
import { useRoute } from '@react-navigation/native';
import { MenuData, ProductData } from '../Interfaces/ProductMenu_Interface';
import { Button, Card, Text } from 'react-native-paper';
import { ScrollView } from 'react-native';
import { UserContext } from '../context/UserContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';

export default function ProductList() {


  const route = useRoute();
  let menuparam = route.params as MenuData
  const userContext = useContext(UserContext)
  const [menu,setMenu] = useState<MenuData>(menuparam)

  const del = async (id: string) => {
    if (userContext) {
      const docRef = doc(db, 'Establishment', userContext.estabId);
      const docSnapshot = await getDoc(docRef);
      const estab = docSnapshot.data();

      const menuIndex = estab?.menu.findIndex((item: MenuData) => item.id === menu.id);
      const productIndex = estab?.menu[menuIndex].items.findIndex((item: ProductData) => item.id === id);

      // Handle deletion
      if (productIndex !== -1) {
        // Remove the item from the items array
        estab?.menu[menuIndex].items.splice(productIndex, 1);

        // Update the document
        await updateDoc(docRef, {
          menu: estab?.menu,
        }).then(() => {
          Alert.alert('Deletou!')
        

        })
      }
    }
  }

  return (
    <View>
      <ScrollView>
        <View style={{ flexDirection: 'row' }}>
          <Text onPress={() => []}>Menu: {menu?.name}</Text>
        </View>
        {menu.items.map((item, index) => (
          <Card key={index} style={{ marginBottom: "2%" }}>
            <Card.Title title={item.name} subtitle={item.description} />
            <Card.Content>
              {/* <Text variant="titleLarge">{item.name}</Text> */}
              <Text variant="bodyMedium">{item.price.toString()}</Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => [del(item.id)]}>Deletar</Button>
              <Button mode="outlined" onPress={() => [console.log(item)]}>Editar</Button>
            </Card.Actions>
          </Card>
        ))}
      </ScrollView>
    </View>
  )
}