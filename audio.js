
/*
 MENSAGENS PLUS
 Gravador compacto estilo WhatsApp
 Render + Cloudinary
*/

(() => {
  const SERVER =
    "https://mensagens-plus-notificacoes.onrender.com";

  const form = document.getElementById("form-enviar");
  const campo = document.getElementById("texto");
  const lista = document.getElementById("mensagens");
  const contatos = document.getElementById("contatos");
  const enviarTexto = document.getElementById("botao-enviar");

  if (!form || !campo || !lista || !contatos || !enviarTexto) return;

  const criar = (tag, classe, texto = "") => {
    const e = document.createElement(tag);
    e.className = classe;
    e.textContent = texto;
    return e;
  };

  const estilo = document.createElement("style");

  estilo.textContent = `
    .mp-mic {
      width:46px;
      height:46px;
      min-width:46px;
      border:0;
      border-radius:50%;
      color:white;
      background:#00a884;
      font-size:23px;
    }
    .mp-mic:disabled { opacity:.45; }

    .mp-gravacao {
      display:none;
      width:100%;
      align-items:center;
      gap:10px;
      min-width:0;
    }

    .mp-gravacao.ativa {
      display:flex;
    }

    .mp-gravacao-info {
      display:flex;
      flex-direction:column;
      flex:1;
      gap:5px;
      min-width:0;
    }

    .mp-gravacao-topo {
      display:flex;
      align-items:center;
      justify-content:space-between;
      color:#e9edef;
      font-size:12px;
    }

    .mp-gravacao-status {
      display:flex;
      align-items:center;
      gap:6px;
    }

    .mp-ponto {
      background:#ff5365;
      width:7px;
      height:7px;
      border-radius:50%;
      animation:mp-piscar 1s infinite;
    }

    @keyframes mp-piscar {
      50% { opacity:.25; }
    }

    .mp-tempo {
      font-size:13px;
      font-variant-numeric:tabular-nums;
      color:#fff;
    }

    .mp-ondas {
      display:flex;
      align-items:center;
      gap:3px;
      height:17px;
      overflow:hidden;
    }

    .mp-ondas span {
      flex:1;
      min-width:2px;
      border-radius:5px;
      background:#37cba0;
    }

    .mp-gravacao button {
      border:0;
      flex-shrink:0;
      width:43px;
      height:43px;
      border-radius:50%;
      color:white;
      font-size:20px;
      display:grid;
      place-items:center;
    }

    .mp-excluir {
      background:#45545d;
      color:#ff9aa5 !important;
    }

    .mp-pausar {
      background:#45545d;
    }

    .mp-enviar-audio {
      background:#00a884;
    }

    .mp-gravacao button:disabled {
      opacity:.4;
    }

    .mp-gravacao.ativa ~ #texto,
    .mp-gravacao.ativa ~ #botao-enviar {
      display:none;
    }

    .mp-player-voz {
      display:flex;
      align-items:center;
      gap:10px;
      min-width:185px;
      max-width:260px;
    }

    .mp-play {
      border:0;
      width:39px;
      height:39px;
      min-width:39px;
      border-radius:50%;
      background:#d9f8e9;
      color:#14664f;
      font-size:18px;
    }

    .mp-player-dados {
      flex:1;
      display:flex;
      flex-direction:column;
      gap:3px;
      min-width:0;
    }

    .mp-player-barra {
      width:100%;
      accent-color:#e0ffef;
    }

    .mp-player-tempo {
      font-size:11px;
      color:#e0f0ea;
    }
  `;

  document.head.appendChild(estilo);

  // BOTÃO DO MICROFONE

  const mic = criar("button", "mp-mic", "🎙");
  mic.type = "button";
  mic.disabled = true;
  mic.title = "Gravar áudio";

  form.appendChild(mic);

  // BARRA COMPACTA DE GRAVAÇÃO

  const barra = criar("div", "mp-gravacao");

  const excluir = criar("button", "mp-excluir", "🗑");
  excluir.type = "button";
  excluir.title = "Descartar";

  const info = criar("div", "mp-gravacao-info");
  const topo = criar("div", "mp-gravacao-topo");
  const status = criar("span", "mp-gravacao-status");

  const ponto = criar("span", "mp-ponto");
  const textoStatus = criar("span", "", "Gravando");
  const tempo = criar("span", "mp-tempo", "00:00");

  status.append(ponto, textoStatus);
  topo.append(status, tempo);

  const ondas = criar("div", "mp-ondas");

  const alturas = [
    8,13,6,17,11,7,16,10,5,14,
    18,7,12,9,16,6,11,18,8,14,
    5,16,11,7,17,9,12,6
  ];

  alturas.forEach(h => {
    const coluna = document.createElement("span");
    coluna.style.height = h + "px";
    ondas.appendChild(coluna);
  });

  info.append(topo, ondas);

  const pausar = criar("button", "mp-pausar", "Ⅱ");
  pausar.type = "button";
  pausar.title = "Pausar ou continuar";

  const enviarAudioBtn = criar(
    "button",
    "mp-enviar-audio",
    "➤"
  );
  enviarAudioBtn.type = "button";
  enviarAudioBtn.title = "Enviar áudio agora";

  barra.append(
    excluir,
    info,
    pausar,
    enviarAudioBtn
  );

  form.insertBefore(barra, campo);

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
  let enviando = false;
  let iniciando = false;
  let descartarGravacao = false;
  let enviarQuandoParar = false;

  function formatar(segundos) {
    const s = Math.max(0, Math.floor(segundos));

    return String(Math.floor(s / 60))
      .padStart(2, "0") + ":" +
      String(s % 60).padStart(2, "0");
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

  function segundosAtuais() {
    let total = tempoAcumulado;

    if (gravador?.state === "recording") {
      total += Date.now() - inicioTrecho;
    }

    return total / 1000;
  }

  function liberarMicrofone() {
    fluxo?.getTracks().forEach(t => t.stop());
    fluxo = null;
  }

  function pararRelogio() {
    clearInterval(timer);
    timer = null;
  }

  function mostrarNormal() {
    barra.classList.remove("ativa");
    campo.style.display = "";
    enviarTexto.style.display = "";
    mic.style.display = "";

    excluir.disabled = false;
    pausar.disabled = false;
    enviarAudioBtn.disabled = false;
    enviarAudioBtn.textContent = "➤";
    mic.disabled = campo.disabled;
  }

  function mostrarGravador() {
    barra.classList.add("ativa");
    campo.style.display = "none";
    enviarTexto.style.display = "none";
    mic.style.display = "none";

    textoStatus.textContent = "Gravando";
    ponto.style.display = "";
    tempo.textContent = "00:00";
    pausar.textContent = "Ⅱ";
  }

  function descartar() {
    if (enviando) return;

    descartarGravacao = true;
    enviarQuandoParar = false;

    pararRelogio();

    if (gravador?.state === "recording" ||
        gravador?.state === "paused") {
      gravador.stop();
    }

    liberarMicrofone();

    partes = [];
    audioPronto = null;
    chatGravado = "";
    tempoAcumulado = 0;
    duracao = 0;

    mostrarNormal();
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

    enviarQuandoParar = enviarDepois;

    pararRelogio();
    gravador.stop();
  }

  async function iniciar() {
    if (campo.disabled || iniciando || enviando) return;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      !window.MediaRecorder
    ) {
      alert("Este navegador não permite gravar áudio.");
      return;
    }

    iniciando = true;

    try {
      const { chatId } = await contexto();

      descartar();

      descartarGravacao = false;
      chatGravado = chatId;

      fluxo = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const formatos = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg"
      ];

      const formato = formatos.find(
        t => MediaRecorder.isTypeSupported(t)
      );

      gravador = new MediaRecorder(
        fluxo,
        formato
          ? {
              mimeType: formato,
              audioBitsPerSecond: 24000
            }
          : {
              audioBitsPerSecond: 24000
            }
      );

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

        if (descartarGravacao) return;

        duracao = Math.max(
          1,
          Math.min(30, Math.ceil(
            tempoAcumulado / 1000
          ))
        );

        const tipo =
          gravador.mimeType ||
          partes[0]?.type ||
          "audio/webm";

        audioPronto = new Blob(partes, {
          type: tipo
        });

        textoStatus.textContent = "Áudio pronto";
        ponto.style.display = "none";
        pausar.disabled = true;
        tempo.textContent = formatar(duracao);

        if (enviarQuandoParar) {
          await enviar();
        }
      };

      gravador.onerror = () => {
        textoStatus.textContent = "Erro na gravação";
        liberarMicrofone();
        pararRelogio();
      };

      mostrarGravador();

      gravador.start();
      inicioTrecho = Date.now();

      timer = setInterval(atualizarRelogio, 200);

    } catch (erro) {
      console.error(erro);
      descartar();

      alert(
        "Não foi possível usar o microfone. Verifique a permissão."
      );

    } finally {
      iniciando = false;
    }
  }

  function alternarPausa() {
    if (!gravador) return;

    if (gravador.state === "recording") {
      tempoAcumulado += Date.now() - inicioTrecho;

      gravador.pause();
      pararRelogio();

      pausar.textContent = "▶";
      textoStatus.textContent = "Pausado";
      ponto.style.display = "none";

    } else if (gravador.state === "paused") {
      if (tempoAcumulado >= 30000) {
        finalizar(false);
        return;
      }

      gravador.resume();
      inicioTrecho = Date.now();

      pausar.textContent = "Ⅱ";
      textoStatus.textContent = "Gravando";
      ponto.style.display = "";

      timer = setInterval(atualizarRelogio, 200);
    }
  }

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

    enviarAudioBtn.disabled = true;
    excluir.disabled = true;
    pausar.disabled = true;
    textoStatus.textContent = "Enviando...";

    try {
      if (
        audioPronto.size < 100 ||
        audioPronto.size > 2 * 1024 * 1024
      ) {
        throw new Error("Áudio vazio ou muito grande.");
      }

      const { user, chatId } = await contexto();

      if (chatId !== chatGravado) {
        throw new Error(
          "Conversa alterada. Grave novamente."
        );
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
          retorno.error || "Não foi possível enviar."
        );
      }

      enviando = false;
      descartar();

    } catch (erro) {
      console.error("Envio de áudio:", erro);
      textoStatus.textContent = "Falha no envio";
      alert(erro.message);

    } finally {
      enviando = false;
      enviarAudioBtn.disabled = false;
      excluir.disabled = false;
    }
  }

  mic.onclick = iniciar;
  pausar.onclick = alternarPausa;
  excluir.onclick = descartar;
  enviarAudioBtn.onclick = enviar;

  // IDENTIFICAR CONTATO

  function selecionarContato(evento) {
    const item = evento.target.closest(".contato");

    if (!item) return;

    if (!enviando) descartar();

    contatoId = item.dataset.uid || null;
  }

  contatos.addEventListener("click", selecionarContato);

  contatos.addEventListener("keydown", evento => {
    if (evento.key === "Enter" || evento.key === " ") {
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

  // PLAYER DE ÁUDIO NO CHAT

  function montarPlayer(bolha) {
    if (
      bolha.dataset.tipo !== "audio" ||
      bolha.dataset.playerPronto === "1"
    ) return;

    bolha.dataset.playerPronto = "1";
    bolha.replaceChildren();

    const caixa = criar("div", "mp-player-voz");
    const botao = criar("button", "mp-play", "▶");
    botao.type = "button";

    const dados = criar("div", "mp-player-dados");
    const progresso = criar("input", "mp-player-barra");
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
        botao.textContent = "▶";
        return;
      }

      try {
        if (!url) {
          carregando = true;
          botao.textContent = "…";

          const user = await usuarioAtual();

          if (!user) {
            throw new Error("Faça login para ouvir.");
          }

          const token = await user.getIdToken();

          const resposta = await fetch(
            SERVER + "/api/audio/" +
              encodeURIComponent(bolha.dataset.chatId) +
              "/" +
              encodeURIComponent(bolha.dataset.messageId),
            {
              headers: {
                Authorization: "Bearer " + token
              }
            }
          );

          if (!resposta.ok) {
            throw new Error(
              "Erro ao carregar áudio: " + resposta.status
            );
          }

          const arquivo = await resposta.blob();

          url = URL.createObjectURL(arquivo);
          audio.src = url;
          progresso.disabled = false;
        }

        await audio.play();
        botao.textContent = "Ⅱ";

      } catch (erro) {
        console.error("Reprodução:", erro);
        botao.textContent = "▶";
        textoTempo.textContent = "Erro ao ouvir";
      } finally {
        carregando = false;
      }
    };

    audio.onpause = () => {
      botao.textContent = "▶";
    };

    audio.onended = () => {
      botao.textContent = "▶";
      progresso.value = "0";
    };

    audio.ontimeupdate = () => {
      if (
        Number.isFinite(audio.duration) &&
        audio.duration > 0
      ) {
        progresso.value = String(
          Math.round(
            audio.currentTime / audio.duration * 100
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

    const observador = new MutationObserver(() => {
      if (!bolha.isConnected) {
        audio.pause();

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

  new MutationObserver(atualizarPlayers).observe(lista, {
    childList: true
  });

  atualizarPlayers();
})();
