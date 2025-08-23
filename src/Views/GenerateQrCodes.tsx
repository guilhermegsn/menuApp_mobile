import { StyleSheet, View } from 'react-native'
import React, { useContext, useState } from 'react'
import { Button, Card, Icon, Modal, Portal, RadioButton, Text, TextInput, Title } from 'react-native-paper'
import { theme } from '../Services/ThemeConfig';
import { openUrl } from '../Services/Functions';
import { base_url } from '../Services/config';
import { UserContext } from '../context/UserContext';

export default function GenerateQrCodes() {

  const [type, setType] = useState<'single' | 'range'>('single')
  const [typePrint, setTypePrint] = useState<'print' | 'browser'>('browser')
  const [singleTable, setSingleTable] = useState('')
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [isOpenModal, setIsOpenModal] = useState(false)
  const [isOpenPrintModal, setIsOpenPrintModal] = useState(false)
  const userContext = useContext(UserContext)

  return (
    <View style={styles.container}>
      <Title style={styles.title}>Escolha o tipo de QR Code</Title>

      <Card
        style={[styles.card, { borderColor: theme.colors.primary }]}
        onPress={() => openUrl(`${base_url}${userContext?.estabId}/qrcode/3/${userContext?.estabName}`)}
      >
        <Card.Content style={styles.cardContent}>
          <Icon source="moped-outline" size={48} />
          <Title>Delivery</Title>
          <Text variant="bodyMedium" style={{ color: 'gray' }}>
            Gere um QR Code para divulgar seu cardápio online. Clientes poderão acessá-lo de qualquer lugar,
            fazer pedidos para entrega ou retirada, visualizar preços e opções em tempo real e fazer o pagamento diretamente no celular.
          </Text>
        </Card.Content>
      </Card>

      {/* <Card
        style={[styles.card, { borderColor: theme.colors.primary }]}
        onPress={() => setIsOpenModal(true)}
      >
        <Card.Content style={styles.cardContent}>
          <Icon source="silverware-fork-knife" size={48} />
          <Title>Mesas</Title>
          <Text variant="bodyMedium" style={{color: 'gray'}}>
          {`Gere um QR Code exclusivo para ser colocado nas mesas do seu estabelecimento.\nOs clientes escaneiam, acessam o cardápio e fazem o pedido diretamente pelo celular, sem precisar de garçom.`}
          </Text>
        </Card.Content>
      </Card> */}

      <Card
        style={[styles.card, { borderColor: theme.colors.primary }]}
        onPress={() => setIsOpenPrintModal(true)}
      >
        <Card.Content style={styles.cardContent}>
          <Icon source="camera-front" size={48} />
          <Title>Autoatendimento</Title>
          <Text variant="bodyMedium" style={{ color: 'gray' }}>
            {`Gere um QR Code para autoatendimento no balcão ou em um totem. \nO cliente faz o pedido direto no celular, realiza o pagamento e aguarda ser chamado quando estiver pronto.`}

          </Text>
        </Card.Content>
      </Card>

      <Portal>
        <Modal visible={isOpenModal} onDismiss={() => setIsOpenModal(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.title}>Imprimir QR Code para Mesas</Text>

          <RadioButton.Group onValueChange={value => setType(value as 'single' | 'range')} value={type}>
            <View style={styles.option}>
              <RadioButton value="single" />
              <Text onPress={() => setType('single')} style={styles.optionLabel}>
                Uma mesa específica
              </Text>
            </View>

            {type === 'single' && (
              <TextInput
                label="Número da mesa"
                value={singleTable}
                onChangeText={setSingleTable}
                keyboardType="number-pad"
                style={styles.input}
              />
            )}

            <View style={styles.option}>
              <RadioButton value="range" />
              <Text onPress={() => setType('range')} style={styles.optionLabel}>
                Múltiplas mesas (ex: 1 até 10)
              </Text>
            </View>

            {type === 'range' && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  label="De"
                  value={rangeStart}
                  onChangeText={setRangeStart}
                  keyboardType="number-pad"
                  style={[styles.input, { flex: 1 }]}
                />
                <TextInput
                  label="Até"
                  value={rangeEnd}
                  onChangeText={setRangeEnd}
                  keyboardType="number-pad"
                  style={[styles.input, { flex: 1 }]}
                />
              </View>
            )}
          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={() => null}
            style={{ marginTop: 24 }}
            disabled={
              (type === 'single' && !singleTable) ||
              (type === 'range' && (!rangeStart || !rangeEnd))
            }
          >
            Confirmar
          </Button>

          <Button onPress={() => setIsOpenModal(false)} style={{ marginTop: 8 }}>
            Cancelar
          </Button>
        </Modal>
      </Portal>




      <Portal>
        <Modal visible={isOpenPrintModal} onDismiss={() => setIsOpenModal(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.title}>Imprimir QR Code para Mesas</Text>

          <RadioButton.Group onValueChange={value => setTypePrint(value as 'print' | 'browser')} value={typePrint}>
            <View style={styles.option}>
              <RadioButton value="print" />
              <Text onPress={() => setTypePrint('print')} style={styles.optionLabel}>
                Imprimir na impressora térmica
              </Text>
            </View>
            <View style={styles.option}>
              <RadioButton value="browser" />
              <Text onPress={() => setTypePrint('browser')} style={styles.optionLabel}>
                Abrir no navegador
              </Text>
            </View>

           
            
          </RadioButton.Group>

          <Button
            mode="contained"
            onPress={() => {
              if(typePrint === 'print'){

              }else{
                openUrl(`${base_url}${userContext?.estabId}/qrcode/5/${userContext?.estabName}`)
              }
            }}
            style={{ marginTop: 24 }}
          >
            Confirmar
          </Button>

          <Button onPress={() => setIsOpenPrintModal(false)} style={{ marginTop: 8 }}>
            Cancelar
          </Button>
        </Modal>
      </Portal>
    </View>




  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  card: {
    marginBottom: 16,
    borderWidth: 1.5,
    borderRadius: 16,
    elevation: 4,
  },
  cardContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  modal: {
    backgroundColor: 'white',
    margin: 24,
    padding: 24,
    borderRadius: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  optionLabel: {
    fontSize: 16,
  },
  input: {
    marginTop: 12,
  },
});
