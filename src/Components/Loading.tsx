import { View, StyleSheet } from 'react-native'
import React from 'react'
import { ActivityIndicator } from 'react-native-paper'
import { theme } from '../Services/ThemeConfig'

export default function Loading() {

  const styles = StyleSheet.create({
    activityIndicator: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center'
    }
  })

  return (
    <View
      style={styles.activityIndicator}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
    </View>
  )
}