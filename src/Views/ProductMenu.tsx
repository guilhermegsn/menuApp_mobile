import { ScrollView, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { Button, TextInput, Text, Card, Icon } from 'react-native-paper'
import { MenuData, ProductData } from '../Interfaces/ProductMenu_Interface'
import { generateUUID } from '../Services/Functions'
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../Services/FirebaseConfig';
import { UserContext } from '../context/UserContext'
import auth from '@react-native-firebase/auth'

export default function ProductMenu() {

  const userContext = useContext(UserContext)
  const [regStage, setRegStage] = useState(0)
  const [isEditing, setIsEditing] = useState(false)

  const [listMenu, setListMenu] = useState<MenuData[]>([])

  const [menuData, setMenuData] = useState<MenuData>({
    id: "",
    name: "",
    urlImg: "",
    items: []
  })
  const [productData, setProductData] = useState<ProductData>({
    id: "",
    name: "",
    description: "",
    price: 0
  })

  useEffect(() => {
    const fetchData = async () => {
      const q = query(
        collection(db, "Establishment"),
        where("owner", "==", auth().currentUser?.uid)
      );
      //setIsLoading(true)
      await getDocs(q).then((res) => {
        if (!res.empty) {
          const doc = res.docs[0];
          setListMenu(doc.data()?.menu)
        }
      }).catch((e) => console.log(e))
    };
    fetchData();
  }, []);

  const add = () => {
    if (isEditing) {
      setMenuData((prevMenuData) => {
        return {
          ...prevMenuData,
          items: prevMenuData.items.map((item) => {
            if (item.id === productData.id) {
              return { ...item, ...productData };
            }
            return item;
          })
        };
      });
      setIsEditing(false)
    } else {
      productData.id = generateUUID()
      setMenuData((prevData) => ({
        ...prevData,
        id: generateUUID(),
        items: [...prevData.items, productData]
      }))
    }
  }

  const deleteLine = (id: string) => {
    setMenuData((prevState) => {
      const updatedItems = prevState.items.filter((item) => item.id !== id);
      return {
        ...prevState,
        items: updatedItems,
      };
    })
  }

  const editLine = (id: string) => {
    setRegStage(2)
    setIsEditing(true)
    const line = menuData.items.find((item) => item.id === id)
    if (line) {
      setProductData(line)
    }
  }

  const saveAll = async () => {
    console.log(userContext?.estabId)
    console.log(menuData)
    if (userContext) {
      const docRef = doc(db, 'Establishment', userContext.estabId);
      // 1. Recupere o registro existente.
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        if (docSnapshot.exists()) {
          const existingData = docSnapshot.data();
          const newItem = menuData;
          // 2. Verifique se o atributo "items" existe.
          if (existingData.menu) {
            if (existingData.menu[menuData.name]) {
              existingData.menu[menuData.name].push(newItem);
            } else {
              // O atributo "menu" existe, adicione o novo item ao array existente.
              existingData.menu.push(newItem);
            }
          } else {
            // 3. O atributo "menu" não existe, crie-o como um novo array com o novo item.
            existingData.menu = [newItem];
          }
          // 4. Atualize o registro no Firestore com os dados atualizados.
          await updateDoc(docRef, existingData);
        } else {
          console.log('O documento não existe');
        }
      }
    }
  }

  const listProduct = (data: MenuData) => {
    return (
      <>
        <Text>ETAPA 5</Text>
        {data.items.map((item) => (
          <Card style={{ marginBottom: "2%" }}>
            <Card.Title title={item.name} subtitle={item.description} />
            <Card.Content>
              {/* <Text variant="titleLarge">{item.name}</Text> */}
              <Text variant="bodyMedium">{item.price.toString()}</Text>
              <Text variant="bodyMedium">{item.id.toString()}</Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={() => deleteLine(item.id)}>Deletar</Button>
              <Button onPress={() => editLine(item.id)}>Editar</Button>
            </Card.Actions>
          </Card>
        ))}
        <Button style={{ width: "100%", marginTop: "4%" }}
          mode="contained"
          icon="hexagon-multiple"
          onPress={() => [saveAll()]}
        >
          {"Salvar todos"}
        </Button>
      </>
    )

  }

  return (
    <ScrollView>
      <View style={{ flex: 1, marginTop: "5%", margin: "3%" }}>
        {regStage === 0 && listMenu.length > 0 &&
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flexWrap: "wrap" }}>
              {listMenu.map((menu, index) => (
                <Card key={index} style={{ width: "46%", margin: "2%", height: 240 }}
                  onPress={() => [setMenuData(menu), setRegStage(3)]}
                >
                  <Card.Cover source={{ uri: menu.urlImg }} />
                  <Card.Content style={{ marginTop: "2%" }}>
                    <Text style={{ marginTop: "2%" }} variant="titleMedium">{menu.name}</Text>
                  </Card.Content>
                </Card>
              ))}
              <Card style={{ width: "45%", margin: "2%", height: 240 }} onPress={() => setRegStage(1)}>
                <Card.Content style={{ marginTop: "2%" }}>
                  <Icon
                    source="plus"
                    size={75}
                  />
                  <Text style={{ bottom: 0 }} variant="titleLarge">  {"Adicionar mais"}</Text>
                </Card.Content>
              </Card>
            </View>
          </>
        }

        {regStage === 1 &&
          <>
            <Text style={{ fontSize: 20, marginBottom: "10%" }}>Vamos começar a criar o seu menu de produtos.</Text>
            <Text style={{ fontSize: 15, textAlign: "left" }}>Você pode criar diversos menus, exemplo:</Text>
            <Text style={{ fontSize: 15, marginBottom: "10%", textAlign: "left" }}>Pratos quentes, Sobremesas, Bebidas, etc.</Text>
            <TextInput
              style={{ width: "100%", marginBottom: "2%" }}
              mode="outlined"
              label="Nome do menu (Ex: Bebidas)"
              onChangeText={(text) => {
                setMenuData((prevData) => ({
                  ...prevData,
                  name: text
                }))
              }}
            />
            <TextInput
              style={{ width: "100%", marginBottom: "2%" }}
              mode="outlined"
              label="Imagem"
              onChangeText={(text) => {
                setMenuData((prevData) => ({
                  ...prevData,
                  urlImg: text
                }))
              }}
            />
            <Button style={{ width: "100%", marginTop: "4%" }}
              mode="contained"
              icon="hexagon-multiple"
              onPress={() => setRegStage(2)}
            >
              {"Próximo"}
            </Button>
            <Button style={{ width: "100%", marginTop: "4%" }}
              icon="skip-previous"
              mode="text"
              onPress={() => setRegStage(0)}
            >
              Voltar
            </Button>
          </>}


        {regStage === 2 &&
          <>
            <Text style={{ fontSize: 20, marginBottom: "5%" }}>Agora vamos incluir os produtos!</Text>
            <Text style={{ fontSize: 20, marginBottom: "10%" }}>Menu: {menuData?.name}</Text>
            <TextInput
              style={{ width: "100%", marginBottom: "2%" }}
              mode="outlined"
              label="Nome do produto"
              value={productData.name}
              onChangeText={(text) => {
                setProductData((prevData) => ({
                  ...prevData,
                  name: text
                }))
              }}

            />
            <TextInput
              style={{ width: "100%", marginBottom: "2%" }}
              mode="outlined"
              label="Descrição"
              value={productData.description}
              onChangeText={(text) => {
                setProductData((prevData) => ({
                  ...prevData,
                  description: text
                }))
              }}

            />
            <TextInput
              style={{ width: "100%", marginBottom: "2%" }}
              mode="outlined"
              label="Preço"
              keyboardType="numeric"
              value={productData.price === 0 ? '' : productData.price.toString()}
              onChangeText={(text) => {
                setProductData((prevData) => ({
                  ...prevData,
                  price: parseFloat(text)
                }))
              }}
            />
            <Button style={{ width: "100%", marginTop: "4%" }}
              mode="contained"
              icon="hexagon-multiple"
              onPress={() => [add(), setRegStage(3)]}
            >
              {"Incluir"}
            </Button>
            <Button style={{ width: "100%", marginTop: "4%" }}
              icon="skip-previous"
              mode="text"
              onPress={() => setRegStage(1)}
            >
              Voltar
            </Button>
          </>}

        {regStage === 3 &&
          <>
            <Text style={{ fontSize: 20, marginBottom: "5%" }}>Menu: {menuData?.name}</Text>
            <Button style={{ width: "100%", marginBottom: "5%" }}
              mode="contained"
              icon="plus"
              onPress={() => [setRegStage(2), setProductData({ id: "", name: "", description: "", price: 0 })]}
            >  Incluir mais</Button>
            {menuData.items.map((item) => (
              <Card style={{ marginBottom: "2%" }}>
                <Card.Title title={item.name} subtitle={item.description} />
                <Card.Content>
                  {/* <Text variant="titleLarge">{item.name}</Text> */}
                  <Text variant="bodyMedium">{item.price.toString()}</Text>
                  <Text variant="bodyMedium">{item.id.toString()}</Text>
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => deleteLine(item.id)}>Deletar</Button>
                  <Button onPress={() => editLine(item.id)}>Editar</Button>
                </Card.Actions>
              </Card>
            ))}
            <Button style={{ width: "100%", marginTop: "4%" }}
              mode="contained"
              icon="hexagon-multiple"
              onPress={() => [saveAll()]}
            >
              {"Salvar todos"}
            </Button>
          </>
        }
        <Button onPress={() => console.log(listMenu)}>menuData</Button>
        <Button onPress={() => setRegStage(5)}>5</Button>
        <Button onPress={() => setRegStage(0)}>0</Button>
      </View>
    </ScrollView>
  )
}