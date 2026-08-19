let carrinho = [];

const PIX = {
    chave: "02581120002",
    nome: "VINICIUS ELY DOS SANTOS",
    cidade: "CERRO LARGO"
};

function formatarMoeda(valor) {
    return valor.toFixed(2).replace(".", ",");
}

function gerarTxid() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let txid = "";
    for (let i = 0; i < 25; i++) {
        txid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return txid;
}

function crc16CCITT(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
            crc &= 0xFFFF;
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

function montarCampo(id, valor) {
    const tamanho = valor.length.toString().padStart(2, "0");
    return id + tamanho + valor;
}

function gerarPayloadPix(valor) {
    const valorStr = valor.toFixed(2);

    let payload = "";
    payload += montarCampo("00", "01");
    payload += montarCampo("01", "12");

    let conta = "";
    conta += montarCampo("00", "br.gov.bcb.pix");
    conta += montarCampo("01", PIX.chave);
    payload += montarCampo("26", conta);

    payload += montarCampo("52", "0000");
    payload += montarCampo("53", "986");
    payload += montarCampo("54", valorStr);
    payload += montarCampo("58", "BR");
    payload += montarCampo("59", PIX.nome);
    payload += montarCampo("60", PIX.cidade);

    let adicional = "";
    adicional += montarCampo("05", gerarTxid());
    payload += montarCampo("62", adicional);

    const crc = crc16CCITT(payload + "6304");
    payload += "6304" + crc;

    return payload;
}

function atualizarCarrinho() {
    const container = document.getElementById("itens-carrinho");
    const totalEl = document.getElementById("total");

    if (carrinho.length === 0) {
        container.innerHTML = '<p class="carrinho-vazio">Seu carrinho está vazio.</p>';
        totalEl.textContent = "0,00";
        return;
    }

    let html = "";
    let total = 0;

    carrinho.forEach(function (item, index) {
        const subtotal = item.preco * item.quantidade;
        total += subtotal;

        html += `
            <div class="item-carrinho">
                <div class="item-info">
                    <span class="nome">${item.nome}</span>
                    <span class="preco-item">R$ ${formatarMoeda(item.preco)} x ${item.quantidade} = R$ ${formatarMoeda(subtotal)}</span>
                </div>
                <div class="item-controles">
                    <button class="btn-qty" data-action="diminuir" data-index="${index}">-</button>
                    <span class="quantidade">${item.quantidade}</span>
                    <button class="btn-qty" data-action="aumentar" data-index="${index}">+</button>
                    <button class="btn-remover" data-action="remover" data-index="${index}">Remover</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    totalEl.textContent = formatarMoeda(total);

    container.querySelectorAll("[data-action]").forEach(function (btn) {
        btn.addEventListener("click", manipularCarrinho);
    });
}

function adicionarAoCarrinho(nome, preco) {
    const existente = carrinho.find(function (item) {
        return item.nome === nome;
    });

    if (existente) {
        existente.quantidade++;
    } else {
        carrinho.push({ nome: nome, preco: preco, quantidade: 1 });
    }

    atualizarCarrinho();
}

function manipularCarrinho(evento) {
    const botao = evento.target;
    const action = botao.getAttribute("data-action");
    const index = parseInt(botao.getAttribute("data-index"));

    if (action === "aumentar") {
        carrinho[index].quantidade++;
    } else if (action === "diminuir") {
        carrinho[index].quantidade--;
        if (carrinho[index].quantidade <= 0) {
            carrinho.splice(index, 1);
        }
    } else if (action === "remover") {
        carrinho.splice(index, 1);
    }

    atualizarCarrinho();
}

function calcularTotal() {
    let total = 0;
    carrinho.forEach(function (item) {
        total += item.preco * item.quantidade;
    });
    return total;
}

function finalizarCompra() {
    if (carrinho.length === 0) {
        alert("Adicione itens ao carrinho antes de finalizar!");
        return;
    }

    if (typeof QRCode === "undefined") {
        alert("Erro: Biblioteca QR Code não carregou. Verifique sua conexão com a internet.");
        return;
    }

    const total = calcularTotal();
    const payload = gerarPayloadPix(total);

    const qrcodeContainer = document.getElementById("qrcode");
    qrcodeContainer.innerHTML = "";

    new QRCode(qrcodeContainer, {
        text: payload,
        width: 220,
        height: 220,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });

    document.getElementById("qrcode-total").textContent = formatarMoeda(total);
    document.getElementById("modal-overlay").classList.add("ativo");
}

function fecharModal() {
    document.getElementById("modal-overlay").classList.remove("ativo");
}

document.querySelectorAll(".produto button").forEach(function (botao) {
    botao.addEventListener("click", function () {
        const card = botao.closest(".produto");
        const nome = card.getAttribute("data-nome");
        const preco = parseFloat(card.getAttribute("data-preco"));
        adicionarAoCarrinho(nome, preco);
    });
});

document.getElementById("limpar-carrinho").addEventListener("click", function () {
    carrinho = [];
    atualizarCarrinho();
});

document.getElementById("finalizar-compra").addEventListener("click", finalizarCompra);

document.getElementById("fechar-modal").addEventListener("click", fecharModal);

document.getElementById("modal-overlay").addEventListener("click", function (evento) {
    if (evento.target === this) {
        fecharModal();
    }
});
