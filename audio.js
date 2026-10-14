
/*
 * Mensagens Plus
 * Gravador de voz — primeira etapa
 * Gravação e reprodução local
 */

(() => {
  const form = document.getElementById("form-enviar");
  const campo = document.getElementById("texto");

  if (!form || !campo) return;

  const estilo = document.createElement("style");

  estilo.textContent = `
    .mp-mic {
      width: 47px;
      height: 47px;
      min-width: 47px;
      border: 0;
      border-radius: 50%;
      background: #00a884;
      color: white;
      display: grid;
      place-items: center;
      cursor: pointer;
      font-size: 22px;
    }

    .mp-mic:disabled {
      opacity: .45;
    }

    .mp-mic.gravando {
      background: #dc3545;
      animation: mp-pulsar 1s infinite;
    }

    @keyframes mp-pulsar {
      50% { opacity: .6; }
    }

    .mp-audio-painel {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 24px);
      max-width: 420px;
      background: #202c33;
      color: white;
      padding: 18px;
      border-radius: 18px;
      z-index: 1000;
      box-shadow: 0 8px 30px #0007;
    }

    .mp-audio-painel[hidden] {
      display: none;
    }

    .mp-audio-painel audio {
      width: 100%;
      margin: 12px 0;
    }

    .mp-audio-acoes {
      display: flex;
      flex-wrap: wrap;
      gap: 9px;
    }

    .mp-audio-acoes button {
      background: #00a884;
      color: white;
      border: 0;
      padding: 11px;
      border-radius: 10px;
      font-weight: bold;
      flex: 1;
    }

    .mp-audio-acoes .excluir {
      background: #65404a;
    }

    .mp-audio-status {
      font-size: 13px;
      color: #d0dde0;
      margin-top: 8px;
    }
  `;

  document.head.append(estilo);

  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "mp-mic";
  botao.textContent = "🎙";
  botao.title = "Gravar áudio";
  botao.setAttribute("aria-label", "Gravar áudio");

  form.append(botao);

  const painel = document.createElement("div");
  painel.className = "mp-audio-painel";
  painel.hidden = true;

  const titulo = document.createElement("strong");
  titulo.textContent = "Mensagem de voz";

  const status = document.createElement("div");
  status.className = "mp-audio-status";

  const player = document.createElement("audio");
  player.controls = true;
  player.hidden = true;

  const acoes = document.createElement("div");
  acoes.className = "mp-audio-acoes";

  const parar = document.createElement("button");
  parar.type = "button";
  parar.textContent = "Parar gravação";

  const salvar = document.createElement("button");
  salvar.type = "button";
  salvar.textContent = "Salvar teste";
  salvar.hidden = true;

  const excluir = document.createElement("button");
  excluir.type = "button";
  excluir.className = "excluir";
  excluir.textContent = "Descartar";

  acoes.append(parar, salvar, excluir);
  painel.append(titulo, status, player, acoes);
  document.body.append(painel);

  let gravador = null;
  let fluxo = null;
  let partes = [];
  let urlAudio = null;
  let tipoAudio = "";
  let descartando = false;

  function limparFluxo() {
    fluxo?.getTracks().forEach(track => track.stop());
    fluxo = null;
  }

  function limparAudio() {
    player.pause();
    player.removeAttribute("src");
    player.load();

    if (urlAudio) {
      URL.revokeObjectURL(urlAudio);
      urlAudio = null;
    }

    player.hidden = true;
    salvar.hidden = true;
  }

  function fechar() {
    descartando = true;

    if (gravador?.state === "recording") {
      gravador.stop();
    }

    limparFluxo();
    limparAudio();

    painel.hidden = true;
    botao.classList.remove("gravando");
  }

  async function gravar() {
    if (campo.disabled) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia ||
        typeof MediaRecorder === "undefined") {
      alert("Este navegador não suporta gravação de áudio.");
      return;
    }

    try {
      limparAudio();
      descartando = false;
      partes = [];

      fluxo = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      tipoAudio = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ].find(tipo => MediaRecorder.isTypeSupported(tipo)) || "";

      gravador = tipoAudio
        ? new MediaRecorder(fluxo, { mimeType: tipoAudio })
        : new MediaRecorder(fluxo);

      tipoAudio = gravador.mimeType;

      gravador.ondataavailable = evento => {
        if (evento.data.size > 0) {
          partes.push(evento.data);
        }
      };

      gravador.onstop = () => {
        limparFluxo();
        botao.classList.remove("gravando");

        if (descartando) return;

        const arquivo = new Blob(partes, {
          type: tipoAudio || "audio/webm"
        });

        if (!arquivo.size) {
          status.textContent = "Não foi possível gravar áudio.";
          return;
        }

        urlAudio = URL.createObjectURL(arquivo);
        player.src = urlAudio;
        player.hidden = false;
        salvar.hidden = false;
        parar.hidden = true;

        status.textContent =
          "Gravação pronta! Ouça antes de salvar.";
      };

      gravador.start();

      painel.hidden = false;
      parar.hidden = false;
      salvar.hidden = true;

      status.textContent =
        "Gravando... toque em Parar gravação.";

      botao.classList.add("gravando");

    } catch (erro) {
      limparFluxo();

      status.textContent = "Microfone indisponível.";
      alert(
        "Não foi possível acessar o microfone. " +
        "Confira a permissão do Chrome."
      );
    }
  }

  botao.onclick = gravar;

  parar.onclick = () => {
    if (gravador?.state === "recording") {
      gravador.stop();
    }
  };

  excluir.onclick = fechar;

  salvar.onclick = () => {
    if (!urlAudio) return;

    const extensao = tipoAudio.includes("mp4")
      ? "m4a"
      : "webm";

    const link = document.createElement("a");
    link.href = urlAudio;
    link.download = "mensagem-de-voz." + extensao;
    link.click();

    status.textContent =
      "Áudio salvo no celular para teste.";
  };
})();
