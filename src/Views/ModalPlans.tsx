import { Alert, Dimensions, Image, Linking, View } from 'react-native'
import React, { useContext, useEffect, useState } from 'react'
import { collection, DocumentData, getDocs } from 'firebase/firestore';
import { db } from '../Services/FirebaseConfig';
import { Button, DataTable, Dialog, Portal, Text } from 'react-native-paper';
import { createSubscription, formatToDoubleBR } from '../Services/Functions';
import { UserContext } from '../context/UserContext';

type ModalPlansProps = {
  isOpenModalPlans: boolean;
  setIsOpenModalPlans: React.Dispatch<React.SetStateAction<boolean>>
  isBlocked: boolean;
}

export default function ModalPlans({ isOpenModalPlans, setIsOpenModalPlans, isBlocked }: ModalPlansProps) {

  const { width } = Dimensions.get('window');
  const userContext = useContext(UserContext)
  const [dataPlans, setDataPlans] = useState<DocumentData>([])
  const [selectedPlan, setSelectedPlan] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    getDataPlans()
  }, [])

  const getDataPlans = async () => {
    const querySnapshot = await getDocs(collection(db, 'Plans'));
    const data = querySnapshot.docs.map(doc => doc.data());
    const sortedData = data.sort((a, b) => a.price - b.price);
    setDataPlans(sortedData)
    setSelectedPlan(sortedData[1].planId)
  }


  const subscribe = async (email: string, planId: string) => {
    setIsLoading(true)
    try {
      // Chama a função para criar a assinatura e obter a URL do Mercado Pago
      const response = await createSubscription(userContext?.estabId, email, planId)
      // Verifica se a resposta tem o campo subscriptionUrl
      if (response && response.subscriptionUrl) {
        const subscriptionUrl = response.subscriptionUrl; // URL de redirecionamento para o Mercado Pago
        Linking.openURL(subscriptionUrl);  // Redireciona o usuário para a página do Mercado Pago
      } else {
        console.error('Erro: URL de assinatura não encontrada.');
      }
    } catch (error: string | any) {
      if (error.response && error.response.status === 409) {
        Alert.alert("Wize Menu", "Sua assinatura está com o status Ativo.")
      }
      console.error('Erro ao tentar assinar:', error);
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View>

      <Portal>
        <Dialog visible={isOpenModalPlans} dismissable={false} >
          {/* <Dialog.Icon icon="check-circle" /> */}
          <View style={{alignItems: 'center'}}>
            <Image
              source={require('../assets/images/icon.png')}
              style={{
                width: '60%',
                aspectRatio: 1,
                height: width * 0.2,
              }}
            />
          </View>
          <Dialog.Title style={{marginTop: -10}}>Assine o Wise Menu</Dialog.Title>
          <Dialog.Content>
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
                  onPress={() => setSelectedPlan(plan?.planId)}
                  style={{ backgroundColor: plan?.planId === selectedPlan ? 'rgba(128, 0, 128, 0.2)' : 'transparent' }}>
                  <DataTable.Cell>{plan?.name}</DataTable.Cell>
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
          </Dialog.Content>

          <Dialog.Actions>

            {!isBlocked &&
              <Button onPress={() => setIsOpenModalPlans(false)}>Fechar</Button>
            }

            <Button
              loading={isLoading}
              onPress={() => subscribe('test_user_942569659@testuser.com', selectedPlan)}>Assinar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

    </View>
  )
}