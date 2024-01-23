import { useContext } from "react"
import { UserContext } from "../context/UserContext"

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

export const  generateUUID = () => {
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
    d += performance.now(); // use high-precision timer if available
  }
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (d + Math.random()*16)%16 | 0;
    d = Math.floor(d/16);
    return (c=='x' ? r : (r&0x3|0x8)).toString(16);
  });
  return uuid;
}

export const getHourMinuteSecond = (timestamp: Date) => {
  const date = new Date(timestamp);
  console.log(`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`)
  return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}


export const formatToCurrencyBR = (number: number) => {
  try{
    return number.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }catch{
    return ""
  }
}

export const formatToDoubleBR = (number: number) => {
  try{
    return number.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  }catch{
    return ""
  }
 
}


export const handleNumberInputChange = (text: string): number => {
  const numericValue = text.replace(/[^0-9]/g, '')
  const parsedValue = parseFloat(numericValue)
  return isNaN(parsedValue) ? 0 : parsedValue
}

