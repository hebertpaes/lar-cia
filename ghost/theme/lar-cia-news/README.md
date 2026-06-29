# LAR & CIA News — tema Ghost de notícias

Portal de notícias de Mato Grosso (Cuiabá, Várzea Grande e região), no estilo
dos grandes portais (Fox News, CNN, Politico como referência de layout).
Código 100% original e versionável.

## Recursos

- **Capa** (`home.hbs`): manchete principal + chamadas, trilho "Mais lidas",
  blocos por editoria, faixa de últimas notícias (ticker) e bloco de Fontes.
- **Editorias** por tag (`/tag/{slug}/`, rota padrão do Ghost — sem precisar de
  routes.yaml): Política, Cidades, Polícia, Economia, Agro, Brasil & Mundo, etc.
- **Sistema de publicidade** nativo (3 zonas) — veja `PUBLICIDADE.md`.
- **Tema claro/escuro**, busca, menu mobile, relógio e data.
- **Selo DEMO** em conteúdo de demonstração (tag interna `#demo`).
- **Membros/Newsletter** nativos do Ghost.
- **Rede de portais** (Hebert Paes) no rodapé.

## Instalação no Ghost local

```bash
# 1) Copie o tema para o Ghost (ajuste o caminho do seu content/themes)
cp -R ghost/theme/lar-cia-news "$GHOST_CONTENT/themes/lar-cia-news"

# 2) No Ghost Admin: Settings → Design → Change theme → Installed → Activate
#    (ou faça upload do .zip do tema)
#
# Roteamento: NÃO precisa de routes.yaml. As editorias usam a rota padrão
# /tag/{slug}/ e a home usa home.hbs automaticamente.
```

## Conteúdo de demonstração

```bash
# Gera o arquivo de importação
node ghost/import/generate-news-import.mjs   # cria ghost/import/news-import.json

# No Ghost Admin: Settings → Labs → Import content → selecione news-import.json
```

Isso cria as editorias, ~20 artigos-modelo, releases-modelo com atribuição,
páginas (Sobre, Anuncie, Fontes oficiais, Contato) e 3 anúncios de exemplo.

## Importante (direitos autorais)

- Todo o texto de demonstração é **original**. Nada é copiado de veículos privados.
- **Releases de órgãos públicos** podem ser reproduzidos **com atribuição**.
- **Matérias de veículos privados** (Olhar Direto, Gazeta, O Documento, CNN,
  Fox, Politico) são apenas **referenciadas e linkadas** à fonte — nunca copiadas.
