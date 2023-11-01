import { FirebaseAuthTypes } from "@react-native-firebase/auth";
import { ReactNode, createContext, useEffect, useState } from "react";
import auth from '@react-native-firebase/auth';
import { View } from "react-native";
import { ActivityIndicator } from "react-native-paper";

interface UserContextType {
  globalState: string;
  setGlobalState: (value: string) => void;
 
  user: FirebaseAuthTypes.User | null;
  setUser: (value: FirebaseAuthTypes.User) => void;
  
  isAuthenticated: Boolean
  setIsAuthenticated: (value: Boolean) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

function UserProvider({ children }: { children: ReactNode }) {
  const [globalState, setGlobalState] = useState("Teste - Funcionou!");

  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<Boolean>(false)

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(_user => {
      if (initializing) {
        setInitializing(false);
      }
      if(_user){
        setUser(_user);
        setIsAuthenticated(true)
      }else{
        setIsAuthenticated(false)
        setUser(null)
      }
      
    });
    return unsubscribe;
  }, [initializing]);

  if (initializing) {
    return (
      <View>
        <ActivityIndicator />
      </View>
    );
  }


  return (
    <UserContext.Provider value={{ globalState, setGlobalState, user, setUser, isAuthenticated, setIsAuthenticated}}>
      {children}
    </UserContext.Provider>
  );
}

export default UserProvider;
