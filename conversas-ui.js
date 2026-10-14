
import {
  getApp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  query,
  orderBy,
  limitToLast,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const app = getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const contatos = document.getElementById("contatos");

let meuId = null;
const escutas = new Map();

// OCULTAR O PAINEL GRANDE DE NOTIFICAÇÕES
// SOMENTE SE O NAVEGADOR JÁ TIVER PERMISSÃO

function ajustarNotificacoes() {
  const botao = document.getElementById(
    "ativar-notificacoes"
  );

  if (!botao) return;

  const painel = botao.parentElement;

  if (
    "Notification" in window &&
    Notification.permission === "granted"
  ) {
    painel.style.display = "none";
  } else {
    painel.style.display = "";
  }
}

// HORÁRIO DA ÚLTIMA MENSAGEM

function formatarHora(timestamp) {
  if (!timestamp?.toDate) return "";

  const data = timestamp.toDate();
  const hoje = new Date();

  if (data.toDateString() === hoje.toDateString()) {
    return data.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit"
  });
}

// LIMPAR ESCUTAS ANTIGAS

function limpar() {
  for (const escuta of escutas.values()) {
    escuta.parar();
  }

  escutas.clear();
}

// ATUALIZAR PRÉVIAS

function atualizarConversas() {
  if (!meuId) return;

  const elementos = contatos.querySelectorAll(
    ".contato[data-uid]"
  );

  const presentes = new Set();

  elementos.forEach(item => {
    const uid = item.dataset.uid;

    if (!uid || uid === meuId) return;

    presentes.add(uid);

    const anterior = escutas.get(uid);

    if (anterior && anterior.item === item) {
      return;
    }

    anterior?.parar();
    escutas.delete(uid);

    const participantes = [meuId, uid].sort();
    const chatId = participantes.join("_");

    const info = item.querySelector(".contato-info");
    const descricao = item.querySelector(".contato-sub");

    if (!info || !descricao) return;

    descricao.textContent = "Nenhuma mensagem ainda";

    let hora = item.querySelector(".contato-hora");

    if (!hora) {
      hora = document.createElement("span");
      hora.className = "contato-hora";

      const topo = item.querySelector(".contato-topo");

      if (topo) topo.appendChild(hora);
    }

    const consulta = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "desc"),
      limitToLast(1)
    );

    // O servidor mantém as mensagens em tempo real.
    // A leitura continua protegida pelas regras Firestore.

    const parar = onSnapshot(
      consulta,

      snapshot => {
        if (snapshot.empty) {
          descricao.textContent = "Nenhuma mensagem ainda";
          hora.textContent = "";
          return;
        }

        const mensagem = snapshot.docs[0].data();

        const prefixo =
          mensagem.senderId === meuId
            ? "Você: "
            : "";

        descricao.textContent =
          prefixo + (mensagem.text || "Mensagem");

        hora.textContent = formatarHora(
          mensagem.createdAt
        );
      },

      erro => {
        console.warn("Prévia indisponível:", erro.code);

        descricao.textContent =
          "Nenhuma prévia disponível";

        hora.textContent = "";
      }
    );

    escutas.set(uid, { parar, item });
  });

  for (const [uid, escuta] of escutas) {
    if (!presentes.has(uid)) {
      escuta.parar();
      escutas.delete(uid);
    }
  }
}

// OBSERVAR MUDANÇAS NA LISTA DE CONTATOS

const observador = new MutationObserver(() => {
  // Esperar o layout organizar os contatos
  queueMicrotask(atualizarConversas);
});

observador.observe(contatos, {
  childList: true
});

// OBSERVAR LOGIN

onAuthStateChanged(auth, user => {
  limpar();
  meuId = user?.uid || null;

  if (meuId) {
    queueMicrotask(atualizarConversas);
  }

  ajustarNotificacoes();
});

ajustarNotificacoes();
