import { ReactNode, createContext, useEffect, useState } from "react";
import { Alert, View } from "react-native";
import { ItemCartData } from "../Interfaces/ProductMenu_Interface";
import { DocumentData } from "@google-cloud/firestore";
import { auth } from '../Services/FirebaseConfig';
import SplashScreen from "../Views/SplashScreen";

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

  expiredSubscription: boolean;
  setExpiredSubscription: (value: boolean) => void

  printConfig: DocumentData,
  setPrintConfig: (value: DocumentData) => void;
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
  const [expiredSubscription, setExpiredSubscription] = useState<Boolean>(false)
  const [printConfig, setPrintConfig] = useState<DocumentData>({
    print: true, //tem impressora
    newOrder: false, //imprimir novos pedidos automaticamente
  } as DocumentData)


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
          // if (!_user.emailVerified) {
          //   Alert.alert('Verificação pendente', 'Por favor, confirme seu e-mail antes de continuar.')
          //   await auth.signOut()
          // } else {
            setIsAuthenticated(true);
          //}
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
      <View style={{ flex: 1 }}>
        <SplashScreen />
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
      userRole, setUserRole,
      expiredSubscription, setExpiredSubscription,
      printConfig, setPrintConfig
    }}>
      {children}
    </UserContext.Provider>
  );
}

export default UserProvider;
