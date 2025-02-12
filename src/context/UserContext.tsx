import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { ReactNode, createContext, useEffect, useState } from "react";
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";
import { ItemCartData } from "../Interfaces/ProductMenu_Interface";
import { DocumentData } from "@google-cloud/firestore";
import messaging from '@react-native-firebase/messaging';
import { collection, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db, auth } from '../Services/FirebaseConfig';

interface UserContextType {
  globalState: string;
  setGlobalState: (value: string) => void

  user: DocumentData
  setUser: (value: DocumentData) => void;

  isAuthenticated: Boolean
  setIsAuthenticated: (value: Boolean) => void

  isUpdatedDataMenu: Boolean
  setIsUpdatedDataMenu: (value: Boolean) => void

  estabName: string;
  setEstabName: (value: string) => void

  estabId: string;
  setEstabId: (value: string) => void

  shoppingCart: ItemCartData[];
  setShoppingCart: React.Dispatch<React.SetStateAction<ItemCartData[]>>

  estabTokenFCM: string;
  setEstabTokenFCM: (value: string) => void

  dataEstablishment: DocumentData;
  setDataEstablishment: (value: DocumentData) => void;

  userRole: string;
  setUserRole: (value: string) => void
}

export const UserContext = createContext<DocumentData>({});

function UserProvider({ children }: { children: ReactNode }) {
  const [globalState, setGlobalState] = useState("Teste - Funcionou!");

  const [user, setUser] = useState<DocumentData>({} as DocumentData);
  const [initializing, setInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<Boolean>(false)
  const [estabName, setEstabName] = useState("")
  const [estabId, setEstabId] = useState("")
  const [estabTokenFCM, setEstabTokenFCM] = useState("")
  const [shoppingCart, setShoppingCart] = useState<ItemCartData[]>([])
  const [isUpdatedDataMenu, setIsUpdatedDataMenu] = useState<Boolean>(false)
  const [dataEstablishment, setDataEstablishment] = useState<DocumentData>({} as DocumentData);
  const [userRole, setUserRole] = useState("")


  const registerToken = async (userId: string) => {
    console.log('entrei..')
    const fcmToken = await messaging().getToken()
    console.log('token:', fcmToken)
    try {
      console.log('alterando..')
      const userQuery = query(
        collection(db, "User"),
        where("uid", "==", userId)
      )
      console.log('oie')
      const querySnapshot = await getDocs(userQuery);
      if (!querySnapshot.empty) {
        console.log('achei o user')
        querySnapshot.forEach(async (docSnapshot) => {
          const docRef = docSnapshot.ref;
          await updateDoc(docRef, {
            token: fcmToken,
          });
        });
      } else {
        console.log('nao achei o user')
      }
    } catch (error) {
      console.log('erroo', error)
    }
  }


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async _user => {
      if (initializing) {
        setInitializing(false)
      }
      if (_user) {
        try {
          // 🔥 Atualiza o token para validar se ainda está ativo
          await _user.getIdToken(true);
          console.log("Usuário autenticado:", _user.uid);
          setUser(_user);
          setIsAuthenticated(true);
        } catch (error: unknown) {
          if (error instanceof Error && "code" in error) {
            const firebaseError = error as { code: string }; // 🔥 Faz cast seguro

            if (
              firebaseError.code === "auth/id-token-expired" ||
              firebaseError.code === "auth/user-token-expired"
            ) {
              console.log("Token expirado, deslogando usuário...");
              await auth.signOut()
            }
          }
        }
      } else {
        console.log("Nenhum usuário autenticado");
        setIsAuthenticated(false);
        setUser({});
        setUserRole("");
      }
    });

    return () => unsubscribe();
  }, [initializing]);

  if (initializing) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }


  return (
    <UserContext.Provider value={{
      globalState, setGlobalState,
      user, setUser,
      isAuthenticated,
      setIsAuthenticated,
      estabName, setEstabName,
      estabId, setEstabId,
      shoppingCart, setShoppingCart,
      isUpdatedDataMenu, setIsUpdatedDataMenu,
      estabTokenFCM, setEstabTokenFCM,
      dataEstablishment, setDataEstablishment,
      userRole, setUserRole
    }}>
      {children}
    </UserContext.Provider>
  );
}

export default UserProvider;
