
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const el = id => document.getElementById(id);

let usuario = null;
let conversaAtual = null;
let pararContatos = null;
let pararMensagens = null;

function aviso(id, mensagem) {
  el(id).textContent = mensagem;
}

function mostrarErro(id, erro) {
  console.error(erro);

  const traducoes = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/popup-closed-by-user": "Login com Google cancelado.",
    "auth/unauthorized-domain": "Este domínio precisa ser autorizado no Firebase.",
    "permission-denied": "Acesso negado. Confira as regras do Firestore."
  };

  aviso(id, traducoes[erro.code] || erro.message || "Ocorreu um erro.");
}

el("cadastrar").onclick = async () => {
  try {
    aviso("aviso-login", "Criando conta...");

    await createUserWithEmailAndPassword(
      auth,
      el("email").value.trim(),
      el("senha").value
    );

    aviso("aviso-login", "");
  } catch (erro) {
    mostrarErro("aviso-login", erro);
  }
};

el("entrar").onclick = async () => {
  try {
    aviso("aviso-login", "Entrando...");

    await signInWithEmailAndPassword(
      auth,
      el("email").value.trim(),
      el("senha").value
    );

    aviso("aviso-login", "");
  } catch (erro) {
    mostrarErro("aviso-login", erro);
  }
};

el("google").onclick = async () => {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (erro) {
    mostrarErro("aviso-login", erro);
  }
};

el("sair").onclick = async () => {
  try {
    await signOut(auth);
  } catch (erro) {
    mostrarErro("aviso-login", erro);
  }
};

onAuthStateChanged(auth, async user => {
  pararContatos?.();
  pararMensagens?.();

  pararContatos = null;
  pararMensagens = null;
  usuario = user;
  conversaAtual = null;

  el("login").classList.toggle("oculto", !!user);
  el("app").classList.toggle("oculto", !user);
  el("sair").classList.toggle("oculto", !user);

  if (!user) return;

  el("texto").disabled = true;
  el("botao-enviar").disabled = true;
  el("mensagens").replaceChildren();
  el("titulo-chat").textContent = "Selecione uma pessoa";

  const nome = user.displayName ||
    user.email?.split("@")[0] ||
    "Usuário";

  el("usuario-atual").textContent = nome;

  try {
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      displayName: nome,
      email: user.email || ""
    }, { merge: true });

    pararContatos = onSnapshot(
      collection(db, "users"),
      resultado => {
        const lista = el("contatos");
        lista.replaceChildren();

        const pessoas = resultado.docs.filter(
          pessoa => pessoa.id !== user.uid
        );

        if (!pessoas.length) {
          lista.textContent = "Nenhum outro usuário cadastrado ainda.";
          return;
        }

        pessoas.forEach(pessoa => {
          const dados = pessoa.data();
          const item = document.createElement("div");

          item.className = "contato";
          item.textContent = dados.displayName || "Usuário";
          item.setAttribute("role", "button");
          item.tabIndex = 0;

          item.onclick = () => abrirConversa(
            pessoa.id,
            dados.displayName || "Usuário"
          );

          item.onkeydown = evento => {
            if (evento.key === "Enter") item.click();
          };

          lista.appendChild(item);
        });
      },
      erro => mostrarErro("aviso-chat", erro)
    );
  } catch (erro) {
    mostrarErro("aviso-chat", erro);
  }
});

async function abrirConversa(outroUsuarioId, nome) {
  if (!usuario) return;

  pararMensagens?.();
  pararMensagens = null;

  const participantes = [usuario.uid, outroUsuarioId].sort();
  const chatId = participantes.join("_");

  conversaAtual = chatId;

  el("titulo-chat").textContent = nome;
  el("mensagens").replaceChildren();
  aviso("aviso-chat", "Carregando conversa...");

  el("texto").disabled = true;
  el("botao-enviar").disabled = true;

  try {
    const referencia = doc(db, "chats", chatId);
    const existente = await getDoc(referencia);

    if (!existente.exists()) {
      await setDoc(referencia, {
        type: "direct",
        members: participantes
      });
    }

    if (conversaAtual !== chatId) return;

    const consulta = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    pararMensagens = onSnapshot(
      consulta,
      resultado => {
        if (conversaAtual !== chatId) return;

        const lista = el("mensagens");
        lista.replaceChildren();

        resultado.forEach(documento => {
          const mensagem = documento.data();
          const bolha = document.createElement("div");

          bolha.className = "bolha";

          if (mensagem.senderId === usuario.uid) {
            bolha.classList.add("minha");
          }

          bolha.textContent = mensagem.text || "";
          lista.appendChild(bolha);
        });

        lista.scrollTop = lista.scrollHeight;
        aviso("aviso-chat", "");
      },
      erro => mostrarErro("aviso-chat", erro)
    );

    el("texto").disabled = false;
    el("botao-enviar").disabled = false;
  } catch (erro) {
    mostrarErro("aviso-chat", erro);
  }
}

el("form-enviar").onsubmit = async evento => {
  evento.preventDefault();

  const texto = el("texto").value.trim();

  if (!usuario || !conversaAtual || !texto) return;

  const chatId = conversaAtual;
  el("botao-enviar").disabled = true;

  try {
    await addDoc(
      collection(db, "chats", chatId, "messages"),
      {
        text: texto,
        senderId: usuario.uid,
        createdAt: serverTimestamp()
      }
    );

    if (conversaAtual === chatId) {
      el("texto").value = "";
    }

    aviso("aviso-chat", "");
  } catch (erro) {
    mostrarErro("aviso-chat", erro);
  } finally {
    el("botao-enviar").disabled = false;
  }
};
