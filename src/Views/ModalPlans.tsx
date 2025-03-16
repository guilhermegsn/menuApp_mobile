import { Alert, Dimensions, Image, Linking, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { collection, DocumentData, getDocs } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { Button, DataTable, Dialog, Portal, Text } from 'react-native-paper';
import { formatToCurrencyBR, formatToDoubleBR, handlePixPayment } from '../Services/Functions';
import { UserContext } from '../context/UserContext';
import { createSubscription, createUnsubscribe, generateCardToken } from '../Services/MercadoPago';
import { CardData } from '../Interfaces/CardData_interface';
import PaymentCreditCard from './PaymentCreditCard';

type ModalPlansProps = {
  isOpenModalPlans: boolean;
  setIsOpenModalPlans: React.Dispatch<React.SetStateAction<boolean>>
  isBlocked: boolean;
}

export default function ModalPlans({ isOpenModalPlans, setIsOpenModalPlans, isBlocked }: ModalPlansProps) {

  const { width } = Dimensions.get('window');
  const userContext = useContext(UserContext)
  const [dataPlans, setDataPlans] = useState<DocumentData>([])
  const [selectedPlan, setSelectedPlan] = useState<DocumentData>({} as DocumentData)
  const [isLoading, setIsLoading] = useState(false)
  const [step, setStep] = useState(0) //0- Escolher plano  //1- Inserir dados do cartao
  const [cardData, setCardData] = useState<CardData>({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
    document: "",
  })

  useEffect(() => {
    getDataPlans()
  }, [])

  const getDataPlans = async () => {
    const querySnapshot = await getDocs(collection(db, 'Plans'));
    const data = querySnapshot.docs.map(doc => doc.data());
    const sortedData = data.sort((a, b) => a.price - b.price);

    setDataPlans(sortedData)
    setSelectedPlan(sortedData[1])
  }

  const subscribe = async (email: string, planId: string, cardData: CardData) => {
    const cardToken = await generateCardToken(cardData)
    if (cardToken) {
      console.log('cardToken ->', cardToken)
      setIsLoading(true)
      try {
        // Chama a função para criar a assinatura e obter a URL do Mercado Pago
        const response = await createSubscription(userContext?.estabId, email, planId, cardToken)
        console.log('response', response)
        if (response.status === 'active') {
          userContext?.setExpiredSubscription(false)
          Alert.alert('Wize Menu', `Seu estabelecimento digital!\nSua assinatura foi atualizada!
            \nPor favor, fechar o app e abrir novamente para atuaizar as modificações.`)
        } else {
          Alert.alert('Wize Menu', `Não foi possível processar o seu pagamento.\nPor favor, refaça a operação.`)
        }
      } catch (error: string | any) {
        Alert.alert('Wize Menu', `Não foi possível processar o seu pagamento.\nPor favor, refaça a operação.`)
        console.error('Erro ao tentar assinar:', error);
      } finally {
        setIsLoading(false)
      }
    }
  }

  const unsubscribe = async () => {
    setIsLoading(true)
    try {
      const response = await createUnsubscribe(userContext?.estabId)
      if (response.OK) {
        Alert.alert("Que pena!", "Sua assinatura foi cancelada.\nVocê pode retomar sua assinatura a qualquer momento.\nMantenha seu estabelecimento no digital.")
      }
    } catch (e) {
      Alert.alert("Wise Menu", "Erro ao cancelar assinatura.\nPor favor, entre em contato com o suporte.")
      console.log('erro ao cancelar assinatura', e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    Alert.alert(
      "Confirmar cancelamento",
      "Tem certeza que deseja cancelar sua assinatura?\nNão deixe seu estabalecimento para trás.\nFique conosco!",
      [
        {
          text: "Não",
          onPress: () => console.log("Cancelamento de assinatura abortado."),
          style: "cancel",
        },
        {
          text: "Confirmar cancelamento",
          onPress: () => {
            unsubscribe()
          },
        },
      ],
      { cancelable: false } // Define que o alerta não pode ser fechado tocando fora dele
    );
  };



  return (
    <View>
      <Portal>
        <Dialog visible={isOpenModalPlans} dismissable={false} >
          {/* <Dialog.Icon icon="check-circle" /> */}
          <View style={{ alignItems: 'center' }}>
            <Image
              source={require('../assets/images/icon.png')}
              style={{
                width: '60%',
                aspectRatio: 1,
                height: width * 0.2,
              }}
            />
          </View>
          <Dialog.Title style={{ marginTop: -20, alignSelf: 'center' }}>Assine o Wise Menu</Dialog.Title>
          <Dialog.Content>
            {step === 0 ?
              <>
                {isBlocked &&
                  <Text variant="bodyMedium">Sua período de testes expirou!</Text>
                }
                <Text variant="bodyMedium">Adiquira agora mesmo um de nossos planos.</Text>
                <Text variant="bodyMedium">Mantenha seu estabeleicimento no digital!</Text>
                <Text variant="bodyLarge" style={{ marginTop: 10 }}>Selecione um plano:</Text>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Plano</DataTable.Title>
                    <DataTable.Title numeric>Itens</DataTable.Title>
                    <DataTable.Title numeric>Pedidos</DataTable.Title>
                    <DataTable.Title numeric>Valor</DataTable.Title>
                  </DataTable.Header>
                  {dataPlans.map((plan: DocumentData, index: number) => (
                    <DataTable.Row key={`row-${index}`}
                      onPress={() => setSelectedPlan(plan)}
                      style={{ backgroundColor: plan?.planId === selectedPlan.planId ? 'rgba(128, 0, 128, 0.2)' : 'transparent' }}>
                      <DataTable.Cell style={{minWidth: 20}}>{plan?.name}</DataTable.Cell>
                      <DataTable.Cell numeric>{plan?.itemsMenu === -1 ? '*' : plan?.itemsMenu}</DataTable.Cell>
                      <DataTable.Cell numeric>{plan?.numberOrders === -1 ? '*' : plan?.numberOrders}</DataTable.Cell>
                      <DataTable.Cell numeric>{formatToDoubleBR(plan?.price)}</DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>

                <Text variant="bodyMedium" style={{ marginTop: 10 }}><Text style={{ fontWeight: 'bold' }}>Itens</Text>: Quantidade de itens no cardápio</Text>
                <Text variant="bodyMedium"><Text style={{ fontWeight: 'bold' }}>Pedidos</Text>: Quantidade de pedidos por mês</Text>
                <Text variant="bodyMedium" style={{ marginTop: 10 }}>Valores por mês / mensalidade</Text>
                <Text variant="bodyMedium">Cancele quando quiser.</Text>
                {!isBlocked &&
                  <Button onPress={handleCancel}>Cancelar assinatura</Button>
                }

              </>
              :
              <>
                <Text style={{ alignSelf: 'center', marginTop: -10, marginBottom: 8 }}>
                  Assinando plano {selectedPlan?.name} - {formatToCurrencyBR(selectedPlan.price)} / Mês</Text>
                <PaymentCreditCard cardData={cardData} setCardData={setCardData} />
              </>
            }


          </Dialog.Content>

          <Dialog.Actions>

            {!isBlocked &&
              <Button onPress={() => setIsOpenModalPlans(false)}>Fechar</Button>
            }
            {/* <Button
              loading={isLoading}
              onPress={() => handlePixPayment(userContext?.estabId, selectedPlan, 'test_user_942569659@testuser.com', '12345678909')}>Assinar com PIX</Button>
            */}

            {step === 1 &&
              <Button
                onPress={() => setStep(0)}>Voltar
              </Button>
            }
            <Button
              loading={isLoading}
              onPress={() => {
                if (step === 0) {
                  setStep(1)
                } else {
                  subscribe('test_user_942569659@testuser.com', selectedPlan.planId, cardData)
                }
              }}>{step === 0 ? 'Próximo' : 'Concluir assinatura'}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </View>
  )
}