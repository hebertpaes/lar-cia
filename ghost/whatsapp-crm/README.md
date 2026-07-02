# WhatsApp CRM + Disparo em massa (starter)

Serviço **separado** do site (o tema Ghost é só a vitrine). Aqui fica o
back-end que conecta o WhatsApp, guarda os contatos (CRM) e faz disparos.
O chat do site pode falar com este serviço apontando `chat_ia_url` (em
Design) para o endpoint `/chat` do `server.mjs`.

## ⚠️ Leia antes (importante — evita banimento e problema legal)
- **Disparo em massa para quem NÃO deu opt-in é SPAM.** Fere as regras do
  WhatsApp e a **LGPD**. Só envie para quem **autorizou** receber suas mensagens.
- **Modo oficial (recomendado): WhatsApp Business Cloud API (Meta).**
  É o caminho permitido para envio em escala. Exige: conta Meta Business, número
  verificado (WABA), **templates aprovados** pela Meta e opt-in dos contatos.
  Fora da janela de 24h só é possível enviar **templates aprovados**.
- **Modo QR (whatsapp-web.js): NÃO oficial.** Conecta lendo o QR do WhatsApp Web.
  Serve para testes/atendimento 1-a-1, mas **usar para disparo em massa viola os
  Termos do WhatsApp e pode banir seu número permanentemente.** Use por sua conta
  e risco, com moderação.

## Componentes
| Arquivo | Função |
|---|---|
| `crm.mjs` | CRM simples: adiciona/lista contatos, opt-in/opt-out (arquivo `contacts.json`). |
| `broadcast.mjs` | **Disparo oficial** (Cloud API): envia um template para a lista, com limite de taxa, `--dry-run` e pulo de opt-out. |
| `qr-session.mjs` | Conexão **via QR** (whatsapp-web.js) para atendimento/envio pontual. Opcional. |
| `server.mjs` | Webhook: recebe mensagens recebidas (monta o CRM) e expõe `/chat` para o assistente do site. |

## Setup
```bash
cd ghost/whatsapp-crm
cp .env.example .env          # preencha os tokens
cp contacts.example.json contacts.json
npm install                   # instala o necessário (ver package.json)
```

### Modo oficial (Cloud API)
No `.env`: `WA_TOKEN` (token permanente da WABA), `WA_PHONE_ID` (ID do número),
`WA_TEMPLATE` (nome do template aprovado) e `WA_LANG` (ex.: `pt_BR`).
```bash
node broadcast.mjs --dry-run                 # simula (não envia)
node broadcast.mjs --template=promo_semana   # envia o template para os opt-in
node crm.mjs add 5565999990000 "Fulano" cliente   # cadastra contato
node crm.mjs optout 5565999990000            # remove do disparo
node crm.mjs stats
```

### Modo QR (opcional, não oficial)
```bash
npm i whatsapp-web.js qrcode-terminal        # dependências extras
node qr-session.mjs                          # mostra o QR; escaneie no celular
```

### Conectar ao chat do site
Suba o `server.mjs` (`node server.mjs`) e coloque a URL pública dele + `/chat`
em **Ghost → Settings → Design → `chat_ia_url`**. O assistente do site passa a
responder pela sua IA/fluxo e pode registrar o lead no CRM.

## Automação
Agende o disparo (cron) — ex.: toda 2ª às 9h, respeitando opt-in:
```cron
0 9 * * 1 cd /caminho/lar-cia/ghost/whatsapp-crm && /usr/local/bin/node broadcast.mjs --template=boletim_semanal >> /tmp/wa.log 2>&1
```

> Este é um **starter** funcional (CLI/serviço), não um painel gráfico pronto.
> Dá para evoluir para uma tela no admin, mas o núcleo (conexão, CRM, disparo)
> já está aqui.
