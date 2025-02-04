import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore"
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Inicializa o Google Signin
export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: '446390716578-d5k736aav8ma7usia871um381nos3k2f.apps.googleusercontent.com',
  });
};

auth.onAuthStateChanged(user => {
  console.log('Estado da autenticação mudou:', user);
});

// Exporta o Firestore e Auth
export const db = getFirestore(app);
export { auth } 