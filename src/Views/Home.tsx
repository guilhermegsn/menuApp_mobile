import { View, Text } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import auth from '@react-native-firebase/auth';
import { ActivityIndicator, Button } from 'react-native-paper';
import { UserContext } from '../context/UserContext';

export default function Home() {
  
  //const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState<Boolean>(true);

  const userContext = useContext(UserContext);
  const globalState = userContext?.globalState || "";

const { user, setUser } = userContext ??{};
 

// useEffect(() => {
//     try{
//       const unsubscribe = auth().onAuthStateChanged(_user => {
//         if (initializing) {
//           setInitializing(false);
//         }
//         if(_user){
//           setUser(_user);
//         }
//       });
//       return unsubscribe;
//     }catch(e){
//       console.log(e)
//     }
//   }, [initializing]);

  const  signOut = () => {
    auth().signOut();
  }

  // if (initializing) {
  //   return (
  //     <View>
  //       <ActivityIndicator />
  //     </View>
  //   );
  // }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: "-30%" }}>
    <Text style={{fontSize: 20, marginBottom: "10%", color: "black"}}>Bem vindo!</Text>
     <Text style={{color: "black"}}>{user?.email}</Text>
     <Button  style={{ width: "90%"}} icon="truck-plus" mode="contained" onPress={() => signOut()}>
        Sair
      </Button>
      <Text>{globalState}</Text>
    </View>
  )
}