import { ImageLibraryOptions, ImagePickerResponse, PhotoQuality, launchImageLibrary } from "react-native-image-picker";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { PermissionsAndroid, Platform, Vibration } from "react-native";
import ThermalPrinterModule from 'react-native-thermal-printer'
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from '../Services/FirebaseConfig';
import { Alert } from "react-native";
import Sound from "react-native-sound";
import { getFunctions, httpsCallable } from "firebase/functions";
import axios from "axios";

export const getCurrentDate = () => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return `${year}-${month}-${day}`;
}

export const getCurrentDateTime = () => {
  const today = new Date();
  const day = today.getDate();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  const hour = today.getHours();
  const minute = today.getMinutes();
  const second = today.getSeconds();
  const millisecond = today.getMilliseconds();
  return `${year}-${month}-${day} ${hour}:${minute}:${second}.${millisecond}`;
}

export const removeAccents = (str: String) => {
  return str
    .normalize('NFD') // Decompõe caracteres acentuados em caracteres base e acento
    .replace(/[\u0300-\u036f]/g, ''); // Remove os acentos
}

export const generateUUID = () => {
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now(); // use high-precision timer if available
  }
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
  return uuid;
}

export const getHourMinuteSecond = (timestamp: Date) => {
  const date = new Date(timestamp);
  console.log(`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`)
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}



export const formatToCurrencyBR = (number: number) => {
  try {
    return number.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  } catch {
    return ""
  }
}

export const formatToDoubleBR = (number: number) => {
  try {
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  } catch {
    return ""
  }
}

export const formatCurrencyInput = (value: string) => {
  value = value.toString().replace(/\D/g, "")
  value = (parseFloat(value) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return value
}

export const handleNumberInputChange = (text: string): number => {
  const numericValue = text.replace(/[^0-9]/g, '')
  const parsedValue = parseFloat(numericValue)
  return isNaN(parsedValue) ? 0 : parsedValue
}

export const openImagePicker = async (
  maxHeight: number = 1080,
  maxWidth: number = 1080,
  quality: number = 0.5
): Promise<string | null> => {
  return new Promise((resolve) => {
    const options: ImageLibraryOptions = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: maxHeight,
      maxWidth: maxWidth,
      quality: quality as PhotoQuality
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
        resolve(null);
      } else if (response.errorMessage) {
        console.log('Image picker error: ', response.errorMessage);
        resolve(null);
      } else {
        const imageUri: string = response.assets?.[0]?.uri || '';
        resolve(imageUri);
      }
    });
  });
}

export const uploadImage = async (image: string | null, idEstablishment: string) => {
  if (image) {
    const storage = getStorage();
    const storageRef = ref(storage, `images/${idEstablishment}/` + new Date().getTime() + '.jpg');
    const response = await fetch(image);
    const blob = await response.blob();

    try {
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      console.log('Image uploaded successfully. Download URL:', downloadURL);
      return downloadURL
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  }
  return null
}

export const printThermalPrinter = async (text: string) => {
  if (Platform.OS === 'android' && Platform.Version >= 31) { // Ajustado para Android 12+
    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
      ]);

      if (
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN] === PermissionsAndroid.RESULTS.GRANTED &&
        granted[PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT] === PermissionsAndroid.RESULTS.GRANTED
      ) {
        await ThermalPrinterModule.printBluetooth({
          payload: text,
          printerNbrCharactersPerLine: 30
        });
      } else {
        console.log('Permissões Bluetooth negadas');
      }
    } catch (err) {
      console.warn('Erro ao solicitar permissões Bluetooth:', err);
    }
  } else {
    try {
      await ThermalPrinterModule.printBluetooth({
        payload: removeAccents(text),
        printerNbrCharactersPerLine: 30
      });
    } catch {
      Alert.alert('Erro ao imprimir pedido.')
    }
  }
}

export const readTagNfc = async (setIsOpenNFC: React.Dispatch<React.SetStateAction<boolean>>) => {
  setIsOpenNFC(true)
  try {
    // Checar se o NFC está suportado no dispositivo
    const supported = await NfcManager.isSupported();
    if (!supported) {
      console.log('NFC is not supported');
      return;
    }
    // Iniciar a sessão de leitura NFC
    await NfcManager.requestTechnology(NfcTech.Ndef);
    const tag = await NfcManager.getTag();
    return tag
  } catch {
    return null
  } finally {
    setIsOpenNFC(false)
    NfcManager.cancelTechnologyRequest();
  }
}

export const getDataNfcTicket = async (idTag: string, idEstablishment: string) => {
  try {
    const q = query(
      collection(db, "Ticket"),
      where("idTag", "==", idTag),
      where("status", "==", 1),
      where("establishment", "==", idEstablishment),
    )
    const querySnapshot = await getDocs(q)
    const doc = querySnapshot.docs[0]
    console.log('ticket-->', doc)
    const ticket = { id: doc.id, ...doc.data() }
    return ticket
  }
  catch (e) {
    console.log('error-->', e)
    return null
  }
}

export const getInitialsName = (name: string) => {
  const splitName = name.split(' ')
  // Pega as iniciais de cada parte do nome
  const initial = splitName.map((part) => part.charAt(0));
  // Verifica o número de partes
  let initialsName = ''
  if (splitName.length === 1) {
    // Se houver apenas um nome, pegue a primeira inicial
    initialsName = initial[0]
  } else {
    // Se houver mais de um nome, pegue as duas primeiras iniciais
    initialsName = initial.slice(0, 2).join('')
  }
  return initialsName.toUpperCase()
}

export const playSound = (media: String) => {
  const som = new Sound(media, Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log('Erro ao carregar o som:', error)
      return;
    }
    som.play((success) => {
      if (!success) {
        console.log('Erro ao reproduzir o som.');
      }
      som.release(); // Libera o recurso após tocar
    })
  })
}

export const vibrate = () => {
  const time = [0, 400, 200, 400]; // Vibra por 400ms, pausa 200ms, vibra novamente
  Vibration.vibrate(time);
};

export const requestNotificationPermission = async () => {
  if (Platform.OS === "android" && Platform.Version >= 33) {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Permissão para Notificações",
          message: "Este aplicativo precisa de permissão para enviar notificações.",
          buttonNeutral: "Perguntar Depois",
          buttonNegative: "Cancelar",
          buttonPositive: "Permitir",
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("Permissão concedida para notificações.");
      } else {
        console.log("Permissão negada para notificações.");
      }
    } catch (err) {
      console.warn(err);
    }
  } else {
    console.log("Permissão de notificações não é necessária nesta versão do Android.");
  }
};

export const fetchOrders = async () => {
  console.log('oi, entrei aq')
  setTimeout(() => {
    console.log('oiii')
    return 'oie'
  }, 3000);

  // const userContext = useContext(UserContext);

  // const q = query(
  //   collection(db, 'OrderItems'),
  //   where("establishment", "==", userContext?.estabId),
  //   orderBy('date', 'desc'),
  //   limit(15)
  // );

  // try {
  //   const querySnapshot = await getDocs(q);
  //   const ordersData: { id: string; }[] = [];

  //   querySnapshot.forEach((doc) => {
  //     // Não exibindo itens cancelados.
  //     if (doc.data().status !== 3) {
  //       ordersData.push({ id: doc.id, ...doc.data() });
  //     }
  //   });

  //   // Atualize o estado ou faça o que for necessário com os dados recebidos
  //   if (ordersData) {
  //     console.log('ordersData',ordersData)
  //   }else{
  //     console.log('ordersData: erro')
  //   }

  // } catch (e) {
  //   console.error('Error fetching orders: ', e);
  // }
};

export const updateUserClaims = async (uid: string, newRole: string, newEstablishment: string) => {
  try {
    console.log('atualizando claims', uid, newRole, newEstablishment)
    const functions = getFunctions();
    const updateClaims = httpsCallable(functions, "updateUserClaims");

    await updateClaims({ uid, newRole, newEstablishment });

  } catch (error) {
    console.error("Erro ao atualizar claims:", error);
  }
}

export const refreshUserToken = async () => {
  const user = auth.currentUser;
  if (user) {
    try {
      const tokenResult = await user.getIdTokenResult(true)
      console.log("Token atualizado do usuário:", tokenResult.claims);

      // Aqui você pode acessar as claims atualizadas diretamente
      const { role, establishmentId } = tokenResult.claims;
      console.log("Role:", role, "Establishment ID:", establishmentId);
    } catch (error) {
      console.error("Erro ao atualizar o token:", error);
    }
  }
};

export const createSubscription = async (userId: string, email: string, planId: string) => {
  const API_URL = 'https://us-central1-appdesc-e1bf2.cloudfunctions.net/createSubscription'
  const currentUser = auth.currentUser
  if (currentUser) {
    const token = await currentUser.getIdToken(); // Token de autenticação
    try {
      const response = await axios.post(
        API_URL,
        {
          userId,
          email,
          planId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Passa o token no cabeçalho
          },
        }
      )
      // O URL de pagamento que o usuário irá acessar
      return response.data//response.data.subscriptionUrl;
    } catch (error) {
      console.error("Erro ao criar assinatura:", error);
      throw error;
    }
  }

};
