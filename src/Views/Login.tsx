import { Keyboard, StyleSheet, TouchableWithoutFeedback, View } from 'react-native'
import React, { useContext, useState } from 'react'
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper'
import auth from '@react-native-firebase/auth';
import { UserContext } from '../context/UserContext';
import { Image, KeyboardAvoidingView } from 'react-native';


export default function Login() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [dataUser, setDataUser] = useState({
    email: "",
    password: "",
    confirmPassword: ""
  })


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
      height:50,   // Ajuste o tamanho da imagem conforme necessário
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
          <TextInput
            style={styles.input}
            mode="outlined"
            label="E-mail"
            onChangeText={(text) => {
              setDataUser((prevState) => ({
                ...prevState,
                email: text
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
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  )
}