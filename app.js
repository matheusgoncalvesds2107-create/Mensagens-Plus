const SERVIDOR_NOTIFICACOES =
  "https://mensagens-plus-notificacoes.onrender.com";

// ENVIAR MENSAGEM E SOLICITAR NOTIFICAÇÃO
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
    // 1. SALVAR MENSAGEM NO FIREBASE
    const mensagemSalva = await addDoc(
      collection(db, "chats", chatId, "messages"),
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

    // 2. ENVIAR AVISO PARA O SERVIDOR
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
            chatId: chatId,
            messageId: mensagemSalva.id
          })
        }
      );

      if (!resposta.ok) {
        throw new Error(
          "Servidor respondeu " + resposta.status
        );
      }

      const resultado = await resposta.json();

      console.log(
        "Notificação Mensagens Plus:",
        resultado
      );

    } catch (erroNotificacao) {
      console.warn(
        "Mensagem salva, mas notificação falhou:",
        erroNotificacao
      );
    }

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
