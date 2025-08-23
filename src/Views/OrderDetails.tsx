import { ScrollView, View } from 'react-native'
import React, { useContext } from 'react'
import { Button, DataTable, Divider, IconButton, Text } from 'react-native-paper'
import { formatToCurrencyBR, formatToDoubleBR } from '../Services/Functions'
import { useRoute } from '@react-navigation/native'
import moment from 'moment'
import { theme } from '../Services/ThemeConfig'
import { UserContext } from '../context/UserContext'
import ThermalPrinterModule from 'react-native-thermal-printer'

export default function OrderDetails() {

  const userContext = useContext(UserContext);
  const route = useRoute()
  const { data } = route.params as { data: { [key: string]: any } }

  const print = async () => {
    let total = 0
    const headerText =
      `[C]<u><font size='tall'>${userContext?.estabName}</font></u>\n` +
      `[L]\n` +
      `[L] *** Conferencia de Consumo ***\n` +
      `[L] ***  Documento nao fiscal  ***\n\n` +
      // `[L]<font size='small'>Cliente: ${local}</font>\n` +
      `[L]Data impressao: ${moment().format('DD/MM/YYYY HH:mm')}\n` +
      `[L]Cliente: ${data?.name}\n` +
      `[C]================================\n` +
      `[L]<b>${("#").padEnd(3)}${("PRODUTO").padEnd(11)}${("QT.").padEnd(2)}${("VL.UN.").padStart(8)}${("TOTAL").padStart(7)}</b>\n` +
      `[C]--------------------------------\n`
    const itemText = data?.items
      .map((item: any, index: number) => {
        total = total + (item.qty * item.price)
        const itemNumber = (index + 1).toString().padEnd(3);
        const itemName = item.name.slice(0, 11).padEnd(12);
        const itemQty = item.qty.toString().padStart(2);
        const itemPrice = formatToDoubleBR(item.price).toString().replaceAll(".", "").padStart(7, " ");
        const itemTotal = formatToDoubleBR(item.qty * item.price).replaceAll(".", "").toString().padStart(8, " ");
        return `[L]<font size='smallest'>${itemNumber}${itemName}${itemQty}${(itemPrice)}${itemTotal}</font>\n`;
      })
      .join('').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase()

    const footerText =
      `[C]================================\n` +
      `[R]<b>Total da conta: R$ ${formatToDoubleBR(data?.totalOrder || 0)}</b>\n` +
      `[R]Desconto -R$ ${formatToDoubleBR(0)}\n` +
      `[R]Taxa R$ ${formatToDoubleBR(0)}\n` +
      `[R]<font size='tall'>TOTAL:  R$ ${formatToDoubleBR(data?.totalOrder || 0)}</font>\n`
    const completeText = headerText + itemText + footerText;

    await ThermalPrinterModule.printBluetooth({
      payload: completeText,
      printerNbrCharactersPerLine: 30
    });
  };

  return (
    <View style={{ flex: 1 }}>

      <View style={{ flexDirection: 'row' }}>
        <View style={{ padding: 10 }}>
          <Text variant="titleMedium">{data?.name}</Text>
          <Text>Data do pedido: {moment(data?.openingDate).format('DD/MM/YYYY HH:mm')}</Text>
          <Divider style={{ marginTop: 10 }} />
          <Text variant="titleLarge" style={{ marginTop: 10 }}>Total: {formatToCurrencyBR(data?.totalOrder || 0)}</Text>
        </View>
        <View style={{ marginLeft: 'auto', marginTop: 10 }}>
          <IconButton
            icon="printer"
            iconColor={theme.colors.primary}
            size={30}
            onPress={() => print()}
          />

        </View>

      </View>
      <ScrollView>
        <DataTable style={{ marginTop: 10 }}>
          <DataTable.Header>
            <DataTable.Title style={{ flex: 2 }}>It</DataTable.Title>
            <DataTable.Title style={{ flex: 5 }}>Produto</DataTable.Title>
            <DataTable.Title numeric style={{ flex: 1 }}>Qtd</DataTable.Title>
            <DataTable.Title numeric style={{ flex: 1 }}>x</DataTable.Title>
            <DataTable.Title numeric style={{ flex: 3 }}>Preço</DataTable.Title>
            <DataTable.Title numeric style={{ flex: 4 }}>Total</DataTable.Title>
          </DataTable.Header>

          {data.items?.map((item: any, index: number) => (
            <DataTable.Row
              key={`row-${index}`}
            >
              <DataTable.Cell style={{ flex: 2 }}>{index + 1}</DataTable.Cell>
              <DataTable.Cell style={{ flex: 5 }}>{item?.name}</DataTable.Cell>
              <DataTable.Cell numeric style={{ flex: 1 }}>{item?.qty}</DataTable.Cell>
              <DataTable.Cell numeric style={{ flex: 1 }}>x</DataTable.Cell>
              <DataTable.Cell numeric style={{ flex: 3 }}>{formatToDoubleBR(item?.price)}</DataTable.Cell>
              <DataTable.Cell numeric style={{ flex: 4 }}>{formatToDoubleBR(item?.qty * item?.price)}</DataTable.Cell>
            </DataTable.Row>
          ))}

          <DataTable.Row key="subtotal">
            <DataTable.Cell style={{ flex: 4 }}>Subtotal</DataTable.Cell>
            <DataTable.Cell numeric style={{ flex: 4 }}>{formatToCurrencyBR(0)}</DataTable.Cell>
          </DataTable.Row>

          <DataTable.Row key="tax">
            <DataTable.Cell style={{ flex: 4 }}>
              <Text>Taxa</Text>
            </DataTable.Cell>
            <DataTable.Cell numeric style={{ flex: 4 }}>{formatToCurrencyBR(0)}</DataTable.Cell>
          </DataTable.Row>

          <DataTable.Row key="discount">
            <DataTable.Cell style={{ flex: 4 }}>Desconto</DataTable.Cell>
            <DataTable.Cell numeric style={{ flex: 4 }}>
              {formatToDoubleBR(0)}
            </DataTable.Cell>
          </DataTable.Row>

          <DataTable.Row key="total">
            <DataTable.Cell style={{ flex: 4 }}>TOTAL</DataTable.Cell>
            <DataTable.Cell numeric style={{ flex: 4 }}>
              <Text style={{ fontWeight: 'bold' }}>

                {formatToCurrencyBR(data?.totalOrder || 0)}
              </Text>
            </DataTable.Cell>
          </DataTable.Row>
        </DataTable>
      </ScrollView>
      <Button onPress={() => console.log(data)}>data</Button>
    </View>
  )
}
