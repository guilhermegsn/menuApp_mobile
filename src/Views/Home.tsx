import { Alert, Dimensions, Image, ImageBackground, Linking, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import React, { useCallback, useContext, useEffect, useState } from 'react'
import { Button, Card, DataTable, Dialog, Icon, Portal, RadioButton, Text, TextInput } from 'react-native-paper'
import axios from 'axios'
import { addDoc, collection, doc, DocumentData, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db, auth } from '../Services/FirebaseConfig';
import { UserContext } from '../context/UserContext'
import { calcularDiferencaDias, createSubscription, formatToDoubleBR, getCurrentDate, printThermalPrinter, refreshUserToken } from '../Services/Functions'
import Loading from '../Components/Loading'
import { theme } from '../Services/ThemeConfig'
import { useNavigation } from '@react-navigation/native'
import { getFunctions } from 'firebase/functions'
import { base_url } from '../Services/config'
import ModalPlans from './ModalPlans'


export default function Home() {

  const free_trial = 7
  const { width } = Dimensions.get('window');
  const navigation = useNavigation()
  const userContext = useContext(UserContext)
  const [isOpenDialogMultiple, setIsOpenDialogMultiple] = useState(false)
  const [regStage, setRegStage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const [isOk, setIsOK] = useState(false)
  const [isOpenModalPlans, setIsOpenModalPlans] = useState(false)
  const [isBlocked, setIsBlocked] = useState(false)

  const [dataEstab, setDataEstab] = useState({
    name: "",
    fullname: "",
    state_registration: "",
    zip_code: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    country: "BR",
    complement: "",
    phone: "",
    number: "",
    owner: auth.currentUser?.uid,
    id: "",
    createdAt: serverTimestamp()
  })

  const getCepApi = async () => {
    if (dataEstab.zip_code.length === 8) {
      await axios.get(`https://viacep.com.br/ws/${dataEstab.zip_code}/json/`).then((res) => {
        console.log(res.data)
        setDataEstab((prevData) => ({
          ...prevData,
          address: res.data.logradouro,
          neighborhood: res.data.bairro,
          city: res.data.localidade,
          state: res.data.uf,
        }))
      }).catch((e) => console.log(e))
    }
  }

  const printEstablishment = async () => {
    const text =
      `[L]\n` +
      `[L]\n` +
      `[C]<u><font size='big'>${dataEstab.name}</font></u>\n` +
      `[L]\n` +
      `[L]Acesse o QR Code para pedir:\n` +
      `[L]\n` +
      `[L]<qrcode size='20'${base_url}/menu/${dataEstab.id}</qrcode>\n` +
      `[L]\n` +
      `[L]\n` +
      `[L]${dataEstab.address}\n` +
      `[L]${dataEstab.neighborhood}\n` +
      `[L]${dataEstab.city} - ${dataEstab.state}\n` +
      `[L]<font size='tall'>Fone: ${dataEstab.phone}</font>\n`
    printThermalPrinter(text)
  }

  const save = async () => {
    try {
      setIsLoading(true);

      if (isEditing) {
        const documentRef = doc(db, "Establishment", dataEstab.id);
        await updateDoc(documentRef, dataEstab);
        console.log("Documento atualizado com sucesso");
        setRegStage(4);
      } else {
        // Criando um novo estabelecimento
        const newEstablishmentRef = await addDoc(collection(db, "Establishment"), dataEstab);
        const newEstablishmentId = newEstablishmentRef.id;

        // Atualiza o estado local com o novo ID
        setDataEstab((prevData) => ({
          ...prevData,
          id: newEstablishmentId,
        }));

        const uid_user = auth.currentUser?.uid || ""
        const userRef = doc(db, "User", uid_user)

        await updateDoc(userRef, {
          association: {
            enabled: true,
            establishmentId: newEstablishmentId,
            establishmentName: dataEstab?.name,
            role: "ADM"
          }
        });
        userContext?.setShoppingCart([])
        userContext?.setEstabId(newEstablishmentId)
        userContext?.setEstabName(dataEstab.name)
        userContext?.setUserRole('ADM')

        await refreshUserToken()

        setIsCreated(true);
        setRegStage(4);
      }
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const fetchEstablishmentData = useCallback(async () => {
    if (!userContext?.estabId) return;
    try {
      setIsLoading(true);
      const estabDoc = await getDoc(doc(db, "Establishment", userContext.estabId));
      if (estabDoc.exists()) {
        userContext.setEstabName(estabDoc.data().name);
        setRegStage(4);
      } else {
        console.warn("Estabelecimento não encontrado.");
      }
    } catch (error) {
      console.error("Erro ao buscar estabelecimento:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userContext]);

  const fetchUserEstablishment = useCallback(async () => {
    if (userContext?.estabId) return; // Evita buscas desnecessárias
    try {
      setIsLoading(true);
      const uid = auth.currentUser?.uid;
      if (!uid) return console.error("Usuário não autenticado.");

      const userDoc = await getDoc(doc(db, "User", uid));
      if (!userDoc.exists()) return console.warn("Usuário não encontrado no Firestore.");

      const userData = userDoc.data();
      if (userData?.association?.enabled) {
        userContext.setEstabId(userData.association.establishmentId);
        userContext.setUserRole(userData.association.role);
      }
    } catch (error) {
      console.error("Erro ao buscar usuário:", error);
    } finally {
      setIsLoading(false);
    }
  }, [userContext, auth]);

  useEffect(() => {
    if (!userContext?.estabId) {
      fetchUserEstablishment();
    } else {
      fetchEstablishmentData();
    }
  }, [userContext.estabId, fetchUserEstablishment, fetchEstablishmentData]);




  useEffect(() => {
    const getStatusSubscription = async () => {
      try {
        if (userContext?.estabId) {
          // Verificando assinatura
          const subscriptionDoc = await getDoc(doc(db, "Subscriptions", userContext?.estabId))
          console.log('estab->', userContext?.estabId)

          if (!subscriptionDoc.exists()) { // Ainda não tem assinatura (período de teste)
            console.log('nao tem assinatura')
            try {
              const establishmentDoc = await getDoc(doc(db, "Establishment", userContext?.estabId))
              if (!establishmentDoc.exists()) {
                console.error("Documento de estabelecimento não encontrado!")
                return;
              }

              const establishmentData = establishmentDoc.data();
              const days = calcularDiferencaDias(establishmentData?.createdAt.toDate(), getCurrentDate())

              if (days > free_trial) {
                setIsBlocked(true)
                setIsOpenModalPlans(true)
              } else {
                const remainingDays = free_trial - days
                if (!isOk) {
                  if (remainingDays === 0) {
                    setIsOpenModalPlans(true)
                    setTimeout(() => {
                      Alert.alert("Assine o Wise Menu!", "Hoje é o último dia do seu período de testes. Assine um de nossos planos e mantenha seu estabelecimento digital!")
                    }, 1000);
                  } else {
                    Alert.alert("Período de teste.", `Restam ${remainingDays} dias para encerrar seu período de testes.`)
                    setIsOK(true);
                  }
                }
              }
            } catch (error) {
              console.error("Erro ao buscar estabelecimento:", error)
            }
          } else { // Tem assinatura, verificando status
            console.log('assinatura encontrada. verificando..')
            try {
              const subscriptionData = subscriptionDoc.data()

              if (subscriptionData?.status !== 'active') {
                const lastPayment = calcularDiferencaDias(subscriptionData?.lastPaymentApproved, getCurrentDate())
                console.log('lastPayment', lastPayment)
                if (lastPayment <= 30 + free_trial) {
                  Alert.alert("Wise Menu", "Não fique sem os nossos serviços!\nVerifique o status de sua assinatura Wise Menu.")
                } else {
                  Alert.alert("Wise Menu", "Não fique sem os nossos serviços!\nVerifique o status de sua assinatura Wise Menu.")
                  userContext?.setExpiredSubscription(true);
                  const establishmentRef = doc(db, "Establishment", userContext?.estabId)
                  await updateDoc(establishmentRef, { status: 'inactive' })
                }
              }
            } catch (error) {
              console.error("Erro ao atualizar status da assinatura:", error)
            }
          }
        }
      } catch (error) {
        console.error("Erro ao buscar assinatura:", error)
      }
    }
    getStatusSubscription()
  }, [])



  const signOut = () => {
    userContext?.setEstabName("")
    userContext?.setUser(null)
    userContext?.setEstabId("")
    userContext?.setShoppingCart([])
    auth.signOut();
  }


  const setContextData = (idEstablishment: string) => {
    console.log('adicionando id contextData ', idEstablishment)
    if (userContext) {
      console.log('entrei aq', userContext?.userRole)
      userContext.setShoppingCart([])
      userContext.setEstabId(idEstablishment)
      setIsOpenDialogMultiple(false)
    } else {
      console.log('sem context')
    }
  }

  const getCnpjData = async (cnpj: string) => {
    const res = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
    if (res.data) {
      setDataEstab(prevData => ({
        ...prevData,
        name: res.data?.nome_fantasia,
        fullname: res.data?.razao_social,
        zip_code: res.data?.cep,
        address: res.data?.logradouro,
        number: res.data?.numero,
        neighborhood: res.data?.bairro,
        city: res.data?.municipio,
        state: res.data?.uf,
        phone: res.data?.ddd_telefone_1
      }))
    }
  }

  const formatCNPJ = (value: string) => {
    // Remove tudo que não for número
    const cleanValue = value.replace(/\D/g, "").slice(0, 14);

    // Aplica a máscara no CNPJ conforme o usuário digita
    return cleanValue
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
      .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
  };


  const styles = StyleSheet.create({
    scrollViewContent: {
      flexGrow: 1,
      padding: 10
    },
    container: {
      flex: 1,
      backgroundColor: '#f8f9fa',
    },
    banner: {
      padding: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
      overflow: 'hidden', // Necessário para os cantos arredondados
      height: 400, // Ajuste conforme necessário
    },

    bannerImage: {
      borderBottomLeftRadius: 40,
      borderBottomRightRadius: 40,
    },
    bannerTitle: {
      color: '#fff',
      fontSize: 28,
      fontWeight: 'bold',
      textAlign: 'center',
      marginBottom: 60
    },
    cardsContainer: {
      padding: 20,
    },
    sectionTitle: {
      marginTop: 30,
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 20,
      color: '#333',
      textAlign: 'center',
    },
    sectionSubTitle: {
      fontSize: 17,
      marginBottom: 30,
      color: '#566573',
      textAlign: 'center',
    },
    card: {
      backgroundColor: '#fff',
      borderRadius: 10,
      padding: 15,
      marginBottom: 20,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 5,
      elevation: 5,
    },
    cardImage: {
      width: '100%',
      height: 150,
      borderRadius: 10,
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: 'bold',
      marginTop: 10,
      color: theme.colors.primary,
    },
    cardDescription: {
      fontSize: 12,
      color: '#555',
      marginTop: 5,
    },
    button: {
      backgroundColor: '#6c63ff',
      padding: 15,
      borderRadius: 30,
      alignItems: 'center',
      margin: 20,
    },
    buttonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    footer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      alignItems: 'center',
      // paddingBottom: 20, // Ajuste para que a imagem não fique colada na borda
    },
    footerImage: {
      // marginTop: 15,
      width: '40%',   // Ajuste o tamanho da imagem conforme necessário
      height: 30,   // Ajuste o tamanho da imagem conforme necessário
    },
    buttomBar: {
      position: 'absolute',
      bottom: 10,
      width: "100%",
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-evenly'
    }
  })

  return (
    <View style={{ flex: 1, flexGrow: 1 }}>
      <ModalPlans
        isOpenModalPlans={isOpenModalPlans}
        setIsOpenModalPlans={setIsOpenModalPlans}
        isBlocked={isBlocked}
      />
      <>
        {isOpenDialogMultiple ? null : isLoading ? <Loading /> : regStage === 0 &&
          // <>
          //   <Text style={{ fontSize: 25 }}>Olá!</Text>
          //   <Text style={{ fontSize: 17, padding: "6%", textAlign: 'center' }}>Falta pouco para dar um Up em seu estabelecimento e torna-lo ainda mais inteligente.</Text>
          //   <Text style={{ fontSize: 20, marginBottom: "10%" }}>Vamos completar o seu cadastro!</Text>
          //   <Button style={{ width: "90%", marginTop: "4%" }}
          //     icon="hexagon-multiple"
          //     mode="contained"
          //     onPress={() => setRegStage(1)}
          //   >
          //     Vamos lá!
          //   </Button>
          // </>
          <ScrollView style={styles.container}>
            {/* Banner */}


            <ImageBackground
              source={require('../assets/images/banner_wise.png')}
              style={styles.banner}
              imageStyle={styles.bannerImage} // Estilos específicos para a imagem
            >

              {/* Texto branco por cima */}
              {/* <Text style={styles.bannerTitle}>MenuPedia</Text> */}
            </ImageBackground>

            {/* Cards */}
            <TouchableOpacity onPress={() => setRegStage(1)}>
              <View style={styles.cardsContainer}>
                <Text style={styles.sectionTitle}>
                  {`Olá, ${userContext?.user?.displayName?.split(" ")[0] || ""}\nSeja Bem Vindo(a) à Wise Menu.`}
                </Text>
                <Text style={styles.sectionSubTitle}>
                  {`Estamos aqui para simplificar a gestão do seu negócio e proporcionar uma experiência incrível para você e seus clientes.\nVamos dar início ao cadastro de seu Estabelecimento.`}
                </Text>
                <View style={styles.card}>
                  <Image
                    source={require('../assets/images/pos.jpeg')}
                    style={styles.cardImage}
                  />
                  <Text style={styles.cardTitle}>Quero Automatizar meu estabelecimento</Text>
                  <Text style={styles.cardDescription}>
                    Crie seu menu digital e automatize os processos do seu estabelecimento.
                    Torne a experiência dos seus clientes mais ágil e moderna com nosso app!
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Call-to-Action */}
            {/* <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Comece agora</Text>
            </TouchableOpacity> */}
          </ScrollView>




        }

        {regStage === 1 &&
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Image
              source={require('../assets/images/wise_logo1.png')}
              style={{
                width: '15%',
                aspectRatio: 1,
                height: width * 0.2,
                marginTop: 15,
                marginBottom: 10
              }}
            />
            <Text style={{ fontSize: 20, width: "90%", marginTop: 10, marginBottom: 20 }}>
              Entre com os dados de seu estabelecimento ;)
            </Text>
            <TextInput
              style={{ width: "90%", marginBottom: "2%" }}
              mode="outlined"
              label="CNPJ"
              value={dataEstab.state_registration}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  state_registration: formatCNPJ(text)
                }))
                if (text.length === 18) {
                  getCnpjData(text.replace("/", "").replaceAll(".", ""))
                }
              }}
            />
            <TextInput
              style={{ width: "90%", marginBottom: "2%" }}
              mode="outlined"
              label="Nome do estabelecimento"
              value={dataEstab.name}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  name: text
                }))
              }}
            />
            <TextInput
              style={{ width: "90%", marginBottom: "2%" }}
              mode="outlined"
              label="Razâo social"
              value={dataEstab.fullname}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  fullname: text
                }))
              }}
            />
            <View style={styles.buttomBar}>
              {/* Botão "Voltar" */}
              <View style={{ width: "45%" }}>
                <Button
                  style={{ width: "100%", marginTop: "4%" }}
                  icon="skip-previous"
                  mode="text"
                  onPress={() => isEditing ? setRegStage(4) : setRegStage(0)}
                >
                  Voltar
                </Button>
              </View>
              {/* Botão "Próximo" */}
              <View style={{ width: "45%" }}>
                <Button
                  style={{ width: "100%", marginTop: "4%" }}
                  icon="hexagon-multiple"
                  mode="text"
                  onPress={() => setRegStage(2)}
                >
                  Próximo
                </Button>
              </View>
            </View>

          </View>}

        {regStage === 2 &&
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: 20, width: "90%", marginTop: 80 }}>
              Agora informe os dados da localização do estabelecimento
            </Text>
            <TextInput
              style={{ width: "90%", marginTop: 10 }}
              mode="outlined"
              keyboardType="numeric"
              label="CEP"
              value={dataEstab.zip_code}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  zip_code: text
                }))
              }}
            />
            <View style={styles.buttomBar}>
              {/* Botão "Voltar" */}
              <View style={{ width: "45%" }}>
                <Button
                  style={{ width: "100%", marginTop: "4%" }}
                  icon="skip-previous"
                  mode="text"
                  onPress={() => setRegStage(1)}
                >
                  Voltar
                </Button>
              </View>
              {/* Botão "Próximo" */}
              <View style={{ width: "45%" }}>
                <Button
                  style={{ width: "100%", marginTop: "4%" }}
                  icon="hexagon-multiple"
                  mode="text"
                  onPress={() => [getCepApi(), setRegStage(3)]}
                >
                  Próximo
                </Button>
              </View>
            </View>
          </View>
        }

        {regStage === 3 &&
          <View style={{ flex: 1, alignItems: 'center' }}>
            <TextInput
              style={{ width: "90%", marginTop: 80 }}
              mode="outlined"
              label="Endereço"
              value={dataEstab.address}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  address: text
                }))
              }}
            />
            <TextInput
              style={{ width: "90%", marginBottom: "2%" }}
              mode="outlined"
              label="Número"
              value={dataEstab.number}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  number: text
                }))
              }}
            />
            <TextInput
              style={{ width: "90%", marginBottom: "2%" }}
              mode="outlined"
              label="Bairro"
              value={dataEstab.neighborhood}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  neighborhood: text
                }))
              }}
            />
            <TextInput
              style={{ width: "90%", marginBottom: "2%" }}
              mode="outlined"
              label="Cidade"
              value={dataEstab.city}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  city: text
                }))
              }}
            />
            <TextInput
              style={{ width: "90%", marginBottom: "2%" }}
              mode="outlined"
              label="Estado"
              value={dataEstab.state}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  state: text
                }))
              }}
            />
            <TextInput
              style={{ width: "90%", marginBottom: "2%" }}
              mode="outlined"
              label="Telefone comercial"
              keyboardType="numeric"
              value={dataEstab.phone}
              onChangeText={(text) => {
                setDataEstab((prevState) => ({
                  ...prevState,
                  phone: text
                }))
              }}
            />
            {/* <Button style={{ width: "90%", marginTop: "4%" }}
              icon="hexagon-multiple"
              mode="contained"
              onPress={() => save()}
            >
              {isEditing ? "Finalizar edição" : "Finalizar cadastro"}
            </Button>
            <Button style={{ width: "90%", marginTop: "4%" }}
              icon="skip-previous"
              mode="text"
              onPress={() => setRegStage(2)}
            >
              Voltar
            </Button> */}
            <View style={styles.buttomBar}>
              {/* Botão "Voltar" */}
              <View style={{ width: "45%" }}>
                <Button
                  style={{ width: "100%", marginTop: "4%" }}
                  icon="skip-previous"
                  mode="text"
                  onPress={() => setRegStage(2)}
                >
                  Voltar
                </Button>
              </View>
              {/* Botão "Próximo" */}
              <View style={{ width: "45%" }}>
                <Button
                  style={{ width: "100%", marginTop: "4%" }}
                  icon="hexagon-multiple"
                  mode="text"
                  onPress={() => save()}
                >
                  {isEditing ? "Finalizar edição" : "Finalizar cadastro"}
                </Button>
              </View>
            </View>
          </View>}


        {regStage === 4 &&
          <View style={{ flex: 1, alignItems: 'center' }}>
            {/* <Button onPress={() => setIsOpenModalBlocked(true)}>Assinar</Button> */}
            <Text style={{ fontSize: 20, marginTop: 20 }}>
              {userContext?.estabName}
            </Text>
            <Text style={{ fontSize: 15 }}>{auth.currentUser?.email}</Text>
            <Text style={{ fontSize: 15, marginTop: "2%", marginBottom: 10 }} onPress={() => signOut()}>
              <Icon
                source="logout"
                size={20}
              />{"Sair"}
            </Text>
            <View style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', marginLeft: 3 }}>

              <Card
                style={{ width: "46%", margin: "2%", height: 240 }}
                onPress={() => navigation.navigate('EstablishmentMenu')}
              >
                <Card.Cover source={require('../assets/images/menuImage.jpeg')} />
                <Card.Content style={{ marginTop: "4%" }}>
                  <Text variant="titleMedium">{"Cardápio"}</Text>
                </Card.Content>
              </Card>

              <Card
                style={{ width: "46%", margin: "2%", height: 240 }}
                onPress={() => navigation.navigate('Orders')}
              >
                <Card.Cover source={require('../assets/images/pos.jpeg')} />
                <Card.Content style={{ marginTop: "4%" }}>
                  <Text variant="titleMedium">{"Comandas"}</Text>
                </Card.Content>
              </Card>

              <Card
                style={{ width: "46%", margin: "2%", height: 240 }}
                onPress={() => navigation.navigate('OrderItems')}
              >
                <Card.Cover source={require('../assets/images/banner3.jpeg')} />
                <Card.Content style={{ marginTop: "4%" }}>
                  <Text variant="titleMedium">{"Pedidos"}</Text>
                </Card.Content>
              </Card>



            </View>
            {/* <View style={styles.buttomBar}>
           
              <View style={{ width: "45%" }}>
                <Button
                  style={{ width: "100%", marginTop: "4%" }}
                  icon="pencil"
                  mode="text"
                  onPress={() => [setRegStage(1), setIsEditing(true)]}
                >
                  Editar Informações
                </Button>
              </View>
             
              <View style={{ width: "45%" }}>
                <Button
                  style={{ width: "100%", marginTop: "4%" }}
                  icon="printer"
                  mode="text"
                  onPress={() => printEstablishment()}
                >
                  Imprimir informações
                </Button>
              </View>
            </View> */}



          </View>
        }


        {/* Mensagem sucesso ao gravar */}
        <Portal>
          <Dialog visible={isCreated} onDismiss={() => setIsCreated(false)}>
            <Dialog.Icon icon="check-circle" />
            <Dialog.Title>Sucesso!</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">Deu tudo certo com a criação do cadastro.</Text>
            </Dialog.Content>

            <Dialog.Actions>
              <Button onPress={() => setIsCreated(false)}>OK</Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>


      </>
    </View >
  )
}