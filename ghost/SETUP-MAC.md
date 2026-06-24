# Lar&Cia — Passo a passo no Terminal do Mac

Do zero até o site rodando em `http://localhost:2368`. Copie e cole bloco a bloco.

---

## 0) Pré-requisitos (só na primeira vez)

```bash
# Homebrew (pule se já tiver — teste com: brew -v)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Ferramentas de compilação do macOS (para o SQLite do Ghost)
xcode-select --install        # se já estiver instalado, pode ignorar o aviso

# Node 22 (LTS) + Git
brew install node@22 git

# Deixar o Node 22 no PATH (Apple Silicon e Intel)
export PATH="$(brew --prefix node@22)/bin:$PATH"
echo "export PATH=\"$(brew --prefix node@22)/bin:\$PATH\"" >> ~/.zshrc

# Conferir (precisa mostrar v22.x)
node -v && npm -v

# Ghost CLI
npm install -g ghost-cli@latest
ghost -v
```

---

## 1) Baixar o projeto

```bash
# Escolha onde guardar (ex.: ~/Sites)
mkdir -p ~/Sites && cd ~/Sites

# Clonar e entrar na branch do projeto
git clone https://github.com/hebertpaes/lar-cia.git
cd lar-cia
git checkout claude/wonderful-bardeen-y8640f
```
> Alternativa sem git: descompacte o `lar-cia-projeto.zip` que recebeu e
> entre na pasta `lar-cia`.

---

## 2) Subir tudo com 1 comando (recomendado)

```bash
ADMIN_PASS='TroqueEstaSenha123' bash ghost/scripts/macos-quickstart.sh
```
Esse script: instala o Ghost local (SQLite, sem Docker) → monta o projeto
**Lar&Cia** (tema + 16 imóveis + blog + páginas + marca azul) → roda os
testes → abre `http://localhost:2368` no navegador.

---

## 2-alt) Passo a passo manual (entendendo cada etapa)

```bash
# a) Instalar o Ghost local numa pasta própria
mkdir -p ~/lar-cia-ghost && cd ~/lar-cia-ghost
ghost install local

# b) Voltar para a pasta do repositório
cd ~/Sites/lar-cia

# c) Provisionar o projeto (tema + conteúdo + rotas + cor/navegação)
ADMIN_PASS='TroqueEstaSenha123' bash ghost/scripts/local-setup.sh

# d) Rodar os testes de fumaça
bash ghost/scripts/smoke-test.sh

# e) Abrir no navegador
open http://localhost:2368
```

---

## 3) Acessos

```text
Site:   http://localhost:2368
Admin:  http://localhost:2368/ghost
        login: ciencia@msn.com
        senha: a que você passou em ADMIN_PASS
```

---

## 4) Comandos do dia a dia

```bash
cd ~/lar-cia-ghost      # pasta da instalação do Ghost
ghost ls                # status
ghost stop              # parar
ghost start             # iniciar
ghost restart           # reiniciar
ghost log               # ver logs
```

---

## 4.1) Ligar automaticamente no login (LaunchAgent)

Para o Ghost subir sozinho toda vez que você ligar o Mac (sem `ghost start`
na mão):

```bash
cd ~/Sites/lar-cia
ghost/scripts/install-autostart.sh        # usa ~/lar-cia-ghost por padrão
# se instalou em outra pasta:  ghost/scripts/install-autostart.sh /caminho/da/instalacao
```
Ele cria `~/Library/LaunchAgents/com.larcia.ghost.plist`, carrega e já liga o
site. Logs em `~/Library/Logs/larcia-ghost.log`.

Desativar:
```bash
launchctl unload ~/Library/LaunchAgents/com.larcia.ghost.plist
rm ~/Library/LaunchAgents/com.larcia.ghost.plist
```

## 5) Cadastrar/editar imóveis

**Opção visual (recomendada):** edite direto no Admin
(`http://localhost:2368/ghost`) → *Posts* → cada imóvel é um post com a tag
interna `#imovel` + a categoria.

**Opção em lote (pelo arquivo):** edite `seed/seed.json`, regenere e
recarregue do zero:
```bash
cd ~/Sites/lar-cia
node ghost/import/generate-ghost-import.mjs        # regera o import

# recarga limpa (apaga o conteúdo atual e recria a partir do seed)
cd ~/lar-cia-ghost && ghost stop && rm -f content/data/*.db && ghost start
cd ~/Sites/lar-cia && ADMIN_PASS='TroqueEstaSenha123' bash ghost/scripts/local-setup.sh
```

---

## 6) Resolução de problemas

```bash
# "command not found: ghost"  → reinstale o CLI
npm install -g ghost-cli@latest

# "Node version não suportada" → garanta o Node 22 no PATH
export PATH="$(brew --prefix node@22)/bin:$PATH"

# Porta 2368 ocupada → pare instâncias antigas
cd ~/lar-cia-ghost && ghost stop

# Ver o que está rodando
ghost ls
```

> As fotos dos imóveis (Unsplash) carregam normalmente no Mac, pois ele tem
> internet. Para publicar em produção depois, veja a seção **Produção** do
> `ghost/README.md`.
