const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendNewOrderNotification = functions.firestore
  .document('OrderItems/{orderId}')
  .onCreate(async (snapshot, context) => {
    const orderData = snapshot.data();

    if (!orderData) {
      console.error('Dados do pedido não encontrados.');
      return null;
    }

    const establishmentId = orderData.establishment;

    if (!establishmentId) {
      console.error('ID do estabelecimento não encontrado no pedido.');
      return null;
    }

    try {
      // Consulta a coleção 'User' buscando usuários associados ao estabelecimento correto
      const usersSnapshot = await admin.firestore()
        .collection('User')
        .where('association.establishmentId', '==', establishmentId) 
        .get();

      if (usersSnapshot.empty) {
        console.error(`Nenhum usuário encontrado para o estabelecimento ID ${establishmentId}.`);
        return null;
      }

      // Para cada usuário encontrado, envia uma notificação
      const notifications = [];
      usersSnapshot.forEach(userDoc => {
        const userData = userDoc.data();

        if (userData?.association?.receiveNotifications && userData?.association?.enabled) {
          const token = userData?.token;
          if (token) {
            console.log('Enviando notificação para:', token);

            // Configuração da mensagem de notificação
            const message = {
              token: token,
              notification: {
                title: 'Novo pedido!',
                body: `${orderData?.items.map(item => (`${item?.qty} ${item?.name}\n`))}\n${orderData?.name}\n${orderData?.local !== orderData?.name ? orderData?.local : ""}`.replaceAll(",", "")
              },
            };
            
            // Adiciona o envio da notificação à lista de promessas
            notifications.push(admin.messaging().send(message));
          } else {
            console.error(`Token não encontrado para o usuário ${userDoc.id}.`);
          }
        }
      });

      // Aguarda todas as notificações serem enviadas
      const responses = await Promise.all(notifications);
      console.log('Notificações enviadas com sucesso:', responses);

      return responses;

    } catch (error) {
      console.error('Erro ao processar as notificações:', error);
      return null;
    }
  });


  exports.setCustomClaims = functions.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    
    try {
      // Buscar o usuário no Firestore para pegar o idEstablishment e role
      const userDoc = await admin.firestore().collection("User").doc(uid).get();
  
      if (!userDoc.exists) {
        console.log("Usuário não encontrado no Firestore.");
        return;
      }
  
      const userData = userDoc.data();
      const establishmentId = userData.association?.establishmentId || null;
      const role = userData.association?.role || "USER"; // Padrão "USER"
  
      // Definir as custom claims no token do usuário
      await admin.auth().setCustomUserClaims(uid, {
        establishmentId: establishmentId,
        role: role,
      });
  
      console.log(`Custom claims definidas para ${uid}:`, { establishmentId, role });
  
    } catch (error) {
      console.error("Erro ao definir custom claims:", error);
    }
  });


  exports.updateUserClaimsOnEstablishmentCreate = functions.firestore
  .document("Establishment/{establishmentId}")
  .onCreate(async (snap, context) => {
    const establishmentData = snap.data();
    const establishmentId = context.params.establishmentId
    const userId = establishmentData.owner

    if (!userId) {  
      console.error("Nenhum userId encontrado no estabelecimento.")
      return;
    }

    try {
      // Busca o usuário no Firebase Authentication
      const user = await admin.auth().getUser(userId);
      if (!user) {
        console.error("Usuário não encontrado no Firebase Auth.")
        return;
      }

      // Define as novas claims no token do usuário
      await admin.auth().setCustomUserClaims(userId, {
        role: "ADM", // O usuário que cria o estabelecimento será um ADM por padrão
        establishmentId: establishmentId,
      });

      //await admin.auth().revokeRefreshTokens(uid);

      console.log(`Claims atualizadas para ${userId}: { role: 'ADM', establishmentId: '${establishmentId}' }`);
    } catch (error) {
      console.error("Erro ao atualizar claims:", error);
    }
  });

  

  // exports.updateUserClaims = functions.https.onCall(async (data, context) => {
  //   const { uid, newRole, newEstablishment } = data; // Dados enviados do frontend
  
  //   if (!context.auth || context.auth.token.role !== "ADM") {
  //     throw new functions.https.HttpsError("permission-denied", "Acesso negado");
  //   }
  
  //   try {
  //     await admin.auth().setCustomUserClaims(uid, {
  //       role: newRole,
  //       establishmentId: newEstablishment,
  //     });

  //     const user = await admin.auth().getUser(uid);
  //     console.log(`Claims atuais para ${uid}:`, user.customClaims);
  //     //await admin.auth().revokeRefreshTokens(uid);
  
  //     return { message: "Claims atualizadas com sucesso!" };
  //   } catch (error) {
  //     throw new functions.https.HttpsError("internal", "Erro ao atualizar claims", error);
  //   }
  // });

  exports.updateUserClaims = functions.https.onCall(async (data, context) => {
    console.log("Iniciando updateUserClaims...");
    const { uid, newRole, newEstablishment } = data;
    console.log("Recebido:", uid, newRole, newEstablishment);
  
    if (!context.auth || context.auth.token.role !== "ADM") {
      console.log("Erro: Usuário sem permissão.");
      throw new functions.https.HttpsError("permission-denied", "Acesso negado");
    }
  
    try {
      console.log(`Atualizando claims para UID: ${uid}`);
      await admin.auth().setCustomUserClaims(uid, {
        role: newRole,
        establishmentId: newEstablishment,
      });
  
      const user = await admin.auth().getUser(uid);
      console.log(`Claims definidas para ${uid}:`, user.customClaims);
  
      console.log("Claims atualizadas com sucesso!");
      return { message: "Claims atualizadas com sucesso!" };
    } catch (error) {
      console.error("Erro ao atualizar claims:", error);
      throw new functions.https.HttpsError("internal", "Erro ao atualizar claims", error);
    }
  });