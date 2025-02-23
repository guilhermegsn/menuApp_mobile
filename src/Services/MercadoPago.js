import axios from 'axios';
import { PUBLIC_KEY_MERCADO_PAGO } from '@env';

const generateCardToken = async () => {

  const PUBLIC_KEY = PUBLIC_KEY_MERCADO_PAGO
  const cardData = {
    number: '5031433215406351',
    expiry: '11/2025',
    cvc: '123',
  }
  try {
    const response = await axios.post(
      'https://api.mercadopago.com/v1/card_tokens',
      {
        card_number: cardData.number.replace(/\s/g, ''),
        expiration_month: cardData.expiry.split('/')[0],
        expiration_year: cardData.expiry.split('/')[1],
        security_code: cardData.cvc,
        cardholder: {
          name: 'APRO',
          identification: {
            type: 'CPF',
            number: '12345678909',
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        params: {
          public_key: PUBLIC_KEY, 
        }
      }
    );
    console.log('token: ', response.data.id)

    return response.data.id; // Retorna o token do cartão
  } catch (error) {
    console.error('Erro ao gerar token:', error.response.data);
    throw error;
  }
};


export const handleSubscribe = async () => {
  try {
    const cardToken = await generateCardToken();

    const payload = {
      userId: '2dLvr1My2egE0QlhdvScVzqyuu33', 
      email: 'test_user_92549659@testuser.com', 
      planId: 'Bbi0YEQTrMInhzpw7wZ6', 
      card_token: cardToken,
    };

    console.log('Enviando payload:', payload)

    const result = await axios.post(
      'https://us-central1-appdesc-e1bf2.cloudfunctions.net/createSubscription',
      payload
    );

    console.log('Assinatura criada:', result.data);
  } catch (error) {
    console.error('Erro ao criar assinatura:', error.response?.data || error.message);
  }
};
