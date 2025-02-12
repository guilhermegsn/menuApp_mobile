import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Badge, Button, Card, Dialog, FAB, Icon, IconButton, Menu, Portal, Text, TextInput } from 'react-native-paper'
import { theme } from '../Services/ThemeConfig'
import { useNavigation, useRoute } from '@react-navigation/native'
import { collection, deleteDoc, doc, DocumentData, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { UserContext } from '../context/UserContext'
import { db } from '../Services/FirebaseConfig';
import { formatCurrencyInput, formatToCurrencyBR, formatToDoubleBR, generateUUID } from '../Services/Functions'
import { ItemCartData } from '../Interfaces/ProductMenu_Interface'

interface RouteParams {
  menu: DocumentData
}

export default function ItemsMenu() {

  const route = useRoute()
  const navigation = useNavigation()
  const { menu } = route.params as RouteParams || {};
  const userContext = useContext(UserContext)
  const [menuList, setMenuList] = useState<DocumentData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  const [operation, setOperation] = useState("")
  const [emptyProduct] = useState<DocumentData>({
    id: "",
    name: "",
    description: "",
    price: "",
    createdAt: serverTimestamp(),
    updatedAt: ""
  })
  const [product, setProduct] = useState(emptyProduct)
  const [isOpenMenuCardProduct, setIsOpenMenuCardProduct] = useState(-1)
  const [isAddShoppingCart, setIsAddShoppingCart] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<DocumentData>({})

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      if (userContext?.estabId) {
        setIsLoading(true)
        const itemsRef = collection(db, "Establishment", userContext?.estabId, "Menu", menu.id, "items");
        const querySnapshot = await getDocs(itemsRef);
        const fetchedItems = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setMenuList(fetchedItems);
      } else {
        console.log('*sem doc')
      }
    } catch (e) {
      console.log(e)
    } finally {
      setIsLoading(false)
    }
  }

  const saveProduct = async () => {
    setIsLoadingSave(true)
    try {
      const newId = generateUUID()
      if (userContext?.estabId && menu.id && product) {

        const itemRef = doc(db, "Establishment", userContext.estabId, "Menu", menu.id, "items",
          operation === 'create' ? newId : product.id // Gera ID para criar
        );

        const parsedPrice = parseFloat(product.price.replaceAll(".", "").replaceAll(",", ".") || null)

        // Realiza a operação com base no tipo
        switch (operation) {
          case 'create': {
            const prodData = {
              ...product,
              id: newId,
              price: parsedPrice,
              createdAt: serverTimestamp(),
              createdBy: userContext.user?.email,
            };
            await setDoc(itemRef, prodData)
            console.log('Item criado com sucesso:', prodData)
            break;
          }
          case 'update': {
            const prodData = {
              ...product,
              price: parsedPrice,
              updatedAt: serverTimestamp(),
              updatedBy: userContext?.user?.email,
            };
            console.log(prodData)
            await setDoc(itemRef, prodData, { merge: true })
            console.log('Item atualizado com sucesso:', prodData)
            break;
          }
          case 'delete': {
            await deleteDoc(itemRef);
            console.log('Item excluído com sucesso:', product.id)
            break;
          }
          default:
            throw new Error('Operação inválida')
        }
        fetchData()
        setOperation("")
      }
    } catch (error) {
      console.error(`Erro ao realizar a operação (${operation}):`, error)
    } finally {
      setIsLoadingSave(false)
    }
  }

  const selectProduct = (product: DocumentData) => {
    console.log(product)
    setIsAddShoppingCart(true)
    setSelectedProduct({
      qty: 1,
      product: product
    })
  }

  const addShoppingCart = (item: ItemCartData) => {
    console.log('item:', item)
    const copyProducts = userContext?.shoppingCart
    if (copyProducts) {
      copyProducts.push(item)
      userContext.setShoppingCart(copyProducts)
      setIsAddShoppingCart(false)
    }
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
      marginTop: 60,
      zIndex: 1
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
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity
            onLongPress={() => Alert.alert(
              'Alterar imagem', 'Deseja alterar a imagem do menu?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Sim',
                  onPress: () => {
                    //updateMenuImage()
                  },
                },
              ],
              { cancelable: true } // Define se o Alert pode ser fechado ao tocar fora dele
            )}
          >

            {menu.imageUrl ?
              <Card.Cover source={{ uri: menu.imageUrl }} style={styles.imagem} /> :
              <Card.Cover source={require('../assets/images/menuImage.jpeg')} style={styles.imagem} />
            }

          </TouchableOpacity>
          <View style={{ position: 'absolute', bottom: -5, alignSelf: 'center', }}>
            <View style={styles.textWrapper}>
              <Text style={styles.text}
                // onLongPress={() => Alert.alert(
                //   'Editar menu', 'Deseja alterar o nome do menu?',
                //   [
                //     { text: 'Cancelar', style: 'cancel' },
                //     {
                //       text: 'Sim',
                //       onPress: () => {

                //       },
                //     },
                //   ],
                //   { cancelable: true }
                // )}
              >{menu?.menuName}</Text>
            </View>

          </View>
        </View>
        <View style={{ marginBottom: 100 }}>
          {isLoading ? <ActivityIndicator /> :
            menuList?.map((item, index) => (
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
                    userContext?.userRole === 'ADM' &&
                    <View>
                      <Menu
                        visible={isOpenMenuCardProduct === index}
                        onDismiss={() => setIsOpenMenuCardProduct(-1)}
                        anchor={<IconButton icon="dots-vertical" onPress={() => [setIsOpenMenuCardProduct(index)]} />}
                      >
                        <Menu.Item
                          onPress={() => {
                            setOperation('update')
                            setProduct({ ...item, price: formatToDoubleBR(item.price) })
                            setIsOpenMenuCardProduct(-1)
                          }}
                          title="Editar"
                          leadingIcon="pencil"
                        />
                        <Menu.Item
                          onPress={() => {
                            setOperation('delete')
                            setProduct({ ...item, price: formatToDoubleBR(item.price) })
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
                    {formatToCurrencyBR(item.price)}
                  </Text>
                </Card.Content>
              </Card>
            ))}
        </View>
      </ScrollView>


      <Portal>
        <Dialog
          visible={operation === 'create' || operation === 'update' || operation === 'delete'}
          onDismiss={() => [setOperation("")]}>
          <Dialog.Title>
            {operation === 'create' ? "Adicionar item" :
              operation === 'update' ? "Editar item" :
                operation === 'delete' && "Excluir item"
            }
          </Dialog.Title>
          <Dialog.Content style={{ margin: -10 }}>
            <TextInput
              style={{ margin: 5, marginTop: 10 }}
              label="Nome"
              keyboardType='default'
              value={product.name}
              disabled={operation === 'delete'}
              onChangeText={(text) => {
                setProduct(items => ({
                  ...items,
                  name: text
                }))
              }}
            />
            <TextInput
              style={{ margin: 5, marginTop: 10 }}
              label="Descrição"
              keyboardType='default'
              multiline
              numberOfLines={3}
              disabled={operation === 'delete'}
              value={product.description}
              onChangeText={(text) => {
                setProduct(items => ({
                  ...items,
                  description: text
                }))
              }}
            />
            <TextInput
              style={{ margin: 5, marginTop: 10 }}
              label="Valor"
              keyboardType='numeric'
              disabled={operation === 'delete'}
              value={product.price}
              onChangeText={(text) => {
                setProduct(items => ({
                  ...items,
                  price: formatCurrencyInput(text)
                }))
              }}
            />
            <Dialog.Actions>
              <Button onPress={() => setOperation("")}>Cancelar</Button>
              <Button
                onPress={saveProduct}
                loading={isLoadingSave}
              >
                {operation === 'delete' ? "Excluir" : "Salvar"}
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
                onPress={() => addShoppingCart(selectedProduct as ItemCartData)}
              // loading={isLoadingSave}
              >
                Adicionar
              </Button>
            </Dialog.Actions>
          </Dialog.Content>
        </Dialog>
      </Portal>


      {userContext?.userRole === 'ADM' &&
        <FAB
          color={theme.colors.background}
          style={styles.fab}
          icon="plus"
          onPress={() => [
            setOperation('create'),
            setProduct(emptyProduct)
          ]}
        />
      }

      {/* <Button onPress={() => console.log(menuList)}>data</Button>
      <Button onPress={() => console.log(userContext?.user)}>user</Button> */}
    </View>
  )
}