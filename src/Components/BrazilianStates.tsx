import { View, Text } from 'react-native'
import React, { useState } from 'react'
import { Button, Menu, TextInput } from 'react-native-paper';


export default function BrazilianStates() {

  const brazilianStates = [
    { label: 'Acre', value: 'AC' },
    { label: 'Alagoas', value: 'AL' },
    { label: 'Amapá', value: 'AP' },
    { label: 'Amazonas', value: 'AM' },
    { label: 'Bahia', value: 'BA' },
    { label: 'Ceará', value: 'CE' },
    { label: 'Distrito Federal', value: 'DF' },
    { label: 'Espírito Santo', value: 'ES' },
    { label: 'Goiás', value: 'GO' },
    { label: 'Maranhão', value: 'MA' },
    { label: 'Mato Grosso', value: 'MT' },
    { label: 'Mato Grosso do Sul', value: 'MS' },
    { label: 'Minas Gerais', value: 'MG' },
    { label: 'Pará', value: 'PA' },
    { label: 'Paraíba', value: 'PB' },
    { label: 'Paraná', value: 'PR' },
    { label: 'Pernambuco', value: 'PE' },
    { label: 'Piauí', value: 'PI' },
    { label: 'Rio de Janeiro', value: 'RJ' },
    { label: 'Rio Grande do Norte', value: 'RN' },
    { label: 'Rio Grande do Sul', value: 'RS' },
    { label: 'Rondônia', value: 'RO' },
    { label: 'Roraima', value: 'RR' },
    { label: 'Santa Catarina', value: 'SC' },
    { label: 'São Paulo', value: 'SP' },
    { label: 'Sergipe', value: 'SE' },
    { label: 'Tocantins', value: 'TO' },
  ];


  const [selectedState, setSelectedState] = useState('');
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const showMenu = () => setMenuVisible(true);
  const hideMenu = () => setMenuVisible(false);

  const filteredStates = brazilianStates.filter((state) =>
    state.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

    return (
      <View>
      <TextInput
        label="Pesquise um estado"
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          showMenu();
        }}
      />
      <Menu
        visible={isMenuVisible}
        onDismiss={hideMenu}
        anchor={
          <Button onPress={showMenu}>{""}</Button>
        }
        
      >
         {filteredStates.map((state) => (
          <Menu.Item
            key={state.value}
            onPress={() => {
              setSelectedState(state.value);
              setSearchQuery(state.label); // Define o texto do TextInput como a seleção
              hideMenu();
            }}
            title={state.label}
          />
        ))}
      </Menu>
    </View>
    )
}