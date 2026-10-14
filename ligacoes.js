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
