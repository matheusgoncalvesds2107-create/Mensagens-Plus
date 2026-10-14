
/*
 MENSAGENS PLUS
 Ligações de voz particulares
 Firebase + WebRTC + STUN
*/

(async () => {
  const contatos = document.getElementById("contatos");
  const barraChat = document.querySelector(".barra-chat");
  const campo = document.getElementById("texto");

  if (!contatos || !barraChat || !campo) return;

  const BASE =
    "https://www.gstatic.com/firebasejs/12.4.0/";

  const [
    firebaseApp,
    firebaseAuth,
    firebaseFirestore
  ] = await Promise.all([
    import(BASE + "firebase-app.js"),
    import(BASE + "firebase-auth.js"),
    import(BASE + "firebase-firestore.js")
  ]);

  const {
    getApp,
    getApps
  } = firebaseApp;

  const {
    getAuth,
    onAuthStateChanged
  } = firebaseAuth;

  const {
    getFirestore,
    collection,
    doc,
    addDoc,
    updateDoc,
    onSnapshot,
    query,
    where,
    serverTimestamp
  } = firebaseFirestore;

  // Aguardar inicialização feita pelo app.js
  for (let i = 0; i < 40 && !getApps().length; i++) {
    await new Promise(resolve =>
      setTimeout(resolve, 100)
    );
  }

  if (!getApps().length) {
    console.error("Firebase não inicializado.");
    return;
  }

  const auth = getAuth(getApp());
  const db = getFirestore(getApp());

  const CONFIG_WEBRTC = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302"
      },
      {
        urls: "stun:stun1.l.google.com:19302"
      }
    ]
  };

  let uid = null;
  let contatoId = null;
  let nomeContato = "Contato";

  let chamada = null;
  let iniciando = false;

  let pararChats = null;
  let pararChamadas = [];
  let pararDocumento = null;
  let pararCandidatos = null;
  let limiteToque = null;
  let geracaoLogin = 0;

  let microfone = null;
  let conexao = null;
  let candidatosLocais = [];
  let candidatosRemotos = [];
  let podeEnviarCandidatos = false;
  let usandoMicrofone = true;
  let somLigado = true;

  const dormir = ms =>
    new Promise(resolve => setTimeout(resolve, ms));

  const criar = (tag, classe, texto = "") => {
    const e = document.createElement(tag);
    e.className = classe;
    e.textContent = texto;
    return e;
  };

  const icones = {
    telefone: `
      <svg viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round">
       <path d="M22 16.9v3a2 2 0 0 1-2.2 2
        19.8 19.8 0 0 1-8.6-3.1
        19.5 19.5 0 0 1-6-6
        A19.8 19.8 0 0 1 2.1 4.2
        2 2 0 0 1 4.1-2h3
        a2 2 0 0 1 2 1.7l.5 2.8
        a2 2 0 0 1-.6 1.7L7.2 9.9
        a16 16 0 0 0 6.9 6.9l1.7-1.8
        a2 2 0 0 1 1.7-.6l2.8.5
        a2 2 0 0 1 1.7 2z"/>
      </svg>
    `,
    ligar: `
      <svg viewBox="0 0 24 24" fill="none"
       stroke="currentColor" stroke-width="2.3"
       stroke-linecap="round" stroke-linejoin="round">
       <path d="M22 16.9v3a2 2 0 0 1-2.2 2
        19.8 19.8 0 0 1-8.6-3.1
        19.5 19.5 0 0 1-6-6
        A19.8 19.8 0 0 1 2.1 4.2
        2 2 0 0 1 4.1-2h3
        a2 2 0 0 1 2 1.7l.5 2.8
        a2 2 0 0 1-.6 1.7L7.2 9.9
        a16 16 0 0 0 6.9 6.9l1.7-1.8
        a2 2 0 0 1 1.7-.6l2.8.5
        a2 2 0 0 1 1.7 2z"/>
      </svg>
    `
  };

  // =====================================
  // VISUAL
  // =====================================

  const estilo = document.createElement("style");

  estilo.textContent = `
    .mp-botao-ligar {
      border:0;
      background:transparent;
      color:#e9fff6;
      width:46px;
      height:46px;
      min-width:46px;
      display:grid;
      place-items:center;
      cursor:pointer;
    }
    .mp-botao-ligar svg {
      width:25px;
      height:25px;
    }
    .mp-botao-ligar:disabled {
      opacity:.4;
    }

    .mp-chamada {
      position:fixed;
      inset:0;
      z-index:99999;
      background:linear-gradient(
        165deg,#223943,#111b21
      );
      color:white;
      display:none;
      flex-direction:column;
      align-items:center;
      justify-content:space-between;
      padding:48px 18px max(
        40px,env(safe-area-inset-bottom)
      );
      font-family:Arial,sans-serif;
    }

    .mp-chamada.ativa {
      display:flex;
    }

    .mp-chamada-topo {
      text-align:center;
      width:100%;
    }

    .mp-chamada-marca {
      font-size:14px;
      color:#88e2c1;
      font-weight:bold;
    }

    .mp-chamada-avatar {
      width:100px;
      height:100px;
      margin:55px auto 20px;
      border-radius:50%;
      background:#127a5c;
      display:grid;
      place-items:center;
      font-size:37px;
      font-weight:bold;
    }

    .mp-chamada-nome {
      font-size:26px;
      font-weight:bold;
      overflow-wrap:anywhere;
    }

    .mp-chamada-status {
      margin-top:12px;
      color:#b9ced2;
      font-size:15px;
    }

    .mp-chamada-acoes {
      width:100%;
      max-width:350px;
      display:flex;
      justify-content:space-around;
      align-items:center;
      gap:12px;
    }

    .mp-chamada-item {
      display:flex;
      align-items:center;
      flex-direction:column;
      gap:8px;
      font-size:12px;
      color:#d5e4e7;
    }

    .mp-chamada-btn {
      width:62px;
      height:62px;
      border:0;
      border-radius:50%;
      background:#425762;
      color:white;
      display:grid;
      place-items:center;
      font-size:26px;
      cursor:pointer;
    }

    .mp-chamada-btn.aceitar {
      background:#00a884;
    }

    .mp-chamada-btn.recusar {
      background:#d33e53;
    }

    .mp-chamada-btn.selecionado {
      background:#d9eee7;
      color:#0b4737;
    }

    .mp-chamada-btn:disabled {
      opacity:.45;
    }

    .mp-chamada-btn svg {
      width:25px;
      height:25px;
    }

    .mp-som-aviso {
      text-align:center;
      font-size:12px;
      color:#ffc983;
      min-height:16px;
    }
  `;

  document.head.appendChild(estilo);

  const botaoLigar =
    criar("button", "mp-botao-ligar");

  botaoLigar.type = "button";
  botaoLigar.title = "Ligação de voz";
  botaoLigar.setAttribute(
    "aria-label",
    "Iniciar ligação de voz"
  );

  botaoLigar.innerHTML = icones.telefone;
  barraChat.append(botaoLigar);

  const tela = criar("section", "mp-chamada");

  tela.setAttribute("role", "dialog");
  tela.setAttribute("aria-modal", "true");
  tela.setAttribute("aria-label", "Ligação de voz");

  const topo = criar("div", "mp-chamada-topo");

  const marca = criar(
    "div",
    "mp-chamada-marca",
    "Mensagens Plus"
  );

  const avatar = criar(
    "div",
    "mp-chamada-avatar",
    "M+"
  );

  const nome = criar(
    "div",
    "mp-chamada-nome",
    "Contato"
  );

  const status = criar(
    "div",
    "mp-chamada-status",
    "Preparando..."
  );

  topo.append(marca, avatar, nome, status);

  const acoes = criar(
    "div",
    "mp-chamada-acoes"
  );

  function acao(classe, simbolo, legenda) {
    const item = criar(
      "div",
      "mp-chamada-item"
    );

    const botao = criar(
      "button",
      "mp-chamada-btn " + classe,
      simbolo
    );

    botao.type = "button";

    const texto = criar("span", "", legenda);
    item.append(botao, texto);

    acoes.append(item);

    return { botao, texto };
  }

  const aceitar = acao(
    "aceitar",
    "☎",
    "Atender"
  );

  const recusar = acao(
    "recusar",
    "✕",
    "Recusar"
  );

  const silenciar = acao(
    "",
    "🎙",
    "Silenciar"
  );

  const som = acao(
    "",
    "🔊",
    "Som ligado"
  );

  const desligar = acao(
    "recusar",
    "✕",
    "Desligar"
  );

  const avisoSom = criar(
    "div",
    "mp-som-aviso"
  );

  const rodape = criar("div", "");
  rodape.style.width = "100%";
  rodape.style.display = "flex";
  rodape.style.flexDirection = "column";
  rodape.style.alignItems = "center";
  rodape.style.gap = "16px";

  rodape.append(acoes, avisoSom);
  tela.append(topo, rodape);

  document.body.appendChild(tela);

  const audioRemoto = document.createElement("audio");
  audioRemoto.autoplay = true;
  audioRemoto.playsInline = true;
  audioRemoto.style.display = "none";
  document.body.appendChild(audioRemoto);

  function iniciais(texto) {
    return (texto || "M+")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(p => p[0] || "")
      .join("")
      .toUpperCase();
  }

  function abrirTela(nomePessoa, estado) {
    nome.textContent = nomePessoa;
    avatar.textContent = iniciais(nomePessoa);
    status.textContent = estado;
    avisoSom.textContent = "";

    tela.classList.add("ativa");
    atualizarBotoes(false);
  }

  function atualizarBotoes(recebendo) {
    aceitar.botao.parentElement.style.display =
      recebendo ? "" : "none";

    recusar.botao.parentElement.style.display =
      recebendo ? "" : "none";

    desligar.botao.parentElement.style.display =
      recebendo ? "none" : "";

    silenciar.botao.parentElement.style.display =
      recebendo ? "none" : "";

    som.botao.parentElement.style.display =
      recebendo ? "none" : "";
  }

  // =====================================
  // LIMPEZA DA LIGAÇÃO
  // =====================================

  function limparConexao() {
    clearTimeout(limiteToque);
    limiteToque = null;

    pararDocumento?.();
    pararDocumento = null;

    pararCandidatos?.();
    pararCandidatos = null;

    if (conexao) {
      conexao.onicecandidate = null;
      conexao.ontrack = null;
      conexao.onconnectionstatechange = null;
      conexao.close();
      conexao = null;
    }

    microfone?.getTracks().forEach(t => t.stop());
    microfone = null;

    audioRemoto.pause();
    audioRemoto.srcObject = null;

    candidatosLocais = [];
    candidatosRemotos = [];

    podeEnviarCandidatos = false;
    usandoMicrofone = true;
    somLigado = true;

    silenciar.botao.classList.remove("selecionado");
    som.botao.classList.remove("selecionado");

    silenciar.texto.textContent = "Silenciar";
    som.texto.textContent = "Som ligado";

    chamada = null;
    iniciando = false;

    tela.classList.remove("ativa");
  }

  async function encerrar(estado = "ended") {
    const atual = chamada;

    if (!atual) {
      limparConexao();
      return;
    }

    // Limpar imediatamente para não deixar
    // microfone e câmera ativos.
    limparConexao();

    try {
      if (atual.ref) {
        await updateDoc(atual.ref, {
          status: estado,
          updatedAt: serverTimestamp()
        });
      }
    } catch (erro) {
      console.warn(
        "Não foi possível atualizar a chamada:",
        erro.message
      );
    }
  }

  // =====================================
  // CANDIDATOS ICE
  // =====================================

  async function salvarCandidato(candidate) {
    if (
      !chamada?.ref ||
      !podeEnviarCandidatos ||
      !candidate
    ) return;

    try {
      await addDoc(
        collection(chamada.ref, "candidates"),
        {
          senderId: uid,
          candidate: candidate.candidate,
          sdpMid: candidate.sdpMid ?? null,
          sdpMLineIndex:
            candidate.sdpMLineIndex ?? null
        }
      );
    } catch (erro) {
      console.warn(
        "Candidato ICE:",
        erro.message
      );
    }
  }

  async function liberarCandidatosLocais() {
    podeEnviarCandidatos = true;

    const pendentes = [...candidatosLocais];
    candidatosLocais = [];

    for (const candidato of pendentes) {
      await salvarCandidato(candidato);
    }
  }

  async function aplicarCandidatosRemotos() {
    if (!conexao?.remoteDescription) return;

    const pendentes = [...candidatosRemotos];
    candidatosRemotos = [];

    for (const candidato of pendentes) {
      try {
        await conexao.addIceCandidate(candidato);
      } catch (erro) {
        console.warn("ICE remoto:", erro.message);
      }
    }
  }

  function monitorarCandidatos(ref) {
    pararCandidatos?.();

    pararCandidatos = onSnapshot(
      collection(ref, "candidates"),
      snapshot => {
        snapshot.docChanges().forEach(modificacao => {
          if (modificacao.type !== "added") return;

          const dados = modificacao.doc.data();

          if (dados.senderId === uid) return;

          const candidato = {
            candidate: dados.candidate,
            sdpMid: dados.sdpMid ?? null,
            sdpMLineIndex:
              dados.sdpMLineIndex ?? null
          };

          candidatosRemotos.push(candidato);
        });

        void aplicarCandidatosRemotos();
      },
      erro => {
        console.warn("Monitor ICE:", erro.message);
      }
    );
  }

  // =====================================
  // CRIAR CONEXÃO WEBRTC
  // =====================================

  async function prepararConexao() {
    microfone =
      await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        },
        video: false
      });

    conexao = new RTCPeerConnection(CONFIG_WEBRTC);

    microfone.getTracks().forEach(track => {
      conexao.addTrack(track, microfone);
    });

    conexao.ontrack = evento => {
      audioRemoto.srcObject =
        evento.streams[0] ||
        new MediaStream([evento.track]);

      audioRemoto.muted = !somLigado;

      audioRemoto.play().catch(() => {
        avisoSom.textContent =
          "Toque em Som para ativar o áudio.";
      });
    };

    conexao.onicecandidate = evento => {
      if (!evento.candidate) return;

      const candidato = evento.candidate.toJSON();

      if (podeEnviarCandidatos) {
        void salvarCandidato(candidato);
      } else {
        candidatosLocais.push(candidato);
      }
    };

    conexao.onconnectionstatechange = () => {
      if (!conexao || !chamada) return;

      if (conexao.connectionState === "connected") {
        status.textContent = "Ligação conectada";
        clearTimeout(limiteToque);
        limiteToque = null;
      }

      if (conexao.connectionState === "failed") {
        status.textContent =
          "Não foi possível conectar nesta rede.";
      }

      if (conexao.connectionState === "disconnected") {
        status.textContent =
          "Conexão interrompida...";
      }
    };
  }

  // =====================================
  // MONITORAR ESTADO DA CHAMADA
  // =====================================

  function monitorarDocumento(ref, papel) {
    pararDocumento?.();

    pararDocumento = onSnapshot(
      ref,
      async snapshot => {
        if (!chamada || !snapshot.exists()) return;

        const dados = snapshot.data();

        if (
          dados.status === "declined" ||
          dados.status === "ended"
        ) {
          limparConexao();
          return;
        }

        if (
          papel === "caller" &&
          dados.status === "accepted" &&
          dados.answer &&
          conexao &&
          !conexao.remoteDescription
        ) {
          try {
            await conexao.setRemoteDescription(
              new RTCSessionDescription(dados.answer)
            );

            await aplicarCandidatosRemotos();

            status.textContent = "Conectando áudio...";
          } catch (erro) {
            console.error("Resposta WebRTC:", erro);
            status.textContent = "Erro na ligação.";
          }
        }
      },
      erro => {
        console.error("Monitor da chamada:", erro);
      }
    );
  }

  // =====================================
  // FAZER LIGAÇÃO
  // =====================================

  async function ligar() {
    if (
      chamada ||
      iniciando ||
      campo.disabled ||
      !contatoId ||
      !uid
    ) return;

    if (!window.RTCPeerConnection) {
      alert("Este navegador não suporta chamadas WebRTC.");
      return;
    }

    iniciando = true;

    const outroUid = contatoId;
    const chatId = [uid, outroUid].sort().join("_");

    abrirTela(nomeContato, "Preparando microfone...");
    atualizarBotoes(false);

    try {
      await prepararConexao();

      const offer = await conexao.createOffer();

      await conexao.setLocalDescription(offer);

      const ref = await addDoc(
        collection(db, "chats", chatId, "calls"),
        {
          callerId: uid,
          calleeId: outroUid,
          status: "ringing",
          offer: {
            type: "offer",
            sdp: conexao.localDescription.sdp
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }
      );

      chamada = {
        ref,
        chatId,
        papel: "caller"
      };

      status.textContent = "Chamando...";
      iniciando = false;

      monitorarDocumento(ref, "caller");
      monitorarCandidatos(ref);
      await liberarCandidatosLocais();

      // Encerrar se ninguém atender
      limiteToque = setTimeout(() => {
        if (chamada?.ref.path === ref.path &&
            conexao?.connectionState !== "connected") {
          void encerrar("ended");
        }
      }, 45000);

    } catch (erro) {
      console.error("Erro ao ligar:", erro);
      limparConexao();
      alert(
        "Não foi possível iniciar a ligação: " +
        erro.message
      );
    } finally {
      iniciando = false;
    }
  }

  // =====================================
  // CHAMADA RECEBIDA
  // =====================================

  function mostrarChamadaRecebida(ref, dados) {
    if (chamada || iniciando) return;

    const criado = dados.createdAt?.toMillis?.();

    // Não apresentar ligações antigas
    if (!criado || Date.now() - criado > 60000) {
      return;
    }

    const outroUid = dados.callerId;

    if (
      !outroUid ||
      outroUid === uid
    ) return;

    chamada = {
      ref,
      chatId: ref.parent.parent.id,
      papel: "callee",
      offer: dados.offer,
      callerId: outroUid
    };

    // Encontrar nome no contato carregado
    const item = [...contatos.querySelectorAll(
      ".contato"
    )].find(c => c.dataset.uid === outroUid);

    const nomePessoa =
      item?.querySelector(".contato-nome")?.textContent ||
      "Contato";

    abrirTela(nomePessoa, "Ligação de voz recebida");
    atualizarBotoes(true);

    monitorarDocumento(ref, "callee");

    limiteToque = setTimeout(() => {
      if (chamada?.ref.path === ref.path) {
        void encerrar("declined");
      }
    }, 45000);
  }

  
async function atender() {
  if (
    chamada?.papel !== "callee" ||
    iniciando
  ) return;

  iniciando = true;
  aceitar.botao.disabled = true;

  const atual = chamada;
  let etapa = "Iniciando";

  try {
    etapa = "Acessando o microfone";
    status.textContent = etapa;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.RTCPeerConnection
    ) {
      throw new Error(
        "Este navegador não oferece os recursos necessários."
      );
    }

    await prepararConexao();

    if (chamada?.ref.path !== atual.ref.path) {
      throw new Error("A ligação foi encerrada.");
    }

    etapa = "Recebendo conexão WebRTC";
    status.textContent = etapa;

    await conexao.setRemoteDescription(
      new RTCSessionDescription(atual.offer)
    );

    monitorarCandidatos(atual.ref);

    etapa = "Preparando resposta de voz";
    status.textContent = etapa;

    const answer = await conexao.createAnswer();
    await conexao.setLocalDescription(answer);

    etapa = "Confirmando atendimento no Firebase";
    status.textContent = etapa;

    await updateDoc(atual.ref, {
      status: "accepted",
      answer: {
        type: "answer",
        sdp: conexao.localDescription.sdp
      },
      updatedAt: serverTimestamp()
    });

    etapa = "Conectando áudio";
    status.textContent = etapa;

    await liberarCandidatosLocais();
    await aplicarCandidatosRemotos();

    atualizarBotoes(false);
    clearTimeout(limiteToque);
    limiteToque = null;

    status.textContent = "Conectando áudio...";

  } catch (erro) {
    console.error(
      "Mensagens Plus - Erro ao atender:",
      etapa,
      erro
    );

    const codigo = erro.code || erro.name || "erro";

    const mensagem =
      "Falha em: " + etapa +
      "\nCódigo: " + codigo +
      "\nDetalhes: " + (erro.message || "Desconhecido");

    status.textContent = mensagem;
    avisoSom.textContent = "Não foi possível atender.";

    // Manter o erro na tela para facilitar a leitura.
    setTimeout(() => {
      if (chamada?.ref.path === atual.ref.path) {
        void encerrar("declined");
      }
    }, 12000);

  } finally {
    iniciando = false;
    aceitar.botao.disabled = false;
  }
}
  // =====================================
  // OUVIR CHAMADAS NOVAS
  // =====================================

  function cancelarMonitoramento() {
    pararChats?.();
    pararChats = null;

    pararChamadas.forEach(parar => parar());
    pararChamadas = [];
  }

  function monitorarRecebidas(userId) {
    cancelarMonitoramento();

    const minhaGeracao = ++geracaoLogin;

    const chatsQuery = query(
      collection(db, "chats"),
      where("members", "array-contains", userId)
    );

    pararChats = onSnapshot(
      chatsQuery,
      snapshot => {
        pararChamadas.forEach(parar => parar());
        pararChamadas = [];

        snapshot.docs.forEach(chat => {
          const chamadasQuery = query(
            collection(
              db,
              "chats",
              chat.id,
              "calls"
            ),
            where("calleeId", "==", userId)
          );

          const parar = onSnapshot(
            chamadasQuery,
            resultado => {
              if (
                minhaGeracao !== geracaoLogin ||
                auth.currentUser?.uid !== userId
              ) return;

              resultado.docs.forEach(documento => {
                const dados = documento.data();

                if (
                  dados.status === "ringing" &&
                  !chamada &&
                  !iniciando
                ) {
                  mostrarChamadaRecebida(
                    documento.ref,
                    dados
                  );
                }
              });
            },
            erro => console.warn(
              "Ligações recebidas:",
              erro.message
            )
          );

          pararChamadas.push(parar);
        });
      },
      erro => {
        console.error("Lista de conversas:", erro);
      }
    );
  }

  onAuthStateChanged(auth, user => {
    uid = user?.uid || null;

    cancelarMonitoramento();

    if (!uid) {
      ++geracaoLogin;
      limparConexao();
      return;
    }

    monitorarRecebidas(uid);
  });

  // =====================================
  // CONTROLES
  // =====================================

  contatos.addEventListener("click", evento => {
    const item = evento.target.closest(".contato");
    if (!item) return;

    contatoId = item.dataset.uid || null;

    nomeContato =
      item.querySelector(".contato-nome")?.textContent ||
      item.textContent.trim() ||
      "Contato";
  });

  contatos.addEventListener("keydown", evento => {
    if (
      evento.key !== "Enter" &&
      evento.key !== " "
    ) return;

    const item = evento.target.closest(".contato");
    if (!item) return;

    contatoId = item.dataset.uid || null;
    nomeContato =
      item.querySelector(".contato-nome")?.textContent ||
      "Contato";
  });

  botaoLigar.onclick = ligar;

  aceitar.botao.onclick = atender;

  recusar.botao.onclick = () => {
    void encerrar("declined");
  };

  desligar.botao.onclick = () => {
    void encerrar("ended");
  };

  silenciar.botao.onclick = () => {
    if (!microfone) return;

    usandoMicrofone = !usandoMicrofone;

    microfone.getAudioTracks().forEach(track => {
      track.enabled = usandoMicrofone;
    });

    silenciar.botao.classList.toggle(
      "selecionado",
      !usandoMicrofone
    );

    silenciar.texto.textContent =
      usandoMicrofone ? "Silenciar" : "Ativar mic";
  };

  som.botao.onclick = async () => {
    somLigado = !somLigado;
    audioRemoto.muted = !somLigado;

    som.botao.classList.toggle(
      "selecionado",
      !somLigado
    );

    som.texto.textContent =
      somLigado ? "Som ligado" : "Som desligado";

    if (somLigado && audioRemoto.srcObject) {
      try {
        await audioRemoto.play();
        avisoSom.textContent = "";
      } catch (erro) {
        avisoSom.textContent =
          "O navegador bloqueou o som.";
      }
    }
  };

  // Em alguns navegadores, voltar à página
  // depois de sair da ligação pode ser necessário.
  window.addEventListener("pagehide", () => {
    if (chamada) {
      void encerrar("ended");
    }
  });

})();
