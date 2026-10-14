/*
  MENSAGENS PLUS
  Parceira Vem Comigo Deus
  Gravador compacto de voz
*/

(() => {
  const form = document.getElementById("form-enviar");
  const campo = document.getElementById("texto");

  if (!form || !campo) return;

  const estilo = document.createElement("style");

  estilo.textContent = `
    .mp-mic {
      width: 46px;
      height: 46px;
      min-width: 46px;
      border: 0;
      border-radius: 50%;
      background: #00a884;
      color: white;
      display: grid;
      place-items: center;
      cursor: pointer;
    }

    .mp-mic:disabled {
      opacity: .45;
      cursor: default;
    }

    .mp-mic svg {
      width: 23px;
      height: 23px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .mp-mic.gravando {
      background: #e53955;
      animation: mp-pulse 1s infinite;
    }

    @keyframes mp-pulse {
      50% { opacity: .65; }
    }

    .mp-voz {
      background: #202c33;
      color: #e9edef;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      border-top: 1px solid #33434c;
    }

    .mp-voz[hidden] {
      display: none !important;
    }

    .mp-voz-linha {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .mp-ponto {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #ff4963;
      animation: mp-pulse 1s infinite;
    }

    .mp-tempo {
      font-size: 14px;
      font-variant-numeric: tabular-nums;
      min-width: 40px;
    }

    .mp-status {
      flex: 1;
      font-size: 13px;
      color: #c2cdd2;
    }

    .mp-voz audio {
      width: 100%;
      height: 43px;
    }

    .mp-acoes {
      display: flex;
      gap: 9px;
    }

    .mp-acoes button {
      border: 0;
      border-radius: 12px;
      padding: 11px 14px;
      font-weight: 700;
      cursor: pointer;
    }

    .mp-descartar {
      background: #45515a;
      color: white;
    }

    .mp-parar {
      background: #00a884;
      color: white;
      flex: 1;
    }

    .mp-acoes button[hidden] {
      display: none;
    }

    .mp-informacao {
      font-size: 12px;
      color: #b5c3c9;
      line-height: 1.4;
    }
  `;

  document.head.appendChild(estilo);

  // BOTAO DE MICROFONE
  const mic = document.createElement("button");

  mic.type = "button";
  mic.className = "mp-mic";
  mic.title = "Gravar mensagem de voz";
  mic.setAttribute("aria-label", "Gravar voz");

  mic.innerHTML = `
    <svg viewBox="0 0 24 24">
      <rect x="9" y="2" width="6" height="13" rx="3"/>
      <path d="M5 10a7 7 0 0 0 14 0"/>
      <path d="M12 17v5"/>
      <path d="M8 22h8"/>
    </svg>
  `;

  form.appendChild(mic);

  // BARRA COMPACTA DE AUDIO
  const painel = document.createElement("div");
  painel.className = "mp-voz";
  painel.hidden = true;

  const linha = document.createElement("div");
  linha.className = "mp-voz-linha";

  const ponto = document.createElement("span");
  ponto.className = "mp-ponto";

  const tempo = document.createElement("span");
  tempo.className = "mp-tempo";
  tempo.textContent = "00:00";

  const status = document.createElement("span");
  status.className = "mp-status";
  status.textContent = "Gravando áudio...";

  linha.append(ponto, tempo, status);

  const player = document.createElement("audio");
  player.controls = true;
  player.preload = "metadata";
  player.hidden = true;

  const acoes = document.createElement("div");
  acoes.className = "mp-acoes";

  const descartar = document.createElement("button");
  descartar.type = "button";
  descartar.className = "mp-descartar";
  descartar.textContent = "Descartar";

  const parar = document.createElement("button");
  parar.type = "button";
  parar.className = "mp-parar";
  parar.textContent = "Parar gravação";

  const informacao = document.createElement("div");
  informacao.className = "mp-informacao";
  informacao.hidden = true;

  acoes.append(descartar, parar);
  painel.append(linha, player, acoes, informacao);

  // FICA LOGO ACIMA DO CAMPO DE MENSAGEM
  form.parentElement.insertBefore(painel, form);

  let gravador = null;
  let fluxo = null;
  let partes = [];
  let urlAudio = null;
  let temporizador = null;
  let inicio = 0;
  let descartado = false;
  let iniciando = false;

  function atualizarTempo() {
    const segundos = Math.floor(
      (Date.now() - inicio) / 1000
    );

    const minutos = Math.floor(segundos / 60);
    const resto = segundos % 60;

    tempo.textContent =
      String(minutos).padStart(2, "0") +
      ":" +
      String(resto).padStart(2, "0");

    // LIMITE DE DOIS MINUTOS
    if (
      segundos >= 120 &&
      gravador?.state === "recording"
    ) {
      gravador.stop();
    }
  }

  function liberarMicrofone() {
    fluxo?.getTracks().forEach(track => track.stop());
    fluxo = null;
  }

  function limparPlayer() {
    player.pause();
    player.removeAttribute("src");
    player.load();

    if (urlAudio) {
      URL.revokeObjectURL(urlAudio);
      urlAudio = null;
    }

    player.hidden = true;
  }

  function pararRelogio() {
    if (temporizador !== null) {
      clearInterval(temporizador);
      temporizador = null;
    }
  }

  function fechar() {
    descartado = true;

    pararRelogio();

    if (gravador?.state === "recording") {
      gravador.stop();
    }

    liberarMicrofone();
    limparPlayer();

    partes = [];
    painel.hidden = true;
    mic.classList.remove("gravando");

    status.textContent = "";
    tempo.textContent = "00:00";
  }

  function prontoParaOuvir() {
    pararRelogio();
    liberarMicrofone();

    mic.classList.remove("gravando");

    if (descartado) return;

    const tipo = gravador?.mimeType || "audio/webm";

    const blob = new Blob(partes, {
      type: tipo
    });

    if (!blob.size) {
      status.textContent = "Gravação vazia.";
      parar.hidden = true;
      return;
    }

    urlAudio = URL.createObjectURL(blob);

    player.src = urlAudio;
    player.hidden = false;
    player.load();

    ponto.style.display = "none";
    parar.hidden = true;

    status.textContent = "Ouça sua gravação";

    informacao.hidden = false;
    informacao.textContent =
      "Prévia de áudio. O envio ao contato será ativado na próxima etapa.";
  }

  async function iniciarGravacao() {
    if (campo.disabled || iniciando) return;

    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      alert(
        "Seu navegador não suporta gravação de voz."
      );
      return;
    }

    iniciando = true;

    try {
      fechar();

      descartado = false;
      partes = [];

      fluxo = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      const formatos = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4"
      ];

      const formato = formatos.find(
        tipo => MediaRecorder.isTypeSupported(tipo)
      );

      gravador = formato
        ? new MediaRecorder(fluxo, { mimeType: formato })
        : new MediaRecorder(fluxo);

      gravador.ondataavailable = evento => {
        if (evento.data.size > 0) {
          partes.push(evento.data);
        }
      };

      gravador.onstop = prontoParaOuvir;

      gravador.onerror = () => {
        status.textContent = "Erro na gravação.";
        liberarMicrofone();
        pararRelogio();
        mic.classList.remove("gravando");
      };

      painel.hidden = false;
      player.hidden = true;
      parar.hidden = false;
      ponto.style.display = "";

      informacao.hidden = true;
      status.textContent = "Gravando sua voz...";
      tempo.textContent = "00:00";

      gravador.start();

      inicio = Date.now();

      temporizador = setInterval(
        atualizarTempo,
        500
      );

      mic.classList.add("gravando");

    } catch (erro) {
      console.error("Mensagens Plus áudio:", erro);

      fechar();

      alert(
        "Não foi possível acessar o microfone. " +
        "Verifique a permissão do navegador."
      );

    } finally {
      iniciando = false;
    }
  }

  mic.onclick = () => {
    if (gravador?.state === "recording") {
      gravador.stop();
    } else {
      iniciarGravacao();
    }
  };

  parar.onclick = () => {
    if (gravador?.state === "recording") {
      gravador.stop();
    }
  };

  descartar.onclick = fechar;

  // NAO PERMITIR GRAVAR FORA DE CONVERSA
  function verificarConversa() {
    mic.disabled = campo.disabled;

    if (
      campo.disabled &&
      !painel.hidden
    ) {
      fechar();
    }
  }

  new MutationObserver(verificarConversa).observe(
    campo,
    { attributes: true, attributeFilter: ["disabled"] }
  );

  verificarConversa();
})();
