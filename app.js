
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// ========================================
// MENSAGENS PLUS
// PARCEIRA VEM COMIGO DEUS
// LOGIN E MOTOR DO APLICATIVO
// ========================================

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

const SERVIDOR_NOTIFICACOES =
  "https://mensagens-plus-notificacoes.onrender.com";

const el = id => document.getElementById(id);

// ESTADO DO APLICATIVO
let usuario = null;
let conversaAtual = null;
let pararContatos = null;
let pararMensagens = null;
let versaoConversa = 0;
let nomePerfil = "";

// ESTADO DO LOGIN POR TELEFONE
let recaptchaVerifier = null;
let confirmacaoTelefone = null;
let telefoneSolicitado = "";

// ========================================
// AVISOS E ERROS
// ========================================

function aviso(id, mensagem) {
  const elemento = el(id);

  if (elemento) {
    elemento.textContent = mensagem;
  }
}

function mostrarErro(id, erro) {
  console.error("Mensagens Plus:", erro);

  const traducoes = {
    "auth/invalid-credential":
      "E-mail ou senha incorretos.",

    "auth/email-already-in-use":
      "Este e-mail já está cadastrado.",

    "auth/weak-password":
      "A senha precisa ter pelo menos 6 caracteres.",

    "auth/invalid-email":
      "Digite um e-mail válido.",

    "auth/unauthorized-domain":
      "Este domínio precisa ser autorizado no Firebase.",

    "auth/popup-closed-by-user":
      "Login com Google cancelado.",

    "auth/popup-blocked":
      "O navegador bloqueou a janela do Google.",

    "auth/too-many-requests":
      "Muitas tentativas. Aguarde um pouco.",

    "auth/invalid-phone-number":
      "Telefone inválido. Use o formato internacional, como +5511991234567.",

    "auth/missing-phone-number":
      "Digite seu número de telefone.",

    "auth/invalid-verification-code":
      "O código SMS está incorreto.",

    "auth/code-expired":
      "O código expirou. Solicite outro SMS.",

    "auth/session-expired":
      "A sessão expirou. Solicite um novo código SMS.",

    "auth/captcha-check-failed":
      "A verificação de segurança falhou. Tente novamente.",

    "auth/quota-exceeded":
      "O limite de SMS foi atingido. Tente novamente mais tarde.",

    "auth/billing-not-enabled":
      "Verifique a configuração de cobrança do projeto Firebase.",

    "auth/operation-not-allowed":
      "Ative o método de login correspondente no Firebase Authentication.",

    "auth/invalid-app-credential":
      "A verificação de segurança falhou. Recarregue a página e tente novamente.",

    "auth/network-request-failed":
      "Falha de conexão. Confira a internet e tente novamente.",

    "permission-denied":
      "Permissão negada pelo Firestore. Confira as regras.",

    "unavailable":
      "Sem conexão com o Firebase. Confira a internet."
  };

  aviso(
    id,
    traducoes[erro?.code] ||
    erro?.message ||
    "Ocorreu um erro. Tente novamente."
  );
}

// ========================================
// CADASTRO COM E-MAIL
// ========================================

el("cadastrar").onclick = async () => {
  try {
    const email = el("email").value.trim();
    const senha = el("senha").value;

    if (!email || !senha) {
      aviso(
        "aviso-login",
        "Preencha seu e-mail e sua senha."
      );
      return;
    }

    aviso("aviso-login", "Criando sua conta...");

    await createUserWithEmailAndPassword(
      auth,
      email,
      senha
    );

    aviso("aviso-login", "");

  } catch (erro) {
    mostrarErro("aviso-login", erro);
  }
};

// ========================================
// ENTRAR COM E-MAIL
// ========================================

el("entrar").onclick = async () => {
  try {
    const email = el("email").value.trim();
    const senha = el("senha").value;

    if (!email || !senha) {
      aviso(
        "aviso-login",
        "Informe seu e-mail e sua senha."
      );
      return;
    }

    aviso("aviso-login", "Entrando...");

    await signInWithEmailAndPassword(
      auth,
      email,
      senha
    );

    aviso("aviso-login", "");

  } catch (erro) {
    mostrarErro("aviso-login", erro);
  }
};

// ========================================
// LOGIN COM GOOGLE
// ========================================

el("google").onclick = async () => {
  try {
    aviso("aviso-login", "Abrindo Google...");

    const provider = new GoogleAuthProvider();

    await signInWithPopup(auth, provider);

    aviso("aviso-login", "");

  } catch (erro) {
    mostrarErro("aviso-login", erro);
  }
};

// ========================================
// LOGIN COM TELEFONE
// ========================================

// ABRIR A ÁREA DE TELEFONE
el("mostrar-telefone").onclick = () => {
  el("login-telefone").classList.remove("oculto");
  aviso("aviso-login", "");

  el("telefone").focus();
};

// CRIAR VERIFICADOR DE SEGURANÇA
async function prepararRecaptcha() {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(
      auth,
      "recaptcha-container",
      {
        size: "normal",

        callback: () => {
          console.log(
            "Mensagens Plus: verificação de segurança concluída."
          );
        },

        "expired-callback": () => {
          aviso(
            "aviso-login",
            "A verificação expirou. Tente novamente."
          );
        }
      }
    );
  }

  await recaptchaVerifier.render();

  return recaptchaVerifier;
}

// SOLICITAR CÓDIGO SMS
el("enviar-codigo").onclick = async () => {
  try {
    const telefone = el("telefone").value.trim();

    if (!/^\+[1-9]\d{7,14}$/.test(telefone)) {
      aviso(
        "aviso-login",
        "Digite o telefone com código do país. Exemplo: +5511991234567"
      );

      el("telefone").focus();
      return;
    }

    el("enviar-codigo").disabled = true;

    aviso(
      "aviso-login",
      "Preparando verificação de segurança..."
    );

    const verifier = await prepararRecaptcha();

    aviso(
      "aviso-login",
      "Solicitando o código SMS..."
    );

    confirmacaoTelefone = await signInWithPhoneNumber(
      auth,
      telefone,
      verifier
    );

    telefoneSolicitado = telefone;

    el("codigo-sms").classList.remove("oculto");
    el("confirmar-codigo").classList.remove("oculto");

    el("codigo-sms").value = "";
    el("codigo-sms").focus();

    aviso(
      "aviso-login",
      "Código enviado. Confira o SMS recebido no seu telefone."
    );

  } catch (erro) {
    mostrarErro("aviso-login", erro);

    // Permitir uma nova tentativa de verificação.
    if (recaptchaVerifier) {
      try {
        await recaptchaVerifier.render();

        if (typeof grecaptcha !== "undefined") {
          const widget = await recaptchaVerifier.render();
          grecaptcha.reset(widget);
        }
      } catch (erroRecaptcha) {
        console.warn(
          "Não foi possível reiniciar a verificação:",
          erroRecaptcha
        );

        try {
          recaptchaVerifier.clear();
        } catch (_) {}

        recaptchaVerifier = null;
      }
    }

  } finally {
    el("enviar-codigo").disabled = false;
  }
};

// CONFIRMAR CÓDIGO SMS
el("confirmar-codigo").onclick = async () => {
  try {
    const codigo = el("codigo-sms").value.trim();

    if (!confirmacaoTelefone) {
      aviso(
        "aviso-login",
        "Solicite primeiro o código SMS."
      );
      return;
    }

    if (!/^\d{6}$/.test(codigo)) {
      aviso(
        "aviso-login",
        "Digite o código de 6 números recebido por SMS."
      );

      el("codigo-sms").focus();
      return;
    }

    el("confirmar-codigo").disabled = true;

    aviso(
      "aviso-login",
      "Verificando o código..."
    );

    await confirmacaoTelefone.confirm(codigo);

    // O Firebase atualiza o estado de autenticação.
    // onAuthStateChanged abrirá o aplicativo.
    confirmacaoTelefone = null;
    telefoneSolicitado = "";

    aviso("aviso-login", "");

  } catch (erro) {
    mostrarErro("aviso-login", erro);

  } finally {
    el("confirmar-codigo").disabled = false;
  }
};

// PERMITIR CONFIRMAR PELO TECLADO
el("codigo-sms").addEventListener("keydown", evento => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    el("confirmar-codigo").click();
  }
});

// ========================================
// SAIR
// ========================================

el("sair").onclick = async () => {
  try {
    await signOut(auth);
  } catch (erro) {
    mostrarErro("aviso-chat", erro);
  }
};

// ========================================
// MONITORAR LOGIN
// ========================================

onAuthStateChanged(auth, async user => {
  pararContatos?.();
  pararMensagens?.();

  pararContatos = null;
  pararMensagens = null;

  versaoConversa++;
  conversaAtual = null;
  usuario = user;

  el("login").classList.toggle(
    "oculto",
    !!user
  );

  el("app").classList.toggle(
    "oculto",
    !user
  );

  el("sair").classList.toggle(
    "oculto",
    !user
  );

  if (!user) {
    nomePerfil = "";
    return;
  }

  el("texto").disabled = true;
  el("botao-enviar").disabled = true;

  el("mensagens").replaceChildren();

  el("titulo-chat").textContent =
    "Selecione uma pessoa para conversar";

  aviso("aviso-chat", "");

  try {
    const perfilRef = doc(
      db,
      "users",
      user.uid
    );

    const perfilDoc = await getDoc(perfilRef);

    if (auth.currentUser?.uid !== user.uid) {
      return;
    }

    const nomePadrao =
      user.displayName ||
      user.email?.split("@")[0] ||
      user.phoneNumber ||
      "Usuário";

    const nomeSalvo = perfilDoc.exists()
      ? perfilDoc.data().displayName
      : null;

    nomePerfil = nomeSalvo || nomePadrao;

    el("usuario-atual").textContent = nomePerfil;

    // CRIAR PERFIL SE AINDA NÃO EXISTIR
    if (!perfilDoc.exists()) {
      await setDoc(perfilRef, {
        uid: user.uid,
        displayName: nomePerfil,
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        createdAt: serverTimestamp()
      });
    } else if (user.phoneNumber) {
      // Completar o telefone sem substituir o perfil existente.
      const dadosPerfil = perfilDoc.data();

      if (!dadosPerfil.phoneNumber) {
        await setDoc(
          perfilRef,
          { phoneNumber: user.phoneNumber },
          { merge: true }
        );
      }
    }

    if (auth.currentUser?.uid !== user.uid) {
      return;
    }

    // CARREGAR CONTATOS EM TEMPO REAL
    pararContatos = onSnapshot(
      collection(db, "users"),

      resultado => {
        const lista = el("contatos");

        lista.replaceChildren();

        const pessoas = resultado.docs.filter(
          pessoa => pessoa.id !== user.uid
        );

        if (!pessoas.length) {
          lista.textContent =
            "Ainda não existem outros contatos cadastrados.";
          return;
        }

        pessoas.forEach(pessoa => {
          const dados = pessoa.data();

          const nome =
            dados.displayName ||
            "Usuário";

          const item = document.createElement("div");

          item.className = "contato";
          item.dataset.uid = pessoa.id;
          item.textContent = nome;

          item.setAttribute("role", "button");
          item.tabIndex = 0;

          item.onclick = () => {
            abrirConversa(
              pessoa.id,
              nome
            );
          };

          item.onkeydown = evento => {
            if (
              evento.key === "Enter" ||
              evento.key === " "
            ) {
              evento.preventDefault();
              item.click();
            }
          };

          lista.appendChild(item);
        });
      },

      erro => {
        mostrarErro("aviso-chat", erro);
      }
    );

  } catch (erro) {
    mostrarErro("aviso-chat", erro);
  }
});

// ========================================
// ABRIR CONVERSA PARTICULAR
// ========================================

async function abrirConversa(outroUsuarioId, nome) {
  if (!usuario) return;

  pararMensagens?.();
  pararMensagens = null;

  const minhaVersao = ++versaoConversa;
  const meuId = usuario.uid;

  const participantes = [
    meuId,
    outroUsuarioId
  ].sort();

  const chatId = participantes.join("_");

  conversaAtual = chatId;

  el("titulo-chat").textContent = nome;
  el("mensagens").replaceChildren();

  el("texto").disabled = true;
  el("botao-enviar").disabled = true;

  aviso("aviso-chat", "Abrindo conversa...");

  try {
    const referencia = doc(
      db,
      "chats",
      chatId
    );

    // CRIAR CONVERSA NOVA OU ABRIR EXISTENTE
    try {
      await setDoc(referencia, {
        type: "direct",
        members: participantes
      });

    } catch (erro) {
      if (erro.code !== "permission-denied") {
        throw erro;
      }

      const existente = await getDoc(referencia);

      if (!existente.exists()) {
        throw erro;
      }

      const dados = existente.data();

      if (
        !Array.isArray(dados.members) ||
        !dados.members.includes(meuId) ||
        !dados.members.includes(outroUsuarioId)
      ) {
        throw new Error(
          "Você não participa desta conversa."
        );
      }
    }

    if (
      minhaVersao !== versaoConversa ||
      auth.currentUser?.uid !== meuId
    ) {
      return;
    }

    el("texto").disabled = false;
    el("botao-enviar").disabled = false;

    el("texto").placeholder =
      "Digite sua mensagem...";

    aviso("aviso-chat", "");

    const consulta = query(
      collection(
        db,
        "chats",
        chatId,
        "messages"
      ),
      orderBy("createdAt", "asc")
    );

    pararMensagens = onSnapshot(
      consulta,

      resultado => {
        if (minhaVersao !== versaoConversa) {
          return;
        }

        const lista = el("mensagens");
        lista.replaceChildren();

        resultado.forEach(documento => {
          const mensagem = documento.data();

          const bolha = document.createElement("div");

          bolha.className = "bolha";

          bolha.dataset.messageId = documento.id;
          bolha.dataset.chatId = chatId;

          if (mensagem.type === "audio" && mensagem.audio) {
            bolha.dataset.tipo = "audio";
            bolha.dataset.duracao =
              mensagem.audio.seconds || 0;
          }

          if (mensagem.senderId === meuId) {
            bolha.classList.add("minha");
          }

          bolha.textContent = mensagem.text || "";

          lista.appendChild(bolha);
        });

        lista.scrollTop = lista.scrollHeight;

        aviso("aviso-chat", "");
      },

      erro => {
        if (minhaVersao === versaoConversa) {
          mostrarErro("aviso-chat", erro);
        }
      }
    );

  } catch (erro) {
    if (minhaVersao === versaoConversa) {
      el("texto").disabled = true;
      el("botao-enviar").disabled = true;

      mostrarErro("aviso-chat", erro);
    }
  }
}

// ========================================
// MOTOR DE NOTIFICAÇÕES
// ========================================

async function enviarNotificacao(
  user,
  chatId,
  messageId
) {
  try {
    const token = await user.getIdToken();

    const resposta = await fetch(
      SERVIDOR_NOTIFICACOES + "/api/notify",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token
        },

        body: JSON.stringify({
          chatId,
          messageId
        })
      }
    );

    if (!resposta.ok) {
      throw new Error(
        "Erro HTTP " + resposta.status
      );
    }

    const resultado = await resposta.json();

    console.log(
      "Notificação Mensagens Plus:",
      resultado
    );

    return resultado;

  } catch (erro) {
    console.warn(
      "A mensagem foi salva, mas a notificação falhou:",
      erro
    );

    return null;
  }
}

// ========================================
// ENVIAR MENSAGENS
// ========================================

el("form-enviar").onsubmit = async evento => {
  evento.preventDefault();

  const texto = el("texto").value.trim();
  const user = auth.currentUser;

  if (!user || !conversaAtual || !texto) {
    return;
  }

  const chatId = conversaAtual;
  const remetente = user.uid;

  el("botao-enviar").disabled = true;

  try {
    const mensagemSalva = await addDoc(
      collection(
        db,
        "chats",
        chatId,
        "messages"
      ),
      {
        text: texto,
        senderId: remetente,
        createdAt: serverTimestamp()
      }
    );

    if (conversaAtual === chatId) {
      el("texto").value = "";
    }

    aviso("aviso-chat", "");

    if (conversaAtual === chatId) {
      el("botao-enviar").disabled = false;
    }

    void enviarNotificacao(
      user,
      chatId,
      mensagemSalva.id
    );

  } catch (erro) {
    mostrarErro("aviso-chat", erro);

  } finally {
    if (
      conversaAtual === chatId &&
      auth.currentUser?.uid === remetente
    ) {
      el("botao-enviar").disabled = false;
    }
  }
};

// ========================================
// FIM DO MOTOR MENSAGENS PLUS
// ========================================
