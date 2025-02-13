import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, TouchableOpacity, View } from 'react-native';
import { RNCamera } from 'react-native-camera';
import { Text } from 'react-native-paper';
import { theme } from '../Services/ThemeConfig';

interface RouteParams {
  backPage: string
}

const QRCodeScanner = () => {

  const route = useRoute()
  const { backPage } = route.params as RouteParams || {}
  const navigation = useNavigation()
  const [flash, setFlash] = useState(RNCamera.Constants.FlashMode.off);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.3, // Reduz opacidade
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1, // Aumenta opacidade
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const toggleFlash = () => {
    setFlash((prevFlash: any) =>
      prevFlash === RNCamera.Constants.FlashMode.off
        ? RNCamera.Constants.FlashMode.torch
        : RNCamera.Constants.FlashMode.off
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1 },
    camera: { flex: 1, justifyContent: "center", alignItems: "center" },

    // 🔦 Estilo do botão do flash
    flashButton: {
      position: "absolute",
      top: 40,
      right: 20,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      padding: 10,
      borderRadius: 10,
    },
    flashText: { color: "#fff", fontSize: 16 },

    // 🎯 Quadrado central para guiar a leitura do QR Code
    focusBox: {
      position: "absolute",
      width: 200,
      height: 200,
      borderWidth: 4,
      borderColor: theme.colors.primary,
      borderRadius: 10,
    },
  });



  const onBarCodeRead = (e: { data: any; }) => {
    console.log('QR Code detected: ', e.data);
    if (e.data) {
      if (backPage) {
        navigation.goBack()
        navigation.navigate(backPage, { qrCodeData: e.data });
      } else {
        console.log('backPage: ' + backPage)
      }
    }
  };

  return (
    <View style={styles.container}>
      <RNCamera
        style={styles.camera}
        flashMode={flash}
        onBarCodeRead={onBarCodeRead}
        captureAudio={false}
      >
        {/* Botão do Flash */}
        <TouchableOpacity style={styles.flashButton} onPress={toggleFlash}>
          <Text style={styles.flashText}>
            {flash === RNCamera.Constants.FlashMode.off ? "🔦 ON" : "🔦 OFF"}
          </Text>
        </TouchableOpacity>

        {/* Quadrado para centralizar */}
        <Animated.View style={[styles.focusBox, { opacity: fadeAnim }]} />
      </RNCamera>
    </View>
  );
};

export default QRCodeScanner;
