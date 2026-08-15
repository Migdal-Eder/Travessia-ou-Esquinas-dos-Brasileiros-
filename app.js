(() => {
  "use strict";

  const data = window.TRAVESSIA_DATA;
  if (!data) return;

  const tracks = data.tracks;
  const glossary = data.glossary;
  const glossaryById = new Map(glossary.map(item => [item.id, item]));

  const KEYS = {
    completed: "travessia:completed:v1",
    notes: "travessia:notes:v1",
    preferences: "travessia:preferences:v1"
  };

  const notePrompts = [
    "Que promessa repetida você quer examinar?",
    "Qual muro pede uma pergunta melhor?",
    "Que trem chegou à sua estação?",
    "Que roda você não quer girar sozinho?",
    "Que recado sua tristeza precisa ouvir?"
  ];

  const artInfo = {
    cover: {
      image: "assets/capa-travessia.jpg",
      title: "A capa é a primeira pergunta",
      alt: "Capa de Travessia: numa esquina noturna, pessoas comuns se reúnem em torno de um livro e de uma vela; ao fundo, um rosto rompe um muro rachado; uma pequena Musa e sapatos de gafieira esperam na calçada.",
      copy: `<p><strong>Antes de decifrar, inventarie.</strong> Há um muro, um livro, velas, sapatos sem pés, uma pequena figura à esquerda e gente reunida sem palco.</p><p>Quem está ensinando? Quem está aprendendo? A pessoa que lê segura o livro, mas a roda inteira segura a cena. O rosto no muro pode gritar, cantar ou romper a própria pedra.</p><p>A arte já oferece a tese do EP sem escrevê-la: biblioteca e calçada não são inimigas.</p>`
    },
    0: {
      image: tracks[0].image,
      title: "O reflexo sabe mais que o documento?",
      alt: "Arte de Geral e Particular: sob a chuva, um homem de terno preto e branco segura um documento; um pássaro e um céu claro aparecem refletidos numa poça diante do muro.",
      copy: `<p><strong>Procure os pares.</strong> Preto e branco; homem e retrato; parede e poça; chuva e céu; documento na mão e pássaro sem fronteira.</p><p>Aquilo que parece menor — o reflexo — contém uma abertura luminosa que o muro não mostra. Mas reflexo também pode enganar. A pergunta de <em>eikásia</em> começa aí.</p>`
    },
    1: {
      image: tracks[1].image,
      title: "A rachadura e a voz ao ouvido",
      alt: "Arte de O Muro: Calíope sussurra a um homem diante de um gigante de pedra que chora; colunas e uma porta iluminada aparecem no próprio muro.",
      copy: `<p><strong>Quem vence quem nesta imagem?</strong> O homem não carrega marreta. Calíope não empurra. Adamastor ainda é enorme — e, mesmo assim, já chora.</p><p>A porta iluminada não está além da imagem: está dentro daquilo que parecia apenas obstáculo. Ver a entrada é parte da batalha.</p>`
    },
    2: {
      image: tracks[2].image,
      title: "Quando o trilho encontra a onda",
      alt: "Arte de Arrasta Trem: uma locomotiva atravessa uma esquina chuvosa onde os trilhos parecem encontrar uma grande onda; ao lado, sapatos de gafieira e o busto da Musa.",
      copy: `<p><strong>Duas forças ocupam o mesmo chão.</strong> O trem pede trilho; a onda não. A montagem visual faz o peso industrial encontrar o movimento líquido.</p><p>Os sapatos esperam vazios. Talvez o embarque da canção também seja um convite para calçá-los.</p>`
    },
    3: {
      image: tracks[3].image,
      title: "Quem toca o centro da roda?",
      alt: "Arte de A Roda de Fortuna: uma mão calejada gira uma roda que reúne, nos raios superiores, uma mesa farta e, nos inferiores, pessoas trabalhando a terra; um broto nasce junto ao eixo.",
      copy: `<p><strong>A roda contém dois andares do mesmo mundo.</strong> No alto, mesa posta; embaixo, plantio e corpo curvado. O eixo é tocado por uma mão que traz a terra nas unhas.</p><p>Ao lado, um broto não espera a ilustração terminar. Fortuna gira; a vida também cresce por baixo dela.</p>`
    },
    4: {
      image: tracks[4].image,
      title: "O corpo diante da porta aberta",
      alt: "Arte de Recado da Tristeza: um homem abre os braços na chuva diante de uma passagem clássica iluminada; os sapatos de gafieira ficam na calçada e o rosto no muro parece cantar.",
      copy: `<p><strong>A porta agora está aberta.</strong> O corpo que antes media o muro ocupa a rua inteira com os braços. A arquitetura antiga aparece iluminada, mas já não serve como fortaleza.</p><p>Os sapatos continuam na esquina: a libertação não é fugir da rua. É poder voltar a dançar nela.</p>`
    }
  };

  const storage = {
    get(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (_) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (_) {
        return false;
      }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (_) { /* sem armazenamento */ }
    }
  };

  const escapeHTML = value => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const normalize = value => String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const formatTime = seconds => {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const total = Math.floor(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  };

  let toastTimer;
  function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  /* ---------- Rendering ---------- */

  let completed = new Set(storage.get(KEYS.completed, []));
  let notes = storage.get(KEYS.notes, {});
  if (!notes || typeof notes !== "object" || Array.isArray(notes)) notes = {};

  function renderRoute() {
    const container = document.getElementById("route-map");
    if (!container) return;

    container.innerHTML = tracks.map(track => `
      <div class="route-stop ${completed.has(track.id) ? "done" : ""}" data-route-id="${escapeHTML(track.id)}">
        <div class="route-node" aria-hidden="true">${completed.has(track.id) ? "✓" : escapeHTML(track.number)}</div>
        <a class="route-card" href="#faixa-${escapeHTML(track.id)}">
          <small>${escapeHTML(track.stage)}</small>
          <h3>${escapeHTML(track.title)}</h3>
          <span class="route-alt">${escapeHTML(track.alternate)}</span>
          <span class="route-tension">${escapeHTML(track.tension)}<strong class="route-verb">${escapeHTML(track.verb)} →</strong></span>
        </a>
      </div>
    `).join("");

    updateProgressUI();
  }

  function renderLyrics(raw) {
    return raw
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const isRubric = line.startsWith("[") && line.endsWith("]");
        return isRubric
          ? `<div><span class="lyric-rubric">${escapeHTML(line.slice(1, -1))}</span></div>`
          : `<p class="lyric-line">${escapeHTML(line)}</p>`;
      })
      .join("");
  }

  function termPills(ids) {
    return ids.map(id => {
      const term = glossaryById.get(id);
      if (!term) return "";
      return `<button class="term-link" type="button" data-term="${escapeHTML(id)}">${escapeHTML(term.term)}</button>`;
    }).join("");
  }

  function renderTracks() {
    const container = document.getElementById("tracks-container");
    if (!container) return;

    container.innerHTML = tracks.map((track, index) => {
      const dark = index % 2 === 0;
      const next = tracks[index + 1];
      const art = artInfo[index];
      const done = completed.has(track.id);

      return `
        <section class="track-section ${dark ? "theme-dark" : "theme-light"}" id="faixa-${escapeHTML(track.id)}" data-index="${index + 1}" data-number="${escapeHTML(track.number)}" aria-labelledby="title-${escapeHTML(track.id)}">
          <div class="track-intro">
            <div class="track-art-wrap">
              <figure class="track-art">
                <img src="${escapeHTML(track.image)}" alt="${escapeHTML(art.alt)}" loading="lazy">
                <button class="track-art-play" type="button" data-play-track="${index}" aria-label="Ouvir ${escapeHTML(track.title)}"><span aria-hidden="true">▶</span></button>
                <figcaption><span>Arte da faixa ${escapeHTML(track.number)}</span><button class="text-button" type="button" data-open-art="${index}">ampliar</button></figcaption>
              </figure>
            </div>

            <div class="track-copy">
              <div class="track-kicker"><span>${escapeHTML(track.number)} · ${escapeHTML(track.stage)}</span></div>
              <h2 class="track-title" id="title-${escapeHTML(track.id)}">${escapeHTML(track.title)}<em>(${escapeHTML(track.alternate)})</em></h2>
              <p class="track-credit">${escapeHTML(track.credit)}</p>
              <div class="track-meta"><span>${escapeHTML(track.duration)}</span><span>${escapeHTML(track.style)}</span><span>${escapeHTML(track.tension)}</span></div>
              <p class="track-summary">${escapeHTML(track.summary)}</p>
              <div class="listen-question"><small>Escute com uma pergunta</small><p>${escapeHTML(track.listenPrompt)}</p></div>
              <div class="track-actions">
                <button class="button button-primary" type="button" data-play-track="${index}"><span aria-hidden="true">▶</span> Ouvir a faixa</button>
                <a class="button button-secondary" href="${escapeHTML(track.suno)}" target="_blank" rel="noopener">Abrir no Suno ↗</a>
              </div>
            </div>
          </div>

          <div class="track-body">
            <div class="track-plain">
              <blockquote class="track-quote">${escapeHTML(track.quote)}</blockquote>
              <p>${escapeHTML(track.plain)}</p>
            </div>

            <div class="subsection-heading">
              <h3>Abra a matriosca</h3>
              <p>Comece pela rua. A biblioteca e a oficina estão dentro dela — nunca acima.</p>
            </div>

            <div class="layer-list">
              ${track.layers.map((layer, layerIndex) => `
                <details class="layer-card" ${layerIndex === 0 ? "open" : ""}>
                  <summary>
                    <span class="layer-label">${escapeHTML(layer.label)}</span>
                    <strong>${escapeHTML(layer.title)}</strong>
                    <span class="layer-toggle" aria-hidden="true">+</span>
                  </summary>
                  <div class="layer-content">
                    <p>${layer.body}</p>
                    <div class="term-pills" aria-label="Chaves desta camada">${termPills(layer.terms)}</div>
                  </div>
                </details>
              `).join("")}
            </div>

            <div class="maieutic-block">
              <div class="question-panel">
                <h3>Perguntas para carregar</h3>
                <ol class="question-list">
                  ${track.questions.map(question => `<li><span>${escapeHTML(question)}</span></li>`).join("")}
                </ol>
              </div>

              <aside class="hint-panel">
                <h3>A Musa sopra</h3>
                <p>Não é resposta. É uma pista para voltar à obra.</p>
                ${track.hints.map((hint, hintIndex) => `
                  <details class="hint-item">
                    <summary>Pedir pista ${hintIndex + 1}</summary>
                    <p>${escapeHTML(hint)}</p>
                  </details>
                `).join("")}
                <div class="track-journal">
                  <label for="journal-${escapeHTML(track.id)}">Uma linha sua</label>
                  <textarea id="journal-${escapeHTML(track.id)}" data-note-id="${escapeHTML(track.id)}" placeholder="${escapeHTML(notePrompts[index])}">${escapeHTML(notes[track.id] || "")}</textarea>
                </div>
              </aside>
            </div>

            <details class="lyrics-block">
              <summary><strong>Letra completa</strong><span>com as rubricas do poeta e da Musa</span></summary>
              <div class="lyrics-inner">${renderLyrics(track.lyrics)}</div>
            </details>

            <div class="track-footer">
              <button class="button button-secondary complete-track ${done ? "done" : ""}" type="button" data-complete-track="${escapeHTML(track.id)}" aria-pressed="${done}">${done ? "Esquina atravessada ✓" : "Marcar como atravessada"}</button>
              ${next
                ? `<a class="next-track" href="#faixa-${escapeHTML(next.id)}">Próxima esquina: <span>${escapeHTML(next.title)} →</span></a>`
                : `<a class="next-track" href="#caderno">Agora, a sua letra: <span>abrir o caderno →</span></a>`}
            </div>
          </div>
        </section>
      `;
    }).join("");
  }

  function renderNotebook() {
    const container = document.getElementById("notebook-grid");
    if (!container) return;

    container.innerHTML = tracks.map((track, index) => `
      <article class="note-card">
        <small>Esquina ${escapeHTML(track.number)} · ${escapeHTML(track.verb)}</small>
        <h3>${escapeHTML(track.title)}</h3>
        <label for="notebook-${escapeHTML(track.id)}">${escapeHTML(notePrompts[index])}</label>
        <textarea id="notebook-${escapeHTML(track.id)}" data-note-id="${escapeHTML(track.id)}" placeholder="Escreva sem procurar a frase perfeita…">${escapeHTML(notes[track.id] || "")}</textarea>
      </article>
    `).join("");
  }

  function renderSources() {
    const container = document.getElementById("sources-grid");
    if (!container) return;

    container.innerHTML = data.sources.map((source, index) => `
      <article class="source-card">
        <small>pista ${String(index + 1).padStart(2, "0")}</small>
        <h3>${escapeHTML(source.title)}</h3>
        <p class="source-author">${escapeHTML(source.author)}</p>
        <p class="source-why">${escapeHTML(source.why)}</p>
        <footer>
          <span>${escapeHTML(source.reference)}</span>
          <a href="${escapeHTML(source.url)}" target="_blank" rel="noopener">seguir pista ↗</a>
        </footer>
      </article>
    `).join("");
  }

  let glossaryFilter = "all";
  let glossaryQuery = "";
  let glossaryExpanded = false;

  function itemMatchesCategory(item, filter) {
    if (filter === "all") return true;
    const kind = normalize(item.kind);
    const categoryWords = {
      forma: ["forma", "teatro", "ode", "poesia", "som da linguagem", "musica e teatro", "dramatic"],
      mitologia: ["mitologia", "mundo antigo", "rito", "lugar mitico"],
      literatura: ["literatura", "pessoa e voz", "musica brasileira", "tradicoes afro", "tradicao viva"],
      ideia: ["ideia", "filosofia", "sentimento", "criacao", "imagem", "linguagem", "vida social", "cidade", "territorio"]
    };
    return (categoryWords[filter] || []).some(word => kind.includes(word));
  }

  function renderGlossary() {
    const grid = document.getElementById("glossary-grid");
    const count = document.getElementById("glossary-count");
    if (!grid || !count) return;

    const query = normalize(glossaryQuery.trim());
    const matches = glossary.filter(item => {
      const haystack = normalize(`${item.term} ${item.kind} ${item.short} ${item.long}`);
      return itemMatchesCategory(item, glossaryFilter) && (!query || haystack.includes(query));
    });

    const canFold = glossaryFilter === "all" && !query;
    const visible = canFold && !glossaryExpanded ? matches.slice(0, 12) : matches;
    count.textContent = `${visible.length === matches.length ? matches.length : `${visible.length} de ${matches.length}`} ${matches.length === 1 ? "chave" : "chaves"}`;

    if (!matches.length) {
      grid.innerHTML = `<div class="empty-results"><strong>Nenhuma chave encontrada.</strong><br>Tente uma palavra menor — ou volte à música e traga outra pergunta.</div>`;
      return;
    }

    grid.innerHTML = visible.map(item => `
      <article class="glossary-card" id="chave-${escapeHTML(item.id)}">
        <small>${escapeHTML(item.kind)}</small>
        <h3>${escapeHTML(item.term)}</h3>
        <p>${escapeHTML(item.short)}</p>
        <button type="button" data-term="${escapeHTML(item.id)}">abrir outra camada</button>
      </article>
    `).join("") + (canFold && visible.length < matches.length
      ? `<div class="glossary-more"><button class="button button-secondary" type="button" data-action="expand-glossary">Mostrar mais ${matches.length - visible.length} chaves</button></div>`
      : "");
  }

  /* ---------- Progress ---------- */

  function updateProgressUI() {
    const count = completed.size;
    const countNode = document.getElementById("progress-count");
    const fill = document.getElementById("progress-fill");
    if (countNode) countNode.textContent = `${count} de ${tracks.length}`;
    if (fill) fill.style.width = `${(count / tracks.length) * 100}%`;

    document.querySelectorAll("[data-route-id]").forEach(node => {
      const id = node.getAttribute("data-route-id");
      const done = completed.has(id);
      node.classList.toggle("done", done);
      const circle = node.querySelector(".route-node");
      const track = tracks.find(item => item.id === id);
      if (circle && track) circle.textContent = done ? "✓" : track.number;
    });

    document.querySelectorAll("[data-complete-track]").forEach(button => {
      const done = completed.has(button.dataset.completeTrack);
      button.classList.toggle("done", done);
      button.setAttribute("aria-pressed", String(done));
      button.textContent = done ? "Esquina atravessada ✓" : "Marcar como atravessada";
    });
  }

  function toggleCompleted(id, force) {
    const shouldComplete = typeof force === "boolean" ? force : !completed.has(id);
    if (shouldComplete) completed.add(id);
    else completed.delete(id);
    storage.set(KEYS.completed, [...completed]);
    updateProgressUI();
    showToast(shouldComplete ? "Esquina marcada na sua travessia." : "Esquina devolvida ao caminho.");
  }

  /* ---------- Dialogs ---------- */

  const termDialog = document.getElementById("term-dialog");
  const artDialog = document.getElementById("art-dialog");

  function openDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  function openTerm(id) {
    const item = glossaryById.get(id);
    if (!item || !termDialog) return;
    document.getElementById("dialog-term-kind").textContent = item.kind;
    document.getElementById("dialog-term-title").textContent = item.term;
    document.getElementById("dialog-term-short").textContent = item.short;
    document.getElementById("dialog-term-long").textContent = item.long;
    openDialog(termDialog);
  }

  function openArt(key) {
    const item = artInfo[key];
    if (!item || !artDialog) return;
    const image = document.getElementById("art-dialog-image");
    image.src = item.image;
    image.alt = item.alt;
    document.getElementById("art-dialog-title").textContent = item.title;
    document.getElementById("art-dialog-copy").innerHTML = item.copy;
    openDialog(artDialog);
  }

  /* ---------- Notes ---------- */

  let saveTimer;
  function syncNote(id, value, source) {
    notes[id] = value;
    document.querySelectorAll(`[data-note-id="${CSS.escape(id)}"]`).forEach(field => {
      if (field !== source && field.value !== value) field.value = value;
    });

    const status = document.getElementById("save-status");
    if (status) status.textContent = "guardando…";
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = storage.set(KEYS.notes, notes);
      if (status) status.textContent = ok ? "guardado neste navegador" : "não foi possível guardar neste navegador";
    }, 350);
  }

  function exportNotes() {
    const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date());
    const sections = tracks.map((track, index) => {
      const answer = (notes[track.id] || "").trim() || "— ainda em branco —";
      return `${track.number} — ${track.title} (${track.alternate})\n${notePrompts[index]}\n\n${answer}`;
    });
    const text = `TRAVESSIA (OU ESQUINAS DOS BRASILEIROS)\nCaderno de bordo\nExportado em ${date}\n\n${"=".repeat(58)}\n\n${sections.join(`\n\n${"-".repeat(58)}\n\n`)}\n\n${"=".repeat(58)}\n\n“mão com mão”\n`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "caderno-travessia.txt";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Caderno exportado.");
  }

  function clearNotes() {
    const hasNotes = Object.values(notes).some(value => String(value).trim());
    if (!hasNotes) {
      showToast("O caderno já está em branco.");
      return;
    }
    if (!window.confirm("Apagar todas as anotações deste navegador? Essa ação não pode ser desfeita.")) return;
    notes = {};
    storage.remove(KEYS.notes);
    document.querySelectorAll("[data-note-id]").forEach(field => { field.value = ""; });
    const status = document.getElementById("save-status");
    if (status) status.textContent = "caderno em branco";
    showToast("Caderno apagado.");
  }

  /* ---------- Player ---------- */

  const audio = document.getElementById("audio-engine");
  const player = document.getElementById("player");
  const seek = document.getElementById("player-seek");
  let currentTrack = 0;
  let isSeeking = false;

  function updatePlayGlyph() {
    const button = document.querySelector('[data-player="play"]');
    if (!button || !audio) return;
    const playing = !audio.paused && !audio.ended;
    button.setAttribute("aria-label", playing ? "Pausar" : "Tocar");
    button.innerHTML = `<span aria-hidden="true">${playing ? "Ⅱ" : "▶"}</span>`;

    document.querySelectorAll(`[data-play-track="${currentTrack}"]`).forEach(trackButton => {
      trackButton.classList.toggle("is-playing", playing);
      if (trackButton.classList.contains("track-art-play")) {
        trackButton.innerHTML = `<span aria-hidden="true">${playing ? "Ⅱ" : "▶"}</span>`;
        trackButton.setAttribute("aria-label", `${playing ? "Pausar" : "Ouvir"} ${tracks[currentTrack].title}`);
      }
    });
  }

  function loadTrack(index, autoplay = false) {
    if (!audio) return;
    const bounded = Math.max(0, Math.min(tracks.length - 1, Number(index)));
    const track = tracks[bounded];
    const sameTrack = bounded === currentTrack && audio.getAttribute("src") === track.audio;
    currentTrack = bounded;

    if (!sameTrack) {
      audio.src = track.audio;
      audio.load();
    }

    document.getElementById("player-art").src = track.image;
    document.getElementById("player-number").textContent = track.number;
    document.getElementById("player-title").textContent = track.title;
    document.getElementById("player-duration").textContent = track.duration;
    document.getElementById("player-current").textContent = "0:00";
    document.getElementById("player-external").href = track.suno;
    document.getElementById("player-external").setAttribute("aria-label", `Abrir ${track.title} no Suno`);
    seek.value = 0;
    seek.style.setProperty("--seek", "0%");

    if (player) {
      player.classList.remove("collapsed");
      const collapse = player.querySelector('[data-player="collapse"]');
      if (collapse) collapse.setAttribute("aria-expanded", "true");
    }

    if (autoplay) {
      const promise = audio.play();
      if (promise && typeof promise.catch === "function") {
        promise.catch(() => showToast("Toque novamente para iniciar o áudio."));
      }
    }
    updatePlayGlyph();
  }

  function togglePlay(index) {
    if (!audio) return;
    const targetIndex = typeof index === "number" ? index : currentTrack;
    if (targetIndex !== currentTrack || !audio.getAttribute("src")) {
      loadTrack(targetIndex, true);
      return;
    }
    if (audio.paused || audio.ended) {
      audio.play().catch(() => showToast("O navegador pediu um novo toque para iniciar."));
    } else {
      audio.pause();
    }
  }

  function updateTimeline() {
    if (!audio || isSeeking) return;
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    const ratio = duration ? audio.currentTime / duration : 0;
    const value = Math.round(ratio * 1000);
    seek.value = value;
    seek.style.setProperty("--seek", `${ratio * 100}%`);
    document.getElementById("player-current").textContent = formatTime(audio.currentTime);
    if (duration) document.getElementById("player-duration").textContent = formatTime(duration);
  }

  if (audio) {
    audio.addEventListener("play", updatePlayGlyph);
    audio.addEventListener("pause", updatePlayGlyph);
    audio.addEventListener("timeupdate", updateTimeline);
    audio.addEventListener("loadedmetadata", updateTimeline);
    audio.addEventListener("ended", () => {
      toggleCompleted(tracks[currentTrack].id, true);
      if (currentTrack < tracks.length - 1) {
        showToast("Esquina atravessada. O trem segue para a próxima.");
        loadTrack(currentTrack + 1, true);
      } else {
        showToast("Evoé, Travessia! As cinco esquinas foram ouvidas.");
        updatePlayGlyph();
      }
    });
    audio.addEventListener("error", () => showToast("Não foi possível abrir o áudio. Use o link do Suno."));
    loadTrack(0, false);
  }

  if (seek) {
    seek.addEventListener("input", () => {
      isSeeking = true;
      const ratio = Number(seek.value) / 1000;
      seek.style.setProperty("--seek", `${ratio * 100}%`);
      if (audio && Number.isFinite(audio.duration)) {
        document.getElementById("player-current").textContent = formatTime(ratio * audio.duration);
      }
    });
    seek.addEventListener("change", () => {
      if (audio && Number.isFinite(audio.duration)) audio.currentTime = Number(seek.value) / 1000 * audio.duration;
      isSeeking = false;
    });
  }

  /* ---------- Preferences and menu ---------- */

  const preferenceDefaults = {
    font: 1,
    contrast: false,
    motion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };
  let preferences = { ...preferenceDefaults, ...storage.get(KEYS.preferences, {}) };

  function applyPreferences() {
    const root = document.documentElement;
    root.classList.remove("text-small", "text-large", "text-xlarge");
    if (preferences.font === 0) root.classList.add("text-small");
    if (preferences.font === 2) root.classList.add("text-large");
    if (preferences.font >= 3) root.classList.add("text-xlarge");
    document.body.classList.toggle("high-contrast", Boolean(preferences.contrast));
    document.body.classList.toggle("reduce-motion", Boolean(preferences.motion));

    const contrastButton = document.querySelector('[data-action="contrast"]');
    const motionButton = document.querySelector('[data-action="motion"]');
    if (contrastButton) contrastButton.setAttribute("aria-pressed", String(Boolean(preferences.contrast)));
    if (motionButton) motionButton.setAttribute("aria-pressed", String(Boolean(preferences.motion)));
  }

  function savePreferences() {
    storage.set(KEYS.preferences, preferences);
    applyPreferences();
  }

  applyPreferences();

  const menuToggle = document.querySelector(".menu-toggle");
  const mainNav = document.getElementById("main-nav");
  function closeMenu() {
    if (!menuToggle || !mainNav) return;
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.querySelector(".sr-only").textContent = "Abrir menu";
  }
  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const open = !mainNav.classList.contains("open");
      mainNav.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.querySelector(".sr-only").textContent = open ? "Fechar menu" : "Abrir menu";
    });
    mainNav.addEventListener("click", event => { if (event.target.closest("a")) closeMenu(); });
  }

  /* ---------- Events ---------- */

  document.addEventListener("click", event => {
    const playButton = event.target.closest("[data-play-track]");
    if (playButton) {
      togglePlay(Number(playButton.dataset.playTrack));
      return;
    }

    const termButton = event.target.closest("[data-term], [data-open-term]");
    if (termButton) {
      openTerm(termButton.dataset.term || termButton.dataset.openTerm);
      return;
    }

    const artButton = event.target.closest("[data-open-art]");
    if (artButton) {
      openArt(artButton.dataset.openArt);
      return;
    }

    const completeButton = event.target.closest("[data-complete-track]");
    if (completeButton) {
      toggleCompleted(completeButton.dataset.completeTrack);
      return;
    }

    const playerButton = event.target.closest("[data-player]");
    if (playerButton) {
      const action = playerButton.dataset.player;
      if (action === "play") togglePlay();
      if (action === "prev") loadTrack(currentTrack - 1, true);
      if (action === "next") loadTrack(currentTrack + 1, true);
      if (action === "collapse" && player) {
        const collapsed = player.classList.toggle("collapsed");
        playerButton.setAttribute("aria-expanded", String(!collapsed));
        playerButton.setAttribute("aria-label", collapsed ? "Abrir tocador" : "Recolher tocador");
      }
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (actionButton) {
      const action = actionButton.dataset.action;
      if (action === "font-up") {
        preferences.font = Math.min(3, Number(preferences.font) + 1);
        savePreferences();
        showToast("Texto aumentado.");
      }
      if (action === "font-down") {
        preferences.font = Math.max(0, Number(preferences.font) - 1);
        savePreferences();
        showToast("Texto diminuído.");
      }
      if (action === "contrast") {
        preferences.contrast = !preferences.contrast;
        savePreferences();
      }
      if (action === "motion") {
        preferences.motion = !preferences.motion;
        savePreferences();
      }
      if (action === "reset-progress") {
        if (!completed.size || window.confirm("Recomeçar o mapa e desmarcar as esquinas atravessadas?")) {
          completed.clear();
          storage.remove(KEYS.completed);
          updateProgressUI();
          showToast("O mapa voltou ao começo.");
        }
      }
      if (action === "export-notes") exportNotes();
      if (action === "clear-notes") clearNotes();
      if (action === "expand-glossary") {
        glossaryExpanded = true;
        renderGlossary();
      }
      return;
    }

    if (event.target.closest("[data-close-dialog]")) closeDialog(termDialog);
    if (event.target.closest("[data-close-art]")) closeDialog(artDialog);
  });

  document.addEventListener("input", event => {
    const noteField = event.target.closest("[data-note-id]");
    if (noteField) syncNote(noteField.dataset.noteId, noteField.value, noteField);
  });

  if (termDialog) termDialog.addEventListener("click", event => { if (event.target === termDialog) closeDialog(termDialog); });
  if (artDialog) artDialog.addEventListener("click", event => { if (event.target === artDialog) closeDialog(artDialog); });

  const search = document.getElementById("glossary-search");
  if (search) {
    search.addEventListener("input", () => {
      glossaryQuery = search.value;
      renderGlossary();
    });
  }

  const filters = document.getElementById("glossary-filters");
  if (filters) {
    filters.addEventListener("click", event => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      glossaryFilter = button.dataset.filter;
      glossaryExpanded = true;
      filters.querySelectorAll("[data-filter]").forEach(item => {
        const active = item === button;
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      renderGlossary();
    });
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1120) closeMenu();
  }, { passive: true });

  /* A mudança da faixa não deve deixar botões antigos dizendo “pausa”. */
  if (audio) {
    audio.addEventListener("play", () => {
      document.querySelectorAll("[data-play-track]").forEach(button => {
        if (Number(button.dataset.playTrack) !== currentTrack && button.classList.contains("track-art-play")) {
          button.innerHTML = '<span aria-hidden="true">▶</span>';
        }
      });
    });
  }

  renderRoute();
  renderTracks();
  renderNotebook();
  renderSources();
  renderGlossary();
})();
