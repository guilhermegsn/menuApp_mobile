import { View, StyleSheet } from 'react-native'
import React from 'react'
import { ActivityIndicator } from 'react-native-paper'
import { theme } from '../Services/ThemeConfig'

export default function Loading() {

  const styles = StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
   //   backgroundColor: 'rgba(0, 0, 0, 0.4)', // "fumê" (fundo semitransparente)
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999, // Garante que o loading fique à frente de outros componentes
    },
    activityIndicator: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return (
    <View style={styles.overlay}>
      <View style={styles.activityIndicator}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    </View>
  )
}