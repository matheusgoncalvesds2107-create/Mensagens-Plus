
/*
 MENSAGENS PLUS
 Áudio real com Render + Cloudinary
*/

(() => {
  const SERVER =
    "https://mensagens-plus-notificacoes.onrender.com";

  const form = document.getElementById("form-enviar");
  const campo = document.getElementById("texto");
  const lista = document.getElementById("mensagens");
  const contatos = document.getElementById("contatos");

  if (!form || !campo || !lista || !contatos) return;

  let contatoId = null;
  let recorder = null;
  let stream = null;
  let chunks = [];
  let blobPronto = null;
  let urlPrevia = null;
  let timer = null;
  let inicio = 0;
  let duracao = 0;
  let descartando = false;
  let enviando = false;
  let iniciando = false;
  let chatGravado = null;
  let tokenUsuario = null;

  const $ = (tag, classe, texto) => {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto) e.textContent = texto;
    return e;
  };

  document.head.insertAdjacentHTML("beforeend", `
    <style>
      .mp-mic {
        width:46px;
        height:46px;
        min-width:46px;
        border:0;
        border-radius:50%;
        background:#00a884;
        color:#fff;
        font-size:23px;
        display:grid;
        place-items:center;
      }
      .mp-mic:disabled { opacity:.45; }
      .mp-mic.gravando {
        background:#e53955;
        animation:mp-pulsar 1s infinite;
      }
      @keyframes mp-pulsar {
        50% { opacity:.55; }
      }
      .mp-gravador {
        background:#202c33;
        color:white;
        padding:10px;
        display:flex;
        flex-direction:column;
        gap:9px;
      }
      .mp-gravador[hidden] { display:none; }
      .mp-linha {
        display:flex;
        gap:10px;
        align-items:center;
      }
      .mp-relogio {
        min-width:48px;
        font-size:14px;
        font-variant-numeric:tabular-nums;
      }
      .mp-situacao {
        flex:1;
        font-size:13px;
        color:#d8e3e6;
      }
      .mp-previa {
        width:100%;
        height:38px;
      }
      .mp-previa[hidden] { display:none; }
      .mp-botoes {
        display:flex;
        gap:8px;
      }
      .mp-botoes button {
        flex:1;
        padding:10px;
        border:0;
        border-radius:12px;
        font-weight:bold;
        color:white;
      }
      .mp-cancelar { background:#59656d; }
      .mp-acao { background:#008f68; }
      .mp-botoes button:disabled { opacity:.5; }
      .mp-audio-player {
        display:flex;
        align-items:center;
        gap:9px;
        min-width:190px;
        max-width:270px;
      }
      .mp-audio-tocar {
        border:0;
        width:39px;
        height:39px;
        min-width:39px;
        border-radius:50%;
        background:#d6f5e8;
        color:#095a43;
        font-size:17px;
      }
      .mp-audio-detalhes {
        flex:1;
        min-width:0;
        display:flex;
        flex-direction:column;
        gap:5px;
      }
      .mp-audio-barra {
        width:100%;
        accent-color:#c2f1da;
      }
      .mp-audio-label {
        font-size:11px;
        opacity:.9;
      }
      .mp-audio-erro {
        color:#ffd2c9;
        font-size:11px;
      }
    </style>
  `);

  // BOTÃO DO MICROFONE

  const mic = $("button", "mp-mic", "🎙");
  mic.type = "button";
  mic.disabled = true;
  mic.title = "Gravar mensagem de voz";
  mic.setAttribute("aria-label", "Gravar áudio");
  form.appendChild(mic);

  // BARRA DE GRAVAÇÃO

  const painel = $("div", "mp-gravador");
  painel.hidden = true;

  const linha = $("div", "mp-linha");
  const relogio = $("span", "mp-relogio", "00:00");
  const situacao = $("span", "mp-situacao", "");

  linha.append(relogio, situacao);

  const previa = $("audio", "mp-previa");
  previa.controls = true;
  previa.hidden = true;

  const botoes = $("div", "mp-botoes");

  const descartar = $(
    "button",
    "mp-cancelar",
    "Descartar"
  );
  descartar.type = "button";

  const acao = $(
    "button",
    "mp-acao",
    "Parar"
  );
  acao.type = "button";

  botoes.append(descartar, acao);
  painel.append(linha, previa, botoes);

  form.parentElement.insertBefore(painel, form);

  function formatar(segundos) {
    const n = Math.max(0, Math.floor(segundos));

    return (
      String(Math.floor(n / 60)).padStart(2, "0") +
      ":" +
      String(n % 60).padStart(2, "0")
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

  function limparStream() {
    stream?.getTracks().forEach(t => t.stop());
    stream = null;
  }

  function pararTimer() {
    clearInterval(timer);
    timer = null;
  }

  function limparPrevia() {
    previa.pause();
    previa.removeAttribute("src");
    previa.load();

    if (urlPrevia) {
      URL.revokeObjectURL(urlPrevia);
      urlPrevia = null;
    }

    previa.hidden = true;
  }

  function fechar() {
    descartando = true;
    pararTimer();

    if (recorder?.state === "recording") {
      recorder.stop();
    }

    limparStream();
    limparPrevia();

    chunks = [];
    blobPronto = null;
    chatGravado = null;
    duracao = 0;
    painel.hidden = true;
    mic.classList.remove("gravando");
  }

  function pararGravacao() {
    if (recorder?.state === "recording") {
      recorder.stop();
    }
  }

  async function iniciarGravacao() {
    if (campo.disabled || iniciando || enviando) return;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      alert("Este navegador não suporta gravação.");
      return;
    }

    iniciando = true;

    try {
      const { chatId } = await contexto();

      fechar();
      descartando = false;
      chatGravado = chatId;

      stream = await navigator.mediaDevices.getUserMedia({
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

      recorder = new MediaRecorder(
        stream,
        formato
          ? { mimeType: formato, audioBitsPerSecond: 24000 }
          : { audioBitsPerSecond: 24000 }
      );

      chunks = [];
      blobPronto = null;

      recorder.ondataavailable = e => {
        if (e.data.size) chunks.push(e.data);
      };

      recorder.onstop = () => {
        pararTimer();
        limparStream();
        mic.classList.remove("gravando");

        if (descartando) return;

        duracao = Math.max(
          1,
          Math.min(30, Math.ceil(
            (Date.now() - inicio) / 1000
          ))
        );

        const tipo = recorder.mimeType ||
          chunks[0]?.type ||
          "audio/webm";

        blobPronto = new Blob(chunks, {
          type: tipo
        });

        if (
          blobPronto.size < 100 ||
          blobPronto.size > 2 * 1024 * 1024
        ) {
          situacao.textContent =
            "Áudio vazio ou grande demais.";
          acao.disabled = true;
          return;
        }

        urlPrevia = URL.createObjectURL(blobPronto);
        previa.src = urlPrevia;
        previa.hidden = false;

        situacao.textContent = "Pronto para enviar";
        relogio.textContent = formatar(duracao);
        acao.textContent = "Enviar ➤";
        acao.disabled = false;
      };

      painel.hidden = false;
      previa.hidden = true;
      relogio.textContent = "00:00";
      situacao.textContent = "Gravando...";
      acao.textContent = "Parar";
      acao.disabled = false;

      recorder.start();
      inicio = Date.now();

      mic.classList.add("gravando");

      timer = setInterval(() => {
        const segundos = (Date.now() - inicio) / 1000;
        relogio.textContent = formatar(segundos);

        if (segundos >= 29.5) {
          pararGravacao();
        }
      }, 200);

    } catch (erro) {
      console.error("Microfone:", erro);
      fechar();
      alert(
        "Não foi possível gravar. Verifique a permissão do microfone."
      );
    } finally {
      iniciando = false;
    }
  }

  async function enviarAudio() {
    if (!blobPronto || enviando) return;

    enviando = true;
    acao.disabled = true;
    descartar.disabled = true;
    situacao.textContent = "Enviando áudio...";

    try {
      const { user, chatId } = await contexto();

      if (chatId !== chatGravado) {
        throw new Error(
          "Você mudou de conversa. Grave novamente."
        );
      }

      const token = await user.getIdToken();

      const dados = new FormData();

      const tipo = blobPronto.type.split(";")[0];

      const extensoes = {
        "audio/webm": "webm",
        "audio/mp4": "m4a",
        "audio/ogg": "ogg",
        "audio/mpeg": "mp3"
      };

      if (!extensoes[tipo]) {
        throw new Error("Formato de áudio não aceito.");
      }

      dados.append(
        "audio",
        blobPronto,
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
          retorno.error || "Falha ao enviar áudio."
        );
      }

      situacao.textContent = "Áudio enviado!";
      fechar();

    } catch (erro) {
      console.error("Envio de áudio:", erro);
      situacao.textContent = erro.message;
      alert("Não foi possível enviar: " + erro.message);

    } finally {
      enviando = false;
      acao.disabled = false;
      descartar.disabled = false;
    }
  }

  // AÇÕES

  mic.onclick = () => {
    if (recorder?.state === "recording") {
      pararGravacao();
    } else if (!painel.hidden && blobPronto) {
      // Não descartar uma prévia por acidente.
      painel.hidden = false;
    } else {
      iniciarGravacao();
    }
  };

  acao.onclick = () => {
    if (recorder?.state === "recording") {
      pararGravacao();
    } else {
      enviarAudio();
    }
  };

  descartar.onclick = () => {
    if (!enviando) fechar();
  };

  // IDENTIFICAR CONVERSA SELECIONADA

  contatos.addEventListener("click", e => {
    const item = e.target.closest(".contato");
    if (!item) return;

    contatoId = item.dataset.uid || null;

    if (!enviando) fechar();
  });

  contatos.addEventListener("keydown", e => {
    if (e.key !== "Enter" && e.key !== " ") return;

    const item = e.target.closest(".contato");
    if (!item) return;

    contatoId = item.dataset.uid || null;
    if (!enviando) fechar();
  });

  function verificar() {
    mic.disabled = campo.disabled || enviando;

    if (campo.disabled && !enviando && !painel.hidden) {
      fechar();
    }
  }

  new MutationObserver(verificar).observe(campo, {
    attributes: true,
    attributeFilter: ["disabled"]
  });

  verificar();

  // PLAYER DE ÁUDIO DENTRO DA CONVERSA

  function montarPlayer(bolha) {
    if (
      bolha.dataset.tipo !== "audio" ||
      bolha.dataset.playerPronto === "1"
    ) {
      return;
    }

    bolha.dataset.playerPronto = "1";
    bolha.replaceChildren();

    const caixa = $("div", "mp-audio-player");
    const tocar = $("button", "mp-audio-tocar", "▶");
    tocar.type = "button";
    tocar.setAttribute("aria-label", "Reproduzir áudio");

    const detalhes = $("div", "mp-audio-detalhes");
    const barra = $("input", "mp-audio-barra");
    barra.type = "range";
    barra.min = 0;
    barra.max = 100;
    barra.value = 0;
    barra.disabled = true;

    const label = $(
      "span",
      "mp-audio-label",
      "🎙 " + formatar(
        Number(bolha.dataset.duracao || 0)
      )
    );

    detalhes.append(barra, label);
    caixa.append(tocar, detalhes);
    bolha.appendChild(caixa);

    const audio = new Audio();
    let url = null;
    let carregando = false;

    audio.onended = () => {
      tocar.textContent = "▶";
      barra.value = 0;
    };

    audio.ontimeupdate = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        barra.value = String(
          Math.round(audio.currentTime / audio.duration * 100)
        );
        label.textContent =
          "🎙 " + formatar(audio.currentTime) +
          " / " + formatar(audio.duration);
      }
    };

    barra.oninput = () => {
      if (Number.isFinite(audio.duration)) {
        audio.currentTime =
          Number(barra.value) / 100 * audio.duration;
      }
    };

    tocar.onclick = async () => {
      if (carregando) return;

      if (!audio.paused) {
        audio.pause();
        tocar.textContent = "▶";
        return;
      }

      // Pausar outros áudios da conversa.
      document.querySelectorAll(
        ".mp-audio-tocar"
      ).forEach(b => {
        if (b !== tocar && b.textContent === "Ⅱ") {
          b.click();
        }
      });

      try {
        if (!url) {
          carregando = true;
          tocar.textContent = "…";

          const user = await usuarioAtual();
          if (!user) {
            throw new Error("Faça login para ouvir.");
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
          barra.disabled = false;
        }

        await audio.play();
        tocar.textContent = "Ⅱ";

      } catch (erro) {
        console.error("Player Mensagens Plus:", erro);
        tocar.textContent = "▶";
        label.textContent = "Não foi possível ouvir";
      } finally {
        carregando = false;
      }
    };

    // Liberar arquivo quando a bolha sair da tela.
    const obs = new MutationObserver(() => {
      if (!bolha.isConnected) {
        audio.pause();
        audio.removeAttribute("src");

        if (url) URL.revokeObjectURL(url);

        obs.disconnect();
      }
    });

    obs.observe(lista, { childList: true });
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
