import { ScrollView, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Button, Card, Dialog, Icon, Portal, Text, TextInput } from 'react-native-paper'
import axios from 'axios'
import auth from '@react-native-firebase/auth'
import { addDoc, collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../Services/FirebaseConfig';
import { EstablishmentData } from '../Interfaces/Establishment_interface'
import { UserContext } from '../context/UserContext'
import ThermalPrinterModule from 'react-native-thermal-printer'

export default function Home() {

  
  const userContext = useContext(UserContext)
  const [regStage, setRegStage] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const [dataEstab, setDataEstab] = useState({
    name: "",
    fullname: "",
    state_registration: "",
    zip_code: "",
    address: "",
    neighborhood: "",
    city: "",
    state: "",
    country: "",
    complement: "",
    phone: "",
    number: "",
    owner: auth().currentUser?.uid,
    id: ""
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

  const printEstablishment = async() => {
      const text =
        `[L]\n` +
        `[L]\n` +
        `[C]<u><font size='big'>${dataEstab.name}</font></u>\n` +
        `[L]\n` +
        `[L]Acesse o QR Code para pedir:\n`  +
        `[L]\n` +
        `[L]<qrcode size='20'>http://192.168.1.113:3000/menu/${dataEstab.id}</qrcode>\n` +
        `[L]\n` +
        `[L]\n` +
        `[L]${dataEstab.address}\n` +
        `[L]${dataEstab.neighborhood}\n` +
        `[L]${dataEstab.city} - ${dataEstab.state}\n`  +
        `[L]<font size='tall'>Fone: ${dataEstab.phone}</font>\n`
      await ThermalPrinterModule.printBluetooth({
        payload: text,
        printerNbrCharactersPerLine: 30
      });
  }

  const save = async () => {
    setIsLoading(true)
    if (isEditing) {
      const documentRef = doc(db, 'Establishment', dataEstab.id);
      updateDoc(documentRef, dataEstab)
        .then(() => {
          console.log('Documento atualizado com sucesso');
          setRegStage(4)
        })
        .catch((error) => {
          console.error('Erro ao atualizar documento:', error);
        }).finally(() => setIsLoading(false))
    } else {
      await addDoc(collection(db, "Establishment"), dataEstab).then((res) => {
        setDataEstab((prevData) => ({
          ...prevData,
          id: res.id
        }))
        setIsCreated(true)
        setRegStage(4)
      }).catch((e) => console.log(e)).finally(() => setIsLoading(false))
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      const q = query(
        collection(db, "Establishment"),
        where("owner", "==", auth().currentUser?.uid)
      );
      setIsLoading(true)
      await getDocs(q).then((res) => {
        if (!res.empty) {
          const doc = res.docs[0];
          setDataEstab(doc.data() as EstablishmentData);
          setRegStage(4)
          if (userContext) {
            userContext.setEstabName(doc.data().name)
            userContext.setEstabId(doc.data().id)
          }
        }
      }).catch((e) => console.log(e)).finally(() => setIsLoading(false))
    };
    fetchData();
  }, []);

  const signOut = () => {
    userContext?.setEstabName("")
    userContext?.setUser(null)
    userContext?.setEstabId("")
    auth().signOut();
  }

  return (
    <ScrollView>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: "10%" }}>
        {isLoading ? <ActivityIndicator /> :
          <>
            {regStage === 0 &&
              <>
                <Text style={{ fontSize: 25 }}>Olá!</Text>
                <Text style={{ fontSize: 17, padding: "6%", textAlign: 'center' }}>Falta pouco para dar um Up em seu estabelecimento e torna-lo ainda mais inteligente.</Text>
                <Text style={{ fontSize: 20, marginBottom: "10%" }}>Vamos completar o seu cadastro!</Text>
                <Button style={{ width: "90%", marginTop: "4%" }}
                  icon="hexagon-multiple"
                  mode="contained"
                  onPress={() => setRegStage(1)}
                >
                  Vamos lá!
                </Button>
              </>}

            {regStage === 1 &&
              <>
                <Text style={{ fontSize: 20, width: "90%", marginBottom: "10%" }}>
                  Entre com os dados de seu estabelecimento ;)
                </Text>
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
                <TextInput
                  style={{ width: "90%", marginBottom: "10%" }}
                  mode="outlined"
                  label="CNPJ"
                  value={dataEstab.state_registration}
                  onChangeText={(text) => {
                    setDataEstab((prevState) => ({
                      ...prevState,
                      state_registration: text
                    }))
                  }}
                />
                <Button style={{ width: "90%", marginTop: "4%" }}
                  icon="hexagon-multiple"
                  mode="contained"
                  onPress={() => setRegStage(2)}
                >
                  Proximo
                </Button>
                {!isEditing &&
                  <Button style={{ width: "90%", marginTop: "4%" }}
                    icon="skip-previous"
                    mode="text"
                    onPress={() => setRegStage(0)}
                  >
                    Voltar
                  </Button>
                }
              </>}

            {regStage === 2 &&
              <>
                <Text style={{ fontSize: 20, width: "90%", marginBottom: "10%" }}>
                  Agora informe os dados da localização do estabelecimento
                </Text>
                <TextInput
                  style={{ width: "90%", marginBottom: "2%" }}
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
                <Button style={{ width: "90%", marginTop: "4%" }}
                  icon="hexagon-multiple"
                  mode="contained"
                  onPress={() => [getCepApi(), setRegStage(3)]}
                >
                  Próximo
                </Button>
                <Button style={{ width: "90%", marginTop: "4%" }}
                  icon="skip-previous"
                  mode="text"
                  onPress={() => setRegStage(1)}
                >
                  Voltar
                </Button>
              </>
            }

            {regStage === 3 &&
              <>
                <TextInput
                  style={{ width: "90%", marginBottom: "2%" }}
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
                <Button style={{ width: "90%", marginTop: "4%" }}
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
                </Button>
              </>}


            {regStage === 4 &&
              <>
                <Text style={{ fontSize: 20, width: "90%" }}>
                  {dataEstab.fullname}
                </Text>
                <Text style={{ fontSize: 15, width: "90%" }}>{auth().currentUser?.email}</Text>
                <Text style={{ fontSize: 15, width: "90%", marginTop: "2%", marginBottom: "6%" }} onPress={() => signOut()}>
                  <Icon
                    source="logout"
                    size={20}
                  />{"Sair"}
                </Text>
                <Card style={{ width: "96%" }}>
                  {/* <Card.Title title="Card Title" subtitle="Card Subtitle"/> */}
                  <Card.Cover source={{ uri: 'https://picsum.photos/700' }} />
                  <Card.Content style={{ marginTop: "2%" }}>
                    <Text variant="titleLarge">{dataEstab.name}</Text>
                    <Text variant="titleMedium">{dataEstab.address}</Text>
                    <Text variant="titleMedium">{dataEstab.neighborhood}</Text>
                    <Text variant="titleMedium">{dataEstab.city} - {dataEstab.state} </Text>
                    <Text variant="titleMedium">{dataEstab.zip_code}</Text>
                    <Text variant="titleMedium">{dataEstab.phone}</Text>
                  </Card.Content>
                  <Card.Actions>
                    <Button style={{ marginTop: "5%" }} onPress={() => [setRegStage(1), setIsEditing(true)]}>Editar informações</Button>
                    <Button style={{ marginTop: "5%" }} onPress={() => [printEstablishment()]}>Imprimir informações</Button>
                  </Card.Actions>
                  {/* <Button style={{ marginTop: "5%" }} onPress={() => console.log(dataEstab)}>stab</Button>
                <Button style={{ marginTop: "5%" }} onPress={() => console.log(userContext?.user)}>userContext</Button>
                <Button style={{ marginTop: "5%" }} onPress={() => console.log(userContext?.estabId)}>estabId</Button> */}
                </Card>
              </>
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
          </>}
      </View>
    </ScrollView>
  )
}