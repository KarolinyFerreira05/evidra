const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3000' : '';
const _fetch = window.fetch;
window.fetch = (url, opts = {}) => {
  const token = localStorage.getItem('token');
  if (token && String(url).startsWith(API)) {
    opts.headers = { ...(opts.headers || {}), Authorization: 'Bearer ' + token };
  }
  return _fetch(url, opts).then(r => {
    if (r.status === 401 && !String(url).endsWith('/auth/login')) mostrarLogin();
    return r;
  });
};
// ================= Ícones =================
const ICONES = {
  gauge: "M12 14l4-4M3.3 18a10 10 0 1 1 17.4 0",
  chart: "M6 20V10M12 20V4M18 20v-6",
  file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5",
  report: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h6",
  clip: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 3h6v4H9zM9 14l2 2 4-4",
  users: "M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M21 21v-2a4 4 0 0 0-3-3.9",
  cog: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.3 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z",
  help: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7M12 17h.01",
  upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  warn: "M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01",
  mail: "M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6",
  bell: "M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3",
  menu: "M3 6h18M3 12h18M3 18h18",
  chevron: "M6 9l6 6 6-6",
  plus: "M12 5v14M5 12h14",
  up: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  down: "M23 18l-9.5-9.5-5 5L1 6M17 18h6v-6",
  image: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M21 15l-5-5L5 21",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
  ok: "M22 11.1V12a10 10 0 1 1-5.9-9.1M22 4L12 14l-3-3",
  check: "M20 6L9 17l-5-5"
};
const ic = n => `<svg viewBox="0 0 24 24"><path d="${ICONES[n]}"/></svg>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = id => document.getElementById(id);
const hojeBR = () => new Date().toLocaleDateString("pt-BR");
function hidratarIcones() { document.querySelectorAll("[data-icon]").forEach(e => { e.innerHTML = ic(e.dataset.icon); }); }

// ================= Dados de exemplo =================
const CATEGORIAS = [{ nome: "Ambiental", letra: "E" }, { nome: "Social", letra: "S" }, { nome: "Governança", letra: "G" }];
let metaESG = 90;

let indicadores = [];

let docs = [
  { nome: "Política de gestão de resíduos.pdf", ind: "Resíduos reciclados", quem: "Marina Alves", data: "28/09/2026", status: "Aprovada" },
  { nome: "Fatura de energia - agosto.pdf", ind: "Energia renovável", quem: "Rafael Costa", data: "25/09/2026", status: "Em análise" },
  { nome: "Inventário GEE 2025.xlsx", ind: "Emissões de CO₂", quem: "Lucas Moura", data: "20/09/2026", status: "Em análise" },
  { nome: "Foto estação de tratamento.jpg", ind: "Consumo de água", quem: "Rafael Costa", data: "18/09/2026", status: "Em análise" },
  { nome: "Censo de diversidade 2026.pdf", ind: "Diversidade na liderança", quem: "Ana Ferreira", data: "10/09/2026", status: "Aprovada" },
  { nome: "Ata do conselho - Q2.pdf", ind: "Conselheiros independentes", quem: "Karoliny Pimentel", data: "02/09/2026", status: "Rejeitada" }
];

const modelos = [
  { nome: "Relatório de sustentabilidade", desc: "Modelo completo baseado nas normas GRI" },
  { nome: "Inventário de emissões", desc: "Escopos 1, 2 e 3 conforme GHG Protocol" },
  { nome: "Contribuição aos ODS", desc: "Foco nos ODS 12, 9 e 13" }
];
let relatorios = [
  { nome: "Relatório ESG 2025", data: "15/03/2026", status: "Publicado" },
  { nome: "Inventário de emissões 2025", data: "02/02/2026", status: "Publicado" },
  { nome: "Relatório parcial - 1º semestre 2026", data: "30/07/2026", status: "Rascunho" }
];

let tarefas = [
  { id: 1, texto: "Atualizar emissões de CO₂ do 3º trimestre", quem: "Lucas Moura", Prazo: "02/10/2026", prio: "Alta", feita: false },
  { id: 2, texto: "Revisar leitura do consumo de água", quem: "Rafael Costa", Prazo: "05/10/2026", prio: "Alta", feita: false },
  { id: 3, texto: "Aprovar evidência da fatura de energia", quem: "Karoliny Pimentel", Prazo: "07/10/2026", prio: "Média", feita: false },
  { id: 4, texto: "Reenviar ata do conselho com assinaturas", quem: "Karoliny Pimentel", Prazo: "10/10/2026", prio: "Média", feita: false },
  { id: 5, texto: "Coletar dados de diversidade por área", quem: "Ana Ferreira", Prazo: "15/10/2026", prio: "Baixa", feita: false },
  { id: 6, texto: "Enviar política de resíduos", quem: "Marina Alves", Prazo: "28/09/2026", prio: "Média", feita: true }
];

let pessoas = [
  { sigla: "KP", nome: "Karoliny Pimentel", cargo: "Administradora", cat: "Governança" },
  { sigla: "LM", nome: "Lucas Moura", cargo: "Analista ambiental", cat: "Ambiental" },
  { sigla: "RC", nome: "Rafael Costa", cargo: "Coordenador de operações", cat: "Ambiental" },
  { sigla: "MA", nome: "Marina Alves", cargo: "Analista de sustentabilidade", cat: "Ambiental" },
  { sigla: "AF", nome: "Ana Ferreira", cargo: "Gestora de pessoas", cat: "Social" },
  { sigla: "PN", nome: "Paulo Nunes", cargo: "Auditor interno", cat: "Governança" }
];

let atividades = [
  { icone: "file", quem: "Marina", acao: "adicionou uma evidência", det: "Política de resíduos · há 2h" },
  { icone: "chart", quem: "Rafael", acao: "atualizou um indicador", det: "Consumo de energia · ontem" }
];

// ================= Cálculos =================
const notaCat = c => {
  const l = indicadores.filter(i => i.cat === c);
  return l.length ? Math.round(l.reduce((t, i) => t + i.prog, 0) / l.length) : 0;
};
const rotuloNota = n => n >= 90 ? "Excelente" : n >= 80 ? "Bom" : n >= 60 ? "Em evolução" : "Atenção";
const termo = () => $("busca").value.trim().toLowerCase();
const corStatus = s => ({ "Atualizado": "ok", "Desatualizado": "warn", "Em revisão": "info", "Aprovada": "ok", "Em análise": "info", "Rejeitada": "warn", "Publicado": "ok", "Rascunho": "mute" }[s] || "mute");
const registrar = (icone, acao, det) => atividades.unshift({ icone, quem: "Você", acao, det: det + " · agora" });

// ================= Renderização =================
function renderResumo() {
  const notas = CATEGORIAS.map(c => notaCat(c.nome));
  const geral = Math.round(notas.reduce((a, b) => a + b, 0) / notas.length);
  let h = `<div class="card destaque">
    <p class="rotulo">Índice ESG geral</p>
    <div class="nota-linha"><span class="nota">${geral}<span class="de100"> /100</span></span></div>
    <p class="ganho">+6 pontos desde 2025</p>
    <div class="meta-linha"><span>Meta anual</span><span>${geral} de ${metaESG}</span></div>
    <div class="progresso"><div style="width:${Math.min(100, geral / metaESG * 100)}%"></div></div></div>`;
  CATEGORIAS.forEach((c, k) => {
    const q = indicadores.filter(i => i.cat === c.nome).length;
    h += `<div class="card"><div class="card-topo"><span>${c.letra}</span><span>${rotuloNota(notas[k])}</span></div>
      <h3>${c.nome}</h3><p class="qtd">${q} ${q === 1 ? "indicador" : "indicadores"}</p>
      <div class="nota-linha"><span class="nota">${notas[k]}</span><span class="de100">de 100</span></div>
      <div class="progresso"><div style="width:${notas[k]}%"></div></div></div>`;
  });
  $("resumo").innerHTML = h;
}

function renderAtencao() {
  const l = indicadores.filter(i => i.status !== "Atualizado").sort((a, b) => b.ha - a.ha);
  $("atencao").innerHTML = l.length ? l.map(i => `
    <div class="linha">
      <span class="ic-caixa ${i.status === "Desatualizado" ? "amarelo" : ""}">${ic("warn")}</span>
      <div class="corpo"><strong>${esc(i.nome)}</strong></div>
      <span class="meta esconde">${i.cat}</span>
      <span class="meta">Há ${i.ha} ${i.ha === 1 ? "mês" : "meses"}</span>
      <span class="avatar">${i.resp}</span>
      <button class="btn-secundario btn-mini" data-atualizar="${i.id}">${i.status === "Desatualizado" ? "Atualizar" : "Revisar"}</button>
    </div>`).join("") : `<p class="vazio">Nenhum indicador precisa de atenção.</p>`;
}

function renderCompletude() {
  const ok = docs.filter(d => d.status === "Aprovada").length, total = docs.length;
  const pct = total ? Math.round(ok / total * 100) : 0;
  $("donut").style.setProperty("--pct", pct);
  $("donut-valor").textContent = pct + "%";
  $("c-completos").innerHTML = `${ic("ok")} ${ok} completos`;
  $("c-pendentes").innerHTML = `${ic("warn")} ${total - ok} pendentes`;
}

function renderAtividade() {
  $("atividade").innerHTML = atividades.slice(0, 4).map(a => `
    <div class="atividade-item"><span class="ic-caixa verde">${ic(a.icone)}</span>
    <div><div><strong>${esc(a.quem)}</strong> ${esc(a.acao)}</div><small>${esc(a.det)}</small></div></div>`).join("");
}

let filtro = "todos";
function renderIndicadores() {
  const l = indicadores.filter(i => (filtro === "todos" || i.cat === filtro) && i.nome.toLowerCase().includes(termo()));
  $("grade-indicadores").innerHTML = l.length ? l.map(i => `
    <div class="card ind-card">
      <div class="card-topo"><span>${i.cat}</span><span class="pill ${corStatus(i.status)}">${i.status}</span></div>
      <p class="nome">${esc(i.nome)}</p>
      <div class="valor-linha"><span class="valor">${esc(i.valor)}</span>
        <span class="tend">${ic(i.tend < 0 ? "down" : "up")} ${i.tend > 0 ? "+" : ""}${i.tend}%</span></div>
      <div class="prog-linha"><span>Progresso da meta</span><b>${i.prog}%</b></div>
      <div class="progresso"><div style="width:${i.prog}%"></div></div>
    </div>`).join("") : `<p class="vazio">Nenhum indicador encontrado.</p>`;
}

function renderEvidencias() {
  const l = docs.filter(d => d.nome.toLowerCase().includes(termo()) || d.ind.toLowerCase().includes(termo()));
  $("lista-docs").innerHTML = l.length ? l.map(d => `
    <div class="linha">
      <span class="ic-caixa">${ic(/\.(jpg|jpeg|png|gif|webp)$/i.test(d.nome) ? "image" : "report")}</span>
      <div class="corpo"><strong>${esc(d.nome)}</strong><small>${esc(d.ind)}</small></div>
      <span class="meta esconde">${esc(d.quem)}</span><span class="meta esconde">${d.data}</span>
      <span class="pill ${corStatus(d.status)}">${d.status}</span>
    </div>`).join("") : `<p class="vazio">Nenhum documento encontrado.</p>`;
}

function renderRelatorios() {
  $("modelos").innerHTML = modelos.map((m, k) => `
    <div class="card modelo"><span class="ic-caixa ouro">${ic("report")}</span>
      <h3>${m.nome}</h3><p>${m.desc}</p>
      <button class="btn-secundario btn-mini" data-modelo="${k}">Usar modelo</button></div>`).join("");
  $("lista-rel").innerHTML = relatorios.map(r => `
    <div class="linha"><div class="corpo"><strong>${esc(r.nome)}</strong><small>Gerado em ${r.data}</small></div>
      <span class="pill ${corStatus(r.status)}">${r.status}</span>
      <button class="btn-baixar" aria-label="Baixar">${ic("download")}</button></div>`).join("");
}

//function renderPendencias() {
  //const abertas = tarefas.filter(t => !t.feita).length;
  //$("sub-pend").textContent = `${abertas} ${abertas === 1 ? "tarefa aberta" : "tarefas abertas"}. Clique em uma tarefa para marcá-la como concluída.`;
  //$("lista-pend").innerHTML = tarefas.map(t => `
    //<div class="linha pend ${t.feita ? "feita" : ""}" data-tarefa="${t.id}">
      //<button class="circulo" aria-label="Concluir">${t.feita ? ic("check") : ""}</button>
      //<div class="corpo"><strong>${esc(t.texto)}</strong><small>${esc(t.quem)} · Prazo ${t.Prazo}</small></div>
      //<span class="pill ${t.feita ? "mute" : t.prio === "Alta" ? "warn" : t.prio === "Média" ? "info" : "mute"}">${t.feita ? "Concluída" : t.prio}</span>
    //</div>`).join("");
//}
// ===== Ordem de prioridade: Alta > Média > Baixa =====
const ORDEM_PRIORIDADE = { alta: 0, media: 1, baixa: 2 };
function pesoPrioridade(p) {
  const chave = String(p || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // "Média" -> "Media"
    .toLowerCase()
    .trim();
  return chave in ORDEM_PRIORIDADE ? ORDEM_PRIORIDADE[chave] : 3; // desconhecidas vão pro fim
}
function renderPendencias() {
  const abertas = tarefas.filter(t => !t.feita).length;
  $("sub-pend").textContent = `${abertas} ${abertas === 1 ? "tarefa aberta" : "tarefas abertas"}. Clique em uma tarefa para marcá-la como concluída.`;

  // cópia ordenada: não altera o array original
  const ordenadas = [...tarefas].sort((a, b) => pesoPrioridade(a.prio) - pesoPrioridade(b.prio));
  $("lista-pend").innerHTML = ordenadas.map(t => `
    <div class="linha pend ${t.feita ? "feita" : ""}" data-tarefa="${t.id}">
      <button class="circulo" aria-label="Concluir">${t.feita ? ic("check") : ""}</button>
      <div class="corpo"><strong>${esc(t.texto)}</strong><small>${esc(t.quem)} · Prazo ${t.Prazo}</small></div>
      <span class="pill ${t.feita ? "mute" : t.prio === "Alta" ? "warn" : t.prio === "Média" ? "info" : "mute"}">${t.feita ? "Concluída" : t.prio}</span>
    </div>`).join("");
}

function renderEquipe() {
  $("grade-equipe").innerHTML = pessoas.map(p => {
    const n = indicadores.filter(i => i.resp === p.sigla).length;
    return `<div class="card pessoa">
      <div class="pessoa-topo"><span class="avatar grande">${p.sigla}</span><div><strong>${esc(p.nome)}</strong><span>${esc(p.cargo)}</span></div></div>
      <div class="pessoa-base"><span class="pill info">${p.cat}</span><span>${n} ${n === 1 ? "indicador" : "indicadores"}</span></div></div>`;
  }).join("");
}

function renderBadges() {
  const ev = docs.filter(d => d.status !== "Aprovada").length;
  const pe = tarefas.filter(t => !t.feita).length;
  $("badge-evidencias").textContent = ev || "";
  $("badge-pendencias").textContent = pe || "";
}

function renderTudo() {
  renderResumo(); renderAtencao(); renderCompletude(); renderAtividade();
  renderIndicadores(); renderEvidencias(); renderRelatorios(); renderPendencias(); renderEquipe(); renderBadges();
}

// ================= Navegação =================
function mostrarView(nome) {
  document.querySelectorAll(".view").forEach(v => { v.hidden = v.id !== "view-" + nome; });
  document.querySelectorAll(".menu a, .menu-rodape > a").forEach(a => a.classList.toggle("ativo", a.dataset.view === nome));
  $("sidebar").classList.remove("aberta");
  window.scrollTo(0, 0);
}

// ================= Eventos =================
document.addEventListener("click", e => {
  const nav = e.target.closest("a[data-view]");
  if (nav) { e.preventDefault(); mostrarView(nav.dataset.view); return; }

    const atu = e.target.closest("[data-atualizar]");
  if (atu) {
    fetch(`${API}/indicators/${atu.dataset.atualizar}/refresh`, { method: 'POST' }).then(carregar);
    return;
  }
  const tar = e.target.closest("[data-tarefa]");
  if (tar) {
    const t = tarefas.find(x => x.id === +tar.dataset.tarefa);
    t.feita = !t.feita; renderPendencias(); renderBadges();
fetch(`${API}/tasks/${t.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ done: t.feita })
});
return;

  }
  const mod = e.target.closest("[data-modelo]");
  if (mod) { criarRelatorio(modelos[+mod.dataset.modelo].nome); return; }

  if (e.target.closest("[data-novo]")) { $("f-erro").style.display = "none"; $("modal").showModal(); }
});

$("btn-menu").addEventListener("click", () => {
  if (window.innerWidth <= 760) $("sidebar").classList.toggle("aberta");
  else $("app").classList.toggle("recolhida");
});

$("busca").addEventListener("input", () => { renderIndicadores(); renderEvidencias(); });

document.querySelectorAll(".chip").forEach(c => c.addEventListener("click", () => {
  document.querySelectorAll(".chip").forEach(x => x.classList.remove("ativo"));
  c.classList.add("ativo"); filtro = c.dataset.filter; renderIndicadores();
}));

// novo indicador
$("f-cancelar").addEventListener("click", () => $("modal").close());
$("f-add").addEventListener("click", async () => {
  const nome = $("f-nome").value.trim(), valor = $("f-valor").value.trim();
  const prog = Math.max(0, Math.min(100, parseInt($("f-prog").value, 10)));
  if (!nome || !valor || isNaN(prog)) {
    $("f-erro").textContent = "Preencha nome, valor e progresso da meta (0 a 100).";
    $("f-erro").style.display = "block"; return;
  }
  const resp = await fetch(`${API}/indicators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, cat: $("f-categoria").value, valor, prog })
  });
  if (!resp.ok) {
    $("f-erro").textContent = "Não foi possível salvar. Use um valor como 120 t ou 45%.";
    $("f-erro").style.display = "block"; return;
  }
  ["f-nome", "f-valor", "f-prog"].forEach(id => { $(id).value = ""; });
  $("modal").close();
  await carregar();
});

// evidências: selecionar e arrastar
async function adicionarArquivos(lista) {
  const arquivos = [...lista]; // copy first: the input gets cleared right after
  for (const f of arquivos) {
    const form = new FormData();
    form.append('nome', f.name);
    form.append('arquivo', f);
    await fetch(`${API}/evidence`, { method: 'POST', body: form });
  }
  await carregar();
}
$("btn-arquivos").addEventListener("click", () => $("input-arquivos").click());
$("input-arquivos").addEventListener("change", e => { adicionarArquivos(e.target.files); e.target.value = ""; });
const dz = $("dropzone");
["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("sobre"); }));
["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("sobre"); }));
dz.addEventListener("drop", e => adicionarArquivos(e.dataTransfer.files));

// relatórios
function criarRelatorio(nome) {
  fetch(`${API}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: `${nome} ${new Date().getFullYear()}` })
  }).then(carregar);
}
$("btn-novo-rel").addEventListener("click", () => criarRelatorio("Novo relatório"));

// equipe
$("btn-convidar").addEventListener("click", async () => {
  const nome = (prompt("Nome da pessoa a convidar:") || "").trim();
  if (!nome) return;
  const email = (prompt("E-mail da pessoa:") || "").trim();
  if (!email) return;
  const resp = await fetch(`${API}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, email })
  });
  if (!resp.ok) { alert("Não foi possível convidar. O e-mail já pode estar cadastrado."); return; }
  await carregar();
});

// configurações
$("cfg-salvar").addEventListener("click", async () => {
  const m = parseInt($("cfg-meta").value, 10);
  const meta = isNaN(m) ? metaESG : Math.max(1, Math.min(100, m));
  await fetch(`${API}/organization`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: $("cfg-nome").value.trim(), setor: $("cfg-setor").value.trim(), meta })
  });
  await carregar();
  $("cfg-salvo").hidden = false;
  setTimeout(() => { $("cfg-salvo").hidden = true; }, 2500);
});

hidratarIcones();
function mostrarLogin() {
  localStorage.removeItem('token');
  const d = $("login");
  if (!d.open) d.showModal();
}
$("login").addEventListener("cancel", e => e.preventDefault()); // Esc can't skip the login

async function entrar() {
  const resp = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: $("l-email").value.trim(), senha: $("l-senha").value })
  });
  if (!resp.ok) {
    $("l-erro").textContent = "E-mail ou senha incorretos.";
    $("l-erro").style.display = "block";
    return;
  }
  const dados = await resp.json();
  localStorage.setItem('token', dados.token);
  localStorage.setItem('usuario', JSON.stringify(dados));
  $("l-senha").value = "";
  $("l-erro").style.display = "none";
  $("login").close();
  await carregar();
}
$("l-entrar").addEventListener("click", entrar);
$("l-senha").addEventListener("keydown", e => { if (e.key === "Enter") entrar(); });
$("btn-sair").addEventListener("click", e => {
  e.preventDefault();
  localStorage.removeItem('token');
  location.reload();
});

function aplicarUsuario() {
  const u = JSON.parse(localStorage.getItem('usuario') || '{}');
  if (!u.nome) return;
  $("user-nome").textContent = u.nome;
  $("user-cargo").textContent = u.cargo || "";
  $("user-sigla").textContent = u.sigla || "";
  $("ola").textContent = `Olá, ${u.nome.split(" ")[0]}.`;
}

async function carregar() {
  if (!localStorage.getItem('token')) { mostrarLogin(); return; }
  try {
    const get = rota => fetch(API + rota).then(r => r.json());
    const [ind, ev, ta, re, pe, at, org] = await Promise.all([
      get('/indicators'), get('/evidence'), get('/tasks'),
      get('/reports'), get('/users'), get('/activity'), get('/organization'),
    ]);
    indicadores = ind; docs = ev; tarefas = ta; relatorios = re; pessoas = pe; atividades = at;
    metaESG = org.meta;
    $("cfg-nome").value = org.nome;
    $("cfg-setor").value = org.setor || "";
    $("cfg-meta").value = org.meta;
  } catch (e) {
    console.error('Could not reach the API:', e);
  }
  renderTudo();
  aplicarUsuario();
}
carregar();