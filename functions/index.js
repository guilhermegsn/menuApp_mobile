const functions = require('firebase-functions');
const admin = require('firebase-admin')

admin.initializeApp();

//Dados Estabelecimento
exports.getMenuData = require('./Establishment/EstablishmentData').getMenuData;
exports.getMenuItems = require('./Establishment/EstablishmentData').getMenuItems;

//Notificações
exports.sendNewOrderNotification = require('./Notifications/FireBaseMessaging').sendNewOrderNotification;
exports.setCustomClaims = require('./Notifications/FireBaseMessaging').setCustomClaims;
exports.updateUserClaimsOnEstablishmentCreate = require('./Notifications/FireBaseMessaging').updateUserClaimsOnEstablishmentCreate;
exports.updateUserClaims = require('./Notifications/FireBaseMessaging').updateUserClaims;
exports.sendEmailOrder = require('./Notifications/EmailOrder').sendEmailOrder;

//Pedidos
exports.sendOrderSecure = require('./Orders/OrderTickets').sendOrderSecure;
exports.getTicketData = require('./Orders/OrderTickets').getTicketData;
exports.sendSimplifiedOrder = require('./Orders/OrderTickets').sendSimplifiedOrder
exports.getOrderStatus = require('./Orders/OrderTickets').getOrderStatus

//Pagamentos estabelecimento
exports.mercadoPagoOAuthCallback = require('./Payments/MercadoPago/EstablishmentPayments').mercadoPagoOAuthCallback;
exports.renewTokensMercadoPago = require('./Payments/MercadoPago/EstablishmentPayments').renewTokensMercadoPago;
exports.getPublicMpKey = require('./Payments/MercadoPago/EstablishmentPayments').getPublicMpKey;
exports.savePayment = require('./Payments/MercadoPago/EstablishmentPayments').savePayment;
exports.executePaymentToEstablishment = require('./Payments/MercadoPago/EstablishmentPayments').executePaymentToEstablishment;


//Pagamentos assinatura
exports.createSubscription = require('./Payments/MercadoPago/SubscriptionsPayments').createSubscription;
exports.unsubscribe = require('./Payments/MercadoPago/SubscriptionsPayments').unsubscribe;
exports.mercadoPagoWebhook = require('./Payments/MercadoPago/SubscriptionsPayments').mercadoPagoWebhook;














