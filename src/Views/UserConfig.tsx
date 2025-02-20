import { StyleSheet, View, ScrollView, Alert, RefreshControl } from 'react-native'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Button, DataTable, Dialog, FAB, Portal, RadioButton, Switch, Text, TextInput } from 'react-native-paper'
import { collection, DocumentData, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import { db } from '../Services/FirebaseConfig';
import { theme } from '../Services/ThemeConfig';
import Loading from '../Components/Loading';
import { updateUserClaims } from '../Services/Functions';

interface User {
  id: "",
  name: string;
  email: string;
  association: DocumentData,
}

export default function UserConfig() {

  const userContext = useContext(UserContext)
  const [dataUsers, setDataUsers] = useState<DocumentData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDialog, setIsLoadingDialog] = useState(false)
  const [isNewRegister, setIsNewRegister] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [refreshing, setRefreshing] = useState(false);

  const [emptyUser] = useState<User>({
    id: "",
    name: "",
    email: "",
    association: {
      establishmentId: userContext?.estabId,
      enabled: true,
      role: 'ADM',
      establishmentName: userContext?.estabName,
      isOwner: false,
      notification: true
    },
  })
  const [user, setUser] = useState(emptyUser)

  useEffect(() => {
    fetchData()
  }, [])


  const fetchData = async () => {
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "User"),
        where("association.establishmentId", "==", userContext?.estabId)
      )

      const res = await getDocs(q);
      if (!res.empty) {
        //let data = res.docs.map(item => item.data())
        const data = res.docs.map(item => ({
          ...item.data() as User,
          id: item.id, // Adiciona o ID do documento
        }));
        setDataUsers(data)
      }
    } catch (error) {
      console.error('Erro ao buscar dados', error);
    } finally {
      setIsLoading(false);
    }
  }

  const saveNewUser = async () => {
    console.log('user', user)
    if (isEdit) {
      const userQuery = query(collection(db, "User"), where("email", "==", user.email))
      const querySnapshot = await getDocs(userQuery)
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]
        const userRef = userDoc.ref
        setIsLoadingDialog(true)
        try {
          await updateDoc(userRef, {
            "association.enabled": user.association.enabled,
            "association.establishmentId": user.association.establishmentId,
            "association.establishmentName": user.association.establishmentName,
            "association.role": user.association.role,
            "association.receiveNotifications": user.association.receiveNotifications
          });          
          setIsEdit(false)

          await updateUserClaims(userDoc.id, user.association.role, user.association.establishmentId)

        } catch (e) {
          console.error(e)
          Alert.alert("Erro ao alterar.")
        } finally {
          setIsLoadingDialog(false)
        }
      }
    } else {
      try {
        // Verificar se o e-mail já existe
        const userQuery = query(collection(db, "User"), where("email", "==", user.email))
        const querySnapshot = await getDocs(userQuery)
        if (!querySnapshot.empty) {
          // Usuário já existe
          const userDoc = querySnapshot.docs[0]
          const userRef = userDoc.ref
          const userData = userDoc.data()
          // Verificar se o e-mail já está vinculado ao estabelecimento atual
          const isEstablishmentLinked = userData.association?.establishmentId === userContext?.estabId
          if (isEstablishmentLinked) {
            Alert.alert("E-mail já cadastrado.", "Este e-mail já está vinculado ao estabelecimento.")
            return
          }
          await updateDoc(userRef, {
            association: {
              enabled: true,
              establishmentId: user.association.establishmentId,
              establishmentName: user.association.establishmentName,
              role: user.association.role,
              receiveNotifications: user.association.receiveNotifications,
              associationDate: serverTimestamp()
            }
          })

          const updateClaims = await updateUserClaims(userDoc.id, user.association.role, user.association.establishmentId)
          console.log('claims atualizadas: ', updateClaims)

          setIsNewRegister(false)
          fetchData()
          console.log("Estabelecimento adicionado ao usuário existente.")
          return userDoc.id
        } else {
          Alert.alert("Usuário nâo cadastrado.", `O usuário deve criar uma conta na Wise Menu para depois associa-lo ao estabelecimento.`)
        }
      } catch (error) {
        console.error("Erro ao incluir usuário:", error)
        throw error; // Propaga o erro para tratamento posterior, se necessário
      } finally {
        setIsLoadingDialog(false)
      }
    }
  }

  const edit = (item: User) => {
    console.log(item)
    setIsEdit(true)
    setUser(item)
  }

  const closeModal = () => {
    setIsEdit(false)
    setIsNewRegister(false)
    setUser(emptyUser)
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const styles = StyleSheet.create({
    scrollView: {
      marginTop: "3%",
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
      backgroundColor: theme.colors.primary,
      marginTop: 60,
      zIndex: 100
    },
  })
  return (
    <View style={{ flex: 1 }}>
      <ScrollView 
       refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {isLoading ? <Loading /> :
          <DataTable style={{ marginTop: 10 }}>
            <DataTable.Header>
              <DataTable.Title style={{ flex: 5 }}>E-mail</DataTable.Title>
              <DataTable.Title style={{ flex: 5 }}>Nome</DataTable.Title>
              <DataTable.Title style={{ flex: 2 }}>Tipo</DataTable.Title>
            </DataTable.Header>
            {dataUsers?.map((item, index) => (
              <DataTable.Row key={`row${index}`} onPress={() => edit(item as User)}>
                <DataTable.Cell key={`cell1-row${index}`} style={{ flex: 5 }}>{item?.email}</DataTable.Cell>
                <DataTable.Cell key={`cell2-row${index}`} style={{ flex: 5 }}>{item?.name}</DataTable.Cell>
                <DataTable.Cell key={`cell3-row${index}`} style={{ flex: 2 }}>
                  <Button onPress={() => console.log('item', item)}>{item?.association?.role}</Button>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>}
        {/* <Button onPress={()=> console.log(userContext?.estabName)}>dataUser</Button> */}
      </ScrollView>




      {/* Modal Usuário */}
      <Portal>
        <Dialog visible={isNewRegister || isEdit} onDismiss={closeModal}>
          <Dialog.Title style={{ textAlign: 'center' }}>{'Associar usuário'}</Dialog.Title>
          <View style={{ margin: 20 }}>
            <Text>Para associar um usuário, este deve ter uma conta na ativa na Wise Menu.</Text>
          </View>
          <View style={{ padding: 15 }}>
            <TextInput
              style={{ margin: 5, marginTop: 10 }}
              label="E-mail"
              disabled={isEdit}
              keyboardType='email-address'
              value={user.email}
              onChangeText={(text) => {
                setUser((prevData) => ({
                  ...prevData,
                  email: text
                }))
              }}
            />
            <View style={{ marginTop: 10 }}>
              <RadioButton.Group
                value={user.association?.role}
                onValueChange={e => {
                  let copyData = { ...user }
                  copyData.association.role = e
                  setUser(copyData)
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 20 }}>
                    <RadioButton value="ADM" />
                    <Text>Administrador</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <RadioButton value="ATD" />
                    <Text>Atendimento</Text>
                  </View>
                </View>
              </RadioButton.Group>
              <View style={{ display: 'flex', flexDirection: 'row' }}>
                <View style={{ alignItems: 'flex-start', marginLeft: 10, marginTop: 30, marginRight: 20 }}>
                  <Text>Habilitado</Text>
                  <Switch
                    value={user?.association?.enabled}
                    onValueChange={(e) => {
                      let copyData = { ...user }
                      copyData.association.enabled = e
                      setUser(copyData)
                    }}
                  />
                </View>
                <View style={{ alignItems: 'flex-start', marginLeft: 10, marginTop: 30 }}>
                  <Text>Notificações</Text>
                  <Switch
                    value={user?.association?.receiveNotifications}
                    onValueChange={(e) => {
                      let copyData = { ...user }
                      copyData.association.receiveNotifications = e
                      setUser(copyData)
                    }}
                  />
                </View>
              </View>
            </View>
          </View>

          <Dialog.Content style={{ marginTop: 40 }}>
            <Dialog.Actions>
              <Button onPress={closeModal}>Cancelar </Button>
              <Button
                // onPress={() => saveNewUser()}
                onPress={saveNewUser}
                loading={isLoadingDialog}
              >
                Salvar
              </Button>
            </Dialog.Actions>
          </Dialog.Content>
        </Dialog>
      </Portal>

      <FAB
        color={theme.colors.background}
        style={styles.fab}
        icon="plus"
        onPress={() => setIsNewRegister(true)}
      />
    </View>
  )
}