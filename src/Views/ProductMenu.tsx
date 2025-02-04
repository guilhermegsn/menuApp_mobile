import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { Button, TextInput, Text, Card, Icon, ActivityIndicator, FAB, IconButton, Portal, Dialog, Menu, Badge } from 'react-native-paper'
import { MenuData, ProductData, ItemCartData } from '../Interfaces/ProductMenu_Interface'
import { generateUUID, openImagePicker, uploadImage } from '../Services/Functions'
import { addDoc, collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../Services/FirebaseConfig';
import { UserContext } from '../context/UserContext'
import auth from '@react-native-firebase/auth'
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native'
import { BackHandler } from 'react-native';
import { theme } from '../Services/ThemeConfig'
import Loading from '../Components/Loading'
import { getStorage, ref } from "firebase/storage";


export default function ProductMenu() {
  const navigation = useNavigation<any>()
  const userContext = useContext(UserContext)
  const [regStage, setRegStage] = useState(-1)
  const [isEditing, setIsEditing] = useState(false)
  const [isBatchAdd, setIsBatcAdd] = useState(false)
  const [listMenu, setListMenu] = useState<MenuData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  const [isLoadingSaveAll, setIsLoadingSaveAll] = useState(false)
  const [isDataModified, setIsDataModified] = useState(false)
  const [isEditingNameMenu, setIsEditingNameMenu] = useState(false)
  const [newNameMenu, setNewNameMenu] = useState('')
  const [isOpenMenuCardProduct, setIsOpenMenuCardProduct] = useState(-1)
  const [isAddShoppingCart, setIsAddShoppingCart] = useState(false)
  const [isNewMenu, setIsNewMenu] = useState(false)
  const [imageMenu, setImageMenu] = useState("")
  const [nameNewMenu, setNameNewMenu] = useState("")

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
    price: 0,
    strPrice: ""
  })

  const [selectedProduct, setSelectedProduct] = useState<ItemCartData>({
    qty: 1,
    product: {
      id: "",
      name: "",
      description: "",
      price: 0,
      strPrice: ""
    }
  })

  useFocusEffect(
    React.useCallback(() => {
      if (userContext?.isUpdatedDataMenu) {
        fetchData()
        userContext.setIsUpdatedDataMenu(false)
      }
    }, [])
  )

  useEffect(() => {
    if (regStage === -1) {
      fetchData()
      setRegStage(0)
    }
    if (regStage === 0) {
      if (isDataModified) {
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
  }

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [regStage])

  const clearMenuData = () => {
    setMenuData({
      id: "",
      name: "",
      urlImg: "",
      items: []
    })
  }

  const fetchData = async () => {
    try {
      if (userContext?.estabId) {
        setIsLoading(true)
        const docRef = doc(db, "Establishment", userContext?.estabId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setListMenu(docSnap.data()?.menu)
        }
      }
    } catch (e) {
      console.log(e)
    } finally {
      setIsLoading(false)
    }
  }


  const editNameMenu = () => {
    setIsEditingNameMenu(true)
    setNewNameMenu(menuData.name)
  }

  const saveNewNameMenu = async () => {
    setIsLoadingSave(true)
    try {
      if (userContext) {
        const docRef = doc(db, 'Establishment', userContext.estabId);
        const docSnapshot = await getDoc(docRef);
        const estab = docSnapshot.data()
        const menuIndex = estab?.menu.findIndex((item: MenuData) => item.id === menuData.id);
        //  const urlImageSave = await uploadImage(uri)
        if (estab) {
          estab.menu[menuIndex].name = newNameMenu
          await updateDoc(docRef, {
            menu: estab.menu
          })
          setIsDataModified(true)
          setIsEditingNameMenu(false)
          setMenuData((items) => ({
            ...items,
            name: newNameMenu
          }))
        }
      }
    } catch {
      Alert.alert('Ocorreu um erro.')
    } finally {
      setIsLoadingSave(false)
    }
  }

  const add = async () => {
    if (isBatchAdd) {
      if (isEditing) {
        console.log('entrei aq')
        setMenuData((prevMenuData) => {
          return {
            ...prevMenuData,
            items: prevMenuData.items.map((item) => {
              if (item.id === productData.id) {
                return { ...item, ...productData }
              }
              return item
            })
          }
        })
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
          productData.price = parseFloat(productData.strPrice.replaceAll(".", "").replaceAll(",", "."))

          let copyData = { ...productData }
          const { strPrice, ...newData } = copyData //removendo srtPrice p/ nao salvar na base de dados

          estab?.menu[menuIndex].items.splice(productIndex, 1, newData);
          //Atualiza o documento
        } else {
          //inserindo diratamente
          productData.price = parseFloat(productData.strPrice.replaceAll(".", "").replaceAll(",", "."))
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
    let line = menuData.items.find((item) => item.id === id)
    if (line) {
      line.strPrice = line.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
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


  const updateMenuImage = async () => {
    setIsLoading(true)
    try {
      const uri = await openImagePicker()
      if (uri) {
        setMenuData((items) => ({
          ...items,
          urlImg: uri
        }))

        if (userContext) {
          const docRef = doc(db, 'Establishment', userContext.estabId);
          const docSnapshot = await getDoc(docRef);
          const estab = docSnapshot.data()
          const menuIndex = estab?.menu.findIndex((item: MenuData) => item.id === menuData.id);
          //  const urlImageSave = await uploadImage(uri)
          if (estab) {
            const urlImageSave = await uploadImage(uri, userContext.estabId)
            estab.menu[menuIndex].urlImg = urlImageSave
            await updateDoc(docRef, {
              menu: estab.menu
            })
            setIsDataModified(true)
            console.log('Imagem alterada!')
          }
        }
      }
    } catch {
      console.log('erro ao salvar imagem')
    } finally {
      setIsLoading(false)
    }
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
    imagem: {
      width: '100%', // Ajusta para ocupar toda a largura
      height: 200,    // Altura fixa de 300
      resizeMode: 'cover', // Mantém a proporção e cobre completamente o contêiner
      marginBottom: 15
    },
    overlay: {
      ...StyleSheet.absoluteFillObject, // Isso faz com que o contêiner cubra toda a área do pai (a imagem)
      flexDirection: 'row',
    },
    textWrapper: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      backgroundColor: theme.colors.primary, // Cor do contorno
      borderRadius: 7
    },
    text: {
      fontSize: 24,
      color: '#fff', // Cor do texto
      textShadowColor: '#000', // Cor do contorno
    },
    thumbnail: {
      width: 150,
      height: 150,
      marginVertical: 20,
    },
    loadingImage: {
      position: 'absolute',
      bottom: 25,
      right: 20,
      zIndex: 1
    },
    badge: {
      marginBottom: 0,
      position: 'absolute',
      marginTop: 20,
      right: 15,
      zIndex: 200
    }
  })

  const formatCurrencyInput = (value: string) => {
    value = value.toString().replace(/\D/g, "")
    value = (parseFloat(value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return value
  }

  const addShoppingCart = (item: ItemCartData) => {
    const copyProducts = userContext?.shoppingCart
    if (copyProducts) {
      copyProducts.push(item)
      userContext.setShoppingCart(copyProducts)
      setIsAddShoppingCart(false)
    }
  }

  const selectProduct = (product: ProductData) => {
    setIsAddShoppingCart(true)
    setSelectedProduct({
      qty: 1,
      product: product
    })
  }

  const sendOrder = async (order_id: string) => {
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
      local: "",
      order_id: order_id,
      status: 1,
      name: "Guilherme Nunes"
    }
    const orderItemsRef = collection(db, "OrderItems");
    const saveOrder = await addDoc(orderItemsRef, dataOrder)
    if (saveOrder) {
      console.log('entrouaq')
      userContext?.setShoppingCart([])

    } else {
      console.log('nao entyrou aq')
    }
  }

  const clearShoppingCart = () => {
    console.log('limpando')
    userContext?.setShoppingCart([] as ItemCartData[]);
  }

  const openImageNewMenu = async () => {
    const uri = await openImagePicker()
    if (uri) {
      setImageMenu(uri)
    }
  }

  const addNewMenu = async () => {
    setIsLoadingSave(true)
    try {
      if (userContext) {
        const docRef = doc(db, 'Establishment', userContext.estabId)
        const docSnapshot = await getDoc(docRef);
        const estab = docSnapshot.data();

        if (estab) {
          const urlImageSave = await uploadImage(imageMenu, userContext?.estabId)
          const newMenuItem = {
            id: generateUUID(),
            urlImg: urlImageSave,
            items: [],
            name: nameNewMenu
          };

          // Adiciona o novo item ao menu
          await updateDoc(docRef, {
            menu: [...estab.menu, newMenuItem]
          });

          userContext.setIsUpdatedDataMenu(true);
          console.log('Novo item de menu adicionado!');
        }
      }
    } catch (e) {
      console.log(e)
      Alert.alert('Erro ao salvar');
    } finally {
      setIsLoadingSave(false);
    }
  }


  return (
    <View style={{ flex: 1 }}>
      <View style={{ position: 'absolute', right: 0, top: -60, zIndex: 100 }}>
        {userContext?.shoppingCart && userContext?.shoppingCart.length > 0 &&
          <Badge
            style={styles.badge}
            onPress={() => navigation.navigate('ShoppingCart')}
            size={13}>{userContext?.shoppingCart.length}
          </Badge>
        }
        <Button
          style={{ marginTop: 15 }}
          // onPress={() => {
          //   navigation.navigate('ShoppingCart', {
          //     shoppingCart: shoppingCart
          //   });
          // }}
          onPress={() => {
            navigation.navigate('ShoppingCart');
          }}
        ><Icon source="cart" size={25} color={theme.colors.onBackground} /></Button>
      </View>
      <ScrollView contentContainerStyle={styles.scrollViewContent}>

        {/* REG STAGE 0 = LISTA DE MENUS */}
        {isLoading ? <Loading /> :
          regStage === 0 &&
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flexWrap: "wrap" }}>
              {listMenu?.map((menu, index) => (
                <Card key={index} style={{ width: "46%", margin: "2%", height: 240 }}
                  //  onPress={() => [setMenuData(menu), setRegStage(3)]}

                  // passo o listMenu e o index do menu selecionado para a stack 
                  onPress={() => [navigation.navigate('ProductMenuItens', { menu: menu, indexMenu: index })]}
                >
                  <Card.Cover source={{ uri: menu.urlImg !== null ? menu.urlImg : '' }} />
                  <Card.Content style={{ marginTop: "2%" }}>
                    <Text style={{ marginTop: "2%" }} variant="titleMedium">{menu.name}</Text>
                  </Card.Content>
                </Card>
              ))}
              {userContext?.userRole === 'ADM' &&
                <Card style={{ width: "45%", margin: "2%", height: 240 }}
                  // onPress={() => [setRegStage(1), setIsBatcAdd(true), clearMenuData()]}>
                  onPress={() => setIsNewMenu(true)}>
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
              }
            </View>
          </>
        }
      </ScrollView>

      <Portal>
        <Dialog visible={isEditingNameMenu} onDismiss={() => [setIsEditingNameMenu(false)]}>
          <Dialog.Title>{"Alterar nome"}</Dialog.Title>
          <Dialog.Content style={{ margin: -10 }}>
            <TextInput
              style={{ margin: 5, marginTop: 10 }}
              label="Valor"
              keyboardType='default'
              value={newNameMenu}
              onChangeText={(text) => {
                setNewNameMenu(text)
              }}
            />
            <Dialog.Actions>
              <Button onPress={() => setIsEditingNameMenu(false)}>Cancelar</Button>
              <Button
                onPress={saveNewNameMenu}
                loading={isLoadingSave}

              >
                Salvar
              </Button>
            </Dialog.Actions>
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Modal ADD ShoppingCart */}
      <Portal>
        <Dialog visible={isAddShoppingCart} onDismiss={() => [setIsAddShoppingCart(false)]}>
          <Dialog.Title style={{ textAlign: 'center' }}>{selectedProduct.product.name}</Dialog.Title>

          <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'center' }}>
            <IconButton
              icon="minus"
              size={25}
              onPress={() => setSelectedProduct((prevData) => ({
                ...prevData,
                qty: prevData.qty - 1
              }))}
            />
            <TextInput
              style={{ margin: 5, marginTop: 10 }}
              label=""
              keyboardType='numeric'
              value={selectedProduct.qty.toString()}
              onChangeText={(text) => {
                setNewNameMenu(text)
              }}
            />
            <IconButton
              icon="plus"
              size={25}
              onPress={() => setSelectedProduct((prevData) => ({
                ...prevData,
                qty: prevData.qty + 1
              }))}
            />
          </View>

          <Dialog.Content style={{ marginTop: 40 }}>
            <Dialog.Actions>
              <Button onPress={() => setIsAddShoppingCart(false)}>Cancelar</Button>
              <Button
                onPress={() => addShoppingCart(selectedProduct)}
              // loading={isLoadingSave}
              >
                Adicionar
              </Button>
            </Dialog.Actions>
          </Dialog.Content>
        </Dialog>
      </Portal>


      {/* Modal ADD Novo menu */}
      <Portal>
        <Dialog visible={isNewMenu} onDismiss={() => [setIsNewMenu(false)]}>
          <Dialog.Title style={{ textAlign: 'center' }}>{'Novo Menu'}</Dialog.Title>

          <View style={{ padding: 15 }}>
            <TextInput
              style={{ margin: 5, marginTop: 10 }}
              mode='outlined'
              label="Nome"
              placeholder='Exemplo: Lanches'
              keyboardType='default'
              value={nameNewMenu}
              onChangeText={(text) => {
                setNameNewMenu(text)
              }}
            />


            <View>
              {imageMenu ?
                <TouchableOpacity
                  onPress={openImageNewMenu}
                >
                  <Image
                    source={{ uri: imageMenu }}
                    style={styles.imagem}
                  />
                </TouchableOpacity> :
                <View style={{ alignSelf: 'center', marginTop: 50 }}>
                  <Button
                    icon="image"
                    mode="outlined"
                    onPress={openImageNewMenu}
                  >Adicionar imagem
                  </Button>
                </View>
              }
            </View>
          </View>

          <Dialog.Content style={{ marginTop: 40 }}>
            <Dialog.Actions>
              <Button onPress={() => setIsNewMenu(false)}>Cancelar</Button>
              <Button
                onPress={() => addNewMenu()}
                loading={isLoadingSave}

              >
                Salvar
              </Button>
            </Dialog.Actions>
          </Dialog.Content>
        </Dialog>
      </Portal>
      {/* <Button onPress={() => console.log(shoppingCart)} >Cart</Button>
      <Button onPress={() => sendOrder("KqULPwqwiJFqFMfy2CZK")} >sendOrder</Button>
      <Button onPress={() => clearShoppingCart()} >Limpar</Button> */}
    </View>
  )


}