import { Alert, Image, StyleSheet, View } from 'react-native'
import React, { useContext, useState } from 'react'
import Svg, { err, Rect, Text as SvgText } from "react-native-svg";
import { Button, TextInput } from 'react-native-paper';
import { theme } from '../Services/ThemeConfig';
import { CardData } from '../Interfaces/CardData_interface';
import { validateCreditCardNumber } from '../Services/Functions';


type PaymentProps = {
  cardData: CardData
  setCardData: React.Dispatch<React.SetStateAction<CardData>>
}



export default function PaymentCreditCard({ cardData, setCardData }: PaymentProps) {

  const [onErrorCredirCard, setIsOnErrorCreditCard] = useState(false)

  const handleChange = (key: keyof CardData, value: string) => {
    setCardData((prev) => ({ ...prev, [key]: value.toUpperCase() }));
  };

  const getCardBrand = (cardNumber: string) => {
    const visaRegex = /^4/;
    const mastercardRegex = /^5[1-5]/;
    const amexRegex = /^3[47]/;
    const eloRegex = /^(636368|438935|504175|451416|509048|509067|509049|509069|509050|509074|509068|509040|509045|509051|509046|509066|509047|509042|509052|509043|509064|509040|36297|5067|4576|4011)/;
    const hipercardRegex = /^(606282|3841)/;

    if (visaRegex.test(cardNumber)) return require("../assets/images/visa.png");
    if (mastercardRegex.test(cardNumber)) return require("../assets/images/master.png");
    if (amexRegex.test(cardNumber)) return require("../assets/images/amex.png");
    if (eloRegex.test(cardNumber)) return require("../assets/images/elo.png");
    if (hipercardRegex.test(cardNumber)) return require("../assets/images/hipercard.png");
    return null; // Retorna nulo se não reconhecer a bandeira
  }

  const cardBrandImage = getCardBrand(cardData.number)

  const handleCardNumberChange = (text: string) => {
    // Remove qualquer caractere que não seja número
    let cleaned = text.replace(/\D/g, "")
    // Limita a 16 dígitos (tamanho máximo de um cartão)
    cleaned = cleaned.slice(0, 16)
    // Adiciona espaços a cada 4 dígitos
    const formatted = cleaned.replace(/(\d{4})/g, "$1 ").trim()
    setCardData((prev) => ({ ...prev, number: formatted }))
  }

  const handleExpiryChange = (text: string) => {
    // Remove qualquer caractere que não seja número
    let cleaned = text.replace(/\D/g, "")
    // Limita a 4 dígitos (MMYY)
    cleaned = cleaned.slice(0, 4)
    // Adiciona a barra automaticamente após os 2 primeiros dígitos
    if (cleaned.length >= 3) {
      cleaned = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`
    }
    // Atualiza o estado
    setCardData((prev) => ({ ...prev, expiry: cleaned }))
  }

  return (
    <View style={styles.container}>
      {/* Cartão desenhado */}
      
      <Svg width={320} height={180} style={styles.card}>
      <Image source={require("../assets/images/wisemenu_white.png")} style={styles.wiseCard} />
        <Rect x={0} y={0} width={320} height={180} rx={10} fill={theme.colors.primary} />
        <SvgText x={20} y={105} fill="white" fontSize={18}>
          {cardData.number || "0000 0000 0000 0000"}
        </SvgText>
        <SvgText x={20} y={140} fill="white" fontSize={14}>
          {cardData.name || "NOME DO TITULAR"}
        </SvgText>
        <SvgText x={20} y={160} fill="white" fontSize={14}>
          {cardData.expiry || "MM/AA"}
        </SvgText>
        <SvgText x={250} y={105} fill="white" fontSize={14}>
          {cardData.cvv ? "***" : "CVV"}
        </SvgText>
        {cardBrandImage && (
          <Image source={cardBrandImage} style={styles.cardBrandLogoOnCard} />
        )}


      </Svg>


      {/* Campos de entrada */}
      <View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.cardNumberInput]}
            placeholder="Número do Cartão"
            keyboardType="numeric"
            value={cardData.number}
            error={onErrorCredirCard}
            underlineColor={(!onErrorCredirCard && cardData.number.replaceAll(" ", "").length === 16) ? 'green' : ""}
            onChangeText={handleCardNumberChange}
            onBlur={() => {
              if (!validateCreditCardNumber(cardData.number)) {
                setIsOnErrorCreditCard(true)
              } else {
                setIsOnErrorCreditCard(false)
              }
            }}
          />
        </View>

        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="Nome no Cartão"
            value={cardData.name}
            onChangeText={(text) => handleChange("name", text)}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="MM/YY"
            value={cardData.expiry}
            onChangeText={handleExpiryChange}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="CVV"
            keyboardType="numeric"
            secureTextEntry
            value={cardData.cvv}
            maxLength={4}
            onChangeText={(text) => handleChange("cvv", text)}
          />
        </View>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            placeholder="CPF/CNPJ"
            keyboardType="numeric"
            value={cardData.document}
            onChangeText={(text) => handleChange("document", text)}
          />
        </View>
      </View>
    </View>
  )
} 






const styles = StyleSheet.create({
  container: { padding: 5, alignItems: "center" },
  card: { marginBottom: 20 },
  input: {
    width: "100%",
    height: 50,
    borderWidth: 1,
    borderColor: "#aaa",
    paddingHorizontal: 10,
    fontSize: 16,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  row: { flexDirection: "row" },
  smallInput: { width: "48%" },
  halfInput: {
    width: "50%",
  },
  cardBrandLogo: {
    width: 40,
    height: 25,
    marginLeft: 10,
    resizeMode: "contain",
  },
  cardInputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardNumberInput: {
    flex: 1,
  },
  cardBrandLogoOnCard: {
    position: "absolute",
    right: 15,
    bottom: -50,
    width: 50,
    height: 30,
    resizeMode: "contain",
  },
  wiseCard: {
    position: "absolute",
    left: 10,
    bottom: -110,
    width: 150,
    height: 130,
    resizeMode: "contain",
  },
});
