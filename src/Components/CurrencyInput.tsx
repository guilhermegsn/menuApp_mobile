import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { TextInput } from 'react-native-paper';

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  label: string
}

export default function CurrencyInput({ value, onChange, label }: CurrencyInputProps) {

  const [amount, setAmount] = useState<number>(value)

  useEffect(() => {
    setAmount(value)
  }, [value])

  const handleInputChange = (text: string) => {
    // Remove caracteres não numéricos
    const numericValue = parseFloat(text.replace(/[^0-9]/g, ''))

    // Verifica se o valor é um número válido
    if (!isNaN(numericValue)) {
      // Divide por 100 para obter o valor em reais
      const newValue = numericValue / 100
      setAmount(newValue)
      onChange(newValue)
    }
  };

  return (
    <View>
      <TextInput
        label={label}
        value={amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        onChangeText={handleInputChange}
        keyboardType="numeric"
        mode="outlined"
        style={{ margin: 10 }}
      />
    </View>
  )
}
