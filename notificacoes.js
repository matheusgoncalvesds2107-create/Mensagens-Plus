
import {
  initializeApp,
  getApps,
  getApp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import {
  getMessaging,
  getToken,
  isSupported,
  onMessage
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-messaging.js";

import { firebaseConfig } from "./firebase-config.js";

const vapidKey =
  "BGZl8Is24cb9Eg57LQLupEUNIwbhfMGNHxBQvKwibJq6BzA8G9IRRGASyYzKL1IhDCwlCuH0zXk4nlxLCOfSLY8";

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

let messaging = null;

const botao = document.createElement("button");
botao.type = "button";
botao.id = "ativar-notificacoes";
botao.textContent = "🔔 Ativar notificações";

Object.assign(botao.style, {
  display: "none",
  width: "100%",
  padding: "13px",
  margin: "10px 0",
  borderRadius: "12px",
  border: "1px solid #247e68",
  background: "#183d34",
  color: "#d6fff0",
  fontWeight: "bold",
  cursor: "pointer"
});

const aviso = document.createElement("div");
aviso.setAttribute("role", "status");
aviso.style.fontSize = "12px";
aviso.style.color = "#aebdc4";
aviso.style.padding = "5px";

const painel = document.createElement("div");
painel.style.padding = "0 15px";
painel.append(botao, aviso);

const area = document.querySelector(".topo-contatos");
area.append(painel);

function informar(texto) {
  aviso.textContent = texto;
}

function identificadorDispositivo() {
  let id = localStorage.getItem("mp-device-id");

  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("mp-device-id", id);
  }

  return id;
}

async function iniciar() {
  if (!("serviceWorker" in navigator)) {
    informar("Este navegador não suporta notificações.");
    return;
  }

  if (!("Notification" in window)) {
    informar("Notificações indisponíveis neste navegador.");
    return;
  }

  const suportado = await isSupported();

  if (!suportado) {
    informar("Firebase Messaging não é compatível aqui.");
    return;
  }

  messaging = getMessaging(app);

  onMessage(messaging, payload => {
    console.log(
      "Mensagens Plus: mensagem recebida",
      payload.messageId || ""
    );

    // As notificações visuais em primeiro plano
    // serão integradas na próxima etapa.
  });
}

botao.onclick = async () => {
  const user = auth.currentUser;

  if (!user) {
    informar("Entre na sua conta primeiro.");
    return;
  }

  botao.disabled = true;
  informar("Preparando notificações...");

  try {
    if (!messaging) {
      await iniciar();
    }

    if (!messaging) {
      botao.disabled = false;
      return;
    }

    const permissao = await Notification.requestPermission();

    if (permissao !== "granted") {
      informar("Permissão de notificações não concedida.");
      return;
    }

    const registro = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registro
    });

    if (!token) {
      throw new Error("Token de notificação não recebido.");
    }

    // Cada dispositivo tem seu próprio registro.
    const id = identificadorDispositivo();

    await setDoc(
      doc(db, "users", user.uid, "pushTokens", id),
      {
        token,
        updatedAt: serverTimestamp()
      }
    );

    botao.textContent = "✓ Notificações ativadas";
    informar("Dispositivo registrado com sucesso.");

  } catch (erro) {
    console.error("Erro nas notificações:", erro);
    informar("Não foi possível registrar: " + erro.message);

  } finally {
    botao.disabled = false;
  }
};

onAuthStateChanged(auth, user => {
  botao.style.display = user ? "block" : "none";
  botao.textContent = "🔔 Ativar notificações";
  informar("");
});
