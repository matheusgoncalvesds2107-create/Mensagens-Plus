
import { initializeApp, getApps, getApp }
  from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  getFirestore,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const css = document.createElement("style");
css.textContent = `
  .mp-perfil-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 12px;
    background: #202c33;
    border: 1px solid #35444b;
    color: #e9edef;
    border-radius: 14px;
    text-align: left;
    cursor: pointer;
  }
  .mp-perfil-btn:hover { background: #2a3942; }
  .mp-foto {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #146b56;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    font-weight: 700;
    font-size: 19px;
    overflow: hidden;
  }
  .mp-foto img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .mp-identidade { min-width: 0; flex: 1; }
  .mp-nome {
    font-weight: 700;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .mp-legenda {
    color: #8696a0;
    font-size: 12px;
    margin-top: 5px;
  }
  .mp-overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    background: #000b;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
  }
  .mp-dialogo {
    background: #18262e;
    border: 1px solid #34454c;
    color: #e9edef;
    border-radius: 22px;
    padding: 24px;
    width: 100%;
    max-width: 390px;
    box-shadow: 0 15px 50px #0008;
  }
  .mp-dialogo h2 { margin-top: 0; }
  .mp-dialogo label {
    display: block;
    font-size: 13px;
    color: #aebdc4;
    margin-top: 15px;
  }
  .mp-dialogo input {
    width: 100%;
    padding: 13px;
    margin-top: 7px;
    background: #202c33;
    border: 1px solid #42535b;
    border-radius: 11px;
    color: white;
    font-size: 16px;
  }
  .mp-acoes {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }
  .mp-acoes button {
    flex: 1;
    padding: 13px;
    border: 0;
    border-radius: 11px;
    font-weight: bold;
    cursor: pointer;
  }
  .mp-salvar { background: #00a884; color: #062b22; }
  .mp-cancelar { background: #35444b; color: white; }
  .mp-aviso { color: #ffcc82; font-size: 12px; }
`;
document.head.append(css);

const area = document.querySelector(".topo-contatos");
const campoAntigo = document.getElementById("usuario-atual");

const botao = document.createElement("button");
botao.type = "button";
botao.className = "mp-perfil-btn";

const avatar = document.createElement("div");
avatar.className = "mp-foto";
avatar.textContent = "M+";

const identidade = document.createElement("div");
identidade.className = "mp-identidade";

const nomeVisual = document.createElement("div");
nomeVisual.className = "mp-nome";
nomeVisual.textContent = "Meu perfil";

const legenda = document.createElement("div");
legenda.className = "mp-legenda";
legenda.textContent = "Toque para editar";

identidade.append(nomeVisual, legenda);
botao.append(avatar, identidade);
area.append(botao);

campoAntigo.style.display = "none";

const overlay = document.createElement("div");
overlay.className = "mp-overlay";
overlay.hidden = true;
overlay.style.display = "none";

overlay.innerHTML = `
  <div class="mp-dialogo" role="dialog"
       aria-modal="true" aria-labelledby="mp-titulo">
    <h2 id="mp-titulo">Meu perfil</h2>
    <p style="color:#8696a0;font-size:13px">
      Mensagens Plus — Parceira Vem Comigo Deus
    </p>
    <div id="mp-foto-grande"
         class="mp-foto"
         style="width:78px;height:78px;margin:18px auto">
      M+
    </div>
    <label>Seu nome
      <input id="mp-editar-nome"
             maxlength="40"
             placeholder="Digite seu nome">
    </label>
    <label>E-mail
      <input id="mp-email" readonly>
    </label>
    <p class="mp-aviso" id="mp-aviso" role="status"></p>
    <div class="mp-acoes">
      <button class="mp-cancelar" id="mp-fechar">
        Cancelar
      </button>
      <button class="mp-salvar" id="mp-salvar">
        Salvar
      </button>
    </div>
  </div>
`;

document.body.append(overlay);

const $ = id => document.getElementById(id);

function iniciais(nome) {
  return (nome || "M+")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p[0])
    .join("")
    .toUpperCase();
}

function preencherAvatar(elemento, user) {
  elemento.replaceChildren();

  if (user.photoURL &&
      user.photoURL.startsWith("https://")) {
    const img = document.createElement("img");
    img.src = user.photoURL;
    img.alt = "Foto de perfil";
    img.referrerPolicy = "no-referrer";
    img.onerror = () => {
      elemento.textContent = iniciais(
        user.displayName || user.email
      );
    };
    elemento.append(img);
  } else {
    elemento.textContent = iniciais(
      user.displayName || user.email
    );
  }
}

function atualizarVisual(user) {
  if (!user) return;

  nomeVisual.textContent =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Meu perfil";

  preencherAvatar(avatar, user);
  preencherAvatar($("mp-foto-grande"), user);
}

function abrir() {
  const user = auth.currentUser;
  if (!user) return;

  $("mp-editar-nome").value = user.displayName || "";
  $("mp-email").value = user.email || "";
  $("mp-aviso").textContent = "";

  atualizarVisual(user);

  overlay.hidden = false;
  overlay.style.display = "flex";
  $("mp-editar-nome").focus();
}

function fechar() {
  overlay.hidden = true;
  overlay.style.display = "none";
}

botao.onclick = abrir;
$("mp-fechar").onclick = fechar;

overlay.addEventListener("click", e => {
  if (e.target === overlay) fechar();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape" && !overlay.hidden) fechar();
});

$("mp-salvar").onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const nome = $("mp-editar-nome").value.trim();

  if (nome.length < 2 || nome.length > 40) {
    $("mp-aviso").textContent =
      "Digite um nome entre 2 e 40 caracteres.";
    return;
  }

  const salvar = $("mp-salvar");
  salvar.disabled = true;
  $("mp-aviso").textContent = "Salvando...";

  try {
    await updateProfile(user, {
      displayName: nome
    });

    await updateDoc(doc(db, "users", user.uid), {
      displayName: nome
    });

    if (auth.currentUser?.uid === user.uid) {
      atualizarVisual(user);
      campoAntigo.textContent = nome;
    }

    fechar();
  } catch (erro) {
    console.error(erro);
    $("mp-aviso").textContent =
      "Erro ao salvar: " + (erro.message || erro.code);
  } finally {
    salvar.disabled = false;
  }
};

onAuthStateChanged(auth, user => {
  botao.style.display = user ? "flex" : "none";

  if (!user) {
    fechar();
    return;
  }

  atualizarVisual(user);
});
