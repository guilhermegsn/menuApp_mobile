import { View } from 'react-native'
import React, { useContext, useState } from 'react'
import { ActivityIndicator, Button, Text, TextInput } from 'react-native-paper'
import auth from '@react-native-firebase/auth';
import { UserContext } from '../context/UserContext';
import { CommonActions, useNavigation } from '@react-navigation/native';


export default function Login() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false)

  const userContext = useContext(UserContext);

  const signIn = () => {
    setIsLoading(true)
    auth()
      .signInWithEmailAndPassword(email, password)
      .then((res) => {
        console.log('user is authenticated');
        console.log(res?.user)
        userContext?.setUser(res?.user);
        userContext?.setIsAuthenticated(true)
        

        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              { name: 'Home' },
            ],
          })
        );

      })
      .catch(error => {
        console.error(error);
      }).finally(()=> setIsLoading(false))
  }

  return (
   
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: "-30%" }}>
      <Text style={{ fontSize: 20, marginBottom: "10%" }}>Bem vindo!</Text>
      <TextInput
        style={{ width: "90%", marginBottom: "2%" }}
        mode="outlined"
        label="Usuário"
        onChangeText={(text) => setEmail(text)}
      />
      <TextInput
        style={{ width: "90%", marginBottom: "10%" }}
        mode="outlined"
        label="Senha"
        onChangeText={(text) => setPassword(text)}
      //placeholder="Type something"
      />
      <Button style={{ width: "90%" }} icon="truck-plus" mode="contained" onPress={() => signIn()}>
        Press me
      </Button>
     <Text> {userContext?.user?.email}</Text>
     <Text> {userContext?.isAuthenticated === true? "ACT" : "DSC"}</Text>
     {isLoading ?  <ActivityIndicator /> : null}
    </View>
  )
}