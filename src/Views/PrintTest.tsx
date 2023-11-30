import { View, Text } from 'react-native'
import React, { useState } from 'react'
import ThermalPrinterModule from 'react-native-thermal-printer'

import { Button, TextInput } from 'react-native-paper';

export default function PrintTest() {
  const print = async () => {
    const text =
    // '[L]<img>https://scontent.fbau1-1.fna.fbcdn.net/v/t1.6435-9/53470201_2217235155003003_3701512912884465664_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=be3454&_nc_eui2=AeFjhUh3sveYrHrnqCt8_uM4kd4p8NpO35mR3inw2k7fmaeZoyIQPSo9Rwx4xE41WgILIu5xEip0OysrgJvY8PtY&_nc_ohc=NgTX3TWlg6gAX9eSS_m&_nc_oc=AQkxj_q-_RYM4KsLPuzgflLXoAvR8sXPVik9rMP7ZbbjlecUSJDCKS1EZRP3nigdas4&_nc_ht=scontent.fbau1-1.fna&oh=00_AfD4M3NhOwerMXjAOnepunQOauwfWLN06ExneckXlwON5A&oe=656A8506</img>\n' +
      `[L]\n` +
      "[C]<u><font size='big'>Pedido N. 1587</font></u>\n" +
      `[L]\n` +
      `[C]================================\n` +
      // `[L]  + Size : S\n` +
      // `[L]<b>12 CERVEJA EISENBAHN 600ML</b>[R]12.99\n` +
      `[L]<b>Qtd. [R]Descricao</b>\n` +
      `[L]<b>12 x CERVEJA EISENBAHN 600ML</b>\n` +
      `[L]<b>1 x PORCAO TILAPIA </b>\n` +
      // `[L]  + Size : 57/58\n` +
      // `[C]--------------------------------\n` +
      // `[R]TOTAL:[R]4354.95e\n` +
      // `[R]TAXA:[R]435.45\n` +
      // "[L]<font size='tall'>TOTAL: [R]4790.45\n </font>\n" +
      `[C]================================\n` +
      "[L]<font size='tall'>Cliente :</font>\n" +
      `[L]Guilherme Nunes\n` +
      `[L]MESA: 10\n` +
      `[L]Tel : +5518981257015\n`
      // `[L]Tel : www.wisecarte.com\n` +
      // `[L]Tel : Seu estabelecimento mais inteligente.\n`
      // "[C]<barcode type='ean13' height='10'>0000045</barcode>\n" +
      // `[L]<qrcode size='25'>${encodedWiFiData}</qrcode>\n` +
    await ThermalPrinterModule.printBluetooth({
      payload: text,
      printerNbrCharactersPerLine: 30
    });

  // const print = async () => {
  //   const text =
  //   // '[L]<img>https://scontent.fbau1-1.fna.fbcdn.net/v/t1.6435-9/53470201_2217235155003003_3701512912884465664_n.jpg?_nc_cat=102&ccb=1-7&_nc_sid=be3454&_nc_eui2=AeFjhUh3sveYrHrnqCt8_uM4kd4p8NpO35mR3inw2k7fmaeZoyIQPSo9Rwx4xE41WgILIu5xEip0OysrgJvY8PtY&_nc_ohc=NgTX3TWlg6gAX9eSS_m&_nc_oc=AQkxj_q-_RYM4KsLPuzgflLXoAvR8sXPVik9rMP7ZbbjlecUSJDCKS1EZRP3nigdas4&_nc_ht=scontent.fbau1-1.fna&oh=00_AfD4M3NhOwerMXjAOnepunQOauwfWLN06ExneckXlwON5A&oe=656A8506</img>\n' +
  //     `[L]\n` +
  //     "[C]<u><font size='big'>Remedios Vivi</font></u>\n" +
  //     `[L]\n` +
  //     `[C]================================\n` +
  //     // `[L]  + Size : S\n` +
  //     // `[L]<b>12 CERVEJA EISENBAHN 600ML</b>[R]12.99\n` +
  //     `[L]<b>DOMINGO 24/12\n` +
  //     `[L]\n` +
  //     `[L]Citoneurim   7:30: _____________\n` +
  //     `[L]Omega 3      7:30: _____________\n` +
  //     `[L]Pregabalina  7:30: _____________\n` +
  //     `[C]        --------------          \n` +
  //     `[L]Omega 3     19:30: _____________\n` +
  //     `[C]================================\n` +
  //     `[L]<b>SEGUNDA 25/12\n` +
  //     `[L]\n` +
  //     `[L]Citoneurim   7:30: _____________\n` +
  //     `[L]Omega 3      7:30: _____________\n` +
  //     `[L]Pregabalina  7:30: _____________\n` +
  //     `[C]        --------------          \n` +
  //     `[L]Omega 3     19:30: _____________\n` +
  //     `[C]================================\n` +
  //     `[L]<b>TERCA 26/12\n` +
  //     `[L]\n` +
  //     `[L]Citoneurim   7:30: _____________\n` +
  //     `[L]Omega 3      7:30: _____________\n` +
  //     `[L]Pregabalina  7:30: _____________\n` +
  //     `[C]        --------------          \n` +
  //     `[L]Omega 3     19:30: _____________\n` +
  //     `[C]================================\n` +
  //     `[L]<b>QUARTA 27/12\n` +
  //     `[L]\n` +
  //     `[L]Citoneurim   7:30: _____________\n` +
  //     `[L]Omega 3      7:30: _____________\n` +
  //     `[L]Pregabalina  7:30: _____________\n` +
  //     `[C]        --------------          \n` +
  //     `[L]Omega 3     19:30: _____________\n` +
  //     `[C]================================\n` +
  //     `[L]<b>QUINTA 28/12\n` +
  //     `[L]\n` +
  //     `[L]Citoneurim   7:30: _____________\n` +
  //     `[L]Omega 3      7:30: _____________\n` +
  //     `[L]Pregabalina  7:30: _____________\n` +
  //     `[C]        --------------          \n` +
  //     `[L]Omega 3     19:30: _____________\n` +
  //     `[C]================================\n` +
  //     `[L]<b>SEXTA 29/12\n` +
  //     `[L]\n` +
  //     `[L]Citoneurim   7:30: _____________\n` +
  //     `[L]Omega 3      7:30: _____________\n` +
  //     `[L]Pregabalina  7:30: _____________\n` +
  //     `[C]        --------------          \n` +
  //     `[L]Omega 3     19:30: _____________\n` +
  //     `[C]================================\n` +
  //     `[L]<b>SABADO 30/12\n` +
  //     `[L]\n` +
  //     `[L]Citoneurim   7:30: _____________\n` +
  //     `[L]Omega 3      7:30: _____________\n` +
  //     `[L]Pregabalina  7:30: _____________\n` +
  //     `[C]        --------------          \n` +

  //     `[L]Omega 3     19:30: _____________\n` +
  //     `[C]================================\n` 
  //   await ThermalPrinterModule.printBluetooth({
  //     payload: text,
  //     printerNbrCharactersPerLine: 30
  //   }).catch((e) => 
  //     console.log('falha na impressao.\n'+e)
  //   );
 }





  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: "-30%" }}>
      <Text style={{ fontSize: 20, marginBottom: "10%" }}>Orders</Text>
      <Button onPress={() => [print()]}>Imprimir</Button>
      <TextInput
        style={{ width: "90%", marginBottom: "2%" }}
        mode="outlined"
        label="E-mail"
       
      />
    </View>
  )
}