
/*
  MENSAGENS PLUS
  Parceira Vem Comigo Deus

  Gravador compacto
  Ícones profissionais
  Render + Cloudinary
  Um áudio tocando por vez
*/

(() => {
  const SERVER =
    "https://mensagens-plus-notificacoes.onrender.com";

  const form = document.getElementById("form-enviar");
  const campo = document.getElementById("texto");
  const lista = document.getElementById("mensagens");
  const contatos = document.getElementById("contatos");
  const botaoTexto = document.getElementById("botao-enviar");

  if (!form || !campo || !lista ||
      !contatos || !botaoTexto) return;

  // =====================================
  // ÍCONES
  // =====================================

  const icones = {
    microfone: `
      <svg viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="2" width="6" height="13" rx="3"/>
        <path d="M5 10a7 7 0 0 0 14 0"/>
        <path d="M12 17v5"/>
        <path d="M8 22h8"/>
      </svg>
    `,
    lixeira: `
      <svg viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/>
        <path d="M8 6V4h8v2"/>
        <path d="M5 6l1 15h12l1-15"/>
        <path d="M10 10v7"/>
        <path d="M14 10v7"/>
      </svg>
    `,
    pausar: `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" rx="1"/>
        <rect x="14" y="4" width="4" height="16" rx="1"/>
      </svg>
    `,
    tocar: `
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 4l14 8-14 8z"/>
      </svg>
    `,
    enviar: `
      <svg viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 2L11 13"/>
        <path d="M22 2L15 22l-4-9-9-4z"/>
      </svg>
    `
  };

  const criar = (tag, classe, texto = "") => {
    const elemento = document.createElement(tag);
    elemento.className = classe;
    elemento.textContent = texto;
    return elemento;
  };

  function iconeNo(botao, nome) {
    botao.innerHTML = icones[nome];
  }

  // =====================================
  // ESTILO
  // =====================================

  const estilo = document.createElement("style");

  estilo.textContent = `
    .mp-mic,
    .mp-gravacao button,
    .mp-play {
      display:grid;
      place-items:center;
      border:0;
      cursor:pointer;
      flex-shrink:0;
    }

    .mp-mic {
      width:46px;
      height:46px;
      min-width:46px;
      border-radius:50%;
      background:#00a884;
      color:#fff;
    }

    .mp-mic svg {
      width:23px;
      height:23px;
    }

    .mp-mic:disabled {
      opacity:.45;
    }

    .mp-gravacao {
      display:none;
      width:100%;
      min-width:0;
      align-items:center;
      gap:9px;
      background:#202c33;
    }

    .mp-gravacao.ativa {
      display:flex;
    }

    .mp-gravacao button {
      width:42px;
      height:42px;
      min-width:42px;
      border-radius:50%;
      padding:10px;
    }

    .mp-gravacao button svg {
      width:22px;
      height:22px;
    }

    .mp-excluir {
      background:#45515a;
      color:#ff7185;
    }

    .mp-pausar {
      background:#45515a;
      color:white;
    }

    .mp-enviar-audio {
      background:#00a884;
      color:white;
    }

    .mp-gravacao button:disabled {
      opacity:.4;
    }

    .mp-info {
      flex:1;
      display:flex;
      flex-direction:column;
      gap:5px;
      min-width:0;
    }

    .mp-info-topo {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:7px;
      font-size:12px;
      color:#e9edef;
    }

    .mp-status {
      display:flex;
      align-items:center;
      gap:6px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .mp-ponto {
      width:7px;
      height:7px;
      min-width:7px;
      background:#ff5365;
      border-radius:50%;
      animation:mp-piscar 1s infinite;
    }

    @keyframes mp-piscar {
      50% { opacity:.2; }
    }

    .mp-tempo {
      font-variant-numeric:tabular-nums;
      font-size:12px;
    }

    .mp-ondas {
      display:flex;
      align-items:center;
      gap:2px;
      height:17px;
      overflow:hidden;
    }

    .mp-ondas span {
      flex:1;
      min-width:2px;
      border-radius:4px;
      background:#35cba0;
    }

    .mp-player-voz {
      display:flex;
      align-items:center;
      gap:9px;
      min-width:180px;
      max-width:260px;
    }

    .mp-play {
      width:40px;
      height:40px;
      min-width:40px;
      border-radius:50%;
      padding:10px;
      background:#d9f8e9;
      color:#14664f;
    }

    .mp-play svg {
      width:22px;
      height:22px;
    }

    .mp-player-dados {
      flex:1;
      display:flex;
      flex-direction:column;
      min-width:0;
      gap:4px;
    }

    .mp-player-barra {
      width:100%;
      margin:0;
      accent-color:#c6f5df;
    }

    .mp-player-tempo {
      font-size:11px;
      color:#e0f0ea;
    }
  `;

  document.head.appendChild(estilo);

  // =====================================
  // CONSTRUIR GRAVADOR
  // =====================================

  const mic = criar("button", "mp-mic");
  mic.type = "button";
  mic.title = "Gravar áudio";
  mic.setAttribute("aria-label", "Gravar áudio");
  iconeNo(mic, "microfone");

  form.appendChild(mic);

  const barra = criar("div", "mp-gravacao");

  const excluir = criar("button", "mp-excluir");
  excluir.type = "button";
  excluir.title = "Descartar gravação";
  excluir.setAttribute("aria-label", "Descartar gravação");
  iconeNo(excluir, "lixeira");

  const info = criar("div", "mp-info");
  const topo = criar("div", "mp-info-topo");

  const status = criar("span", "mp-status");
  const ponto = criar("span", "mp-ponto");
  const statusTexto = criar("span", "", "Gravando");

  status.append(ponto, statusTexto);

  const tempo = criar("span", "mp-tempo", "00:00");

  topo.append(status, tempo);

  const ondas = criar("div", "mp-ondas");

  const alturas = [
    7,13,9,17,6,12,16,8,14,5,
    17,11,7,15,9,18,6,13,10,16,
    8,14,5,18,12,7,15,9
  ];

  alturas.forEach(altura => {
    const parte = document.createElement("span");
    parte.style.height = altura + "px";
    ondas.appendChild(parte);
  });

  info.append(topo, ondas);

  const pausar = criar("button", "mp-pausar");
  pausar.type = "button";
  pausar.title = "Pausar gravação";
  iconeNo(pausar, "pausar");

  const enviarBotao = criar(
    "button",
    "mp-enviar-audio"
  );
  enviarBotao.type = "button";
  enviarBotao.title = "Enviar áudio";
  iconeNo(enviarBotao, "enviar");

  barra.append(
    excluir,
    info,
    pausar,
    enviarBotao
  );

  form.insertBefore(barra, campo);

  // =====================================
  // ESTADO
  // =====================================

  let contatoId = null;

  let gravador = null;
  let fluxo = null;
  let partes = [];
  let audioPronto = null;

  let timer = null;
  let inicioTrecho = 0;
  let tempoAcumulado = 0;
  let duracao = 0;

  let chatGravado = "";
  let iniciando = false;
  let enviando = false;
  let descartando = false;
  let enviarAoParar = false;

  // REPRODUÇÃO: APENAS UM ÁUDIO ATIVO
  let audioAtivo = null;
  let botaoAtivo = null;
  let versaoReproducao = 0;

  function formatar(segundos) {
    const s = Math.max(0, Math.floor(segundos));

    return (
      String(Math.floor(s / 60)).padStart(2, "0") +
      ":" +
      String(s % 60).padStart(2, "0")
    );
  }

  async function usuarioAtual() {
    const [{ getApp }, { getAuth }] =
      await Promise.all([
        import(
          "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js"
        ),
        import(
          "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js"
        )
      ]);

    return getAuth(getApp()).currentUser;
  }

  async function contexto() {
    const user = await usuarioAtual();

    if (!user || !contatoId) {
      throw new Error("Abra uma conversa primeiro.");
    }

    const chatId = [user.uid, contatoId]
      .sort()
      .join("_");

    return { user, chatId };
  }

  function liberarMicrofone() {
    fluxo?.getTracks().forEach(t => t.stop());
    fluxo = null;
  }

  function pararRelogio() {
    clearInterval(timer);
    timer = null;
  }

  function segundosAtuais() {
    let total = tempoAcumulado;

    if (gravador?.state === "recording") {
      total += Date.now() - inicioTrecho;
    }

    return total / 1000;
  }

  function modoNormal() {
    barra.classList.remove("ativa");

    campo.style.display = "";
    botaoTexto.style.display = "";
    mic.style.display = "";

    excluir.disabled = false;
    pausar.disabled = false;
    enviarBotao.disabled = false;

    mic.disabled = campo.disabled;
  }

  function modoGravando() {
    barra.classList.add("ativa");

    campo.style.display = "none";
    botaoTexto.style.display = "none";
    mic.style.display = "none";

    statusTexto.textContent = "Gravando";
    ponto.style.display = "";
    tempo.textContent = "00:00";

    iconeNo(pausar, "pausar");
    pausar.title = "Pausar";
  }

  function descartar() {
    if (enviando) return;

    descartando = true;
    enviarAoParar = false;

    pararRelogio();

    if (
      gravador?.state === "recording" ||
      gravador?.state === "paused"
    ) {
      gravador.stop();
    }

    liberarMicrofone();

    partes = [];
    audioPronto = null;
    chatGravado = "";
    tempoAcumulado = 0;
    duracao = 0;

    modoNormal();
  }

  function atualizarRelogio() {
    const segundos = segundosAtuais();
    tempo.textContent = formatar(segundos);

    if (segundos >= 30) {
      finalizar(false);
    }
  }

  function finalizar(enviarDepois) {
    if (
      gravador?.state !== "recording" &&
      gravador?.state !== "paused"
    ) return;

    if (gravador.state === "recording") {
      tempoAcumulado += Date.now() - inicioTrecho;
    }

    enviarAoParar = enviarDepois;

    pararRelogio();
    gravador.stop();
  }

  // =====================================
  // GRAVAR
  // =====================================

  async function iniciar() {
    if (campo.disabled || iniciando || enviando) {
      return;
    }

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      alert("Seu navegador não suporta gravação.");
      return;
    }

    iniciando = true;

    try {
      const { chatId } = await contexto();

      descartar();
      descartando = false;
      chatGravado = chatId;

      fluxo = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      if (campo.disabled) {
        throw new Error("Conversa fechada.");
      }

      const formatos = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg"
      ];

      const formato = formatos.find(
        tipo => MediaRecorder.isTypeSupported(tipo)
      );

      const opcoes = {
        audioBitsPerSecond: 24000
      };

      if (formato) {
        opcoes.mimeType = formato;
      }

      gravador = new MediaRecorder(fluxo, opcoes);

      partes = [];
      audioPronto = null;
      tempoAcumulado = 0;
      duracao = 0;

      gravador.ondataavailable = evento => {
        if (evento.data.size) {
          partes.push(evento.data);
        }
      };

      gravador.onstop = async () => {
        pararRelogio();
        liberarMicrofone();

        if (descartando) return;

        duracao = Math.max(
          1,
          Math.min(
            30,
            Math.ceil(tempoAcumulado / 1000)
          )
        );

        const tipo =
          gravador.mimeType ||
          partes[0]?.type ||
          "audio/webm";

        audioPronto = new Blob(partes, {
          type: tipo
        });

        statusTexto.textContent = "Áudio pronto";
        ponto.style.display = "none";
        tempo.textContent = formatar(duracao);

        pausar.disabled = true;

        if (enviarAoParar) {
          await enviar();
        }
      };

      gravador.onerror = () => {
        pararRelogio();
        liberarMicrofone();
        statusTexto.textContent = "Erro na gravação";
        pausar.disabled = true;
      };

      modoGravando();

      gravador.start();

      inicioTrecho = Date.now();

      timer = setInterval(atualizarRelogio, 200);

    } catch (erro) {
      console.error("Microfone:", erro);

      descartar();

      alert(
        "Não foi possível usar o microfone. " +
        "Confira a permissão do navegador."
      );

    } finally {
      iniciando = false;
    }
  }

  // =====================================
  // PAUSAR E CONTINUAR
  // =====================================

  function alternarPausa() {
    if (!gravador) return;

    if (gravador.state === "recording") {
      tempoAcumulado += Date.now() - inicioTrecho;

      gravador.pause();
      pararRelogio();

      iconeNo(pausar, "tocar");
      pausar.title = "Continuar gravação";

      statusTexto.textContent = "Pausado";
      ponto.style.display = "none";

    } else if (gravador.state === "paused") {
      if (tempoAcumulado >= 30000) {
        finalizar(false);
        return;
      }

      gravador.resume();

      inicioTrecho = Date.now();

      iconeNo(pausar, "pausar");
      pausar.title = "Pausar gravação";

      statusTexto.textContent = "Gravando";
      ponto.style.display = "";

      timer = setInterval(atualizarRelogio, 200);
    }
  }

  // =====================================
  // ENVIAR PARA O RENDER
  // =====================================

  async function enviar() {
    if (enviando) return;

    if (
      gravador?.state === "recording" ||
      gravador?.state === "paused"
    ) {
      finalizar(true);
      return;
    }

    if (!audioPronto) return;

    enviando = true;

    enviarBotao.disabled = true;
    excluir.disabled = true;
    pausar.disabled = true;

    statusTexto.textContent = "Enviando...";

    try {
      if (
        audioPronto.size < 100 ||
        audioPronto.size > 2 * 1024 * 1024
      ) {
        throw new Error("Áudio vazio ou muito grande.");
      }

      const { user, chatId } = await contexto();

      if (chatId !== chatGravado) {
        throw new Error("A conversa foi alterada.");
      }

      const token = await user.getIdToken();

      const tipo = audioPronto.type.split(";")[0];

      const extensoes = {
        "audio/webm": "webm",
        "audio/mp4": "m4a",
        "audio/ogg": "ogg",
        "audio/mpeg": "mp3"
      };

      if (!extensoes[tipo]) {
        throw new Error("Formato não suportado.");
      }

      const dados = new FormData();

      dados.append(
        "audio",
        audioPronto,
        "voz." + extensoes[tipo]
      );

      dados.append("chatId", chatId);
      dados.append("audioSeconds", String(duracao));

      const resposta = await fetch(
        SERVER + "/api/audio/upload",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer " + token
          },
          body: dados
        }
      );

      const retorno = await resposta.json();

      if (!resposta.ok || !retorno.ok) {
        throw new Error(
          retorno.error || "Erro no envio."
        );
      }

      // ENVIO CONCLUÍDO
      enviando = false;
      descartar();

    } catch (erro) {
      console.error("Envio:", erro);

      statusTexto.textContent = "Falha no envio";
      alert("Não foi possível enviar: " + erro.message);

    } finally {
      enviando = false;
      enviarBotao.disabled = false;
      excluir.disabled = false;
    }
  }

  mic.onclick = iniciar;
  excluir.onclick = descartar;
  pausar.onclick = alternarPausa;
  enviarBotao.onclick = enviar;

  // =====================================
  // IDENTIFICAR CONTATO
  // =====================================

  function selecionarContato(evento) {
    const item = evento.target.closest(".contato");

    if (!item) return;

    if (!enviando) descartar();

    contatoId = item.dataset.uid || null;
  }

  contatos.addEventListener("click", selecionarContato);

  contatos.addEventListener("keydown", evento => {
    if (
      evento.key === "Enter" ||
      evento.key === " "
    ) {
      selecionarContato(evento);
    }
  });

  new MutationObserver(() => {
    mic.disabled = campo.disabled;

    if (campo.disabled && !enviando) {
      descartar();
    }
  }).observe(campo, {
    attributes: true,
    attributeFilter: ["disabled"]
  });

  mic.disabled = campo.disabled;

  // =====================================
  // APENAS UM ÁUDIO TOCANDO
  // =====================================

  function pararAudioAnterior(novoAudio) {
    if (audioAtivo && audioAtivo !== novoAudio) {
      audioAtivo.pause();

      if (botaoAtivo) {
        iconeNo(botaoAtivo, "tocar");
      }
    }

    audioAtivo = novoAudio;
  }

  // =====================================
  // PLAYER NAS MENSAGENS
  // =====================================

  function montarPlayer(bolha) {
    if (
      bolha.dataset.tipo !== "audio" ||
      bolha.dataset.playerPronto === "1"
    ) {
      return;
    }

    bolha.dataset.playerPronto = "1";
    bolha.replaceChildren();

    const caixa = criar("div", "mp-player-voz");

    const botao = criar("button", "mp-play");
    botao.type = "button";
    botao.title = "Ouvir áudio";
    iconeNo(botao, "tocar");

    const dados = criar("div", "mp-player-dados");

    const progresso = criar(
      "input",
      "mp-player-barra"
    );

    progresso.type = "range";
    progresso.min = "0";
    progresso.max = "100";
    progresso.value = "0";
    progresso.disabled = true;

    const textoTempo = criar(
      "span",
      "mp-player-tempo",
      "🎙 " + formatar(
        Number(bolha.dataset.duracao || 0)
      )
    );

    dados.append(progresso, textoTempo);
    caixa.append(botao, dados);
    bolha.append(caixa);

    const audio = new Audio();

    let url = null;
    let carregando = false;

    botao.onclick = async () => {
      if (carregando) return;

      if (!audio.paused) {
        audio.pause();
        iconeNo(botao, "tocar");

        if (audioAtivo === audio) {
          audioAtivo = null;
          botaoAtivo = null;
        }

        return;
      }

      const minhaVersao = ++versaoReproducao;

      try {
        if (!url) {
          carregando = true;
          botao.textContent = "…";

          const user = await usuarioAtual();

          if (!user) {
            throw new Error("Faça login.");
          }

          const token = await user.getIdToken();

          const chatId = bolha.dataset.chatId;
          const messageId = bolha.dataset.messageId;

          const resposta = await fetch(
            SERVER + "/api/audio/" +
              encodeURIComponent(chatId) + "/" +
              encodeURIComponent(messageId),
            {
              headers: {
                Authorization: "Bearer " + token
              }
            }
          );

          if (!resposta.ok) {
            throw new Error(
              "Erro HTTP " + resposta.status
            );
          }

          const arquivo = await resposta.blob();

          if (!arquivo.size) {
            throw new Error("Áudio vazio.");
          }

          url = URL.createObjectURL(arquivo);
          audio.src = url;
          progresso.disabled = false;
        }

        // Se outro áudio foi selecionado enquanto
        // este carregava, não começar a tocar.
        if (
          minhaVersao !== versaoReproducao ||
          !bolha.isConnected
        ) {
          iconeNo(botao, "tocar");
          return;
        }

        // PAUSAR PRIMEIRO ÁUDIO
        pararAudioAnterior(audio);
        botaoAtivo = botao;

        // TOCAR O NOVO
        await audio.play();

        iconeNo(botao, "pausar");

      } catch (erro) {
        console.error("Player:", erro);

        iconeNo(botao, "tocar");

        if (audioAtivo === audio) {
          audioAtivo = null;
          botaoAtivo = null;
        }

        textoTempo.textContent = "Erro ao ouvir";

      } finally {
        carregando = false;
      }
    };

    audio.onpause = () => {
      iconeNo(botao, "tocar");
    };

    audio.onended = () => {
      iconeNo(botao, "tocar");
      progresso.value = "0";

      if (audioAtivo === audio) {
        audioAtivo = null;
        botaoAtivo = null;
      }
    };

    audio.ontimeupdate = () => {
      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        progresso.value = String(
          Math.round(
            audio.currentTime /
            audio.duration * 100
          )
        );

        textoTempo.textContent =
          formatar(audio.currentTime) +
          " / " +
          formatar(audio.duration);
      }
    };

    progresso.oninput = () => {
      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        audio.currentTime =
          Number(progresso.value) *
          audio.duration / 100;
      }
    };

    // LIBERAR ÁUDIO QUANDO SAIR DA CONVERSA

    const observador = new MutationObserver(() => {
      if (!bolha.isConnected) {
        audio.pause();

        if (audioAtivo === audio) {
          audioAtivo = null;
          botaoAtivo = null;
        }

        if (url) {
          URL.revokeObjectURL(url);
        }

        observador.disconnect();
      }
    });

    observador.observe(lista, {
      childList: true
    });
  }

  function atualizarPlayers() {
    lista.querySelectorAll(
      '.bolha[data-tipo="audio"]'
    ).forEach(montarPlayer);
  }

  new MutationObserver(atualizarPlayers).observe(
    lista,
    { childList: true }
  );

  atualizarPlayers();

})();
