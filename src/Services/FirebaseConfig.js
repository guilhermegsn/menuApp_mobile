import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore"
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APIKEY,
  AUTH_DOMAIN,
  DATABASE_URL,
  PROJECT_ID,
  STORAGE_BUCKET,
  MESSAGING_SENDER_ID,
  AP_ID,
  WEB_CLIENT_ID
} from '@env';

const firebaseConfig = {
  apiKey: APIKEY,
  authDomain: AUTH_DOMAIN,
  databaseURL: DATABASE_URL,
  projectId: PROJECT_ID,
  storageBucket: STORAGE_BUCKET,
  messagingSenderId: MESSAGING_SENDER_ID,
  appId: AP_ID
};

const app = initializeApp(firebaseConfig);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Inicializa o Google Signin
export const configureGoogleSignin = () => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
  });
};

auth.onAuthStateChanged(user => {
  console.log('Estado da autenticação mudou:', user);
});

// Exporta o Firestore e Auth
export const db = getFirestore(app);
export { auth } 