
/*
 Mensagens Plus
 Ligações particulares - Interface inicial
*/

(() => {
  const contatos = document.getElementById("contatos");
  const barraChat = document.querySelector(".barra-chat");
  const campo = document.getElementById("texto");

  if (!contatos || !barraChat || !campo) return;

  let nomeContato = "Contato";

  const estilo = document.createElement("style");
  estilo.textContent = `
    .mp-botao-ligar {
      border: 0;
      background: transparent;
      color: #e6fff5;
      padding: 9px;
      display: grid;
      place-items: center;
      cursor: pointer;
    }
    .mp-botao-ligar svg {
      width: 24px;
      height: 24px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
    }
    .mp-tela-ligacao {
      position: fixed;
      inset: 0;
      z-index: 99999;
      background: #14232c;
      color: white;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 55px 20px 45px;
      font-family: Arial, sans-serif;
    }
    .mp-tela-ligacao.ativa {
      display: flex;
    }
    .mp-avatar-ligacao {
      width: 95px;
      height: 95px;
      background: #176c53;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 38px;
      margin-bottom: 18px;
    }
    .mp-nome-ligacao {
      font-size: 25px;
      font-weight: bold;
      text-align: center;
    }
    .mp-status-ligacao {
      color: #b7c8ce;
      margin-top: 12px;
      font-size: 14px;
      text-align: center;
    }
    .mp-controles-ligacao {
      display: flex;
      gap: 35px;
      align-items: center;
    }
    .mp-controle-ligacao {
      border: 0;
      background: #344650;
      color: white;
      width: 61px;
      height: 61px;
      border-radius: 50%;
      font-size: 24px;
    }
    .mp-controle-ligacao.desligar {
      background: #d33c4e;
    }
    .mp-controle-ligacao:disabled {
      opacity: .45;
    }
  `;
  document.head.appendChild(estilo);

  const botaoLigar = document.createElement("button");
  botaoLigar.type = "button";
  botaoLigar.className = "mp-botao-ligar";
  botaoLigar.title = "Ligação de voz";
  botaoLigar.setAttribute("aria-label", "Ligação de voz");
  botaoLigar.innerHTML = `
    <svg viewBox="0 0 24 24">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2
      19.8 19.8 0 0 1-8.6-3.1
      19.5 19.5 0 0 1-6-6
      A19.8 19.8 0 0 1 2.1 4.2
      2 2 0 0 1 4.1 2h3
      a2 2 0 0 1 2 1.7l.5 2.8
      a2 2 0 0 1-.6 1.7L7.2 9.9
      a16 16 0 0 0 6.9 6.9l1.7-1.8
      a2 2 0 0 1 1.7-.6l2.8.5
      a2 2 0 0 1 1.7 2z"/>
    </svg>
  `;
  barraChat.appendChild(botaoLigar);

  const tela = document.createElement("section");
  tela.className = "mp-tela-ligacao";
  tela.setAttribute("role", "dialog");
  tela.setAttribute("aria-label", "Ligação de voz");

  tela.innerHTML = `
    <div style="text-align:center">
      <div class="mp-avatar-ligacao">☎</div>
      <div class="mp-nome-ligacao"></div>
      <div class="mp-status-ligacao">
        Preparando ligação de voz
      </div>
    </div>
    <div class="mp-controles-ligacao">
      <button class="mp-controle-ligacao"
        type="button" disabled title="Microfone">
        ♩
      </button>
      <button class="mp-controle-ligacao"
        type="button" disabled title="Alto-falante">
        ◖))
      </button>
      <button class="mp-controle-ligacao desligar"
        type="button" title="Fechar">
        ☎
      </button>
    </div>
  `;

  document.body.appendChild(tela);

  const nomeTela = tela.querySelector(".mp-nome-ligacao");
  const fechar = tela.querySelector(".desligar");

  function selecionarContato(evento) {
    const item = evento.target.closest(".contato");
    if (!item) return;

    nomeContato =
      item.querySelector(".contato-nome")?.textContent ||
      item.textContent.trim() ||
      "Contato";
  }

  contatos.addEventListener("click", selecionarContato);

  botaoLigar.onclick = () => {
    if (campo.disabled) return;

    nomeTela.textContent = nomeContato;
    tela.classList.add("ativa");
  };

  fechar.onclick = () => {
    tela.classList.remove("ativa");
  };
})();
