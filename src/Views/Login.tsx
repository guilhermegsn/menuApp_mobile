import { View } from 'react-native'
import React, { useContext, useState } from 'react'
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper'
import auth from '@react-native-firebase/auth';
import { UserContext } from '../context/UserContext';


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
    </View>
  )
}