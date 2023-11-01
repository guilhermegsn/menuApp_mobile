import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore"
import { getAuth } from "firebase/auth";
//import { AsyncStorage } from '@react-native-async-storage/async-storage';


const firebaseConfig = {
  apiKey: "AIzaSyC8h_V6MKR4sAA7MkmKGuLtveqbJQJE7h4",
  authDomain: "appdesc-e1bf2.firebaseapp.com",
  databaseURL: "https://appdesc-e1bf2.firebaseio.com",
  projectId: "appdesc-e1bf2",
  storageBucket: "appdesc-e1bf2.appspot.com",
  messagingSenderId: "446390716578",
  appId: "1:446390716578:web:50b09de0899dc61f292ffb"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app)
export const auth = getAuth(app)

//auth.useDeviceLanguage();
//auth.setPersistence(AsyncStorage);