import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Appbar, Button, Drawer } from 'react-native-paper';
import Icon from 'react-native-paper';

const MenuDrawer = () => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  return (
    <View>
      <StatusBar
      backgroundColor="blue" 
      barStyle="light-content"
    />
      <Appbar.Header  style={styles.appbarHeader}>
        <Appbar.Action icon="menu" onPress={toggleDrawer} />
        <Appbar.Content title="smartMenu" />
      </Appbar.Header>

    {isDrawerOpen &&
      <Drawer.Section title="Menu" style={styles.drawer}>
        <Drawer.Item
          icon="wall-sconce-outline"
          
          label="Página 1"
          onPress={() => {}}
        />
        <Drawer.Item
        icon="violin"
          label="Página 2"
          onPress={() => {}}
        />
        <Drawer.Item
          label="Página 3"
          onPress={() => {}}
        />
      </Drawer.Section>}
      <Button icon="camera">
        Press
      </Button>
      
      <Text style={styles.content}>Conteúdo do Aplicativo</Text>
    
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  appbarHeader: {
    backgroundColor: 'blue'
  },
  drawer: {
    backgroundColor: "grey",
    height: "100%",
    width: "60%"
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default MenuDrawer;
