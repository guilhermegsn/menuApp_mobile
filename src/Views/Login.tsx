import { Alert, BackHandler, Dimensions, Keyboard, ScrollView, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Button, Card, Dialog, Icon, Portal, Text, TextInput } from 'react-native-paper'
import { Image, KeyboardAvoidingView } from 'react-native';
import { GoogleSignin, GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { configureGoogleSignin } from '../Services/FirebaseConfig';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { db, auth } from '../Services/FirebaseConfig'
import messaging from '@react-native-firebase/messaging';
import { theme } from '../Services/ThemeConfig';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';

export default function Login() {
  const { width } = Dimensions.get('window');
  const [isWelcome, setIsWelcome] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [tokenFcm, setTokenFcm] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [dataUser, setDataUser] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: '',
  })
  const [emptySelectedCard] = useState({
    title: "",
    subtitle: "",
    description: "",
    icon: "cellphone-text",
    sizeIncon: 55

  })
  const [selectedCard, setSelectedCard] = useState(emptySelectedCard)

  //Programando Botão voltar do smartphone p/ voltar a tela de Boas vindas.
  const handleBackPress = () => {
    if (!isWelcome) {
      setIsWelcome(true)
      return true
    }
    return false
  }

  useEffect(() => {
    BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      BackHandler.removeEventListener('hardwareBackPress', handleBackPress);
    };
  }, [])



  useEffect(() => {
    const registerNotifications = async () => {
      try {
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          console.log('token:', fcmToken)
          setTokenFcm(fcmToken)
        } else {
          console.log('Nâo foi possível obter o token.')
        }
      } catch {
        return null
      }
    }
    registerNotifications()
  }, [])


  useEffect(() => {
    // Configure o GoogleSignin no início
    configureGoogleSignin();
  }, []);

  const signIn = async () => {
    setIsLoading(true)
    try {
      const userCredential = await signInWithEmailAndPassword(auth, dataUser.email, dataUser.password);
      console.log("Usuário autenticado com sucesso!", userCredential.user);
    } catch (error) {
      Alert.alert('Erro durante login:', error?.toString() || "")
    } finally {
      setIsLoading(false)
    }
  }


  const signUp = async () => {
    try {
      // Cria o usuário com email e senha
      const userCredential = await createUserWithEmailAndPassword(auth, dataUser.email, dataUser.password);

      // Atualizando o perfil do usuário
      await updateProfile(userCredential.user, {
        displayName: dataUser.name, // Substitua pelo nome do usuário
      });

      // Pega o UID do usuário recém-criado
      const userId = userCredential.user.uid;

      // Adiciona o documento na coleção "User" com o UID no corpo do documento
      await addDoc(collection(db, 'User'), {
        uid: userId,
        email: dataUser.email,
        name: dataUser.name,
        token: tokenFcm,
        createdAt: serverTimestamp()
      });

      console.log('Conta de usuário criada e UID salvo com sucesso!');
    } catch (error: string | any) {
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert('Esse endereço de email já está em uso!');
      } else if (error.code === 'auth/invalid-email') {
        Alert.alert('Esse endereço de email é inválido!');
      } else {
        Alert.alert('Erro durante o cadastro:', error);
      }
    }
  }




  const signInWithGoogle = async () => {
    setIsLoading(true)
    try {
      await GoogleSignin.signOut();
      const userInfo = await GoogleSignin.signIn();
      console.log('Informações do Usuário:', userInfo); // Adicione um log para verificar a resposta
      const idToken = userInfo?.data?.idToken;
      if (!idToken) {
        throw new Error('ID Token não encontrado');
      }
      // Criar credenciais para o Firebase
      const googleCredential = GoogleAuthProvider.credential(idToken);
      // Autenticar com Firebase
      const userCredential = await signInWithCredential(auth, googleCredential);
      const userId = userCredential.user.uid;
      //\Verifico se Usuário já está cadastrado
      const userQuery = query(collection(db, "User"), where("email", "==", userCredential.user.email))
      const querySnapshot = await getDocs(userQuery)
      if (querySnapshot.empty) {
        // Adiciona o usuário  a collection User
        await addDoc(collection(db, 'User'), {
          uid: userId,
          email: userCredential.user.email,
          name: userCredential.user.displayName,
          token: tokenFcm,
          createdAt: serverTimestamp()
        });
      }
      console.log('Usuário autenticado:', userCredential.user);
    } catch (error) {
      console.error('Erro durante o login com Google:', error);
      Alert.alert('Erro', 'Falha ao fazer login com Google.');
    } finally {
      setIsLoading(false)
    }
  };


  const contentCards = [
    {
      title: "Cardápio Digital",
      subtitle: "Tenha seu cardápio interativo e sempre atualizado.",
      description: "Com o cardápio digital, seus clientes têm acesso a um menu dinâmico e fácil de navegar diretamente pelo celular, garantindo praticidade e agilidade no pedido. Caso o cliente prefira não acessar o QR Code, o garçom também pode realizar o pedido diretamente pelo aplicativo, oferecendo mais flexibilidade e conveniência. Isso proporciona uma experiência de atendimento mais rápida e eficiente, seja para clientes que optam por utilizar o celular ou para aqueles que preferem interagir diretamente com o garçom.",
      icon: "cellphone-text",
      sizeIncon: 55
    },
    {
      title: "Pedidos Automáticos",
      subtitle: "Pedidos diretamente na cozinha, sem erros ou esperas.",
      description: "Com os pedidos automáticos, elimina-se a comunicação manual, garantindo que o pedido chegue diretamente à cozinha, sem filas, sem confusões e com mais eficiência.",
      icon: "printer-pos",
      sizeIncon: 55
    },
    {
      title: "Comandas por QR Code",
      subtitle: "Comandas individuais com escaneamento de QR Code.",
      description: "Os clientes escaneiam o QR Code da comanda, acessam o cardápio e fazem seus pedidos diretamente, sem precisar interagir com garçons, tornando tudo mais rápido e conveniente.",
      icon: "qrcode",
      sizeIncon: 55
    },
    {
      title: "Comandas por NFC",
      subtitle: "Comandas modernas utilizando tecnologia NFC.",
      description: "Com a comanda NFC, o cliente pode simplesmente aproximar seu cartão ou tag para realizar o pedido de forma prática e sem contato, oferecendo uma experiência moderna e sem complicação.",
      icon: "cellphone-nfc",
      sizeIncon: 55
    },
    {
      title: "Comanda em Grupo (Mesa)",
      subtitle: "Uma comanda para todos na mesa, sem confusão.",
      description: "Com um único QR Code escaneado pela mesa inteira, todos os clientes podem fazer pedidos no mesmo lugar, compartilhando a comanda.",
      icon: "qrcode",
      sizeIncon: 55
    },
    {
      title: "Delivery",
      subtitle: "Receba pedidos de qualquer lugar com facilidade.",
      description: "Com um simples QR Code ou link, seus clientes podem realizar pedidos para delivery de qualquer local, sem precisar ligar ou sair de casa, tornando a experiência mais conveniente e acessível.",
      icon: "moped-outline",
      sizeIncon: 55
    }



  ]

  const styles = StyleSheet.create({
    cardImage: {
      width: '50%',
      height: 150,
      borderRadius: 10,
    },
    input: {
      width: '90%',
      marginBottom: '2%',
    },
    footerImage: {
      width: '100%',   // Ajuste o tamanho da imagem conforme necessário
      height: 50,   // Ajuste o tamanho da imagem conforme necessário
      borderBottomRightRadius: 40,
      borderBottomLeftRadius: 40
    },
    header: {
      alignItems: 'center',
      padding: 24,
    },
    logo: {
      width: 120,
      height: 120,
      marginBottom: 16,
      marginTop: -20
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: '#333',
      marginBottom: 8,
      marginTop: -20
    },
    subtitle: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
    },
    benefitsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      padding: 16,
    },
    benefitCard: {
      width: '48%', // 2 colunas
      //  backgroundColor: '#FFF',
      //  borderRadius: 12,
      padding: 10,
      marginBottom: 16,
      alignItems: 'center',
      elevation: 2, // Android shadow
      // shadowColor: '#000', // iOS shadow
      //  shadowOpacity: 0.1,
      //   shadowRadius: 4,
    },
    benefitIcon: {
      width: 48,
      height: 48,
      marginBottom: 8,
    },
    benefitTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: '#2E7D32', // Verde Esmeralda
      marginBottom: 4,
      marginTop: 5,
    },
    benefitText: {
      fontSize: 12,
      color: '#666',
      textAlign: 'center',
    },
    ctaButton: {
      width: '90%',
      backgroundColor: theme.colors.primary,
      padding: 16,
      borderRadius: 8,
      margin: 15,
      alignItems: 'center',
    },
    ctaButtonSignUp: {
      width: '90%',
      backgroundColor: '#229954',
      padding: 16,
      borderRadius: 8,
      margin: 15,
      alignItems: 'center',
    },
    ctaText: {
      color: '#FFF',
      fontWeight: '600',
      fontSize: 16,
    },
    loginText: {
      textAlign: 'center',
      color: '#666',
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: '#EEE',
      padding: 16,
      alignItems: 'center',
    },
    footerLink: {
      color: '#2E7D32',
      fontWeight: '600',
    },
  })



  return (
    <View style={{ flex: 1 }}>
      {isWelcome ?
        <View>
          <ScrollView>
            <View style={styles.header}>
              <Image
                source={require('../assets/images/wise.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.title}>
                Bem-vindo(a) à Wise Menu!
              </Text>
              <Text style={styles.subtitle}>
                Transforme seu estabelecimento em minutos e gerencie tudo pelo celular.
              </Text>
            </View>
            <View style={styles.benefitsContainer}>

              {contentCards.map((card, index) => (
                <Card
                  onPress={() => setSelectedCard(card)}
                  key={`card${index}`}
                  style={styles.benefitCard}>
                  <View style={{ alignItems: 'center' }}>
                    <Icon source={card.icon} size={card.sizeIncon} color={theme.colors.primary} />
                    <Text style={styles.benefitTitle}>{card.title}</Text>
                    <Text style={styles.benefitText}>
                      {card.subtitle}
                    </Text>
                  </View>
                </Card>
              ))}

            </View>
            <View style={{ alignItems: 'center' }}>
              <TouchableOpacity style={styles.ctaButton} onPress={() => setIsWelcome(false)}>
                <Text style={styles.ctaText}>Entre ou Registre-se</Text>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
        :
        <KeyboardAvoidingView
          style={{ flex: 1 }}
        >
          <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Image
                source={require('../assets/images/wise.png')}
                style={styles.logo}
              />
              {isSignUp && (
                <TextInput
                  style={styles.input}
                  mode="outlined"
                  label="Nome Completo"
                  placeholder='Digite o seu nome completo. Ex: João da Silva'
                  value={dataUser.name}
                  onChangeText={(text) => {
                    setDataUser((prevState) => ({
                      ...prevState,
                      name: text
                    }));
                  }}
                />
              )}
              <TextInput
                style={styles.input}
                mode="outlined"
                label="E-mail"
                keyboardType="email-address"
                onChangeText={(text) => {
                  setDataUser((prevState) => ({
                    ...prevState,
                    email: text.toLowerCase()
                  }));
                }}
              />
              <TextInput
                style={styles.input}
                mode="outlined"
                secureTextEntry
                label="Senha"
                onChangeText={(text) => {
                  setDataUser((prevState) => ({
                    ...prevState,
                    password: text
                  }));
                }}
              />
              {isSignUp && (
                <TextInput
                  style={styles.input}
                  mode="outlined"
                  secureTextEntry
                  label="Confirmar senha"
                  onChangeText={(text) => {
                    setDataUser((prevState) => ({
                      ...prevState,
                      confirmPassword: text
                    }));
                  }}
                />
              )}

              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => isSignUp ? signUp() : signIn()}>
                <Text style={styles.ctaText}>  {isSignUp ? 'Inscrever' : 'Login'}</Text>
              </TouchableOpacity>


              <Text style={{ marginTop: 30 }}>
                {isSignUp ? 'Já possui uma conta?' : 'Não tem uma conta?'}
              </Text>
              {/* <Button style={{ marginTop: 20 }} onPress={() => setIsSignUp(!isSignUp)}>
                {!isSignUp ? 'Inscreva-se agora!' : 'Login'}
              </Button> */}

              <TouchableOpacity
                style={styles.ctaButtonSignUp}
                onPress={() => setIsSignUp(!isSignUp)}>
                <Text style={styles.ctaText}>   {!isSignUp ? 'Inscreva-se agora!' : 'Login'}</Text>
              </TouchableOpacity>

              {isLoading && <ActivityIndicator />}

              <Text>Ou conecte-se com sua conta do Google</Text>
              <GoogleSigninButton
                style={{ width: '90%', minHeight: 60, height: 48, marginTop: 10 }}  // Estilize conforme necessário
                size={GoogleSigninButton.Size.Wide}  // Pode ser 'Standard' ou 'Wide'
                color={GoogleSigninButton.Color.Dark}  // Pode ser 'Dark' ou 'Light'
                onPress={signInWithGoogle}
              />

            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      }


      {/* Detalhes card */}
      <Portal>
        <Dialog
          visible={selectedCard !== emptySelectedCard} onDismiss={() => setSelectedCard(emptySelectedCard)}>
          <Dialog.Icon icon={selectedCard.icon} />
          <Dialog.Title>{selectedCard?.title}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{selectedCard.description}</Text>
            <Image
              source={require('../assets/images/wisemenu.png')}
              style={{
                width: '15%',
                aspectRatio: 3,
                height: width * 0.1,
                marginTop: 5,
                marginBottom: 10
              }}
            />
          </Dialog.Content>

          <Dialog.Actions>
            <Button onPress={() => setSelectedCard(emptySelectedCard)}>OK</Button>
          </Dialog.Actions>
        </Dialog>

      </Portal>
    </View>
  )
}