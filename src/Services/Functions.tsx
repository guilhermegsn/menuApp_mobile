import { useContext } from "react"
import { UserContext } from "../context/UserContext"
import { ImageLibraryOptions, ImagePickerResponse, PhotoQuality, launchImageLibrary } from "react-native-image-picker";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";

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

export const uploadImage = async (image: string | null) => {
  if (image) {
    const storage = getStorage();
    const storageRef = ref(storage, 'images/' + new Date().getTime() + '.jpg');
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