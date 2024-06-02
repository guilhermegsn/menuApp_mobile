import { View, Text } from 'react-native'
import React from 'react'
import { Dialog, Icon, Portal } from 'react-native-paper'

interface NfcReaderProps {
  isOpenNFC: boolean
  setIsOpenNFC: React.Dispatch<React.SetStateAction<boolean>>
  cancelTechnologyRequest: () => void
}


export const NfcReader: React.FC<NfcReaderProps> = ({ isOpenNFC, setIsOpenNFC, cancelTechnologyRequest }) => {

  const handleDismiss = () => {
    setIsOpenNFC(false);
    cancelTechnologyRequest();
  };

  return (
    <View>
      <Portal>
        <Dialog visible={isOpenNFC} onDismiss={() => handleDismiss()}>
          <Dialog.Title style={{ textAlign: 'center' }}>Aproxime o cartão</Dialog.Title>
          <View style={{ alignItems: "flex-end", marginTop: 15, marginEnd: 20, marginBottom: 30 }}>
            <Icon
              source="contactless-payment"
              size={80}
            />
          </View>
        </Dialog>
      </Portal>
    </View>
  )
}