const functions = require("firebase-functions");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

const transporter = nodemailer.createTransport({
  host: "smtpout.secureserver.net", // ou smtp.secureserver.net
  port: 465, // se for SSL use 465 e secure: true
  secure: true, // true se porta 465
  authMethod: 'LOGIN',
  auth: {
    user: functions.config().email.user,
    pass: functions.config().email.pass
  }
});

exports.sendEmailOrder = functions.firestore

  .document("Establishment/{establishmentId}/Orders/{orderId}")
  .onCreate(async (snap, context) => {
    const order = snap.data();

    try {
      // Gerar QR code em base64 (data URL)
      const qrCodeBase64 = await QRCode.toDataURL(context.params.orderId)

      // Montar o e-mail com o QR code embutido
      const mailOptions = {
        from: `"Wise Menu" <${functions.config().email.user}>`,
        to: order.userEmail,
        subject: `Pedido #${order?.orderNumber} confirmado!`,
        html: `
            <h2>Obrigado pela sua compra, ${order?.name}!</h2>
            <p>Seu pedido foi recebido e está sendo processado.</p>
             <p><strong>Total:</strong> R$ ${order?.totalOrder?.toFixed(2)}</p>
            <p><b>Veja o QR Code do seu pedido:</b></p>
            <img src="${qrCodeBase64}" alt="QR Code do pedido" />
            <p>Ou acesse diretamente: <a href="${'http://www.uol.com.br'}">teste</a></p>
          `,
      };

      await transporter.sendMail(mailOptions);
      console.log("E-mail enviado para:", order?.email);
    } catch (error) {
      console.error("Erro ao enviar e-mail:", error);
    }
  });
