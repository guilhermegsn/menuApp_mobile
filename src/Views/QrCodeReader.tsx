import { View, Text, Alert } from 'react-native'
import React, { useState } from 'react'
import QRCodeScanner from 'react-native-qrcode-scanner'
import { RNCamera } from 'react-native-camera'
import { useNavigation } from '@react-navigation/native';
import { IconButton } from 'react-native-paper';


export default function QrCodeReader() {

  const [flash, setFlash] = useState(false)

  const navigation = useNavigation();

  const redData = (data: string) => {
    if (data) {
      console.log('comanda: ' + data)
      navigation.goBack()
      navigation.navigate('ShoppingCart', { newData: data });
    }
  }

  return (
    <View>
      <QRCodeScanner
        onRead={({ data }) => redData(data)}
        flashMode={flash ? RNCamera.Constants.FlashMode.torch : null}
      />
      <View style={{alignItems: 'flex-end'}}>
        <IconButton
          icon={ flash ? "flash" : "flash-off"}
          size={25}
          mode='outlined'
          style={{ marginTop: 15, marginRight: 15 }}
          onPress={() => setFlash(!flash)}
        />
      </View>
    </View>
  )
}