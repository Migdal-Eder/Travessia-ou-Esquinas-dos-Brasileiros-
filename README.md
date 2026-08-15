# Travessia — vade-mécum

Site de paidéia para o EP **Travessia (ou Esquinas dos Brasileiros)**, de Lupe e Calíope.

## O que está pronto

- jornada editorial em cinco esquinas, da paralisia à catarse;
- player contínuo com as cinco faixas armazenadas localmente;
- artes da capa e de cada faixa;
- letras integrais com as rubricas destacadas;
- leitura em três camadas: **rua → biblioteca → oficina**;
- perguntas maiêuticas e pistas que não funcionam como gabarito;
- dicionário pesquisável com mais de 60 chaves;
- caderno de bordo salvo apenas no navegador e exportável em `.txt`;
- mapa de progresso também salvo localmente;
- roteiro de roda de conversa para escola, família ou bar;
- controles de tamanho de texto, contraste e redução de movimento;
- leiaute responsivo, navegação por teclado e versão de impressão;
- tudo local, sem bibliotecas, fontes ou scripts externos.

## Abrir o site

Abra `index.html` no navegador ou sirva a pasta com qualquer servidor estático:

```bash
cd travessia-paideia
python3 -m http.server 4173
```

Depois visite `http://localhost:4173`.

## Publicar

A pasta pode ser publicada sem etapa de compilação em GitHub Pages, Netlify, Cloudflare Pages, Vercel ou hospedagem estática comum. O arquivo inicial é `index.html`.

Os áudios somam cerca de 36 MB. Uma hospedagem pública deve aceitar arquivos `.mp3` e, idealmente, requisições HTTP com `Range` para permitir busca imediata na linha do tempo.

## Onde editar

- `data.js` — faixas, letras, perguntas, camadas, dicionário e bibliografia;
- `index.html` — estrutura geral e textos de abertura/fecho;
- `styles.css` — direção visual e acessibilidade;
- `app.js` — player, busca, progresso, caderno e diálogos;
- `assets/` — capa, artes, ícone e áudio.

## Direitos

As letras, músicas e artes permanecem sob os direitos de seus respectivos autores. Os links bibliográficos levam a páginas externas apenas como pistas de leitura.
