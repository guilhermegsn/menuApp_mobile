import { ScrollView, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { Button, TextInput, Text, Card, Icon, ActivityIndicator, FAB } from 'react-native-paper'
import { MenuData, ProductData } from '../Interfaces/ProductMenu_Interface'
import { generateUUID } from '../Services/Functions'
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../Services/FirebaseConfig';
import { UserContext } from '../context/UserContext'
import auth from '@react-native-firebase/auth'
import { useNavigation } from '@react-navigation/native'
import { BackHandler } from 'react-native';
import { theme } from '../Services/ThemeConfig'


export default function ProductMenu() {

  const navigation = useNavigation<any>();
  const userContext = useContext(UserContext)
  const [regStage, setRegStage] = useState(-1)
  const [isEditing, setIsEditing] = useState(false)
  const [isBatchAdd, setIsBatcAdd] = useState(false)
  const [listMenu, setListMenu] = useState<MenuData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  const [isLoadingSaveAll, setIsLoadingSaveAll] = useState(false)
  const [isDataModified, setIsDataModified] = useState(false)


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
    if(regStage === -1){
      fetchData()
      setRegStage(0)
    }
    if (regStage === 0) {
      if(isDataModified){
        fetchData()
        setIsDataModified(false)
      }
      setIsEditing(false)
      setIsBatcAdd(false)
    }
  }, [regStage])

  const handleBackPress = () => {
    if (regStage === 1) {
      setRegStage(0)
      fetchData()
      return true
    } else if (regStage === 2) {
      if (isBatchAdd)
        setRegStage(1)
      else
        setRegStage(3)
      return true
    } else if (regStage === 3) {
      if (isBatchAdd)
        setRegStage(2)
      else
        setRegStage(0)
      return true
    } else {
      // Executa o comportamento padrão
      return false;
    }
  };

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [regStage]);

  const clearMenuData = () => {
    setMenuData({
      id: "",
      name: "",
      urlImg: "",
      items: []
    })
  }

  const fetchData = async () => {
    const q = query(
      collection(db, "Establishment"),
      where("owner", "==", auth().currentUser?.uid)
    );
    setIsLoading(true)
    await getDocs(q).then((res) => {
      if (!res.empty) {
        const doc = res.docs[0];
        if (doc.data().menu) {
          setListMenu(doc.data()?.menu)
        }
      }
    }).catch((e) => console.log(e)).finally(() => setIsLoading(false))
  };



  const add = async () => {
    if (isBatchAdd) {
      if (isEditing) {
        console.log('entrei aq')
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
      setRegStage(3)
    } else {
      //editando diretamente
      if (userContext) {
        const docRef = doc(db, 'Establishment', userContext.estabId);
        const docSnapshot = await getDoc(docRef);
        const estab = docSnapshot.data()

        const menuIndex = estab?.menu.findIndex((item: MenuData) => item.id === menuData.id);
        console.log('menuData id:' + menuData.id)
        const productIndex = estab?.menu[menuIndex].items.findIndex((item: ProductData) => item.id === productData.id);

        console.log('atualizando..')
        // Atualiza o elemento do array
        if (isEditing) {
          estab?.menu[menuIndex].items.splice(productIndex, 1, productData);
          console.log(estab?.menu)
          //Atualiza o documento
        } else {
          //inserindo diratamente
          productData.id = generateUUID(),
            estab?.menu[menuIndex].items.push(productData);
        }
        setIsLoadingSave(true)
        await updateDoc(docRef, {
          menu: estab?.menu,
        }).then(() => {
          setMenuData(estab?.menu[menuIndex])
          setIsDataModified(true)
          setRegStage(3)
        }).finally(() => setIsLoadingSave(false))
      }
    }
  }

  const deleteLine = async (id: string) => {
    if (isBatchAdd) {
      setMenuData((prevState) => {
        const updatedItems = prevState.items.filter((item) => item.id !== id);
        return {
          ...prevState,
          items: updatedItems,
        };
      })
    } else {
      if (userContext) {
        const docRef = doc(db, 'Establishment', userContext.estabId);
        const docSnapshot = await getDoc(docRef);
        const estab = docSnapshot.data();

        const menuIndex = estab?.menu.findIndex((item: MenuData) => item.id === menuData.id);
        const productIndex = estab?.menu[menuIndex].items.findIndex((item: ProductData) => item.id === id);

        // Handle deletion
        if (productIndex !== -1) {
          // Remove the item from the items array
          estab?.menu[menuIndex].items.splice(productIndex, 1);

          // Update the document
          await updateDoc(docRef, {
            menu: estab?.menu,
          }).then(() => {
            setMenuData(estab?.menu[menuIndex]);
            setIsDataModified(true)
            // setRegStage(3);
          }).finally(() => setIsLoadingSave(false));
        }
      }
    }


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
    if (userContext) {
      const docRef = doc(db, 'Establishment', userContext.estabId);
      // 1. Recupere o registro existente.
      const docSnapshot = await getDoc(docRef);
      if (docSnapshot.exists()) {
        const existingData = docSnapshot.data();
        const newItem = menuData;
        if (existingData.menu) {
          existingData.menu.push(newItem);
        } else {
          existingData.menu = [newItem];
        }
        // 2. Atualize o registro no Firestore com os dados atualizados.
        setIsLoadingSaveAll(true)
        await updateDoc(docRef, existingData).then(() => {
          console.log('salvo! ')
          setRegStage(0)
          setIsDataModified(true)
        }).finally(() => setIsLoadingSaveAll(false))
      } else {
        console.log('O documento não existe');
      }
    }
  }

  const styles = StyleSheet.create({
    scrollView: {
      marginTop: "5%",
      margin: "3%",
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
    }
  })


  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>

        {/* REG STAGE 0 = LISTA DE MENUS */}
        {isLoading ? <ActivityIndicator /> :
          regStage === 0 &&
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flexWrap: "wrap" }}>
              {listMenu?.map((menu, index) => (
                <Card key={index} style={{ width: "46%", margin: "2%", height: 240 }}
                  onPress={() => [setMenuData(menu), setRegStage(3)]}
                >
                  <Card.Cover source={{ uri: menu.urlImg }} />
                  <Card.Content style={{ marginTop: "2%" }}>
                    <Text style={{ marginTop: "2%" }} variant="titleMedium">{menu.name}</Text>
                  </Card.Content>
                </Card>
              ))}
              <Card style={{ width: "45%", margin: "2%", height: 240 }}
                onPress={() => [setRegStage(1), setIsBatcAdd(true), clearMenuData()]}>
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
            </View>
          </>
        }

        {/* REG STAGE 1 = CADASTRAR NOME DO MENU */}
        {regStage === 1 &&
          <>
            <Text style={{ fontSize: 20, marginBottom: "10%" }}>Vamos começar a criar o seu menu de produtos.</Text>
            <Text style={{ fontSize: 15, textAlign: "left" }}>Você pode criar diversos menus, exemplo:</Text>
            <Text style={{ fontSize: 15, marginBottom: "10%", textAlign: "left" }}>Pratos quentes, Sobremesas, Bebidas, etc.</Text>
            <TextInput
              style={{ width: "100%", marginBottom: "2%" }}
              mode="outlined"
              label="Nome do menu (Ex: Bebidas)"
              value={menuData.name}
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

        {/* REG STAGE 2 - CADASTRO DE PRODUTOS */}
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
              style={{ width: "100%", marginBottom: "3%" }}
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
            {isLoadingSave && <ActivityIndicator animating />}
            <Button style={{ width: "100%", marginTop: "4%" }}
              mode="contained"
              disabled={isLoadingSave}
              onPress={() => [add()]}
            >
              {"Salvar"}
            </Button>

            <Button style={{ width: "100%", marginTop: "4%" }}
              icon="skip-previous"
              mode="text"
              onPress={() => { isBatchAdd ? setRegStage(1) : setRegStage(3) }}
            >
              Voltar
            </Button>
          </>}

        {/* REG STAGE 3 = LISTA DE PRODUTOS DO MENU  */}
        {regStage === 3 &&
          <View>
            <View style={{ flexDirection: 'row' }}>
              <Text onPress={() => setRegStage(1)} style={{ fontSize: 20, marginBottom: "5%" }}>Menu: {menuData?.name}</Text>
            </View>
            {menuData.items.map((item, index) => (
              <Card key={index} style={{ marginBottom: "2%" }}>
                <Card.Title title={item.name} subtitle={item.description} />
                <Card.Content>
                  {/* <Text variant="titleLarge">{item.name}</Text> */}
                  <Text variant="bodyMedium">{item.price.toString()}</Text>
                </Card.Content>
                <Card.Actions>
                  <Button onPress={() => deleteLine(item.id)}>Deletar</Button>
                  <Button mode="outlined" onPress={() => editLine(item.id)}>Editar</Button>
                </Card.Actions>
              </Card>
            ))}
            <Button style={{ width: "100%", marginTop: "4%", marginBottom: "20%" }}
              mode="text"
              icon="skip-previous"
              onPress={() => isBatchAdd ? setRegStage(2) : setRegStage(0)}
            >
              {"Voltar"}
            </Button>
            {isBatchAdd &&
              <>
                {isLoadingSaveAll && <ActivityIndicator animating />}
                <Button style={{ width: "100%", marginTop: "4%" }}
                  mode="contained"
                  icon="hexagon-multiple"
                  onPress={() => [saveAll()]}
                >
                  {"Salvar todos"}
                </Button>
              </>
            }
          </View>
        }
        {/* <Button onPress={() => console.log(listMenu)}>menuData</Button>
        <Button onPress={() => setRegStage(0)}>0</Button>
        <Button onPress={() => fetchData()}>fetchData</Button> */}
      </ScrollView>

      {regStage === 3 &&

        <FAB
          color={theme.colors.background}
          style={styles.fab}
          icon="plus"
          onPress={() => [
            setRegStage(2),
            setProductData({ id: "", name: "", description: "", price: 0 }),
            setIsEditing(false),
          ]}
        />

      }
    </View>
  )


}