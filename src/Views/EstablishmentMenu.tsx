import { Image, StyleSheet, View, TouchableOpacity, Alert, ScrollView, RefreshControl } from 'react-native'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Button, Card, Dialog, Icon, Portal, Text, TextInput } from 'react-native-paper'
import { UserContext } from '../context/UserContext'
import { addDoc, collection, deleteDoc, doc, getDocs, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../Services/FirebaseConfig';
import { DocumentData } from '@google-cloud/firestore'
import Loading from '../Components/Loading'
import { openImagePicker, uploadImage } from '../Services/Functions'
import { useNavigation } from '@react-navigation/native'
import { Dimensions } from 'react-native';

interface MenuData {
  id: string,
  menuName: string,
  imageUrl: string
}


export default function EstablishmentMenu() {



  const { width } = Dimensions.get('window');

  const navigation = useNavigation<any>()
  const userContext = useContext(UserContext)
  const [emptyMenu] = useState<MenuData>({
    id: "",
    menuName: "",
    imageUrl: ""
  })
  const [menu, setMenu] = useState(emptyMenu)
  const [isNewMenu, setIsNewMenu] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [isDelete, setIsDelete] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingSave, setIsLoadingSave] = useState(false)
  const [listMenu, setListMenu] = useState<DocumentData[]>([])
  const [uri, setUri] = useState("")
  const [refreshing, setRefreshing] = useState(false);
  const [confirmTitleDelete, setConfirmTitleDelete] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    console.log('Obtendo dados...')
    try {
      if (userContext?.estabId) {
        setIsLoading(true)

        const menuRef = collection(
          db,
          "Establishment",
          userContext.estabId,
          "Menu"
        )

        // Obtém os documentos da subcoleção "Menu"
        const querySnapshot = await getDocs(menuRef);

        if (!querySnapshot.empty) {
          // Itera sobre os documentos da subcoleção e extrai os dados
          const menus = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }));
          setListMenu(menus)// Define os menus no estado
        } else {
          console.log('Nenhum menu encontrado')
        }
      }
    } catch (e) {
      console.error("Erro ao buscar os menus:", e)
    } finally {
      setIsLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  // const saveNewMenu = async (menuName: string) => {
  //   setIsLoadingSave(true);
  //   try {
  //     if (!userContext?.estabId) {
  //       throw new Error("ID do estabelecimento não encontrado");
  //     }
  //     // Referência à coleção 'Menu' no estabelecimento
  //     const menuRef = collection(db, "Establishment", userContext.estabId, "Menu");

  //     if (isEdit) {

  //       //crie os edit pra mim


  //     } else {
  //       const urlImageSave = await uploadImage(imageMenu, userContext.estabId)
  //       // Caso seja inclusão, cria um novo documento na coleção 'Menu'
  //       const docRef = await addDoc(menuRef, { menuName: menuName, imageUrl: urlImageSave, });
  //       console.log("Menu criado com ID:", docRef.id)
  //       setIsNewMenu(false)
  //     }
  //   } catch (error) {
  //     console.error("Erro ao salvar o menu", error);
  //   } finally {
  //     setIsLoadingSave(false);
  //   }
  // }

  const saveNewMenu = async (menu: DocumentData) => {
    setIsLoadingSave(true);
    try {
      if (!userContext?.estabId) {
        throw new Error("ID do estabelecimento não encontrado");
      }
      const menuRef = collection(db, "Establishment", userContext.estabId, "Menu");
     
      
      if (isEdit) {
        console.log('editando...')
        const updateData: any = { menuName: menu?.menuName };
        if (menu.imageUrl !== uri) {// A imagem foi alterada
          const urlImageSave = await uploadImage(menu.imageUrl, userContext.estabId);
          updateData.imageUrl = urlImageSave;
        }
        const menuDocRef = doc(db, "Establishment", userContext.estabId, "Menu", menu.id);
        await updateDoc(menuDocRef, updateData);
        console.log("Menu atualizado com sucesso!");
        setIsEdit(false)
      } else if (isDelete) {
        const menuDocRef = doc(db, "Establishment", userContext.estabId, "Menu", menu.id);
        console.log('excluindo...')
        await deleteDoc(menuDocRef)
        setIsDelete(false)
      } else {
        console.log('adicionando...')
        console.log(menuRef)
        const urlImageSave = await uploadImage(menu.imageUrl, userContext.estabId);
        const docRef = await addDoc(menuRef, { menuName: menu.menuName, imageUrl: urlImageSave });

        console.log("Menu criado com ID:", docRef.id);
        setIsNewMenu(false)
      }
    } catch (error) {
      console.error("Erro ao salvar o menu", error);
    } finally {
      fetchData()
      setIsLoadingSave(false);
    }
  };
  const openImageNewMenu = async () => {
    const uri = await openImagePicker()
    if (uri) {
      setMenu(prevMenu => ({
        ...prevMenu,
        imageUrl: uri
      }))
    }
  }

  const editMenu = (menu: DocumentData) => {
    setIsEdit(true)
    setUri(menu?.imageUrl) //armazeno a imagem atual para saber se foi trocada ao fazer o update.
    setMenu(menu as MenuData)
  }

  const newMenu = () => {
    // if (userContext?.expiredSubscription) {
    //   Alert.alert("Wise Menu", "Não é possível criar um novo menu.")
    // } else {
      setIsNewMenu(true)
      setMenu(emptyMenu)
    //}
  }

  const deleteMenu = () => {

  }

  const styles = StyleSheet.create({
    scrollViewContent: {
      flexGrow: 1,
    },

    imagem: {
      width: '100%', // Ajusta para ocupar toda a largura
      height: 200,    // Altura fixa de 300
      resizeMode: 'cover', // Mantém a proporção e cobre completamente o contêiner
      marginBottom: 15
    },
    loadingImage: {
      position: 'absolute',
      bottom: 25,
      right: 20,
      zIndex: 1
    },
  })




  return (
    <View style={{ flex: 1 }}>
      {isLoading ? <Loading /> :
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ flexGrow: 1 }}>

          <View style={{ flexDirection: 'row', justifyContent: 'flex-start', flexWrap: "wrap" }}>
            {listMenu?.map((menu, index) => (
              <Card key={index} style={{
                width: width * 0.46,
                margin: width * 0.02,
                //height: width * 0.4
              }}
                onPress={() => navigation.navigate('ItemsMenu', { menu: menu })}
                onLongPress={() => editMenu(menu)}
              >
                {menu.imageUrl ?
                  <Card.Cover source={{ uri: menu.imageUrl }} /> :
                  <Card.Cover source={require('../assets/images/menuImage.jpeg')} />
                }

                <Card.Content
                  style={{
                    padding: 0,
                    position: 'absolute', // Posicionamento absoluto
                    bottom: 0, // Fixa no rodapé
                    left: 0,
                    right: 0,
                    // backgroundColor: 'rgba(255, 255, 255, 0.6)', // Fundo semi-transparente (opcional)
                    backgroundColor: 'rgba(0, 0, 0, 0.6)', // Preto com 60% de opacidade
                    borderBottomEndRadius: 9,
                    borderBottomLeftRadius: 8
                  }}
                >
                  <Text
                    variant="titleMedium"
                    style={{ fontWeight: 'bold', fontSize: 17, color: 'white', marginBottom: -13 }}
                  >
                    {menu?.menuName}
                  </Text>
                </Card.Content>
              </Card>
            ))}
            {userContext?.userRole === 'ADM' &&
              <Card style={{
                width: width * 0.45,
                margin: width * 0.02,
                // height: width * 0.5
              }}
                onPress={newMenu}
              >
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
          {/* <View style={{ alignItems: 'center' }}>
            <Image
              source={require('../assets/images/wisemenu.png')}
              style={{
                width: '30%',
                aspectRatio: 3,
                height: width * 0.2,
                marginTop: 5,
                marginBottom: 10
              }}
            />
          </View> */}
        </ScrollView>
      }


      {/* Modal ADD Novo menu */}
      <Portal>
        <Dialog visible={isNewMenu || isEdit || isDelete} onDismiss={() => [setIsNewMenu(false), setIsEdit(false)]}>
          <Dialog.Title style={{ textAlign: 'center' }}>
            {isEdit ? 'Editar Menu'
              : isDelete ? 'Excluir menu'
                : 'Novo Menu'}
          </Dialog.Title>

          {isDelete ?

            <View style={{ padding: 15 }}>
              <Text>Confirma a exclusão do menu {menu.menuName}?</Text>
              <Text>Todos os itens serão excluídos.</Text>
              <Text>Esta ação não poderá ser desfeita.</Text>

              <Text style={{marginTop: 10}}>Para confirmar, digite o nome do menu a ser excluído:</Text>
              <TextInput
                style={{ margin: 5, marginTop: 10 }}
                mode='outlined'
                label="Nome do menu a ser excluído"
                placeholder={menu.menuName}
                keyboardType='default'
                value={confirmTitleDelete}
                onChangeText={(text) => setConfirmTitleDelete(text)}
              />


            </View>
            :
            <View style={{ padding: 15 }}>
              <TextInput
                style={{ margin: 5, marginTop: 10 }}
                mode='outlined'
                label="Nome"
                placeholder='Exemplo: Lanches'
                keyboardType='default'
                value={menu.menuName}
                onChangeText={(text) => {
                  setMenu(prevMenu => ({
                    ...prevMenu,
                    menuName: text
                  }))
                }}
              />

              <View>
                {menu.imageUrl ?
                  <TouchableOpacity
                    onPress={openImageNewMenu}
                  >
                    <Image
                      source={{ uri: menu.imageUrl }}
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
          }


          <Dialog.Content style={{ marginTop: 40 }}>
            <Dialog.Actions>
              {isEdit && 
                <Button style={{ marginRight: 50 }}
                  onPress={() => [setIsDelete(true), setIsEdit((false))]}>Excluir
                </Button>
              }
              <Button onPress={() => [setIsNewMenu(false), setIsEdit(false), setIsDelete(false)]}>Cancelar</Button>
              <Button
                disabled={!menu.menuName || !menu.imageUrl || (isDelete && confirmTitleDelete !== menu.menuName)}
                onPress={() => saveNewMenu(menu)}
                loading={isLoadingSave}
              >
                {isDelete ? 'Excluir' : 'Salvar'}
              </Button>
            </Dialog.Actions>
          </Dialog.Content>
        </Dialog>
      </Portal>
    </View>

  )
}