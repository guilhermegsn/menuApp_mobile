import { StyleSheet, View, ScrollView, Alert, RefreshControl, Linking } from 'react-native'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Button, DataTable, Dialog, Divider, FAB, Portal, RadioButton, Switch, Text, TextInput } from 'react-native-paper'
import { collection, doc, DocumentData, getDoc, getDocs, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { UserContext } from '../context/UserContext';
import { db } from '../Services/FirebaseConfig';
import { theme } from '../Services/ThemeConfig';
import Loading from '../Components/Loading';
import { updateUserClaims } from '../Services/Functions';
import moment from 'moment';
import ModalPlans from './ModalPlans';
import { useStorage } from '../context/StorageContext';

interface User {
  id: "",
  name: string;
  email: string;
  association: DocumentData,
}

export default function UserConfig() {

  const { hasPrinter, setHasPrinter, autoPrint, setAutoPrint, hasOnlinePayment, setHasOnlinePayment } = useStorage();
  const userContext = useContext(UserContext)
  const [dataUsers, setDataUsers] = useState<DocumentData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDialog, setIsLoadingDialog] = useState(false)
  const [isNewRegister, setIsNewRegister] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [dataSubscription, setDataSubscription] = useState<DocumentData>()
  const [dataPlans, setDataPlans] = useState<DocumentData[]>([])
  const [dataEstablishment, setDataEstablishment] = useState<DocumentData>([])
  const [isOpenModalPlans, setIsOpenModalPlans] = useState(false)
  const [isOpenDialogOnlinePayment, setIsOpenDialogOnlinePayment] = useState(false)
  const [stepAccountMercadoPago, setStepAccountMercadoPago] = useState(0)

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
    getDataPlans()
    getDataSubscription()
  }, [])

  const getDataPlans = async () => {
    const querySnapshot = await getDocs(collection(db, 'Plans'));
    const data = querySnapshot.docs.map(doc => doc.data());
    const sortedData = data.sort((a, b) => a.price - b.price);
    setDataPlans(sortedData)
  }

  const getDataSubscription = async () => {
    const docRef = doc(db, 'Subscriptions', userContext.estabId);
    const docSnapshot = await getDoc(docRef);
    if (docSnapshot.exists()) {

      const data = docSnapshot.data();
      console.log('data', data)
      setDataSubscription(data)
    }
  }

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

  const authorizeMercadoPago = () => {
    setIsOpenDialogOnlinePayment(false)
    setStepAccountMercadoPago(0)
    const url = `https://auth.mercadopago.com/authorization?client_id=8023157023344936&response_type=code&platform_id=mp&state=${userContext?.estabId}&redirect_uri=https://us-central1-appdesc-e1bf2.cloudfunctions.net/mercadoPagoOAuthCallback`
    Linking.openURL(url)
      .catch(err => console.error('Erro ao tentar abrir o link', err));
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

  useEffect(() => {
    if (!hasPrinter)
      setAutoPrint(false)
  }, [hasPrinter])

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
      <ModalPlans
        isOpenModalPlans={isOpenModalPlans}
        setIsOpenModalPlans={setIsOpenModalPlans}
        isBlocked={false}
      />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        {isLoading ? <Loading /> :
          <View>
            <Text variant="headlineSmall" style={{ marginBottom: 12 }}>Meu plano</Text>
            {dataSubscription && dataPlans ?
              <View>
                <Text>Plano: {dataPlans.find(item => item.planId === dataSubscription.planId)?.name || ""}</Text>
                <Text>Status: {dataSubscription?.status === 'active' ? 'Ativo' : 'paused' ? 'Cancelado' : 'Pendente'}</Text>
                <Text>
                  Último pagamento:
                  {moment(dataSubscription?.lastAuthorizedPayment.toDate()).utcOffset(-3).format("DD/MM/YYYY HH:mm")}
                </Text>

                <Button
                  style={{ marginTop: 12, marginBottom: 25 }}
                  mode='outlined'
                  onPress={() => setIsOpenModalPlans(true)}>Alterar plano</Button>
              </View>
              :
              <View>
                <Text>Plano: FREE TRIAL</Text>
                <Button
                  style={{ marginTop: 12, marginBottom: 25 }}
                  mode='outlined'
                  onPress={() => setIsOpenModalPlans(true)}>Assinar o Wise Menu</Button>
              </View>
            }

            <Divider />
            <Text variant="headlineSmall" style={{ marginTop: 12 }}>Receber pagamentos online</Text>

            <View style={{ display: 'flex', flexDirection: 'row', marginBottom: 20 }}>
              <View style={{ alignItems: 'flex-start', marginLeft: 10, marginTop: 30, marginRight: 20 }}>
                <Text>Habilitado</Text>
                <Switch
                  value={hasOnlinePayment}
                  onValueChange={setHasOnlinePayment}
                />
              </View>
            </View>

            <Button
              style={{ marginTop: 12, marginBottom: 25 }}
              mode='outlined'
              onPress={() => setIsOpenDialogOnlinePayment(true)}
            >Configurar conta</Button>

            <Divider />

            <Text variant="headlineSmall" style={{ marginTop: 12 }}>Usuários do sistema</Text>
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
            </DataTable>

            <Button
              style={{ marginTop: 12, marginBottom: 25 }}
              mode='outlined'
              onPress={() => {
                if (userContext?.expiredSubscription) {
                  Alert.alert("Wize Menu", "Não é possível criar um novo usuário")
                } else {
                  setIsNewRegister(true)
                }
              }}
            >Adicionar Usuário</Button>
            <Divider />
            <Text variant="headlineSmall" style={{ marginTop: 12 }}>Configurações de improssora</Text>

            <View style={{ display: 'flex', flexDirection: 'row' }}>
              <View style={{ alignItems: 'flex-start', marginLeft: 10, marginTop: 30, marginRight: 20 }}>
                <Text>Habilitado</Text>
                <Switch
                  value={hasPrinter}
                  onValueChange={setHasPrinter}
                />
              </View>
              <View style={{ alignItems: 'flex-start', marginLeft: 10, marginTop: 30, marginRight: 20 }}>
                <Text>Imprimir pedidos</Text>
                <Switch
                  disabled={!hasPrinter}
                  value={autoPrint}
                  onValueChange={setAutoPrint}
                />
              </View>

            </View>
<Button onPress={()=> console.log(hasPrinter, autoPrint)}>log</Button>
          </View>
        }







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
                    <RadioButton value="ADM" disabled={user?.association.isOwner} />
                    <Text>Administrador</Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <RadioButton value="ATD" disabled={user?.association.isOwner} />
                    <Text>Atendimento</Text>
                  </View>
                </View>
              </RadioButton.Group>
              <View style={{ display: 'flex', flexDirection: 'row' }}>
                <View style={{ alignItems: 'flex-start', marginLeft: 10, marginTop: 30, marginRight: 20 }}>
                  <Text>Habilitado</Text>
                  <Switch
                    value={user?.association?.enabled}
                    disabled={user?.association.isOwner}
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


      {/* Modal Usuário */}
      <Portal>
        <Dialog visible={isOpenDialogOnlinePayment} onDismiss={() => setIsOpenDialogOnlinePayment(false)}>
          <Dialog.Title style={{ textAlign: 'center' }}>{'Receber pagamentos online'}</Dialog.Title>
          {stepAccountMercadoPago === 0 ?
            <View style={{ margin: 20 }}>
              <Text variant="titleSmall">Para receber pagamentos online, você deve ter uma conta no Mercado Pago.</Text>
              <Text variant="titleSmall" style={{ marginTop: 10 }}>
                Os pagamentos serão processados pelo Mercado Pago e cairá diretamente na sua conta no mesmo dia.
              </Text>
              <Text variant="titleMedium" style={{ marginTop: 10 }}>Confira as taxas:</Text>
              <Text variant="titleSmall" style={{ marginTop: 10 }}>Crédito à vista: 4,98%</Text>
              <Text variant="titleSmall">PIX: 0,00%</Text>
              <Text variant="titleSmall" style={{ marginTop: 10 }}>Taxa do aplicativo: 3,00%</Text>
              <Text variant="bodyMedium" style={{ marginTop: 30 }}>Ainda nâo possui uma conta  Mercado Pago?</Text>

              <Button style={{ marginTop: 10 }}
                onPress={() => setStepAccountMercadoPago(1)}
                mode='outlined'>Criar uma conta no Mercado Pago</Button>


              <Text variant="bodyMedium" style={{ marginTop: 30 }}>Já possui uma conta  Mercado Pago?</Text>
              <Button style={{ marginTop: 10 }}
                onPress={authorizeMercadoPago}
                mode='outlined'>Vincular minha conta Mercado Pago
              </Button>
            </View>
            : stepAccountMercadoPago === 1 ?
              <View style={{ margin: 20 }}>
                <Text variant="headlineSmall" style={{ marginTop: 10 }}>Atenção!</Text>
                <Text variant="titleMedium" style={{ marginTop: 10 }}>
                  Após criar sua conta no Mercado Pago, você deve voltar as configurações para vincular sua conta Mercado pago com o aplicativo.
                </Text>
                <Button style={{ marginTop: 40 }}
                  onPress={() => {
                    setStepAccountMercadoPago(2)
                    Linking.openURL('https://www.mercadopago.com.br/hub/registration/landing')
                      .catch(err => console.error('Erro ao tentar abrir o link', err));
                  }}
                  mode='outlined'>OK</Button>
              </View>
              :
              <View style={{ padding: 20 }}>
                <Text variant="bodyMedium" style={{ marginTop: 30, marginBottom: 20 }}>Deu tudo certo com a criação da conta?</Text>
                <Button style={{ marginTop: 10 }}
                  onPress={authorizeMercadoPago}
                  mode='outlined'>Vincular minha conta Mercado Pago
                </Button>
              </View>
          }

          <Dialog.Content style={{ marginTop: 40 }}>
            <Dialog.Actions>
              {stepAccountMercadoPago === 1 &&
                <Button onPress={() => setStepAccountMercadoPago(0)}>Voltar </Button>
              }
              <Button onPress={() => {
                setIsOpenDialogOnlinePayment(false)
                setStepAccountMercadoPago(0)
              }}>Fechar </Button>
            </Dialog.Actions>
          </Dialog.Content>
        </Dialog>

      </Portal>


      {/* <FAB
        color={theme.colors.background}
        style={styles.fab}
        icon="plus"
        onPress={() => {
          if (userContext?.expiredSubscription) {
            Alert.alert("Wize Menu", "Não é possível criar um novo usuário")
          } else {
            setIsNewRegister(true)
          }
        }}
      />
      <Button onPress={() => console.log(dataSubscription)}>dataSubscription</Button> */}
    </View>
  )
}