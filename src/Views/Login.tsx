import { Alert, Keyboard, StyleSheet, TouchableWithoutFeedback, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper'
import auth from '@react-native-firebase/auth';
import { Image, KeyboardAvoidingView } from 'react-native';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { configureGoogleSignin } from '../Services/FirebaseConfig';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig'
import messaging from '@react-native-firebase/messaging';

export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [tokenFcm, setTokenFcm] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [dataUser, setDataUser] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: '',
  })

  useEffect(() => {
    const registerNotifications = async () => {
      const fcmToken = await messaging().getToken();
      if (fcmToken) {
        console.log('token:', fcmToken)
        setTokenFcm(fcmToken)
      } else {
        console.log('Nâo foi possível obter o token.')
      }
    }
    registerNotifications()
  }, [])


  useEffect(() => {
    // Configure o GoogleSignin no início
    configureGoogleSignin();
  }, []);

  const signIn = async () => {
    setIsLoading(true)
    try {
      await auth().signInWithEmailAndPassword(dataUser.email, dataUser.password)
    } catch (error) {
      console.error('Erro durante login:', error)
    } finally {
      setIsLoading(false)
    }
  }


  const signUp = async () => {
    try {
      // Cria o usuário com email e senha
      const userCredential = await auth().createUserWithEmailAndPassword(dataUser.email, dataUser.password);

      // Pega o UID do usuário recém-criado
      const userId = userCredential.user.uid;

      // Adiciona o documento na coleção "User" com o UID no corpo do documento
      await addDoc(collection(db, 'User'), {
        uid: userId,
        email: dataUser.email,
        name: dataUser.name,
        token: tokenFcm,
        createdAt: serverTimestamp()
      });

      console.log('Conta de usuário criada e UID salvo com sucesso!');
    } catch (error: string | any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('Esse endereço de email já está em uso!');
      } else if (error.code === 'auth/invalid-email') {
        console.log('Esse endereço de email é inválido!');
      } else {
        console.error('Erro durante o cadastro:', error);
      }
    }
  }

  


  const signInWithGoogle = async () => {
    setIsLoading(true)
    try {
      await GoogleSignin.signOut();
      // Verifique se os serviços do Google estão disponíveis
      // const hasServices = await GoogleSignin.hasPlayServices();
      // console.log('Google Play Services estão disponíveis:', hasServices);
      // if (!hasServices) {
      //   throw new Error('Google Play Services não estão disponíveis.');
      // }
      // Solicitar o login com Google, o que deve exibir o prompt de conta se o usuário estiver logado em mais de uma conta
      const userInfo = await GoogleSignin.signIn();
      console.log('Informações do Usuário:', userInfo); // Adicione um log para verificar a resposta
      const idToken = userInfo?.data?.idToken;
      if (!idToken) {
        throw new Error('ID Token não encontrado');
      }
      // Criar credenciais para o Firebase
      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      // Autenticar com Firebase
      const userCredential = await auth().signInWithCredential(googleCredential);
      const userId = userCredential.user.uid;
      //\Verifico se Usuário já está cadastrado
      const userQuery = query(collection(db, "User"), where("email", "==", userCredential.user.email))
      const querySnapshot = await getDocs(userQuery)
      if (querySnapshot.empty) {
        // Adiciona o usuário  a collection User
        await addDoc(collection(db, 'User'), {
          uid: userId,
          email: userCredential.user.email,
          name: userCredential.user.displayName,
          token: tokenFcm,
          createdAt: serverTimestamp()
        });
      }
      console.log('Usuário autenticado:', userCredential.user);
    } catch (error) {
      console.error('Erro durante o login com Google:', error);
      Alert.alert('Erro', 'Falha ao fazer login com Google.');
    } finally {
      setIsLoading(false)
    }
  };

  const styles = StyleSheet.create({
    cardImage: {
      marginTop: -40,
      width: '35%',
      height: 150,
      borderRadius: 10,
    },
    input: {
      width: '90%',
      marginBottom: '2%',
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
      width: '100%',   // Ajuste o tamanho da imagem conforme necessário
      height: 50,   // Ajuste o tamanho da imagem conforme necessário
      borderBottomRightRadius: 40,
      borderBottomLeftRadius: 40
    },
  })



  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 }}>
          <Image
            source={require('../assets/images/menupedia_logo.png')}
            style={styles.cardImage}
          />
          {isSignUp && (
            <TextInput
              style={styles.input}
              mode="outlined"
              label="Nome"
              value={dataUser.name}
              onChangeText={(text) => {
                setDataUser((prevState) => ({
                  ...prevState,
                  name: text
                }));
              }}
            />
          )}
          <TextInput
            style={styles.input}
            mode="outlined"
            label="E-mail"
            keyboardType="email-address"
            onChangeText={(text) => {
              setDataUser((prevState) => ({
                ...prevState,
                email: text.toLowerCase()
              }));
            }}
          />
          <TextInput
            style={styles.input}
            mode="outlined"
            secureTextEntry
            label="Senha"
            onChangeText={(text) => {
              setDataUser((prevState) => ({
                ...prevState,
                password: text
              }));
            }}
          />
          {isSignUp && (
            <TextInput
              style={styles.input}
              mode="outlined"
              secureTextEntry
              label="Confirmar senha"
              onChangeText={(text) => {
                setDataUser((prevState) => ({
                  ...prevState,
                  confirmPassword: text
                }));
              }}
            />
          )}
          <Button
            style={{ width: '90%', marginTop: '4%' }}
            icon="login"
            mode="text"
            onPress={() => isSignUp ? signUp() : signIn()}
          >
            {isSignUp ? 'Inscrever' : 'Login'}
          </Button>
          <Text style={{ marginTop: 10 }}>
            {isSignUp ? 'Já possui uma conta?' : 'Não tem uma conta?'}
          </Text>
          <Button onPress={() => setIsSignUp(!isSignUp)}>
            {!isSignUp ? 'Inscreva-se' : 'Login'}
          </Button>
          {isLoading && <ActivityIndicator />}


          <View style={styles.footer}>
            <Image
              source={require('../assets/images/banner.png')}
              style={styles.footerImage}
            />
          </View>
          <GoogleSigninButton
            style={{ width: 250, height: 48 }}  // Estilize conforme necessário
            size={GoogleSigninButton.Size.Wide}  // Pode ser 'Standard' ou 'Wide'
            color={GoogleSigninButton.Color.Dark}  // Pode ser 'Dark' ou 'Light'
            onPress={signInWithGoogle}
          />

        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}