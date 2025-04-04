import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface StorageContextType {
  hasPrinter: boolean
  setHasPrinter: (value: boolean) => Promise<void>
  autoPrint: boolean
  setAutoPrint: (value: boolean) => Promise<void>
  hasOnlinePayment: boolean
  setHasOnlinePayment: (value: boolean) => Promise<void>
}

const StorageContext = createContext<StorageContextType | undefined>(undefined)

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasPrinter, setHasPrinterState] = useState<boolean>(false)
  const [autoPrint, setAutoPrintState] = useState<boolean>(false)
  const [hasOnlinePayment, setHasOnlinePaymentSate] = useState<boolean>(false)

  useEffect(() => {
    const loadSettings = async () => {
      const storedHasPrinter = await AsyncStorage.getItem('hasPrinter')
      const storedAutoPrint = await AsyncStorage.getItem('autoPrint')
      const storedOnlinePayment = await AsyncStorage.getItem('onlinePayment')

      if (storedHasPrinter !== null) setHasPrinterState(storedHasPrinter === 'true')
      if (storedAutoPrint !== null) setAutoPrintState(storedAutoPrint === 'true')
      if (storedOnlinePayment !== null) setHasOnlinePaymentSate(storedOnlinePayment === 'true')
    }

    loadSettings()
  }, [])

  const setHasPrinter = async (value: boolean) => {
    await AsyncStorage.setItem('hasPrinter', value.toString())
    setHasPrinterState(value)
  }

  const setAutoPrint = async (value: boolean) => {
    await AsyncStorage.setItem('autoPrint', value.toString())
    setAutoPrintState(value)
  }

  const setHasOnlinePayment = async (value: boolean) => {
    await AsyncStorage.setItem('onlinePayment', value.toString())
    setHasOnlinePaymentSate(value)
  }

  return (
    <StorageContext.Provider value={{ hasPrinter, setHasPrinter, autoPrint, setAutoPrint, hasOnlinePayment, setHasOnlinePayment }}>
      {children}
    </StorageContext.Provider>
  )
}

export const useStorage = () => {
  const context = useContext(StorageContext)
  if (!context) {
    throw new Error('useStorage deve ser usado dentro de um StorageProvider')
  }
  return context
}
