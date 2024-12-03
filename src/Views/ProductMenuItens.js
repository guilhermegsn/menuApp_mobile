import { Alert, Image, ScrollView, StyleSheet, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Badge, Button, Card, Dialog, FAB, Icon, IconButton, Menu, Portal, Text, TextInput } from 'react-native-paper'
import { useRoute, useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { theme } from '../Services/ThemeConfig'
import { formatCurrencyInput, generateUUID, openImagePicker, uploadImage } from '../Services/Functions';
import { TouchableOpacity } from 'react-native-gesture-handler';

export default function ProductMenuItens() {

  const route = useRoute()
  const navigation = useNavigation()
  const { menu } = route.params
  const [dataMenu, setDataMenu] = useState([])
  const [imageMenu, setImageMenu] = useState('')
  const [nameMenu, setnameMenu] = useState('')
  const [isOpenMenuCardProduct, setIsOpenMenuCardProduct] = useState(-1)
  const [isEdit, setIsEdit] = useState(false)
  const [isCreate, setIsCreate] = useState(false)
  const [isDelete, setIsDelete] = useState(false)
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const userContext = useContext(UserContext)
  const [isEditingNameMenu, setIsEditingNameMenu] = useState(false)
  const [newNameMenu, setNewNameMenu] = useState('')
  const [isAddShoppingCart, setIsAddShoppingCart] = useState(false)


  const [emptySelectedProduct] = useState({
    id: "",
    name: "",
    price: 0,
    strPrice: "",
    description: ""
  })

  useEffect(() => {
    if (dataMenu?.length <= 0) {
      const formatedData = menu?.items?.map((item) => ({
        ...item,
        strPrice: item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      }))
      setImageMenu(menu.urlImg)
      setnameMenu(menu.name)
      setDataMenu(formatedData)
    }
  }, [menu])

  const cancel = () => {
    setIsEdit(false)
    setIsCreate(false)
    setIsDelete(false)
    setSelectedProduct(emptySelectedProduct)
  }


  const styles = StyleSheet.create({
    imagem: {
      width: '100%', // Ajusta para ocupar toda a largura
      height: 200,    // Altura fixa de 300
      resizeMode: 'cover', // Mantém a proporção e cobre completamente o contêiner
      marginBottom: 15
    },
    fab: {
      position: 'absolute',
      margin: 12,
      right: 10,
      bottom: 10,
      backgroundColor: theme.colors.primary,
      marginTop: 60
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
    badge: {
      marginBottom: 0,
      position: 'absolute',
      marginTop: 20,
      right: 15,
      zIndex: 200
    }
  })


  const updateItem = async (menuId, itemId, data) => {
    const docRef = doc(db, 'Establishment', userContext.estabId)
    const docSnapshot = await getDoc(docRef)
    const estab = docSnapshot.data()
    const menuIndex = estab?.menu.findIndex(menu => menu.id === menuId)
    const productIndex = estab?.menu[menuIndex]?.items.findIndex(item => item.id === itemId)
    if (isDelete) {
      console.log('excluindo..')
      const newData = estab.menu[menuIndex].items.filter(item => item.id !== data.id)
      estab.menu[menuIndex].items = newData
      console.log('newData', newData)
    } else {
      let formatedData = { ...data }
      formatedData.price = parseFloat(data?.strPrice?.replace('.', '')?.replace(',', '.'))
      delete formatedData.strPrice
      if (isEdit) {
        estab.menu[menuIndex].items[productIndex] = formatedData; // Atualiza o item
      } else if (isCreate) {
        estab.menu[menuIndex].items.push({ ...formatedData, id: generateUUID() }); // Adiciona novo item
      }
    }
    setIsLoadingSave(true)
    try {
      await updateDoc(docRef, { menu: estab.menu }) //atualiza o banco
      if (isEdit) { //atualiza o componente na tela
        let copyDataMenu = dataMenu
        copyDataMenu[productIndex] = data
        setDataMenu(copyDataMenu)
      } else if (isCreate) {
        setDataMenu(prevData => ([...prevData, data]))
      } else {
        setDataMenu(prevData => (prevData.filter(item => item.id !== data.id)))
      }
      cancel() //fecho o modal
      userContext.setIsUpdatedDataMenu(true)//informo que os dados foram atualizados p/ atualizar o menu
    } catch (e) {
      Alert.alert('Ocorreu um erro!', e)
    } finally {
      setIsLoadingSave(false)
    }
  }

  const updateMenuImage = async () => {
    setIsLoading(true)
    try {
      const uri = await openImagePicker()
      if (uri) {
        setImageMenu(uri)
        if (userContext) {
          const docRef = doc(db, 'Establishment', userContext.estabId)
          const docSnapshot = await getDoc(docRef)
          const estab = docSnapshot.data()
          const menuIndex = estab?.menu.findIndex(menuItem => menuItem.id === menu.id)
          if (estab) {
            const urlImageSave = await uploadImage(uri)
            estab.menu[menuIndex].urlImg = urlImageSave
            await updateDoc(docRef, {
              menu: estab.menu
            })
            userContext.setIsUpdatedDataMenu(true)
            console.log('Imagem alterada!')
          }
        }
      }
    } catch (e) {
      console.log('erro ao salvar imagem', e)
    } finally {
      setIsLoading(false)
    }
  }

  const saveNewNameMenu = async () => {
    setIsLoadingSave(true)
    try {
      if (userContext) {
        const docRef = doc(db, 'Establishment', userContext.estabId)
        const docSnapshot = await getDoc(docRef);
        const estab = docSnapshot.data()
        const menuIndex = estab?.menu.findIndex((item) => item.id === menu.id)
        if (estab) {
          estab.menu[menuIndex].name = newNameMenu
          await updateDoc(docRef, {
            menu: estab.menu
          })
          userContext.setIsUpdatedDataMenu(true)
          setIsEditingNameMenu(false)
          setnameMenu(newNameMenu)
        }
      }
    } catch (e) {
      console.log(e)
      Alert.alert('Ocorreu um erro.')
    } finally {
      setIsLoadingSave(false)
    }
  }

  const addShoppingCart = (item) => {
    const copyProducts = userContext?.shoppingCart
    if (copyProducts) {
      copyProducts.push(item)
      userContext.setShoppingCart(copyProducts)
      setIsAddShoppingCart(false)
    }
  }


  const selectProduct = (product) => {
    setIsAddShoppingCart(true)
    setSelectedProduct({
      qty: 1,
      product: product
    })
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
          onPress={() => {
            navigation.navigate('ShoppingCart');
          }}
        ><Icon source="cart" size={25} color={theme.colors.onBackground} /></Button>
      </View>
      <ScrollView>
        <View style={{ marginBottom: 90 }}>
          <View style={{ marginBottom: 15 }}>
            <TouchableOpacity
              onLongPress={() => Alert.alert(
                'Alterar imagem', 'Deseja alterar a imagem do menu?',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Sim',
                    onPress: () => {
                      updateMenuImage()
                    },
                  },
                ],
                { cancelable: true } // Define se o Alert pode ser fechado ao tocar fora dele
              )}
            >
              {isLoading && <ActivityIndicator
                color='orange'
                style={styles.loadingImage} />}
              {imageMenu &&
                <Image
                  source={{ uri: imageMenu }}
                  style={styles.imagem}
                />
              }
            </TouchableOpacity>
            <View style={{ position: 'absolute', bottom: -5, alignSelf: 'center', }}>
              <View style={styles.textWrapper}>
                <Text style={styles.text}
                  onLongPress={() => Alert.alert(
                    'Editar menu', 'Deseja alterar o nome do menu?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Sim',
                        onPress: () => {
                          setIsEditingNameMenu(true)
                          setNewNameMenu(menu.name)
                        },
                      },
                    ],
                    { cancelable: true }
                  )}
                >{nameMenu}</Text>
              </View>
            </View>
          </View>
          {dataMenu?.map((item, index) => (
            <Card
              key={index}
              style={{ marginLeft: 10, marginBottom: 10, marginRight: 10 }}
              onPress={() => selectProduct(item)}
            >
              <Card.Title
                titleVariant='titleMedium'
                title={item.name}
                subtitle={""}
                right={() => (
                  <View>
                    <Menu
                      visible={isOpenMenuCardProduct === index}
                      onDismiss={() => setIsOpenMenuCardProduct(-1)}
                      anchor={<IconButton icon="dots-vertical" onPress={() => [setIsOpenMenuCardProduct(index)]} />}
                    >
                      <Menu.Item
                        onPress={() => {
                          setIsEdit(true)
                          setSelectedProduct(item)
                          setIsOpenMenuCardProduct(-1)
                        }}
                        title="Editar"
                        leadingIcon="pencil"
                      />
                      <Menu.Item
                        onPress={() => {
                          setSelectedProduct(item)
                          setIsDelete(true)
                          setIsOpenMenuCardProduct(-1)
                        }}
                        title="Excluir"
                        leadingIcon="delete"
                      />
                    </Menu>
                  </View>
                )}
              />
              <Card.Content>
                <View style={{ marginTop: -15, marginBottom: 10 }}>
                  <Text variant='bodySmall'>{item?.description}</Text>
                </View>
                <Text variant="bodyMedium">
                  R$ {item.strPrice}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={isEdit || isCreate || isDelete} onDismiss={cancel}>
          <Dialog.Title>{isDelete ? "Excluir produto" : "Cadastro de produto"}</Dialog.Title>
          <Dialog.Content style={{ margin: -10 }}>
            <TextInput
              disabled={isDelete}
              style={{ margin: 5, marginTop: 10 }}
              label="Nome"
              keyboardType='default'
              value={selectedProduct?.name || ""}
              onChangeText={(text) => {
                setSelectedProduct((items) => ({
                  ...items,
                  name: text
                }))
              }}
            />
            {!isDelete &&
              <>
                <TextInput
                  numberOfLines={3}
                  multiline
                  style={{ margin: 5, marginTop: 10 }}
                  label="Descrição"
                  keyboardType='default'
                  value={selectedProduct?.description || ""}
                  onChangeText={(text) => {
                    setSelectedProduct((items) => ({
                      ...items,
                      description: text
                    }))
                  }}
                />
                <TextInput
                  style={{ margin: 5, marginTop: 10 }}
                  label="Valor"
                  keyboardType='numeric'
                  value={selectedProduct?.strPrice}
                  onChangeText={(text) => {
                    setSelectedProduct((items) => ({
                      ...items,
                      strPrice: formatCurrencyInput(text)
                    }))
                  }}
                />
              </>
            }
            <Dialog.Actions>
              <Button onPress={cancel}>Cancelar</Button>
              <Button
                onPress={() => updateItem(menu.id, selectedProduct?.id, selectedProduct)}
                loading={isLoadingSave}
              >
                {isDelete ? "Excluir" : "Salvar"}
              </Button>
            </Dialog.Actions>
          </Dialog.Content>
        </Dialog>
      </Portal>

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
          <Dialog.Title style={{ textAlign: 'center' }}>{selectedProduct?.product?.name}</Dialog.Title>
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
              value={selectedProduct?.qty?.toString()}
              onChangeText={(text) => {
                setSelectedProduct(prevData => ({
                  ...prevData,
                  qty: text
                }))
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


      <FAB
        color={theme.colors.background}
        style={styles.fab}
        icon="plus"
        onPress={() => [
          setIsCreate(true),
          setSelectedProduct(emptySelectedProduct),
        ]}
      />
    </View>
  )
}