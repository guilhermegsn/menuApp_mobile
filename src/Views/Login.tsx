import { Alert, View } from 'react-native'
import React, { useContext, useState } from 'react'
import { ActivityIndicator, Button, Dialog, Portal, RadioButton, Text, TextInput } from 'react-native-paper'
import auth from '@react-native-firebase/auth';
import { UserContext } from '../context/UserContext';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { collection, DocumentData, getDocs, query, where } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import NotificationService from '../Services/NotificationService';
import messaging from '@react-native-firebase/messaging';

interface userEstablishmentInterface {
  name: string
  enabled: boolean
  id: string
  type: string
}


export default function Login() {
  const navigation = useNavigation()
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [multipleEstablishment, setMultiEstablishment] = useState<userEstablishmentInterface[]>([])
  const [selectedEstablishment, setSelectedEstablishment] = useState("")
  const [isOpenDialogMultiple, setIsOpenDialogMultiple] = useState(false)
  const [dataUser, setDataUser] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  })

  const userContext = useContext(UserContext);

  const signIn = async () => {
    setIsLoading(true)
    try {
      // Autentica o usuário
      const res = await auth().signInWithEmailAndPassword(dataUser.email, dataUser.password)
      const q = query(
        collection(db, "User"),
        where("email", "==", auth().currentUser?.email)
      )

      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        const data = doc.data()
        if (data.establishment.length > 1) {
          console.log('Multiple')
          setMultiEstablishment(data.establishment)
          setIsOpenDialogMultiple(true)
        }
      } else {
        Alert.alert("Sem acesso.", "Usuário sem acesso. Contate o administrador.")
      }
    } catch (error) {
      console.error('Erro durante login:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // const signIn = async () => {
  //   setIsLoading(true);
  //   try {
  //     // Autentica o usuário
  //     const res = await auth().signInWithEmailAndPassword(dataUser.email, dataUser.password);
  //     console.log('Usuário autenticado com sucesso:', res?.user);

  //     const currentUser = auth().currentUser;
  //     if (!currentUser) {
  //       throw new Error("Usuário não autenticado.");
  //     }

  //     // Realiza a busca no Firestore
  //     const q = query(
  //       collection(db, "User"),
  //       where("email", "==", currentUser.email)
  //     )

  //     const querySnapshot = await getDocs(q);

  //     if (!querySnapshot.empty) {
  //       const doc = querySnapshot.docs[0];
  //       const data = doc.data();

  //       if (data?.establishment?.length > 1) {
  //         console.log('Usuário possui múltiplos estabelecimentos:', data.establishment);
  //         setMultiEstablishment(data.establishment);
  //         setIsOpenDialogMultiple(true);
  //       } else {
  //         console.log('Usuário autenticado com um único estabelecimento.');
  //         // Aqui você pode definir a navegação ou outras ações
  //       }
  //     } else {
  //       Alert.alert("Sem acesso", "Usuário não encontrado ou sem acesso autorizado. Contate o administrador.");
  //     }
  //   } catch (error) {
  //     const firebaseError = error as { code?: string; message?: string };
  //     console.error('Erro durante o login:', firebaseError.message);
  //     if (firebaseError.code === 'auth/wrong-password') {
  //       Alert.alert("Erro de autenticação", "Senha incorreta. Verifique e tente novamente.");
  //     } else if (firebaseError.code === 'auth/user-not-found') {
  //       Alert.alert("Erro de autenticação", "Usuário não encontrado. Verifique o e-mail informado.");
  //     } else {
  //       Alert.alert("Erro", firebaseError.message || "Ocorreu um erro desconhecido.");
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }

  // const signIn = async () => {
  //   setIsLoading(true);
  //   try {
  //     const res = await auth().signInWithEmailAndPassword(dataUser.email, dataUser.password);
  //     console.log("Usuário autenticado com sucesso:", res?.user);
  
  //     const currentUser = auth().currentUser;
  //     if (!currentUser) {
  //       throw new Error("Usuário não autenticado.");
  //     }
  //     // Salve apenas o usuário autenticado no estado/contexto
  //     userContext?.setUser(currentUser);
  //     userContext?.setIsAuthenticated(true);
  //   } catch (error) {
  //     const firebaseError = error as { code?: string; message?: string };
  //     console.error("Erro durante o login:", firebaseError.message);
  //     if (firebaseError.code === "auth/wrong-password") {
  //       Alert.alert("Erro de autenticação", "Senha incorreta. Verifique e tente novamente.");
  //     } else if (firebaseError.code === "auth/user-not-found") {
  //       Alert.alert("Erro de autenticação", "Usuário não encontrado. Verifique o e-mail informado.");
  //     } else {
  //       Alert.alert("Erro", firebaseError.message || "Ocorreu um erro desconhecido.");
  //     }
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };
  
  

  const setContextData = (idEstablishment: string) => {
    console.log('establishment: ', idEstablishment)
    if (userContext) {
      const document = multipleEstablishment.find((item: userEstablishmentInterface) => item.id === idEstablishment)
      if (document && document.enabled) {
        userContext.setIsAuthenticated(true)
        userContext.setShoppingCart([])
        userContext.setEstabId(idEstablishment)
        setIsOpenDialogMultiple(false)
      } else {
        Alert.alert("Sem acesso.", "Usuário sem acesso. Contate o administrador.")
      }
    }
  }

  const signUp = () => {
    // auth()
    //   .createUserWithEmailAndPassword(dataUser.email, dataUser.password)
    //   .then(() => {
    //     console.log('User account created & signed in!');
    //   })
    //   .catch(error => {
    //     if (error.code === 'auth/email-already-in-use') {
    //       console.log('That email address is already in use!');
    //     }
    //     if (error.code === 'auth/invalid-email') {
    //       console.log('That email address is invalid!');
    //     }
    //     console.error(error);
    //   });
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: "-30%" }}>
      <Text style={{ fontSize: 20, marginBottom: "10%" }}>Bem vindo!</Text>
      <TextInput
        style={{ width: "90%", marginBottom: "2%" }}
        mode="outlined"
        label="E-mail"
        onChangeText={(text) => {
          setDataUser((prevState) => ({
            ...prevState,
            email: text
          }))
        }}
      />
      <TextInput
        style={{ width: "90%", marginBottom: "2%" }}
        mode="outlined"
        secureTextEntry
        label="Senha"
        onChangeText={(text) => {
          setDataUser((prevState) => ({
            ...prevState,
            password: text
          }))
        }}
      //placeholder="Type something"
      />
      {isSignUp &&
        <TextInput
          style={{ width: "90%", marginBottom: "10%" }}
          mode="outlined"
          secureTextEntry
          label="Confirmar senha"
          onChangeText={(text) => {
            setDataUser((prevState) => ({
              ...prevState,
              confirmPassword: text
            }))
          }}
        //placeholder="Type something"
        />
      }
      <Button style={{ width: "90%", marginTop: "4%" }}
        icon="login"
        mode="contained"
        // onPress={() => isSignUp ? signUp() : signIn()}>
        onPress={signIn}>
        {isSignUp ? "Inscrever" : "Loginnn"}
      </Button>
      <Text style={{ marginTop: "10%" }}>
        {isSignUp ? "Já possui uma conta?" : "Não tem uma conta?"}
      </Text>
      <Button onPress={() => setIsSignUp(!isSignUp)}>
        {!isSignUp ? "Inscreva-se" : "Login"}
      </Button>
      {isLoading ? <ActivityIndicator /> : null}





      <Portal>
        <Dialog visible={isOpenDialogMultiple} onDismiss={() => []}>
          <Dialog.Title style={{ textAlign: 'center' }}>{'Selecione o estabelecimento'}</Dialog.Title>
          <View style={{ padding: 15 }}>
            <RadioButton.Group
              value={selectedEstablishment}
              onValueChange={(e) => {
                setSelectedEstablishment(e)
              }}
            >
              {multipleEstablishment?.map((item: DocumentData) => (
                <RadioButton.Item label={item?.name || ""} color='green' value={item?.id} />
              ))}
            </RadioButton.Group>
          </View>
          <Dialog.Content style={{ marginTop: 40 }}>
            <Dialog.Actions>
              <Button onPress={() => []}>Cancelar </Button>
              <Button
                onPress={() => setContextData(selectedEstablishment)}
              //  loading={isLoadingDialog}
              >
                Salvar
              </Button>
            </Dialog.Actions>
          </Dialog.Content>
        </Dialog>
      </Portal>
      <Button onPress={() => console.log(multipleEstablishment)}>is</Button>
      <Button onPress={() => console.log(isOpenDialogMultiple)}>multiple</Button>
    </View>
  )
}