import { View } from 'react-native'
import React, { useContext, useState } from 'react'
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper'
import auth from '@react-native-firebase/auth';
import { UserContext } from '../context/UserContext';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import NotificationService from '../Services/NotificationService';
import messaging from '@react-native-firebase/messaging';


export default function Login() {
  const navigation = useNavigation()
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
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
      console.log('Usuário autenticado:', res?.user);
      if (userContext) {
        userContext.setUser(res?.user)
        userContext.setIsAuthenticated(true)
        userContext.setShoppingCart([])
      }
      // Consulta no Firestore para obter os dados do estabelecimento
      const q = query(
        collection(db, "Establishment"),
        where("owner", "==", auth().currentUser?.uid)
      )
      const querySnapshot = await getDocs(q)
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0]
        if (userContext) {
          //obtendo token do usuário p/ notificações push
          const fcmToken = await messaging().getToken()
          userContext.setEstabName(doc.data().name || '')
          userContext.setEstabId(doc.id)
          userContext?.setEstabTokenFCM(fcmToken)
          userContext?.setDataEstablishment(doc.data())
          console.log('docdata->',doc.data())
          //registrando token
          NotificationService.registerForPushNotifications(doc.id, fcmToken)
        }
      } else {
        console.log('Nenhum estabelecimento encontrado para este usuário.')
      }
      // Redireciona para a Home
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        })
      )
    } catch (error) {
      console.error('Erro durante login:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const signUp = () => {
      auth()
        .createUserWithEmailAndPassword(dataUser.email, dataUser.password)
        .then(() => {
          console.log('User account created & signed in!');
        })
        .catch(error => {
          if (error.code === 'auth/email-already-in-use') {
            console.log('That email address is already in use!');
          }
          if (error.code === 'auth/invalid-email') {
            console.log('That email address is invalid!');
          }
          console.error(error);
        });
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
          onPress={() => isSignUp ? signUp() : signIn()}>
          {isSignUp ? "Inscrever" : "Login"}
        </Button>
        <Text style={{ marginTop: "10%" }}>
          {isSignUp ? "Já possui uma conta?" : "Não tem uma conta?"}
        </Text>
        <Button onPress={() => setIsSignUp(!isSignUp)}>
          {!isSignUp ? "Inscreva-se" : "Login"}
        </Button>
        {isLoading ? <ActivityIndicator /> : null}
      </View>
    )
  }