import { Image, StyleSheet, View } from 'react-native'
import React, { useEffect } from 'react'

export default function SplashScreen() {

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FFFFFF',
      justifyContent: 'center',
      alignItems: 'center',
    },
    image: {
      width: 150,
      height: 150,
      resizeMode: 'contain',
    },
  });

  return (
    <View style={styles.container}>
      <Image source={require('../assets/images/wise.png')} style={styles.image} />
    </View>
  )
}