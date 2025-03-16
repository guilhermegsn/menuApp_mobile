import axios from 'axios';
import { PUBLIC_KEY_MERCADO_PAGO } from '@env';
import { CardData } from '../Interfaces/CardData_interface';
import { auth } from '../Services/FirebaseConfig';

export const generateCardToken = async (cardData: CardData) => {
  const PUBLIC_KEY = PUBLIC_KEY_MERCADO_PAGO
  const body = {
    card_number: cardData.number.replace(/\s/g, ''),
    expiration_month: cardData.expiry.split('/')[0],
    expiration_year: `20${cardData.expiry.split('/')[1]}`,
    security_code: cardData.cvv,
    cardholder: {
      name: cardData.name,
      identification: {
        type: 'CPF',
        number: cardData.document,
      },
    },
  }
  console.log(body)
  try {
    const response = await axios.post(
      'https://api.mercadopago.com/v1/card_tokens',body,
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
  } catch (error: string | any) {
    console.error('Erro ao gerar token:', error.response.data);
    throw error;
  }
};

export const createSubscription = async (establishmentId: string, email: string, planId: string, cardToken: string) => {
  const API_URL = 'https://us-central1-appdesc-e1bf2.cloudfunctions.net/createSubscription'
  const currentUser = auth.currentUser
  if (currentUser) {
    const token = await currentUser.getIdToken(); // Token de autenticação
    try {
      const response = await axios.post(API_URL,{
          establishmentId,
          email,
          planId,
          cardToken
        },
        {
          headers: {
            Authorization: `Bearer ${token}`, // Passa o token no cabeçalho
          },
        }
      )
      // O URL de pagamento que o usuário irá acessar
      return response.data//response.data.subscriptionUrl;
    } catch (error) {
      console.error("Erro ao criar assinatura:", error);
      throw error;
    }
  }
};

export const createUnsubscribe = async (establishmentId: string) => {
  const API_URL = 'https://us-central1-appdesc-e1bf2.cloudfunctions.net/unsubscribe '
  const currentUser = auth.currentUser
  if (currentUser) {
    const token = await currentUser.getIdToken(); // Token de autenticação
    try {
      const response = await axios.post(API_URL,{establishmentId},{
          headers: {
            Authorization: `Bearer ${token}`, // Passa o token no cabeçalho
          },
        }
      )
      // O URL de pagamento que o usuário irá acessar
      return response.data//response.data.subscriptionUrl;
    } catch (error) {
      console.error("Erro ao cancelar assinatura:", error);
      throw error;
    }
  }
};