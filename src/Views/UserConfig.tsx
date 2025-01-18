import { StyleSheet, View, ScrollView, Alert } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { Button, DataTable, Dialog, FAB, Portal, RadioButton, Switch, Text, TextInput } from 'react-native-paper'
import { addDoc, arrayUnion, collection, doc, DocumentData, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import auth from '@react-native-firebase/auth'
import { db } from '../Services/FirebaseConfig';
import { theme } from '../Services/ThemeConfig';
import Loading from '../Components/Loading';

interface User {
  id: "",
  name: string;
  email: string;
  establishment: DocumentData,
  establishmentId: string
}

export default function UserConfig() {

  const userContext = useContext(UserContext)
  const [dataUsers, setDataUsers] = useState<DocumentData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDialog, setIsLoadingDialog] = useState(false)
  const [isNewRegister, setIsNewRegister] = useState(false)
  const [isEdit, setIsEdit] = useState(false)

  const [emptyUser] = useState<User>({
    id: "",
    name: "",
    email: "",
    establishment: {
      id: userContext?.estabId,
      enabled: true,
      type: 'ADM',
      name: userContext?.estabName
    },
    establishmentId: userContext?.estabId || ""
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
        where("establishmentId", "array-contains", userContext?.estabId)
      );
      const res = await getDocs(q);
      if (!res.empty) {
        //let data = res.docs.map(item => item.data())
        const data = res.docs.map(item => ({
          ...item.data() as User,
          id: item.id, // Adiciona o ID do documento
        }));
        let newData = data.map(item => ({
          ...item,
          establishment: item.establishment.find((estab: DocumentData) => estab.id === userContext?.estabId)
        }))
        setDataUsers(newData)
      }
    } catch (error) {
      console.error('Erro ao buscar dados', error);
    } finally {
      setIsLoading(false);
    }
  }

  const saveNewUser = async () => {
    console.log('user', user)
    // setIsLoadingDialog(true)

    if (isEdit) {
      console.log('edit')
      //busco o usuário a ser editado
      const docRef = doc(db, "User", user?.id);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists) {
        console.log('Usuário não encontrado');
        return;
      }
      const userData = docSnap.data();
      // Atualiza o array de estabelecimentos
      const updatedEstablishments = userData?.establishment.map((est: DocumentData) => {
        if (est.id === userContext?.estabId) {
          return { ...est, ...user.establishment }; // Atualiza o estabelecimento específico
        }
        return est; // Mantém os outros estabelecimentos inalterados
      });
      setIsLoadingDialog(true)
      try {
        // Salva as mudanças no Firestore
        await updateDoc(docRef, {
          establishment: updatedEstablishments,
          name: user.name || userData?.name, // Atualiza o nome do usuário, se incluído no `updatedData`
        });
        Alert.alert("Alterado com sucesso.")
        closeModal()
      } catch {
        Alert.alert("Erro ao alterar.", "Ocorreu um erro ao alterar o registro")
      } finally {
        setIsLoadingDialog(false)
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
          const isEstablishmentLinked = userData.establishmentId?.includes(userContext?.estabId)

          if (isEstablishmentLinked) {
            Alert.alert("E-mail já cadastrado.", "Este e-mail já está vinculado ao estabelecimento.")
            return
          }

          // Atualizar os arrays de estabelecimentos e IDs
          const updatedEstablishment = [...(userData.establishment || []), user.establishment]
          const updatedEstablishmentId = [...(userData.establishmentId || []), user.establishmentId]

          // Atualizar documento no Firestore
          await updateDoc(userRef, {
            establishment: updatedEstablishment,
            establishmentId: updatedEstablishmentId
          })
          setIsNewRegister(false)
          fetchData()
          console.log("Estabelecimento adicionado ao usuário existente.")
          return userDoc.id
        }

        // Usuário não existe, criar novo documento
        const newUserRef = await addDoc(collection(db, "User"), {
          email: user.email,
          name: user.name,
          establishment: [user.establishment],
          establishmentId: [user.establishmentId]
        })

        setIsNewRegister(false)
        fetchData()
        console.log("Novo usuário criado com sucesso! ID do documento", newUserRef.id)
        return newUserRef.id

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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
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
                  <Button onPress={() => console.log('item', item)}>{item?.establishment?.type}</Button>
                </DataTable.Cell>
              </DataTable.Row>
            ))}
          </DataTable>}
        {/* <Button onPress={()=> console.log(userContext?.estabName)}>dataUser</Button> */}
      </ScrollView>




      {/* Modal ADD Novo menu */}
      <Portal>
        <Dialog visible={isNewRegister || isEdit} onDismiss={closeModal}>
          <Dialog.Title style={{ textAlign: 'center' }}>{'Cadastrar usuário'}</Dialog.Title>

          <View style={{ padding: 15 }}>
            <TextInput
              style={{ margin: 5, marginTop: 10 }}
              label="Nome"
              keyboardType='default'
              value={user.name}
              onChangeText={(text) => {
                setUser((prevData) => ({
                  ...prevData,
                  name: text
                }))
              }}
            />
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
                value={user.establishment?.type}
                onValueChange={e => {
                  let copyData = { ...user }
                  copyData.establishment.type = e
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
              <View style={{ alignItems: 'flex-start', marginLeft: 10, marginTop: 30 }}>
                <Text>Habilitado</Text>
                <Switch
                  value={user?.establishment?.enabled}
                  onValueChange={(e) => {
                    let copyData = { ...user }
                    copyData.establishment.enabled = e
                    setUser(copyData)
                  }}
                />
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