
importScripts(
  "https://www.gstatic.com/firebasejs/12.4.0/firebase-app-compat.js"
);

importScripts(
  "https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyDuMTEeYhAsYI-8tqvcaR1YEujF_alrlX8",
  authDomain: "mensagens-4fecc.firebaseapp.com",
  projectId: "mensagens-4fecc",
  storageBucket: "mensagens-4fecc.firebasestorage.app",
  messagingSenderId: "1030574675090",
  appId: "1:1030574675090:web:e701be3c86d4718609424b"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  // Mensagens recebidas em segundo plano.
  // O FCM exibe automaticamente notificações
  // quando o servidor envia um payload de
  // notificação compatível.
  console.log(
    "Mensagens Plus: notificação recebida",
    payload.messageId || ""
  );
});
