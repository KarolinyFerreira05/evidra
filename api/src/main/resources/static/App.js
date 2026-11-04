const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1') ? 'http://localhost:3000' : '';
const _fetch = window.fetch;
window.fetch = (url, opts = {}) => {
  const token = localStorage.getItem('token');
  if (token && String(url).startsWith(API)) {
    opts.headers = { ...(opts.headers || {}), Authorization: 'Bearer ' + token };
  }
  return _fetch(url, opts).then(r => {
    if (r.status === 401 && !String(url).endsWith('/auth/login')) mostrarLogin();
    if (r.status === 403) {
      r.clone().json().catch(() => ({})).then(d =>
        mostrarAviso("Ação não permitida", [d.erro || "Seu perfil não tem permissão para esta ação."]));
    }
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
  check: "M20 6L9 17l-5-5",
  edit: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  trash: "M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6",
  paperclip: "M21.4 11.1l-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5",
  archive: "M21 8v13H3V8M1 3h22v5H1zM10 12h4",
  back: "M19 12H5M12 19l-7-7 7-7",
  restore: "M1 4v6h6M3.5 15a9 9 0 1 0 2.1-9.4L1 10",
  eye: "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  eyeOff: "M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.4 0-10-7-10-7a18.5 18.5 0 0 1 4.1-5.1M9.9 5.2A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a18.6 18.6 0 0 1-2.2 3.2M14.1 14.1a3 3 0 1 1-4.2-4.2M2 2l20 20"
};
const ic = n => `<svg viewBox="0 0 24 24"><path d="${ICONES[n]}"/></svg>`;
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = id => document.getElementById(id);
const hojeBR = () => new Date().toLocaleDateString("pt-BR");

// ================= Perfis =================
const PERFIS = { admin: "Administrador", responsavel: "Responsável por dados", auditor: "Auditor" };
// mirrors Auth.exigir(...) on the server, only to hide what can't be used; the server is the real check
const PERMISSOES = {
  indicadores: ["admin", "responsavel"],
  evidencias: ["admin", "responsavel"],
  pendencias: ["admin", "responsavel"],
  relatorios: ["admin", "responsavel", "auditor"],
  equipe: ["admin"],
  config: ["admin"],
  revisar: ["admin", "auditor"],
  publicar: ["admin", "auditor"], // whoever drafts the report is not necessarily who signs it off
  importar: ["admin", "responsavel"],
  auditoria: ["admin", "auditor"] // "Pacote de auditoria" report model
};
const usuarioAtual = () => JSON.parse(localStorage.getItem('usuario') || '{}');
const pode = acao => (PERMISSOES[acao] || []).includes(usuarioAtual().role);
function aplicarPermissoes() {
  document.querySelectorAll("[data-perm]").forEach(el => { el.hidden = !pode(el.dataset.perm); });
  document.querySelectorAll("[data-perm-desativar]").forEach(el => { el.disabled = !pode(el.dataset.permDesativar); });
  document.querySelectorAll("[data-perm-aviso]").forEach(el => { el.hidden = pode(el.dataset.permAviso); });
}

// ================= Carregamento =================
let saidaCarregando;
function mostrarCarregando(msg = "Carregando…") {
  clearTimeout(saidaCarregando);
  $("carregando-msg").textContent = msg;
  $("carregando").classList.remove("saindo");
  $("carregando").hidden = false;
}
function esconderCarregando() {
  const tela = $("carregando");
  if (tela.hidden) return;
  tela.classList.add("saindo");
  saidaCarregando = setTimeout(() => { tela.hidden = true; }, 200);
}
// runs an async action with the button disabled and showing a spinner
async function ocupar(btn, fn) {
  if (btn.disabled) return;
  btn.disabled = true;
  btn.classList.add("ocupado");
  btn.setAttribute("aria-busy", "true");
  try { await fn(); }
  finally {
    btn.disabled = false;
    btn.classList.remove("ocupado");
    btn.removeAttribute("aria-busy");
  }
}
function aoClicar(id, fn) {
  const btn = $(id);
  btn.addEventListener("click", e => ocupar(btn, () => fn(e)));
}

// ================= Mostrar senha =================
const ocultadores = [];
const ocultarSenhas = () => ocultadores.forEach(f => f());
document.querySelectorAll('input[type="password"]').forEach(input => {
  const wrap = document.createElement("span");
  wrap.className = "senha-wrap";
  input.replaceWith(wrap);
  wrap.appendChild(input);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "ver-senha";
  wrap.appendChild(btn);
  const atualizar = () => {
    const visivel = input.type === "text";
    btn.innerHTML = ic(visivel ? "eyeOff" : "eye");
    btn.setAttribute("aria-label", visivel ? "Ocultar senha" : "Mostrar senha");
    btn.setAttribute("aria-pressed", String(visivel));
  };
  btn.addEventListener("click", e => {
    e.preventDefault(); // keep the surrounding <label> from stealing the click
    input.type = input.type === "password" ? "text" : "password";
    atualizar();
    input.focus();
  });
  atualizar();
  ocultadores.push(() => { input.type = "password"; atualizar(); });
});
function hidratarIcones() { document.querySelectorAll("[data-icon]").forEach(e => { e.innerHTML = ic(e.dataset.icon); }); }

// ================= Dados de exemplo =================
const CATEGORIAS = [{ nome: "Ambiental", letra: "E" }, { nome: "Social", letra: "S" }, { nome: "Governança", letra: "G" }];
// tags an indicator can carry (the server accepts only these: IndicatorController.GRI / ODS)
const GRI_OPCOES = { 205: "Anticorrupção", 302: "Energia", 303: "Água e efluentes", 305: "Emissões", 306: "Resíduos",
  401: "Emprego", 403: "Saúde e segurança", 404: "Treinamento", 405: "Diversidade" };
const ODS_OPCOES = { 9: "Indústria, inovação e infraestrutura", 12: "Consumo e produção responsáveis", 13: "Ação contra a mudança global do clima" };
document.querySelectorAll("[data-opcoes-gri]").forEach(s => {
  s.innerHTML = `<option value="">Sem GRI</option>` + Object.entries(GRI_OPCOES).map(([c, n]) => `<option value="${c}">GRI ${c} – ${n}</option>`).join("");
});
document.querySelectorAll("[data-opcoes-ods]").forEach(s => {
  s.innerHTML = `<option value="">Sem ODS</option>` + Object.entries(ODS_OPCOES).map(([n, t]) => `<option value="${n}">ODS ${n} – ${t}</option>`).join("");
});
const tagsIndicador = i => (i.griCodigo ? `<span class="pill tag-gri" title="GRI ${esc(i.griCodigo)} – ${esc(GRI_OPCOES[i.griCodigo] || "")}">GRI ${esc(i.griCodigo)}</span>` : "")
  + (i.ods ? `<span class="pill tag-ods" title="ODS ${esc(i.ods)} – ${esc(ODS_OPCOES[i.ods] || "")}">ODS ${esc(i.ods)}</span>` : "");
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
  { chave: "mensal", nome: "Relatório mensal", desc: "Valores e evidências de um mês" },
  { chave: "semestral", nome: "Relatório parcial/semestral", desc: "Primeiro ou segundo semestre do ano" },
  { chave: "anual", nome: "Relatório anual", desc: "O ano completo, de janeiro a dezembro" },
  { chave: "intervalo", nome: "Definir intervalo", desc: "Qualquer período, de uma data a outra" },
  { chave: "auditoria", nome: "Pacote de auditoria", desc: "Valores, evidências, revisões e lacunas do período", perm: "auditoria" }
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
// search ignores case and accents ("emissoes" finds "Emissões")
const norm = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const termo = () => norm($("busca").value.trim());
const bate = (...campos) => !termo() || campos.some(c => norm(c).includes(termo()));
// empty-state text: says when it's the search that found nothing
const vazio = (padrao, tag = "p") => `<${tag} class="vazio">${termo() ? `Nenhum resultado para “${esc($("busca").value.trim())}”.` : padrao}</${tag}>`;
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
  const l = indicadores.filter(i => i.status !== "Atualizado" && bate(i.nome, i.cat, i.status, i.dono)).sort((a, b) => b.ha - a.ha);
  $("atencao").innerHTML = l.length ? l.map(i => `
    <div class="linha">
      <span class="ic-caixa ${i.status === "Desatualizado" ? "amarelo" : ""}">${ic("warn")}</span>
      <div class="corpo"><strong>${esc(i.nome)}</strong></div>
      <span class="meta esconde">${i.cat}</span>
      <span class="meta">Há ${i.ha} ${i.ha === 1 ? "mês" : "meses"}</span>
      <span class="avatar">${i.resp}</span>
      ${pode("indicadores") ? `<button class="btn-secundario btn-mini" data-atualizar="${i.id}">${i.status === "Desatualizado" ? "Atualizar" : "Revisar"}</button>` : ""}
    </div>`).join("") : vazio("Nenhum indicador precisa de atenção.");
}

// an indicator is complete when at least one evidence linked to it was approved;
// evidence still in review or rejected does not count
function renderCompletude() {
  const comprovados = new Set(docs.filter(d => d.status === "Aprovada" && d.indicadorId != null).map(d => d.indicadorId));
  const total = indicadores.length, ok = indicadores.filter(i => comprovados.has(i.id)).length;
  const pct = total ? Math.round(ok / total * 100) : 0;
  $("donut").style.setProperty("--pct", pct);
  $("donut-valor").textContent = pct + "%";
  $("c-completos").innerHTML = `${ic("ok")} ${ok} ${ok === 1 ? "indicador comprovado" : "indicadores comprovados"}`;
  $("c-pendentes").innerHTML = `${ic("warn")} ${total - ok} sem evidência aprovada`;
  const emAnalise = docs.filter(d => d.status === "Em análise").length;
  $("c-dica").textContent = !total ? "Cadastre indicadores para acompanhar a completude."
    : ok === total ? "Todos os indicadores têm evidência aprovada."
    : emAnalise ? `${emAnalise} ${emAnalise === 1 ? "evidência aguarda" : "evidências aguardam"} revisão.`
    : "Envie e aprove evidências para os indicadores pendentes.";
}

const itemAtividade = a => `
    <div class="atividade-item"><span class="ic-caixa verde">${ic(a.icone)}</span>
    <div><div><strong>${esc(a.quem)}</strong> ${esc(a.acao)}</div><small>${esc(a.det)}</small></div></div>`;
function renderAtividade() {
  const l = atividades.filter(a => bate(a.nome || a.quem, a.acao, a.detalhe || a.det)).slice(0, 4);
  $("atividade").innerHTML = l.length ? l.map(itemAtividade).join("") : vazio("Nenhuma atividade ainda.");
}

let filtro = "todos";
function renderIndicadores() {
  const l = indicadores.filter(i => (filtro === "todos" || i.cat === filtro)
    && bate(i.nome, i.cat, i.status, i.dono, i.unidade, i.griCodigo && "GRI " + i.griCodigo, i.ods && "ODS " + i.ods));
  $("grade-indicadores").innerHTML = l.length ? l.map(i => `
    <div class="card ind-card">
      <div class="card-topo"><span>${i.cat}</span>
        <span class="topo-dir">
          <button type="button" class="ind-anexos${i.evidencias ? "" : " sem-ev"}" data-ind-ev="${i.id}" aria-expanded="false"
            aria-label="${i.evidencias ?? 0} evidência(s) de ${esc(i.nome)}" title="Evidências">${ic("paperclip")}${i.evidencias ?? 0}</button>
          <span class="pill ${corStatus(i.status)}">${i.status}</span>
        </span></div>
      <p class="nome">${esc(i.nome)}</p>
      ${i.griCodigo || i.ods ? `<div class="ind-tags">${tagsIndicador(i)}</div>` : ""}
      <div class="valor-linha"><span class="valor">${esc(i.valor)}</span>
        <span class="tend">${ic(i.tend < 0 ? "down" : "up")} ${i.tend > 0 ? "+" : ""}${Number(i.tend).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span></div>
      <div class="prog-linha"><span>Progresso da meta</span><b>${i.prog}%</b></div>
      <div class="progresso"><div style="width:${i.prog}%"></div></div>
      <div class="ind-acoes">
        <button type="button" class="link-acao" data-hist="${i.id}">${ic("chart")}Histórico</button>
        ${pode("indicadores") ? `<button type="button" class="link-acao" data-atualizar="${i.id}">${ic("up")}Atualizar</button>
        <button type="button" class="link-acao" data-editar-ind="${i.id}">${ic("edit")}Editar</button>
        <button type="button" class="link-acao link-perigo" data-arquivar="${i.id}">${ic("archive")}Arquivar</button>` : ""}
      </div>
    </div>`).join("") : vazio(indicadores.length ? "Nenhum indicador neste pilar." : "Nenhum indicador cadastrado ainda.");
}

// nobody reviews their own upload (the server refuses it too)
const podeRevisar = d => d.id != null && d.status === "Em análise" && pode("revisar") && d.enviadoPorId !== usuarioAtual().id;
function linhaRevisao(d) {
  if (d.status === "Rejeitada" && d.nota)
    return `<small class="motivo-rejeicao">Motivo: ${esc(d.nota)}${d.revisor ? ` — ${esc(d.revisor)}, ${esc(d.revisadoEm || "")}` : ""}</small>`;
  if (d.status === "Aprovada" && d.revisor) return `<small>Aprovada por ${esc(d.revisor)} em ${esc(d.revisadoEm || "")}</small>`;
  return "";
}
function renderEvidencias() {
  const l = docs.filter(d => bate(d.nome, d.ind, d.descricao, d.quem, d.status, d.data));
  $("lista-docs").innerHTML = l.length ? l.map(d => `
    <div class="linha">
      <span class="ic-caixa">${ic(/\.(jpg|jpeg|png|gif|webp)$/i.test(d.nome) ? "image" : "report")}</span>
      <div class="corpo"><strong>${esc(d.nome)}</strong><small>${esc(d.ind)}${d.descricao ? " · " + esc(d.descricao) : ""}</small>${linhaRevisao(d)}</div>
      <span class="meta esconde">${esc(d.quem)}</span><span class="meta esconde">${d.data}</span>
      <span class="pill ${corStatus(d.status)}">${d.status}</span>
      ${podeRevisar(d) ? `<button class="btn-secundario btn-mini btn-aprovar" data-aprovar="${d.id}">Aprovar</button>
        <button class="btn-secundario btn-mini btn-mini-perigo" data-rejeitar="${d.id}">Rejeitar</button>` : ""}
      ${d.id == null || d.indicadorId != null || !pode("evidencias") ? "" : indicadores.length
        ? `<button class="btn-secundario btn-mini" data-vincular="${d.id}">Vincular</button>`
        : `<button class="btn-secundario btn-mini" disabled title="Cadastre um indicador primeiro">Vincular</button>`}
      ${d.id == null ? "" : d.arquivo
        ? `<button class="btn-secundario btn-mini" data-abrir="${d.id}">Abrir</button>`
        : `<button class="btn-secundario btn-mini" disabled title="Arquivo enviado antes da mudança para o banco de dados; envie novamente">Abrir</button>`}
    </div>`).join("") : vazio("Nenhum documento enviado ainda.");
}

function renderRelatorios() {
  $("modelos").innerHTML = modelos.map((m, k) => `
    <div class="card modelo"><span class="ic-caixa ouro">${ic("report")}</span>
      <h3>${m.nome}</h3><p>${m.desc}</p>
      ${pode(m.perm || "relatorios") ? `<button class="btn-secundario btn-mini" data-modelo="${k}">Usar modelo</button>` : ""}</div>`).join("");
  const l = relatorios.filter(r => bate(r.nome, r.modeloNome, r.periodo, r.status, r.data));
  $("lista-rel").innerHTML = l.length ? l.map(r => `
    <div class="linha"><div class="corpo"><strong>${esc(r.nome)}</strong>
      <small>${r.modeloNome ? `${esc(r.modeloNome)} · ${esc(r.periodo)} · ` : ""}Gerado em ${esc(r.data)}</small></div>
      <span class="pill ${corStatus(r.status)}">${r.status}</span>
      ${r.id != null && r.temConteudo && r.status === "Rascunho" && pode("publicar")
        ? `<button class="btn-secundario btn-mini" data-publicar="${r.id}">Publicar</button>` : ""}
      ${r.id == null ? "" : r.temConteudo
        ? `<button class="btn-secundario btn-mini" data-abrir-rel="${r.id}">Abrir</button>`
        : `<button class="btn-secundario btn-mini" disabled title="Criado antes dos relatórios com dados; gere um novo">Abrir</button>`}
      ${r.id != null && pode("relatorios")
        ? `<button class="btn-icone btn-arquivar" data-arquivar-rel="${r.id}" aria-label="Arquivar ${esc(r.nome)}" title="Arquivar">${ic("archive")}</button>` : ""}
    </div>`).join("") : vazio("Nenhum relatório gerado ainda.");
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
  $("sub-pend").textContent = `${abertas} ${abertas === 1 ? "tarefa aberta" : "tarefas abertas"}.${pode("pendencias") ? " Clique em uma tarefa para marcá-la como concluída." : ""} As do sistema somem sozinhas quando o problema é resolvido.`;

  // cópia ordenada: não altera o array original
  const nomeInd = id => indicadores.find(i => i.id === id)?.nome;
  const ordenadas = tarefas.filter(t => bate(t.texto, t.quem, t.prio, t.Prazo, nomeInd(t.indicadorId)))
    .sort((a, b) => pesoPrioridade(a.prio) - pesoPrioridade(b.prio));
  $("lista-pend").innerHTML = ordenadas.length ? ordenadas.map(t => {
    const sistema = t.origem === "sistema", editavel = !sistema && pode("pendencias");
    const ind = t.indicadorId != null && !String(t.id).startsWith("sys-ind-") ? indicadores.find(i => i.id === t.indicadorId) : null;
    return `
    <div class="linha pend ${t.feita ? "feita" : ""} ${editavel ? "" : "pend-sistema"}" ${editavel ? `data-tarefa="${t.id}"` : ""}>
      ${sistema
        ? `<span class="circulo circulo-sistema" title="Gerada pelo sistema">${ic("cog")}</span>`
        : !editavel ? `<span class="circulo">${t.feita ? ic("check") : ""}</span>`
        : `<button class="circulo" aria-label="${t.feita ? "Reabrir" : "Concluir"}: ${esc(t.texto)}">${t.feita ? ic("check") : ""}</button>`}
      <div class="corpo"><strong>${esc(t.texto)}</strong><small>${esc(t.quem)} · Prazo ${esc(t.Prazo)}${ind ? " · " + esc(ind.nome) : ""}</small></div>
      ${sistema ? `<span class="pill mute">Sistema</span>` : ""}
      <span class="pill ${t.feita ? "mute" : t.prio === "Alta" ? "warn" : t.prio === "Média" ? "info" : "mute"}">${t.feita ? "Concluída" : t.prio}</span>
      ${!editavel ? "" : `<span class="acoes-pend">
        <button class="btn-icone" data-editar-pend="${t.id}" aria-label="Editar: ${esc(t.texto)}" title="Editar">${ic("edit")}</button>
        <button class="btn-icone" data-excluir-pend="${t.id}" aria-label="Excluir: ${esc(t.texto)}" title="Excluir">${ic("trash")}</button>
      </span>`}
    </div>`;
  }).join("") : vazio("Nenhuma pendência.");
}

let filtroEquipe = "ativos";
// avatar colors: picked pseudo-randomly from the person's id, so each one keeps the same color
// on every visit; all pairs keep readable contrast for the initials
const CORES_AVATAR = [
  ["#0a5252", "#fff"], ["#d9a521", "#3a2a00"], ["#b4532a", "#fff"], ["#2b5a88", "#fff"], ["#6b4c9a", "#fff"],
  ["#2f7d4f", "#fff"], ["#a8396b", "#fff"], ["#4a5a64", "#fff"], ["#1f7a8c", "#fff"], ["#8a6d1f", "#fff"]
];
function corAvatar(p) {
  let h = 2166136261; // FNV-1a over the id (or the name, for rows without an id)
  for (const c of String(p.id ?? p.nome)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const [fundo, texto] = CORES_AVATAR[(h >>> 0) % CORES_AVATAR.length];
  return `background:${fundo};color:${texto}`;
}
function renderEquipe() {
  const detalhes = pode("equipe"); // only admins can open a member's details (the server checks too)
  const eu = usuarioAtual().id; // no "Desativar" on yourself (the server refuses it too)
  const lista = pessoas.filter(p => (filtroEquipe === "inativos" ? p.ativo === false : p.ativo !== false)
    && bate(p.nome, p.cargo, p.cat, PERFIS[p.role]));
  $("grade-equipe").innerHTML = lista.length ? lista.map(p => {
    const n = p.indicadores ?? indicadores.filter(i => i.resp === p.sigla).length;
    const acao = !pode("equipe") || p.id == null ? ""
      : p.ativo === false ? `<button class="btn-secundario btn-mini" data-reativar="${p.id}">Reativar</button>`
      : p.id === eu ? "" : `<button class="btn-secundario btn-mini btn-mini-perigo" data-desativar="${p.id}">Desativar</button>`;
    const abre = detalhes && p.id != null;
    const topo = `<span class="avatar grande" style="${corAvatar(p)}">${esc(p.sigla)}</span><div><strong>${esc(p.nome)}</strong><span>${esc(p.cargo)}</span></div>`;
    return `<div class="card pessoa ${p.ativo === false ? "inativo" : ""} ${abre ? "clicavel" : ""}" ${abre ? `data-pessoa="${p.id}"` : ""}>${acao ? `<div class="pessoa-acao">${acao}</div>` : ""}${p.ativo === false ? `<span class="pill mute pill-inativo">Inativo${p.desativadoEm ? " desde " + p.desativadoEm.split("-").reverse().join("/") : ""}</span>` : ""}
      ${abre ? `<button type="button" class="pessoa-topo pessoa-abrir" aria-label="Ver informações de ${esc(p.nome)}">${topo}</button>` : `<div class="pessoa-topo">${topo}</div>`}
      <div class="pessoa-base"><span class="pill info">${p.cat}</span>${p.role ? `<span class="pill ${p.role === "admin" ? "ok" : p.role === "auditor" ? "warn" : "mute"}">${PERFIS[p.role]}</span>` : ""}<span>${n} ${n === 1 ? "indicador" : "indicadores"}</span></div></div>`;
  }).join("") : vazio(filtroEquipe === "inativos" ? "Nenhum membro inativo." : "Nenhum membro ativo.");
}

function renderBadges() {
  const ev = docs.filter(d => d.status !== "Aprovada").length;
  const pe = tarefas.filter(t => !t.feita).length;
  // either badge may be absent from the menu; a missing one must not stop the rest of carregar()
  if ($("badge-evidencias")) $("badge-evidencias").textContent = ev || "";
  if ($("badge-pendencias")) $("badge-pendencias").textContent = pe || "";
}

function renderTudo() {
  renderResumo(); renderAtencao(); renderCompletude(); renderAtividade();
  renderIndicadores(); renderEvidencias(); renderRelatorios(); renderPendencias(); renderEquipe(); renderBadges();
  renderNotificacoes(); renderPerfil();
  if (viewAtual === "historico") renderHistorico();
  if (viewAtual === "arquivados") renderArquivados();
}

// ================= Navegação e busca =================
// each screen searches its own content; null = nothing to search there
const BUSCA = {
  visao: { ph: "Buscar indicadores em atenção e atividades...", render: () => { renderAtencao(); renderAtividade(); } },
  indicadores: { ph: "Buscar indicadores por nome, pilar ou responsável...", render: () => renderIndicadores() },
  relatorios: { ph: "Buscar relatórios por nome, modelo ou período...", render: () => renderRelatorios() },
  evidencias: { ph: "Buscar evidências por arquivo, indicador ou autor...", render: () => renderEvidencias() },
  pendencias: { ph: "Buscar pendências por título, responsável ou indicador...", render: () => renderPendencias() },
  equipe: { ph: "Buscar pessoas por nome, cargo ou perfil...", render: () => renderEquipe() },
  notificacoes: { ph: "Buscar notificações...", render: () => renderNotificacoes() },
  historico: { ph: "Buscar no histórico por pessoa, ação ou item...", render: () => renderHistorico() },
  arquivados: { ph: "Buscar itens arquivados...", render: () => renderArquivados() },
  ajuda: { ph: "Buscar nas perguntas frequentes...", render: () => renderAjuda() },
  config: null,
  perfil: null
};
let viewAtual = "visao";
function prepararBusca(nome) {
  const b = BUSCA[nome], input = $("busca");
  input.value = ""; // a filter typed on one screen must not silently hide things on the next
  input.disabled = !b;
  input.placeholder = b ? b.ph : "Nada para buscar nesta tela";
  input.closest(".busca").classList.toggle("desativada", !b);
}
// ---- Voltar: every screen change is a browser history entry, so both the "Voltar" button
// and the browser's own back button return to the screen the user came from
const NOMES_VIEW = {
  visao: "Visão geral", indicadores: "Indicadores", relatorios: "Relatórios", evidencias: "Evidências",
  pendencias: "Pendências", equipe: "Equipe", config: "Configurações", ajuda: "Ajuda e suporte",
  notificacoes: "Notificações", perfil: "Meu perfil", historico: "Histórico de atividades", arquivados: "Arquivados"
};
let navN = 0, navDe = null; // how deep in the app's history we are, and the screen before this one
function atualizarVoltar() {
  const pode = navN > 0 && navDe && NOMES_VIEW[navDe];
  $("btn-voltar").hidden = !pode;
  if (pode) $("voltar-texto").textContent = `Voltar para ${NOMES_VIEW[navDe]}`;
}
function iniciarNavegacao() {
  navN = 0; navDe = null;
  history.replaceState({ view: viewAtual, n: 0, de: null }, "");
  atualizarVoltar();
}
$("btn-voltar").addEventListener("click", () => history.back());
window.addEventListener("popstate", e => {
  if ($("app").hidden) return;
  const s = e.state;
  if (!s || !s.view || !NOMES_VIEW[s.view]) { navN = 0; navDe = null; mostrarView("visao", { empilhar: false }); return; }
  navN = s.n || 0; navDe = s.de;
  mostrarView(s.view, { empilhar: false });
});

// ---- Carregamento das telas que buscam os próprios dados
const MIN_CARREGANDO = 350; // a load shorter than this would only flash on screen
const carregandoTelas = new Set();
const esperar = ms => new Promise(r => setTimeout(r, ms));
const telaCarregando = msg => `<div class="carregando-view" role="status" aria-live="polite"><span class="spinner" aria-hidden="true"></span><p>${esc(msg)}</p></div>`;
// shows a loader in `alvo` while `tarefa` runs, then lets the screen render itself
async function comCarregamento(tela, alvo, msg, tarefa, render) {
  carregandoTelas.add(tela);
  alvo.innerHTML = telaCarregando(msg);
  try { await Promise.all([tarefa(), esperar(MIN_CARREGANDO)]); }
  finally { carregandoTelas.delete(tela); render(); }
}

function mostrarView(nome, { empilhar = true } = {}) {
  const anterior = viewAtual, trocou = nome !== anterior;
  viewAtual = nome;
  if (trocou && empilhar) {
    navN++; navDe = anterior;
    history.pushState({ view: nome, n: navN, de: anterior }, "");
  }
  atualizarVoltar();
  document.querySelectorAll(".view").forEach(v => { v.hidden = v.id !== "view-" + nome; });
  document.querySelectorAll(".menu a, .menu-rodape > a, .usuario").forEach(a => a.classList.toggle("ativo", a.dataset.view === nome));
  $("btn-sino").classList.toggle("ativo", nome === "notificacoes");
  $("sidebar").classList.remove("aberta");
  if (trocou || termo()) { prepararBusca(nome); BUSCA[nome]?.render(); }
  if (trocou) {
    if (nome === "notificacoes") abrirNotificacoes();
    if (nome === "perfil") abrirPerfil();
    if (nome === "historico") comCarregamento("historico", $("lista-historico"), "Carregando histórico…", carregarHistorico, renderHistorico);
    if (nome === "arquivados") comCarregamento("arquivados", $("lista-arquivados"), "Carregando itens arquivados…", carregarArquivados, renderArquivados);
  }
  window.scrollTo(0, 0);
}

// ================= Eventos =================
document.addEventListener("click", e => {
  const nav = e.target.closest("a[data-view]");
  if (nav) { e.preventDefault(); mostrarView(nav.dataset.view); return; }

    const atu = e.target.closest("[data-atualizar]");
  if (atu) { abrirAtualizar(indicadores.find(i => String(i.id) === atu.dataset.atualizar)); return; }
  const tar = e.target.closest("[data-tarefa]");
  // only manual tasks carry data-tarefa; their edit/delete icons are handled in the Pendências section
  if (tar && !e.target.closest("[data-editar-pend], [data-excluir-pend]")) {
    alternarTarefa(tarefas.find(x => String(x.id) === tar.dataset.tarefa));
    return;
  }
  const mod = e.target.closest("[data-modelo]");
  if (mod) { abrirNovoRelatorio(modelos[+mod.dataset.modelo].chave); return; }

  if (e.target.closest("[data-novo]")) {
    $("f-erro").style.display = "none";
    anexosIndicador = [];
    renderAnexos();
    exemploValor();
    $("modal").showModal();
  }
});

$("btn-menu").addEventListener("click", () => {
  if (window.innerWidth <= 760) $("sidebar").classList.toggle("aberta");
  else $("app").classList.toggle("recolhida");
});

$("busca").addEventListener("input", () => BUSCA[viewAtual]?.render());
$("busca").addEventListener("keydown", e => {
  if (e.key === "Escape" && $("busca").value) { e.preventDefault(); $("busca").value = ""; BUSCA[viewAtual]?.render(); }
});
// "/" jumps to the search, like most web apps (not while typing somewhere else)
document.addEventListener("keydown", e => {
  if (e.key !== "/" || $("app").hidden || $("busca").disabled || document.querySelector("dialog[open]")) return;
  if (e.target.closest("input, textarea, select, [contenteditable]")) return;
  e.preventDefault();
  $("busca").focus();
});

function renderAjuda() {
  let n = 0;
  document.querySelectorAll("#faq details").forEach(d => {
    const ok = bate(d.textContent);
    d.hidden = !ok;
    if (ok) n++;
    if (termo()) d.open = ok; // show the matching answers right away
  });
  $("faq-vazio").innerHTML = termo() ? `Nenhuma pergunta sobre “${esc($("busca").value.trim())}”. Fale com o suporte ao lado.` : "";
  $("faq-vazio").hidden = n > 0 || !termo();
}

document.querySelectorAll("#view-indicadores .chip").forEach(c => c.addEventListener("click", () => {
  document.querySelectorAll("#view-indicadores .chip").forEach(x => x.classList.remove("ativo"));
  c.classList.add("ativo"); filtro = c.dataset.filter; renderIndicadores();
}));

// novo indicador
// the "Valor" example follows the chosen pillar, so it hints at a unit that fits it
const EXEMPLO_VALOR = { "Ambiental": "Valor (ex: 120 t)", "Social": "Valor (ex: 45%)", "Governança": "Valor (ex: 3 reuniões)" };
function exemploValor() { $("f-valor").placeholder = EXEMPLO_VALOR[$("f-categoria").value] || "Valor"; }
$("f-categoria").addEventListener("change", exemploValor);
$("f-cancelar").addEventListener("click", () => $("modal").close());
aoClicar("f-add", async () => {
  const nome = $("f-nome").value.trim(), valor = $("f-valor").value.trim();
  const prog = Math.max(0, Math.min(100, parseInt($("f-prog").value, 10)));
  if (!nome || !valor || isNaN(prog)) {
    $("f-erro").textContent = "Preencha nome, valor e progresso da meta (0 a 100).";
    $("f-erro").style.display = "block"; return;
  }
  const invalidos = errosArquivos(anexosIndicador);
  if (invalidos.length) {
    $("f-erro").textContent = invalidos.join("\n");
    $("f-erro").style.display = "block"; return;
  }
  const resp = await fetch(`${API}/indicators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome, cat: $("f-categoria").value, valor, prog, griCodigo: $("f-gri").value || null, ods: $("f-ods").value || null })
  });
  if (!resp.ok) {
    $("f-erro").textContent = await erroResposta(resp, "Não foi possível salvar. Use um valor como 120 t ou 45%.");
    $("f-erro").style.display = "block"; return;
  }
  const { id } = await resp.json();

  // the indicator is kept even if some attachments fail; those are reported afterwards
  const falhas = [];
  for (const f of anexosIndicador) {
    const form = new FormData();
    form.append('nome', f.name);
    form.append('indicatorId', id);
    form.append('arquivo', f);
    const r = await fetch(`${API}/evidence`, { method: 'POST', body: form }).catch(() => null);
    if (!r || !r.ok) {
      const dados = r ? await r.json().catch(() => ({})) : {};
      falhas.push(`${f.name}: ${dados.erro || "não foi possível enviar o arquivo."}`);
    }
  }

  const enviados = anexosIndicador.length - falhas.length;
  ["f-nome", "f-valor", "f-prog", "f-gri", "f-ods"].forEach(id => { $(id).value = ""; });
  anexosIndicador = [];
  renderAnexos();
  $("modal").close();
  await carregar();
  if (falhas.length) {
    mostrarAviso(
      `O indicador "${nome}" foi criado, mas ${falhas.length === 1 ? "1 arquivo não foi enviado" : `${falhas.length} arquivos não foram enviados`}:`,
      falhas,
      "Envie novamente em Evidências → Nova evidência, escolhendo este indicador.");
  } else {
    mostrarSucesso(`Indicador "${nome}" criado com sucesso.`,
      enviados ? `${enviados} ${enviados === 1 ? "evidência anexada aguarda" : "evidências anexadas aguardam"} revisão.`
               : "Ele já aparece em Indicadores. Anexe evidências para comprová-lo.");
  }
});

// anexos do novo indicador
let anexosIndicador = [];
function renderAnexos() {
  $("f-anexos").innerHTML = anexosIndicador.map((f, k) => `
    <li><span>${esc(f.name)} <small>${tamanho(f.size)}</small></span>
      <button type="button" class="btn-icone remover-anexo" data-remover="${k}" aria-label="Remover ${esc(f.name)}" title="Remover">×</button></li>`).join("");
}
$("f-anexar").addEventListener("click", () => $("f-arquivos").click());
$("f-arquivos").addEventListener("change", e => {
  const novos = [...e.target.files];
  e.target.value = ""; // lets the same file be picked again after removing it
  const invalidos = errosArquivos(novos);
  const repetido = f => anexosIndicador.some(a => a.name === f.name && a.size === f.size);
  anexosIndicador.push(...novos.filter(f => !errosArquivos([f]).length && !repetido(f)));
  renderAnexos();
  $("f-erro").textContent = invalidos.join("\n");
  $("f-erro").style.display = invalidos.length ? "block" : "none";
});
$("f-anexos").addEventListener("click", e => {
  const b = e.target.closest("[data-remover]");
  if (!b) return;
  anexosIndicador.splice(+b.dataset.remover, 1);
  renderAnexos();
  $("f-anexar").focus();
});

// errors stay on screen until closed; successes ("ok") close themselves after a few seconds
let saidaAviso;
function mostrarAviso(titulo, linhas = [], dica = "", tipo = "erro") {
  clearTimeout(saidaAviso);
  const aviso = $("aviso"), ok = tipo === "ok";
  $("aviso-titulo").textContent = titulo;
  $("aviso-lista").innerHTML = linhas.map(l => `<li>${esc(l)}</li>`).join("");
  $("aviso-dica").textContent = dica;
  aviso.classList.toggle("aviso-ok", ok);
  aviso.setAttribute("role", ok ? "status" : "alert");
  aviso.setAttribute("aria-live", ok ? "polite" : "assertive");
  aviso.hidden = false;
  if (ok) saidaAviso = setTimeout(() => { aviso.hidden = true; }, 5000);
}
const mostrarSucesso = (titulo, dica = "") => mostrarAviso(titulo, [], dica, "ok");
$("aviso-fechar").addEventListener("click", () => { clearTimeout(saidaAviso); $("aviso").hidden = true; });
// hovering or focusing a success message keeps it open while it's being read
$("aviso").addEventListener("mouseenter", () => clearTimeout(saidaAviso));
$("aviso").addEventListener("focusin", () => clearTimeout(saidaAviso));

// ================= Indicadores: atualizar, editar, arquivar, histórico =================
// generic confirmation; resolves true when confirmed
function confirmar({ titulo, texto, botao, perigo = true }) {
  return new Promise(resolve => {
    $("conf-titulo").textContent = titulo;
    $("conf-texto").textContent = texto;
    $("conf-ok").textContent = botao;
    $("conf-ok").className = perigo ? "btn-perigo" : "btn-primario";
    const fechar = r => { $("modal-confirmar").close(); resolve(r); };
    $("conf-ok").onclick = () => fechar(true);
    $("conf-cancelar").onclick = () => fechar(false);
    $("modal-confirmar").oncancel = () => resolve(false);
    $("modal-confirmar").showModal();
    $("conf-cancelar").focus();
  });
}

let indAtualizando = null;
function abrirAtualizar(ind) {
  if (!ind) return;
  indAtualizando = ind;
  $("atu-form").reset();
  $("atu-nome").textContent = ind.nome;
  $("atu-atual").textContent = `Mantém ${ind.valor}, registrado novamente com a data de hoje.`;
  $("atu-unidade").textContent = ind.unidade ? `(${ind.unidade})` : "";
  $("atu-periodo").max = hojeISO();
  $("atu-periodo").value = hojeISO();
  modoAtualizar();
  $("atu-erro").style.display = "none";
  $("modal-atualizar").showModal();
}
function modoAtualizar() {
  const novo = $("atu-form").elements["atu-modo"].value === "novo";
  $("atu-novo").hidden = !novo;
  $("atu-salvar").textContent = novo ? "Registrar valor" : "Confirmar valor";
  if (novo) $("atu-valor").focus();
}
document.querySelectorAll('input[name="atu-modo"]').forEach(r => r.addEventListener("change", modoAtualizar));
$("atu-cancelar").addEventListener("click", () => $("modal-atualizar").close());
$("atu-form").addEventListener("submit", e => {
  e.preventDefault();
  ocupar($("atu-salvar"), async () => {
    const erro = msg => { $("atu-erro").textContent = msg; $("atu-erro").style.display = "block"; };
    const novo = $("atu-form").elements["atu-modo"].value === "novo";
    let resp;
    if (novo) {
      const valor = $("atu-valor").value.trim(), periodo = $("atu-periodo").value;
      if (!/^-?[\d.]+(,\d+)?$/.test(valor)) return erro("Informe um valor numérico, como 1.250 ou 45,5.");
      if (!periodo) return erro("Informe a data de referência do valor.");
      if (periodo > hojeISO()) return erro("A data de referência não pode estar no futuro.");
      resp = await fetch(`${API}/indicators/${indAtualizando.id}/records`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valor, periodo })
      }).catch(() => null);
    } else {
      resp = await fetch(`${API}/indicators/${indAtualizando.id}/refresh`, { method: 'POST' }).catch(() => null);
    }
    if (!resp || !resp.ok) return erro(await erroResposta(resp, "Não foi possível atualizar o indicador."));
    $("modal-atualizar").close();
    await carregar();
  });
});

let indEditando = null;
function abrirEditarIndicador(ind) {
  indEditando = ind;
  $("ind-form").reset();
  $("ind-nome").value = ind.nome;
  $("ind-cat").value = ind.cat;
  $("ind-unidade").value = ind.unidade || "";
  $("ind-prog").value = ind.prog;
  $("ind-freq").value = ind.frequencia || 90;
  // active members; the current owner stays listed even if inactive
  $("ind-dono").innerHTML = `<option value="">Sem responsável</option>` + pessoas
    .filter(p => p.id != null && (p.ativo !== false || p.id === ind.donoId))
    .map(p => `<option value="${p.id}">${esc(p.nome)}${p.ativo === false ? " (inativo)" : ""}</option>`).join("");
  $("ind-dono").value = ind.donoId ?? "";
  $("ind-gri").value = ind.griCodigo ?? "";
  $("ind-ods").value = ind.ods ?? "";
  $("ind-erro").style.display = "none";
  $("modal-ind").showModal();
  $("ind-nome").focus();
}
$("ind-cancelar").addEventListener("click", () => $("modal-ind").close());
$("ind-form").addEventListener("submit", e => {
  e.preventDefault();
  ocupar($("ind-salvar"), async () => {
    const erro = msg => { $("ind-erro").textContent = msg; $("ind-erro").style.display = "block"; };
    const dados = {
      nome: $("ind-nome").value.trim(), cat: $("ind-cat").value, unidade: $("ind-unidade").value.trim(),
      prog: $("ind-prog").value, frequencia: $("ind-freq").value, donoId: $("ind-dono").value || null,
      griCodigo: $("ind-gri").value || null, ods: $("ind-ods").value || null
    };
    if (!dados.nome) return erro("Informe o nome do indicador.");
    if (!/^\d+$/.test(dados.prog) || +dados.prog > 100) return erro("O progresso da meta vai de 0 a 100.");
    if (!/^\d+$/.test(dados.frequencia) || +dados.frequencia < 1 || +dados.frequencia > 3650) return erro("A frequência de atualização vai de 1 a 3650 dias.");
    const resp = await fetch(`${API}/indicators/${indEditando.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
    }).catch(() => null);
    if (!resp || !resp.ok) return erro(await erroResposta(resp, "Não foi possível salvar o indicador."));
    $("modal-ind").close();
    await carregar();
  });
});

async function arquivarIndicador(ind, btn) {
  const ok = await confirmar({
    titulo: "Arquivar indicador?",
    texto: `"${ind.nome}" deixa de aparecer nas listas, relatórios novos e pendências. O histórico e as evidências continuam guardados, e você pode restaurá-lo em "Ver arquivados".`,
    botao: "Arquivar"
  });
  if (!ok) return;
  await ocupar(btn, async () => {
    const resp = await fetch(`${API}/indicators/${ind.id}`, { method: 'DELETE' }).catch(() => null);
    if (!resp || !resp.ok) { mostrarAviso("Não foi possível arquivar", [await erroResposta(resp, "Tente novamente.")]); return; }
    await carregar();
    mostrarSucesso(`Indicador "${ind.nome}" arquivado.`, "Para restaurá-lo, use Indicadores → Ver arquivados.");
  });
}

$("grade-indicadores").addEventListener("click", e => {
  const b = e.target.closest("[data-hist], [data-editar-ind], [data-arquivar]");
  if (!b) return;
  const ind = indicadores.find(i => String(i.id) === (b.dataset.hist ?? b.dataset.editarInd ?? b.dataset.arquivar));
  if (!ind) return;
  if (b.dataset.hist) abrirHistorico(ind, b);
  else if (b.dataset.editarInd) abrirEditarIndicador(ind);
  else arquivarIndicador(ind, b);
});

// ---- CSV: template, export and import (Excel in Portuguese: ";" separator, decimal comma)
// the token goes in the Authorization header (added by the fetch wrapper), never in a URL
async function baixarArquivo(rota, nomePadrao) {
  const resp = await fetch(API + rota).catch(() => null);
  if (!resp || !resp.ok) throw new Error(await erroResposta(resp, "Não foi possível baixar o arquivo."));
  const nome = (resp.headers.get("Content-Disposition") || "").match(/filename="?([^";]+)"?/)?.[1] || nomePadrao;
  const url = URL.createObjectURL(await resp.blob());
  const a = Object.assign(document.createElement("a"), { href: url, download: nome });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const erroCsv = msg => { $("csv-erro").textContent = msg; $("csv-erro").style.display = msg ? "block" : "none"; };
aoClicar("btn-csv-modelo", () => baixarArquivo("/indicators/template.csv", "modelo-indicadores.csv").then(() => erroCsv(""), e => erroCsv(e.message)));
aoClicar("btn-csv-exportar", () => baixarArquivo("/indicators/export.csv", "indicadores.csv").then(() => erroCsv(""), e => erroCsv(e.message)));

let importValidado = false; // the chosen file was checked and has no line with errors
function erroImport(msg) { $("import-erro").textContent = msg; $("import-erro").style.display = msg ? "block" : "none"; }
function limparPrevia() {
  importValidado = false;
  $("import-confirmar").disabled = true;
  $("import-previa").hidden = true;
  $("import-linhas").innerHTML = "";
  $("import-resumo").textContent = "";
  erroImport("");
}
$("btn-csv-importar").addEventListener("click", () => {
  $("import-form").reset();
  limparPrevia();
  $("modal-import").showModal();
  $("import-arquivo").focus();
});
$("import-cancelar").addEventListener("click", () => $("modal-import").close());

async function enviarImportacao(confirmar) {
  const f = $("import-arquivo").files[0];
  const form = new FormData();
  form.append("arquivo", f);
  form.append("confirmar", String(confirmar));
  const resp = await fetch(`${API}/indicators/import`, { method: "POST", body: form }).catch(() => null);
  const dados = resp ? await resp.json().catch(() => ({})) : {};
  return { resp, dados };
}
function renderPrevia(d) {
  $("import-linhas").innerHTML = d.linhas.map(l => `
    <tr><td class="num">${l.linha}</td><td>${l.nome ? esc(l.nome) : "—"}</td>
      <td>${l.ok ? `<span class="pill ok">OK</span> <small class="import-acao">${esc(l.acao)}</small>`
        : `<span class="pill erro">Erro</span><ul class="import-erros">${l.erros.map(e => `<li>${esc(e)}</li>`).join("")}</ul>`}</td></tr>`).join("");
  $("import-previa").hidden = false;
  const partes = [`${d.total} ${d.total === 1 ? "linha" : "linhas"}`,
    `${d.novos} ${d.novos === 1 ? "indicador novo" : "indicadores novos"}`,
    `${d.novosValores} ${d.novosValores === 1 ? "valor em indicador existente" : "valores em indicadores existentes"}`];
  if (d.comErros) partes.push(`${d.comErros} ${d.comErros === 1 ? "linha com erro" : "linhas com erro"}: corrija no Excel e escolha o arquivo de novo`);
  $("import-resumo").textContent = partes.join(" · ");
}
$("import-arquivo").addEventListener("change", async () => {
  limparPrevia();
  const f = $("import-arquivo").files[0];
  if (!f) return;
  if (!/\.csv$/i.test(f.name)) return erroImport("Escolha um arquivo .csv. No Excel, use Salvar como > CSV (separado por ponto e vírgula).");
  if (f.size > 1024 * 1024) return erroImport("O arquivo passa do limite de 1 MB.");
  $("import-resumo").textContent = "Verificando o arquivo…";
  const { resp, dados } = await enviarImportacao(false);
  if (f !== $("import-arquivo").files[0]) return; // another file was picked meanwhile
  if (!resp || !resp.ok || !dados.linhas) { $("import-resumo").textContent = ""; return erroImport(dados.erro || "Não foi possível ler o arquivo."); }
  renderPrevia(dados);
  importValidado = dados.comErros === 0 && dados.total > 0;
  $("import-confirmar").disabled = !importValidado;
});
$("import-form").addEventListener("submit", e => {
  e.preventDefault();
  if (!importValidado) return;
  ocupar($("import-confirmar"), async () => {
    const { resp, dados } = await enviarImportacao(true);
    if (!resp || !resp.ok) {
      if (dados.linhas) renderPrevia(dados);
      importValidado = false;
      return erroImport(dados.erro || "Não foi possível importar. Nada foi salvo.");
    }
    $("modal-import").close();
    await carregar();
    mostrarSucesso("Importação concluída.",
      `${dados.novos} ${dados.novos === 1 ? "indicador novo" : "indicadores novos"} e ${dados.novosValores} ${dados.novosValores === 1 ? "valor novo em indicador existente" : "valores novos em indicadores existentes"}.`);
  }).then(() => { $("import-confirmar").disabled = !importValidado; });
});

// ---- Histórico: table + a single-series line chart in plain SVG
const COR_SERIE = "#1a6b68"; // --teal-700: one series, so no legend; the title names it
const fmtNum = v => Number(v).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
const isoParaBR = iso => iso.split("-").reverse().join("/");

async function abrirHistorico(ind, btn) {
  await ocupar(btn, async () => {
    const resp = await fetch(`${API}/indicators/${ind.id}/records`).catch(() => null);
    if (!resp || !resp.ok) { mostrarAviso("Não foi possível abrir o histórico", [await erroResposta(resp, "Tente novamente.")]); return; }
    const h = await resp.json();
    $("hist-titulo").textContent = `Histórico · ${h.nome}`;
    $("hist-sub").textContent = `${h.registros.length} ${h.registros.length === 1 ? "registro" : "registros"}${h.unidade ? " · valores em " + h.unidade : ""}`;
    const corpo = $("hist-tabela").tBodies[0];
    corpo.replaceChildren(...[...h.registros].reverse().map(r => {
      const tr = document.createElement("tr");
      [isoParaBR(r.periodo), r.valorTexto, r.quem, r.registradoEm].forEach((t, k) => {
        const td = document.createElement("td");
        td.textContent = t; // names come from the database: never innerHTML
        if (k === 1) td.className = "num";
        tr.appendChild(td);
      });
      return tr;
    }));
    desenharGrafico($("hist-grafico"), h);
    $("modal-hist").showModal();
  });
}
$("hist-fechar").addEventListener("click", () => $("modal-hist").close());

function desenharGrafico(alvo, h) {
  const pts = h.registros.map(r => ({ t: Date.parse(r.periodo + "T12:00:00"), v: Number(r.valor), r }));
  alvo.replaceChildren();
  if (!pts.length) { alvo.innerHTML = `<p class="vazio">Sem registros ainda.</p>`; return; }

  const W = 640, H = 240, m = { t: 16, r: 72, b: 28, l: 56 };
  const minT = Math.min(...pts.map(p => p.t)), maxT = Math.max(...pts.map(p => p.t));
  let minV = Math.min(...pts.map(p => p.v)), maxV = Math.max(...pts.map(p => p.v));
  if (minV === maxV) { minV -= Math.abs(minV) * 0.1 || 1; maxV += Math.abs(maxV) * 0.1 || 1; }
  // round ticks: 4 gridlines on a 1/2/5 step
  const passoBruto = (maxV - minV) / 4, mag = 10 ** Math.floor(Math.log10(passoBruto));
  const passo = [1, 2, 5, 10].map(k => k * mag).find(k => k >= passoBruto);
  const y0 = Math.floor(minV / passo) * passo, y1 = Math.ceil(maxV / passo) * passo;
  const x = t => maxT === minT ? (m.l + W - m.r) / 2 : m.l + (t - minT) / (maxT - minT) * (W - m.l - m.r);
  const y = v => H - m.b - (v - y0) / (y1 - y0) * (H - m.t - m.b);
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs, pai) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); pai.appendChild(e); return e; };

  const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "grafico-svg", role: "img", tabindex: "0",
    "aria-label": `${h.nome}: ${pts.length} registros, de ${fmtNum(pts[0].v)} em ${isoParaBR(pts[0].r.periodo)} a ${fmtNum(pts.at(-1).v)} em ${isoParaBR(pts.at(-1).r.periodo)}. Use as setas para percorrer os pontos; a tabela abaixo tem todos os valores.` }, alvo);
  // recessive grid + y labels
  for (let v = y0; v <= y1 + passo / 2; v += passo) {
    el("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: "grade" }, svg);
    el("text", { x: m.l - 8, y: y(v) + 4, class: "eixo", "text-anchor": "end" }, svg).textContent = fmtNum(v);
  }
  // x labels: first and last date only
  const xl = [pts[0], pts.at(-1)].filter((p, k, a) => k === 0 || p.t !== a[0].t);
  xl.forEach((p, k) => el("text", { x: x(p.t), y: H - 8, class: "eixo", "text-anchor": xl.length === 1 ? "middle" : k === 0 ? "start" : "end" }, svg).textContent = isoParaBR(p.r.periodo));

  if (pts.length > 1) el("polyline", { points: pts.map(p => `${x(p.t)},${y(p.v)}`).join(" "), class: "linha-serie", stroke: COR_SERIE }, svg);
  pts.forEach(p => el("circle", { cx: x(p.t), cy: y(p.v), r: 4, fill: COR_SERIE, class: "ponto" }, svg));
  // one direct label: the latest value
  const ult = pts.at(-1);
  el("text", { x: x(ult.t) + 10, y: y(ult.v) + 4, class: "rotulo-direto" }, svg).textContent = ult.r.valorTexto;

  // crosshair + tooltip, snapping to the nearest point; same on keyboard focus
  const cruz = el("line", { y1: m.t, y2: H - m.b, class: "cruz", visibility: "hidden" }, svg);
  const foco = el("circle", { r: 6, fill: COR_SERIE, class: "ponto-foco", visibility: "hidden" }, svg);
  const dica = document.createElement("div");
  dica.className = "dica-grafico"; dica.hidden = true;
  alvo.appendChild(dica);
  let atual = -1;
  const mostrar = k => {
    atual = k; const p = pts[k];
    cruz.setAttribute("x1", x(p.t)); cruz.setAttribute("x2", x(p.t)); cruz.setAttribute("visibility", "visible");
    foco.setAttribute("cx", x(p.t)); foco.setAttribute("cy", y(p.v)); foco.setAttribute("visibility", "visible");
    const forte = document.createElement("strong"); forte.textContent = p.r.valorTexto;
    const linha = document.createElement("span"); linha.textContent = `${isoParaBR(p.r.periodo)} · ${p.r.quem}`;
    dica.replaceChildren(forte, linha); dica.hidden = false;
    const caixa = svg.getBoundingClientRect(), esc = caixa.width / W;
    const px = x(p.t) * esc, py = y(p.v) * esc;
    dica.style.left = Math.min(Math.max(px - dica.offsetWidth / 2, 0), caixa.width - dica.offsetWidth) + "px";
    dica.style.top = Math.max(py - dica.offsetHeight - 12, 0) + "px";
  };
  const esconder = () => { cruz.setAttribute("visibility", "hidden"); foco.setAttribute("visibility", "hidden"); dica.hidden = true; atual = -1; };
  svg.addEventListener("pointermove", e => {
    const caixa = svg.getBoundingClientRect(), vx = (e.clientX - caixa.left) / caixa.width * W;
    let k = 0; pts.forEach((p, i) => { if (Math.abs(x(p.t) - vx) < Math.abs(x(pts[k].t) - vx)) k = i; });
    mostrar(k);
  });
  svg.addEventListener("pointerleave", esconder);
  svg.addEventListener("focus", () => mostrar(pts.length - 1));
  svg.addEventListener("blur", esconder);
  svg.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      mostrar(Math.min(pts.length - 1, Math.max(0, (atual < 0 ? pts.length - 1 : atual) + (e.key === "ArrowRight" ? 1 : -1))));
    }
  });
}

// ================= Equipe: ativos / inativos =================
document.querySelectorAll("[data-equipe]").forEach(c => c.addEventListener("click", () => {
  filtroEquipe = c.dataset.equipe;
  document.querySelectorAll("[data-equipe]").forEach(x => { x.classList.toggle("ativo", x === c); x.setAttribute("aria-pressed", String(x === c)); });
  renderEquipe();
}));

let membroDesativando = null;
function abrirDesativar(p) {
  membroDesativando = p;
  $("desativar-form").reset();
  $("desativar-texto").textContent = `${p.nome} perde o acesso ao Evidra. O nome continua no histórico, e o membro pode ser reativado depois.`;
  mostrarTransferencia(p.indicadores || 0, p.pendencias || 0);
  $("desativar-erro").style.display = "none";
  $("modal-desativar").showModal();
  $("desativar-cancelar").focus();
}
function mostrarTransferencia(nInd, nPend) {
  const precisa = nInd + nPend > 0;
  $("desativar-transferir").hidden = !precisa;
  if (!precisa) return;
  const p = membroDesativando;
  $("desativar-pendente").textContent = `${p.nome} é responsável por ${nInd} ${nInd === 1 ? "indicador" : "indicadores"} e ${nPend} ${nPend === 1 ? "pendência aberta" : "pendências abertas"}. Eles passam para:`;
  $("desativar-para").innerHTML = `<option value="">Escolha…</option>` + pessoas
    .filter(x => x.ativo !== false && x.id !== p.id).map(x => `<option value="${x.id}">${esc(x.nome)}</option>`).join("");
}
async function mudarAtivo(p, ativo, transferTo) {
  return fetch(`${API}/users/${p.id}/active`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(transferTo ? { ativo, transferTo } : { ativo })
  }).catch(() => null);
}
$("desativar-cancelar").addEventListener("click", () => $("modal-desativar").close());
$("desativar-form").addEventListener("submit", e => {
  e.preventDefault();
  ocupar($("desativar-confirmar"), async () => {
    const erro = msg => { $("desativar-erro").textContent = msg; $("desativar-erro").style.display = "block"; };
    const transferindo = !$("desativar-transferir").hidden;
    const para = $("desativar-para").value;
    if (transferindo && !para) return erro("Escolha quem vai assumir.");
    const resp = await mudarAtivo(membroDesativando, false, transferindo ? Number(para) : null);
    if (resp && resp.status === 409) {
      // something was assigned meanwhile: show the server's counts and ask again
      const d = await resp.json().catch(() => ({}));
      mostrarTransferencia(d.indicadores || 0, d.pendencias || 0);
      return erro(d.erro || "Escolha quem vai assumir.");
    }
    if (!resp || !resp.ok) return erro(await erroResposta(resp, "Não foi possível desativar."));
    $("modal-desativar").close();
    await carregar();
  });
});
// ---- Detalhes de um membro (admin): click anywhere on the card except its action button
let pessoaAberta = 0; // ignores a slow answer when another member was opened meanwhile
async function abrirPessoa(p) {
  const vez = ++pessoaAberta;
  $("pessoa-avatar").textContent = p.sigla;
  $("pessoa-avatar").style.cssText = corAvatar(p);
  $("pessoa-titulo").textContent = p.nome;
  $("pessoa-sub").textContent = p.cargo || "";
  $("pessoa-corpo").innerHTML = telaCarregando("Carregando informações…");
  $("modal-pessoa").showModal();
  const [resp] = await Promise.all([fetch(`${API}/users/${p.id}`).catch(() => null), esperar(MIN_CARREGANDO)]);
  if (vez !== pessoaAberta || !$("modal-pessoa").open) return;
  if (!resp || !resp.ok) {
    $("pessoa-corpo").innerHTML = `<p class="mensagem-erro mensagem-visivel" role="alert">${esc(await erroResposta(resp, "Não foi possível carregar as informações deste membro."))}</p>`;
    return;
  }
  renderPessoa(await resp.json());
}
function renderPessoa(d) {
  const inds = indicadores.filter(i => i.donoId === d.id);
  const pends = tarefas.filter(t => t.origem !== "sistema" && !t.feita && t.responsavelId === d.id);
  const ev = d.evidencias;
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const numero = (valor, rotulo, detalhe = "") => `<div class="pessoa-num"><strong>${valor}</strong><span>${rotulo}</span>${detalhe ? `<small>${detalhe}</small>` : ""}</div>`;
  $("pessoa-sub").textContent = d.cargo || "Cargo não informado";
  $("pessoa-corpo").innerHTML = `
    <div class="pessoa-det-info">
      ${d.email ? `<a class="link-pequeno" href="mailto:${esc(d.email)}">${ic("mail")} ${esc(d.email)}</a>` : ""}
      <span class="pill ${d.role === "admin" ? "ok" : d.role === "auditor" ? "warn" : "mute"}">${PERFIS[d.role] || "—"}</span>
      ${d.cat ? `<span class="pill info">${esc(d.cat)}</span>` : ""}
      <span class="pill ${d.ativo ? "ok" : "mute"}">${d.ativo ? "Ativo" : `Inativo${d.desativadoEm ? " desde " + esc(d.desativadoEm) : ""}`}</span>
    </div>
    <p class="painel-sub">${d.ultimaAtividade ? `Última atividade em ${esc(d.ultimaAtividade)}` : "Nenhuma atividade registrada ainda."}</p>
    <div class="pessoa-det-numeros">
      ${numero(inds.length, "indicadores sob responsabilidade")}
      ${numero(pends.length, "pendências abertas")}
      ${numero(ev.total, "evidências enviadas", `${ev.aprovadas} aprovadas · ${ev.emAnalise} em análise · ${ev.rejeitadas} rejeitadas`)}
      ${numero(d.registros, "valores registrados")}
      ${numero(d.revisoes, "evidências revisadas")}
    </div>
    <div class="pessoa-det-listas">
      <section>
        <h3>Indicadores</h3>
        ${inds.length ? `<ul>${inds.map(i => `<li><span>${esc(i.nome)}<small>${esc(i.cat)} · ${esc(i.valor)}</small></span><span class="pill ${corStatus(i.status)}">${i.status}</span></li>`).join("")}</ul>`
          : `<p class="vazio vazio-sem-pad">Nenhum indicador sob responsabilidade.</p>`}
      </section>
      <section>
        <h3>Pendências abertas</h3>
        ${pends.length ? `<ul>${pends.map(t => {
          const dias = diasAte(t.Prazo);
          return `<li><span>${esc(t.texto)}<small>Prazo ${esc(t.Prazo)}${dias != null && dias < 0 ? " · atrasada" : ""}</small></span><span class="pill ${t.prio === "Alta" ? "warn" : t.prio === "Média" ? "info" : "mute"}">${t.prio}</span></li>`;
        }).join("")}</ul>` : `<p class="vazio vazio-sem-pad">Nenhuma pendência aberta.</p>`}
      </section>
    </div>
    <section class="pessoa-det-atividade">
      <h3>Atividade recente</h3>
      ${d.atividade.length ? `<ul>${d.atividade.map(a => `<li><span>${esc(a.acao)}<small>${esc(a.detalhe)}</small></span><span class="meta">${esc(a.quando)}</span></li>`).join("")}</ul>`
        : `<p class="vazio vazio-sem-pad">${esc(d.nome.split(" ")[0])} ainda não registrou nenhuma atividade.</p>`}
      ${d.atividade.length ? `<p class="painel-sub">${plural(d.atividade.length, "ação mais recente", "ações mais recentes")}. O histórico completo está em <a href="#" class="link-pequeno" data-pessoa-hist>Histórico de atividades</a>.</p>` : ""}
    </section>`;
  $("pessoa-corpo").querySelector("[data-pessoa-hist]")?.addEventListener("click", e => {
    e.preventDefault();
    $("modal-pessoa").close();
    mostrarView("historico");
    $("busca").value = d.nome; // opens the history already filtered to this person
    renderHistorico();
  });
}
$("pessoa-fechar").addEventListener("click", () => $("modal-pessoa").close());
$("modal-pessoa").addEventListener("click", e => { if (e.target === $("modal-pessoa")) $("modal-pessoa").close(); }); // click on the backdrop
$("grade-equipe").addEventListener("click", e => {
  if (e.target.closest("[data-desativar], [data-reativar]")) return;
  const card = e.target.closest(".pessoa.clicavel");
  const p = card && pessoas.find(x => String(x.id) === card.dataset.pessoa);
  if (p) abrirPessoa(p);
});
$("grade-equipe").addEventListener("click", e => {
  const des = e.target.closest("[data-desativar]"), rea = e.target.closest("[data-reativar]");
  const p = pessoas.find(x => String(x.id) === (des?.dataset.desativar ?? rea?.dataset.reativar));
  if (!p) return;
  if (des) { abrirDesativar(p); return; }
  ocupar(rea, async () => {
    const resp = await mudarAtivo(p, true);
    if (!resp || !resp.ok) { $("equipe-erro").textContent = await erroResposta(resp, "Não foi possível reativar."); $("equipe-erro").style.display = "block"; return; }
    $("equipe-erro").style.display = "none";
    await carregar();
  });
});

// ================= Pendências =================
// local calendar date as yyyy-mm-dd (toISOString alone would use UTC)
const hojeISO = () => { const d = new Date(); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
const brParaISO = br => /^\d{2}\/\d{2}\/\d{4}$/.test(br) ? br.split("/").reverse().join("-") : "";
const erroResposta = async (resp, padrao) => (resp ? (await resp.json().catch(() => ({}))).erro : null) || padrao;

function mostrarErroPend(msg) {
  $("pend-erro").textContent = msg || "";
  $("pend-erro").style.display = msg ? "block" : "none";
}

// ticks a manual task right away and undoes it if the server refuses
async function alternarTarefa(t) {
  if (!t || t.origem === "sistema") return;
  t.feita = !t.feita;
  renderPendencias(); renderBadges();
  const resp = await fetch(`${API}/tasks/${t.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ done: t.feita })
  }).catch(() => null);
  if (resp && resp.ok) { mostrarErroPend(""); return; }
  t.feita = !t.feita;
  renderPendencias(); renderBadges();
  mostrarErroPend(await erroResposta(resp, "Não foi possível atualizar a pendência."));
}

let pendEditando = null; // the task being edited, or null when creating
function abrirPendencia(t = null) {
  pendEditando = t;
  $("pend-form").reset();
  $("pend-titulo").textContent = t ? "Editar pendência" : "Nova pendência";
  $("pend-salvar").textContent = t ? "Salvar alterações" : "Criar pendência";
  $("pend-indicador").innerHTML = opcoesIndicadores("Nenhum indicador");
  // active members only; an inactive one already on the task stays selectable so the task can still be edited
  $("pend-resp").innerHTML = `<option value="">Escolha…</option>` +
    pessoas.filter(p => p.id != null && (p.ativo !== false || p.id === t?.responsavelId))
      .map(p => `<option value="${p.id}">${esc(p.nome)}${p.ativo === false ? " (inativo)" : ""}</option>`).join("");
  const prazoAtual = t ? brParaISO(t.Prazo) : "";
  // an existing deadline that already passed can be kept, but not moved further into the past
  $("pend-prazo").min = prazoAtual && prazoAtual < hojeISO() ? prazoAtual : hojeISO();
  if (t) {
    $("pend-texto").value = t.texto;
    $("pend-indicador").value = t.indicadorId ?? "";
    $("pend-resp").value = t.responsavelId ?? "";
    $("pend-prazo").value = prazoAtual;
    $("pend-prio").value = { "Alta": "alta", "Média": "media", "Baixa": "baixa" }[t.prio] || "media";
  }
  $("pend-form-erro").style.display = "none";
  $("modal-pend").showModal();
  $("pend-texto").focus();
}

async function salvarPendencia() {
  const erro = msg => { $("pend-form-erro").textContent = msg; $("pend-form-erro").style.display = "block"; };
  const dados = {
    titulo: $("pend-texto").value.trim(),
    indicadorId: $("pend-indicador").value ? Number($("pend-indicador").value) : null,
    responsavelId: $("pend-resp").value ? Number($("pend-resp").value) : null,
    prazo: $("pend-prazo").value,
    prio: $("pend-prio").value
  };
  const prazoAtual = pendEditando ? brParaISO(pendEditando.Prazo) : "";
  if (!dados.titulo) return erro("Informe o título.");
  if (!dados.responsavelId) return erro("Escolha um responsável.");
  if (!dados.prazo) return erro("Informe o prazo.");
  if (dados.prazo < hojeISO() && dados.prazo !== prazoAtual) return erro("O prazo não pode estar no passado.");

  const resp = await fetch(pendEditando ? `${API}/tasks/${pendEditando.id}` : `${API}/tasks`, {
    method: pendEditando ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados)
  }).catch(() => null);
  if (!resp || !resp.ok) return erro(await erroResposta(resp, "Não foi possível salvar a pendência."));
  $("modal-pend").close();
  mostrarErroPend("");
  await carregar();
}

let pendExcluindo = null;
function confirmarExclusao(t) {
  pendExcluindo = t;
  $("excluir-texto").textContent = `"${t.texto}" será excluída. Essa ação não pode ser desfeita.`;
  $("modal-excluir").showModal();
  $("excluir-cancelar").focus(); // the safe choice gets the focus
}

$("btn-nova-pend").addEventListener("click", () => abrirPendencia());
$("pend-cancelar").addEventListener("click", () => $("modal-pend").close());
$("pend-form").addEventListener("submit", e => { e.preventDefault(); ocupar($("pend-salvar"), salvarPendencia); });
$("excluir-cancelar").addEventListener("click", () => $("modal-excluir").close());
aoClicar("excluir-confirmar", async () => {
  const t = pendExcluindo;
  const resp = await fetch(`${API}/tasks/${t.id}`, { method: 'DELETE' }).catch(() => null);
  $("modal-excluir").close();
  if (!resp || !resp.ok) { mostrarErroPend(await erroResposta(resp, "Não foi possível excluir a pendência.")); return; }
  mostrarErroPend("");
  await carregar();
});
$("lista-pend").addEventListener("click", e => {
  const editar = e.target.closest("[data-editar-pend]"), excluir = e.target.closest("[data-excluir-pend]");
  const id = editar?.dataset.editarPend ?? excluir?.dataset.excluirPend;
  const t = id && tarefas.find(x => String(x.id) === id);
  if (!t) return;
  if (editar) abrirPendencia(t); else confirmarExclusao(t);
});

// evidências: selecionar e arrastar
// same rules as EvidenceController; the server checks again
const EV_MAX_MB = 10;
const EV_EXTENSOES = ["pdf", "xlsx", "xls", "csv", "docx", "png", "jpg", "jpeg"];
const extensao = nome => (nome.match(/\.([^.]+)$/) || [])[1]?.toLowerCase() || "";

function mostrarErroEvidencia(msgs) {
  $("ev-erro").textContent = msgs.join("\n");
  $("ev-erro").style.display = msgs.length ? "block" : "none";
}

const errosArquivos = arquivos => arquivos.flatMap(f =>
  !EV_EXTENSOES.includes(extensao(f.name)) ? [`${f.name}: tipo de arquivo não permitido. Envie PDF, XLSX, XLS, CSV, DOCX, PNG, JPG ou JPEG.`]
  : f.size > EV_MAX_MB * 1024 * 1024 ? [`${f.name}: o arquivo passa do limite de ${EV_MAX_MB} MB.`]
  : !f.size ? [`${f.name}: o arquivo está vazio.`] : []);

// <option>s for the indicator selects, grouped by pillar
function opcoesIndicadores(primeira) {
  const porCat = {};
  indicadores.forEach(i => (porCat[i.cat] ||= []).push(i));
  return `<option value="">${primeira}</option>` + Object.entries(porCat).map(([cat, l]) =>
    `<optgroup label="${esc(cat)}">${l.map(i => `<option value="${i.id}">${esc(i.nome)}</option>`).join("")}</optgroup>`).join("");
}

// "Nova evidência" dialog: opened by the button or by dropping files on the dropzone
function tamanho(bytes) {
  return bytes < 1024 * 1024
    ? Math.max(1, Math.round(bytes / 1024)) + " KB"
    : (bytes / 1024 / 1024).toFixed(1).replace(".", ",") + " MB";
}
function listarSelecionados() {
  $("ev-selecionados").innerHTML = [...$("ev-arquivos").files].map(f =>
    `<li>${esc(f.name)} <small>${tamanho(f.size)}</small></li>`).join("");
}
function abrirNovaEvidencia(arquivos = []) {
  $("ev-form").reset();
  $("ev-indicador").innerHTML = opcoesIndicadores("Sem indicador vinculado");
  if (arquivos.length) {
    const dt = new DataTransfer();
    arquivos.forEach(f => dt.items.add(f));
    $("ev-arquivos").files = dt.files;
  }
  listarSelecionados();
  $("ev-form-erro").style.display = "none";
  $("modal-ev").showModal();
}

async function enviarEvidencias() {
  const arquivos = [...$("ev-arquivos").files];
  const erroForm = msgs => { $("ev-form-erro").textContent = msgs.join("\n"); $("ev-form-erro").style.display = "block"; };
  if (!arquivos.length) return erroForm(["Selecione pelo menos um arquivo."]);
  const invalidos = errosArquivos(arquivos);
  if (invalidos.length) return erroForm(invalidos);

  const indicatorId = $("ev-indicador").value, descricao = $("ev-descricao").value.trim();
  $("modal-ev").close(); // a modal dialog sits above everything, including the loader
  mostrarErroEvidencia([]);
  mostrarCarregando(arquivos.length > 1 ? `Enviando ${arquivos.length} evidências…` : "Enviando evidência…");
  const erros = [];
  try {
    for (const f of arquivos) {
      const form = new FormData();
      form.append('nome', f.name);
      if (indicatorId) form.append('indicatorId', indicatorId);
      if (descricao) form.append('descricao', descricao);
      form.append('arquivo', f);
      const resp = await fetch(`${API}/evidence`, { method: 'POST', body: form }).catch(() => null);
      if (!resp || !resp.ok) {
        const dados = resp ? await resp.json().catch(() => ({})) : {};
        erros.push(`${f.name}: ${dados.erro || "não foi possível enviar o arquivo."}`);
      }
    }
    mostrarErroEvidencia(erros);
    await carregar();
  } finally {
    esconderCarregando();
  }
}

// "Vincular" on rows without an indicator: swaps the button for a small select
function mostrarVincular(btn, d) {
  const box = document.createElement("span");
  box.className = "vincular-box";
  box.innerHTML = `<select aria-label="Indicador para ${esc(d.nome)}">${opcoesIndicadores("Escolha o indicador…")}</select>
    <button class="btn-primario btn-mini" data-vinc-salvar="${d.id}">Salvar</button>
    <button class="btn-secundario btn-mini" data-vinc-cancelar>Cancelar</button>`;
  btn.replaceWith(box);
  box.querySelector("select").focus();
}
async function salvarVinculo(btn, d) {
  const sel = btn.closest(".vincular-box").querySelector("select");
  if (!sel.value) { mostrarErroEvidencia([`${d.nome}: escolha um indicador.`]); sel.focus(); return; }
  const resp = await fetch(`${API}/evidence/${d.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ indicatorId: Number(sel.value) })
  }).catch(() => null);
  if (!resp || !resp.ok) {
    const dados = resp ? await resp.json().catch(() => ({})) : {};
    mostrarErroEvidencia([`${d.nome}: ${dados.erro || "não foi possível vincular a evidência."}`]);
    return;
  }
  mostrarErroEvidencia([]);
  await carregar();
}

// a plain link can't send the Authorization header, so fetch with the token and open a blob URL
const ABRE_NO_NAVEGADOR = ["pdf", "png", "jpg", "jpeg"];
async function abrirEvidencia(d, mostrarErro = msg => mostrarErroEvidencia([msg])) {
  const noNavegador = ABRE_NO_NAVEGADOR.includes(extensao(d.nome));
  // open the tab now, while the click still counts as a user action, or the popup blocker kicks in
  const aba = noNavegador ? window.open("", "_blank") : null;
  if (aba) { aba.opener = null; aba.document.title = d.nome; aba.document.body.textContent = "Carregando arquivo…"; }
  try {
    const resp = await fetch(`${API}/evidence/${d.id}/file`);
    if (!resp.ok) {
      const dados = await resp.json().catch(() => ({}));
      throw new Error(dados.erro || "Não foi possível abrir o arquivo.");
    }
    const url = URL.createObjectURL(await resp.blob());
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    if (aba) { aba.location.href = url; return; }
    const a = document.createElement("a");
    a.href = url;
    if (noNavegador) a.target = "_blank"; // popup was blocked: try a regular new-tab link
    else a.download = d.nome;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    if (aba) aba.close();
    mostrarErro(`${d.nome}: ${e.message}`);
  }
}

// paperclip on each indicator card: small list of that indicator's evidence
function fecharEvidenciasIndicador() {
  document.querySelectorAll(".ind-ev-pop").forEach(p => p.remove());
  document.querySelectorAll('[data-ind-ev][aria-expanded="true"]').forEach(b => b.setAttribute("aria-expanded", "false"));
}
function alternarEvidenciasIndicador(btn) {
  const estavaAberto = btn.getAttribute("aria-expanded") === "true";
  fecharEvidenciasIndicador();
  if (estavaAberto) return;
  const ind = indicadores.find(i => String(i.id) === btn.dataset.indEv);
  if (!ind) return;
  const lista = docs.filter(d => d.indicadorId === ind.id);
  const pop = document.createElement("div");
  pop.className = "ind-ev-pop";
  pop.id = `ind-ev-pop-${ind.id}`;
  pop.setAttribute("role", "region");
  pop.setAttribute("aria-label", `Evidências de ${ind.nome}`);
  pop.innerHTML = `<p class="ind-ev-titulo">Evidências</p>` + (lista.length
    ? `<ul>${lista.map(d => `
        <li><span class="ind-ev-nome" title="${esc(d.nome)}">${esc(d.nome)}</span>
          <span class="pill ${corStatus(d.status)}">${d.status}</span>
          ${d.arquivo
            ? `<button type="button" class="btn-secundario btn-mini" data-ev-abrir="${d.id}">Abrir</button>`
            : `<button type="button" class="btn-secundario btn-mini" disabled title="Arquivo enviado antes da mudança para o banco de dados; envie novamente">Abrir</button>`}</li>`).join("")}</ul>`
    : `<p class="ind-ev-vazio">Nenhuma evidência vinculada.</p>`)
    + `<p class="mensagem-erro" role="alert"></p>`;
  btn.closest(".ind-card").appendChild(pop);
  btn.setAttribute("aria-expanded", "true");
  btn.setAttribute("aria-controls", pop.id);
}
$("grade-indicadores").addEventListener("click", e => {
  const toggle = e.target.closest("[data-ind-ev]");
  if (toggle) { alternarEvidenciasIndicador(toggle); return; }
  const abrir = e.target.closest("[data-ev-abrir]");
  if (!abrir) return;
  const d = docs.find(x => String(x.id) === abrir.dataset.evAbrir);
  const erro = abrir.closest(".ind-ev-pop").querySelector(".mensagem-erro");
  erro.style.display = "none";
  if (d) ocupar(abrir, () => abrirEvidencia(d, msg => { erro.textContent = msg; erro.style.display = "block"; }));
});
document.addEventListener("click", e => {
  if (!e.target.closest(".ind-ev-pop, [data-ind-ev]")) fecharEvidenciasIndicador();
});
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  const aberto = document.querySelector('[data-ind-ev][aria-expanded="true"]');
  if (aberto) { fecharEvidenciasIndicador(); aberto.focus(); }
});
$("lista-docs").addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if ("vincCancelar" in btn.dataset) { renderEvidencias(); return; }
  const id = btn.dataset.abrir ?? btn.dataset.vincular ?? btn.dataset.vincSalvar;
  const d = docs.find(x => String(x.id) === id);
  if (!d) return;
  if (btn.dataset.abrir) ocupar(btn, () => abrirEvidencia(d));
  else if (btn.dataset.vincular) mostrarVincular(btn, d);
  else ocupar(btn, () => salvarVinculo(btn, d));
});
async function revisarEvidencia(d, decisao, nota) {
  const resp = await fetch(`${API}/evidence/${d.id}/review`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisao, nota })
  }).catch(() => null);
  if (!resp || !resp.ok) return erroResposta(resp, "Não foi possível registrar a revisão.");
  return null;
}
let evRejeitando = null;
$("lista-docs").addEventListener("click", e => {
  const apr = e.target.closest("[data-aprovar]"), rej = e.target.closest("[data-rejeitar]");
  const d = docs.find(x => String(x.id) === (apr?.dataset.aprovar ?? rej?.dataset.rejeitar));
  if (!d) return;
  if (rej) {
    evRejeitando = d;
    $("rejeitar-form").reset();
    $("rejeitar-arquivo").textContent = d.nome;
    $("rejeitar-erro").style.display = "none";
    $("modal-rejeitar").showModal();
    $("rejeitar-nota").focus();
    return;
  }
  ocupar(apr, async () => {
    const erro = await revisarEvidencia(d, "aprovada", "");
    mostrarErroEvidencia(erro ? [`${d.nome}: ${erro}`] : []);
    if (!erro) await carregar();
  });
});
$("rejeitar-cancelar").addEventListener("click", () => $("modal-rejeitar").close());
$("rejeitar-form").addEventListener("submit", e => {
  e.preventDefault();
  ocupar($("rejeitar-confirmar"), async () => {
    const nota = $("rejeitar-nota").value.trim();
    const mostrar = msg => { $("rejeitar-erro").textContent = msg; $("rejeitar-erro").style.display = "block"; };
    if (!nota) return mostrar("Informe o motivo da rejeição.");
    const erro = await revisarEvidencia(evRejeitando, "rejeitada", nota);
    if (erro) return mostrar(erro);
    $("modal-rejeitar").close();
    mostrarErroEvidencia([]);
    await carregar();
  });
});
$("lista-docs").addEventListener("keydown", e => {
  if (e.key === "Escape" && e.target.closest(".vincular-box")) renderEvidencias();
});
$("btn-nova-ev").addEventListener("click", () => abrirNovaEvidencia());
$("ev-cancelar").addEventListener("click", () => $("modal-ev").close());
$("ev-arquivos").addEventListener("change", listarSelecionados);
$("ev-form").addEventListener("submit", e => { e.preventDefault(); enviarEvidencias(); });
const dz = $("dropzone");
["dragenter", "dragover"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add("sobre"); }));
["dragleave", "drop"].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove("sobre"); }));
dz.addEventListener("drop", e => { if (pode("evidencias") && e.dataTransfer.files.length) abrirNovaEvidencia([...e.dataTransfer.files]); });

// relatórios
// ---- Novo relatório: model + matching period inputs, with a suggested (editable) name
const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const NOMES_MODELO = { mensal: "Relatório mensal", semestral: "Relatório parcial", anual: "Relatório anual", intervalo: "Relatório", auditoria: "Pacote de auditoria" };
// the audit package picks its kind of period; the other models are one kind each
const tipoPeriodoRel = () => $("rel-modelo").value === "auditoria" ? $("rel-tipo").value : $("rel-modelo").value;
const ultimoDia = (ano, mes) => new Date(ano, mes, 0).getDate(); // mes 1-12
const pad = n => String(n).padStart(2, "0");
let nomeEditado = false;

// {inicio, fim, rotulo} for the chosen model, or {erro}
function periodoRelatorio() {
  const modelo = tipoPeriodoRel();
  const ano = id => { const v = $(id).value.trim(); return /^\d{4}$/.test(v) && +v >= 2000 && +v <= 2100 ? +v : null; };
  if (modelo === "mensal") {
    const a = ano("rel-ano-m"), m = +$("rel-mes").value;
    if (!a) return { erro: "Informe um ano válido." };
    return { inicio: `${a}-${pad(m)}-01`, fim: `${a}-${pad(m)}-${pad(ultimoDia(a, m))}`, rotulo: `${pad(m)}/${a}` };
  }
  if (modelo === "semestral") {
    const a = ano("rel-ano-s"), sem = +$("rel-semestre").value;
    if (!a) return { erro: "Informe um ano válido." };
    return sem === 1 ? { inicio: `${a}-01-01`, fim: `${a}-06-30`, rotulo: `1º semestre de ${a}` }
                     : { inicio: `${a}-07-01`, fim: `${a}-12-31`, rotulo: `2º semestre de ${a}` };
  }
  if (modelo === "anual") {
    const a = ano("rel-ano-a");
    if (!a) return { erro: "Informe um ano válido." };
    return { inicio: `${a}-01-01`, fim: `${a}-12-31`, rotulo: String(a) };
  }
  const ini = $("rel-inicio").value, fim = $("rel-fim").value;
  if (!ini || !fim) return { erro: "Informe o início e o fim do período." };
  if (fim < ini) return { erro: "O fim do período não pode ser antes do início." };
  return { inicio: ini, fim, rotulo: `${isoParaBR(ini)} a ${isoParaBR(fim)}` };
}
function atualizarFormRelatorio() {
  const modelo = $("rel-modelo").value, tipo = tipoPeriodoRel();
  $("rel-tipo-campo").hidden = modelo !== "auditoria";
  document.querySelectorAll("[data-rel-modo]").forEach(g => { g.hidden = g.dataset.relModo !== tipo; });
  const p = periodoRelatorio();
  if (!nomeEditado && !p.erro) $("rel-nome").value = `${NOMES_MODELO[modelo]} – ${p.rotulo}`;
}
function abrirNovoRelatorio(modelo = "mensal") {
  $("rel-form").reset();
  nomeEditado = false;
  const hoje = new Date(), ano = hoje.getFullYear(), mes = hoje.getMonth() + 1;
  // defaults: the last full month, the current semester, the current year, this month so far
  const mesAnterior = mes === 1 ? 12 : mes - 1, anoMesAnterior = mes === 1 ? ano - 1 : ano;
  $("rel-mes").innerHTML = MESES.map((n, k) => `<option value="${k + 1}">${n[0].toUpperCase() + n.slice(1)}</option>`).join("");
  $("rel-mes").value = mesAnterior;
  $("rel-ano-m").value = anoMesAnterior;
  $("rel-semestre").value = mes <= 6 ? "1" : "2";
  $("rel-ano-s").value = ano;
  $("rel-ano-a").value = ano;
  $("rel-inicio").value = `${ano}-${pad(mes)}-01`;
  $("rel-fim").value = hojeISO();
  // only admin and auditor may create the audit package (the server checks it too)
  document.querySelectorAll("[data-perm-opcao]").forEach(o => { o.disabled = o.hidden = !pode(o.dataset.permOpcao); });
  $("rel-modelo").value = modelo === "auditoria" && !pode("auditoria") ? "mensal" : modelo;
  $("rel-form-erro").style.display = "none";
  atualizarFormRelatorio();
  $("modal-rel").showModal();
  $("rel-modelo").focus();
}
$("btn-novo-rel").addEventListener("click", () => abrirNovoRelatorio());
$("rel-form").addEventListener("input", e => {
  if (e.target.id === "rel-nome") { nomeEditado = $("rel-nome").value.trim() !== ""; return; }
  atualizarFormRelatorio();
});
$("rel-form").addEventListener("change", e => { if (e.target.id !== "rel-nome") atualizarFormRelatorio(); });
$("rel-cancelar").addEventListener("click", () => $("modal-rel").close());
$("rel-form").addEventListener("submit", e => {
  e.preventDefault();
  ocupar($("rel-gerar"), async () => {
    const erro = msg => { $("rel-form-erro").textContent = msg; $("rel-form-erro").style.display = "block"; };
    const p = periodoRelatorio();
    if (p.erro) return erro(p.erro);
    const nome = $("rel-nome").value.trim();
    if (!nome) return erro("Informe o nome do relatório.");
    const resp = await fetch(`${API}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, modelo: $("rel-modelo").value, periodo: tipoPeriodoRel(), inicio: p.inicio, fim: p.fim })
    }).catch(() => null);
    if (!resp || !resp.ok) return erro(await erroResposta(resp, "Não foi possível gerar o relatório."));
    $("modal-rel").close();
    await carregar();
  });
});

// ---- Abrir: a print-friendly page in a new tab, built from the snapshot
async function abrirRelatorio(id, alvoErro = $("rel-erro")) {
  const aba = window.open("", "_blank"); // now, while the click still counts as a user action
  if (aba) { aba.opener = null; aba.document.title = "Relatório"; aba.document.body.textContent = "Carregando relatório…"; }
  const resp = await fetch(`${API}/reports/${id}`).catch(() => null);
  if (!resp || !resp.ok) {
    if (aba) aba.close();
    const msg = await erroResposta(resp, "Não foi possível abrir o relatório.");
    alvoErro.textContent = msg; alvoErro.style.display = "block";
    return;
  }
  alvoErro.style.display = "none";
  const r = await resp.json();
  if (!aba) { alvoErro.textContent = "O navegador bloqueou a nova aba. Permita pop-ups para este site e tente de novo."; alvoErro.style.display = "block"; return; }
  aba.document.open();
  aba.document.write(r.modelo === "auditoria" ? paginaAuditoria(r) : paginaRelatorio(r));
  aba.document.close();
  aba.document.getElementById("imprimir").addEventListener("click", () => aba.print());
}
function paginaRelatorio(r) {
  const classeEv = s => s === "Aprovada" ? "ok" : s === "Rejeitada" ? "rej" : "ana";
  const classeStatus = s => s === "Atualizado" ? "ok" : s === "Desatualizado" ? "atr" : "ana";
  // evidence totals by review state, counted from the snapshot (works for reports generated before this layout)
  const evs = r.indicadores.flatMap(i => i.evidencias);
  const contaEv = s => evs.filter(e => classeEv(e.status) === s).length;
  const semDado = r.indicadores.filter(i => i.semDado).length;

  // one block per pillar, in the usual ESG order; any other pillar goes last
  const ORDEM = ["Ambiental", "Social", "Governança"];
  const pilares = [...new Set(r.indicadores.map(i => i.pilar))]
    .sort((a, b) => (ORDEM.indexOf(a) + 1 || 99) - (ORDEM.indexOf(b) + 1 || 99));
  const indicador = i => {
    const prog = i.progresso == null ? null : Math.max(0, Math.min(100, Number(i.progresso)));
    const detalhes = [i.gri ? "GRI " + esc(i.gri) : "", i.ods ? "ODS " + esc(i.ods) : "", i.responsavel ? esc(i.responsavel) : ""].filter(Boolean).join(" · ");
    return `<tbody class="ind">
      <tr class="linha">
        <td><strong>${esc(i.nome)}</strong>${detalhes ? `<span class="sub">${detalhes}</span>` : ""}</td>
        <td class="num ${i.semDado ? "falta" : ""}">${esc(i.valor)}${i.dataValor ? `<span class="sub">ref. ${esc(i.dataValor)}</span>` : ""}</td>
        <td><span class="pill st-${classeStatus(i.status)}">${esc(i.status)}</span></td>
        <td class="meta-col">${prog == null ? "—" : `<span class="pct">${prog}%</span><span class="barra-meta"><i style="width:${prog}%"></i></span>`}</td>
      </tr>
      <tr class="evid"><td colspan="4">${i.evidencias.length
        ? `<span class="rotulo">Evidências</span>${i.evidencias.map(e => `<span class="arq">${esc(e.nome)} <span class="pill ev-${classeEv(e.status)}">${esc(e.status)}</span></span>`).join("")}`
        : `<span class="rotulo">Evidências</span><span class="sub-inline">Nenhuma evidência vinculada</span>`}</td></tr>
    </tbody>`;
  };
  const secoes = pilares.map(p => {
    const lista = r.indicadores.filter(i => i.pilar === p);
    return `<section class="pilar">
      <h2>${esc(p)} <span>${lista.length} ${lista.length === 1 ? "indicador" : "indicadores"}</span></h2>
      <table>
        <colgroup><col><col class="c-valor"><col class="c-status"><col class="c-meta"></colgroup>
        <thead><tr><th>Indicador</th><th class="num">Valor no período</th><th>Status</th><th>Meta</th></tr></thead>
        ${lista.map(indicador).join("")}
      </table>
    </section>`;
  }).join("");

  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(r.nome)}</title>
<style>
  *{box-sizing:border-box} html{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body{font-family:"Plus Jakarta Sans",Arial,sans-serif;color:#1c2b2b;margin:0 auto;padding:32px;max-width:210mm;font-size:12px;line-height:1.45;background:#fff}
  .barra{display:flex;justify-content:flex-end;margin-bottom:24px}
  .barra button{font:600 13px inherit;padding:9px 16px;border-radius:8px;border:none;background:#0a5252;color:#fff;cursor:pointer}
  header{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;border-bottom:2px solid #0a5252;padding-bottom:14px;margin-bottom:20px}
  .org{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#1a6b68;font-weight:700}
  h1{font-size:21px;margin:4px 0 0;line-height:1.25}
  .info{text-align:right;color:#5f6b70;font-size:11px;line-height:1.6;white-space:nowrap}
  .info b{color:#1c2b2b;font-weight:600}
  .status{display:inline-block;font-size:10px;font-weight:700;padding:2px 9px;border-radius:999px;background:#e8ecec;color:#5a6468;margin-left:8px;vertical-align:middle;letter-spacing:.02em}
  .status.publicado{background:#dff2e5;color:#1d6b3a}

  .resumo{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px}
  .grupo{border:1px solid #e6e1d6;border-radius:10px;padding:12px 14px;background:#fbfaf6}
  .grupo h3{margin:0 0 10px;font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#5f6b70}
  .nums{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .nums div{font-size:10.5px;color:#5f6b70;line-height:1.3}
  .nums strong{display:block;font-size:20px;line-height:1.1;margin-bottom:2px;color:#1c2b2b;font-variant-numeric:tabular-nums}
  .nums .ok strong{color:#1d6b3a} .nums .ana strong{color:#2b5a66} .nums .rej strong{color:#a13224} .nums .atr strong{color:#a15c00}

  section.pilar{margin-bottom:22px}
  h2{display:flex;align-items:baseline;gap:8px;font-size:14px;margin:0 0 6px;padding:6px 10px;border-left:3px solid #0a5252;background:#eef4f3;border-radius:0 6px 6px 0;break-after:avoid}
  h2 span{font-size:10.5px;font-weight:500;color:#5f6b70}
  table{width:100%;border-collapse:collapse;table-layout:fixed}
  col.c-valor{width:24%} col.c-status{width:17%} col.c-meta{width:15%}
  th{text-align:left;font-size:9.5px;text-transform:uppercase;letter-spacing:.05em;color:#5f6b70;font-weight:600;padding:6px 8px;border-bottom:1px solid #cfd6d6}
  tbody.ind{break-inside:avoid}
  tbody.ind + tbody.ind tr.linha td{border-top:1px solid #e6e1d6}
  td{vertical-align:top;padding:9px 8px 3px}
  tr.evid td{padding:0 8px 9px;font-size:10.5px}
  .num{text-align:right;font-variant-numeric:tabular-nums}
  .sub{display:block;color:#5f6b70;font-size:10px;font-weight:400;margin-top:1px}
  .sub-inline{color:#8a9498;font-style:italic}
  .falta{color:#a15c00}
  .pill{display:inline-block;font-size:9.5px;font-weight:700;padding:1px 7px;border-radius:999px;white-space:nowrap}
  .st-ok,.ev-ok{background:#dff2e5;color:#1d6b3a} .st-atr{background:#fdecc8;color:#8a4f00} .st-ana,.ev-ana{background:#d9e9ee;color:#2b5a66} .ev-rej{background:#fbdcd8;color:#a13224}
  .pct{font-weight:600;font-variant-numeric:tabular-nums}
  .barra-meta{display:block;height:5px;margin-top:4px;border-radius:3px;background:#e6ecec;overflow:hidden}
  .barra-meta i{display:block;height:100%;background:#0a5252;border-radius:3px}
  .rotulo{font-size:9px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a9498;margin-right:8px}
  .arq{display:inline-block;margin:2px 12px 2px 0;color:#3d4a4a}
  footer{margin-top:24px;padding-top:10px;border-top:1px solid #e6e1d6;font-size:10px;color:#5f6b70}
  @page{size:A4 portrait;margin:14mm}
  @media print{body{padding:0;max-width:none}.barra{display:none}}
</style></head><body>
<div class="barra"><button id="imprimir" type="button">Imprimir / Salvar como PDF</button></div>
<header>
  <div>
    <div class="org">${esc(r.organizacao.nome)}${r.organizacao.setor ? " · " + esc(r.organizacao.setor) : ""}</div>
    <h1>${esc(r.nome)}<span class="status ${r.status === "Publicado" ? "publicado" : ""}">${esc(r.status)}</span></h1>
  </div>
  <div class="info">
    ${esc(r.modeloNome)} · <b>${esc(r.periodo.texto)}</b><br>
    ${r.modelo === "intervalo" ? "" : `${esc(r.periodo.inicio)} a ${esc(r.periodo.fim)}<br>`}
    Gerado em ${esc(r.geradoEm)} por ${esc(r.geradoPor)}
  </div>
</header>
<div class="resumo">
  <div class="grupo"><h3>Indicadores</h3><div class="nums">
    <div><strong>${r.resumo.indicadores}</strong>ativos</div>
    <div class="ok"><strong>${r.resumo.comDado}</strong>com dado no período</div>
    <div class="atr"><strong>${semDado}</strong>sem dado no período</div>
  </div></div>
  <div class="grupo"><h3>Evidências</h3><div class="nums">
    <div class="ok"><strong>${contaEv("ok")}</strong>aprovadas</div>
    <div class="ana"><strong>${contaEv("ana")}</strong>em análise</div>
    <div class="rej"><strong>${contaEv("rej")}</strong>rejeitadas</div>
  </div></div>
</div>
${secoes || `<p class="sub-inline">Nenhum indicador ativo.</p>`}
<footer>Cada valor é o último registro com data de referência dentro do período. Status, meta e evidências refletem o momento em que o relatório foi gerado. Gerado pelo Evidra.</footer>
</body></html>`;
}
// "Pacote de auditoria": summary and gaps first, then one A4 page (or more) per pillar
function paginaAuditoria(r) {
  const tags = i => (i.gri ? ` <span class="tag">GRI ${esc(i.gri)}</span>` : "") + (i.ods ? ` <span class="tag ods">ODS ${esc(i.ods)}</span>` : "");
  const classeEv = s => s === "Aprovada" ? "ok" : s === "Rejeitada" ? "rej" : "ana";
  const lacuna = (titulo, nomes, explica) => `
    <div class="lacuna"><h3>${titulo} <span class="qtd">${nomes.length}</span></h3><p class="sub">${explica}</p>
      ${nomes.length ? `<ul>${nomes.map(n => `<li>${esc(n)}</li>`).join("")}</ul>` : `<p class="nenhuma">Nenhum.</p>`}</div>`;
  const indicador = i => `
    <article class="ind">
      <h3>${esc(i.nome)}${tags(i)}</h3>
      <p class="sub">${esc(i.pilar)}${i.unidade ? " · " + esc(i.unidade) : ""} · Responsável: ${esc(i.responsavel || "—")}</p>
      <h4>Valores registrados no período</h4>
      ${i.valores.length ? `<table><thead><tr><th>Data de referência</th><th class="num">Valor</th><th>Registrado por</th><th>Registrado em</th></tr></thead><tbody>
        ${i.valores.map(v => `<tr><td>${esc(v.data)}</td><td class="num">${esc(v.valor)}</td><td>${esc(v.quem || "—")}</td><td>${esc(v.registradoEm)}</td></tr>`).join("")}
      </tbody></table>` : `<p class="falta">Nenhum valor com data de referência no período.</p>`}
      <h4>Evidências</h4>
      ${i.evidencias.length ? `<table><thead><tr><th>Arquivo</th><th>Status</th><th>Revisão</th><th>SHA-256 (12)</th></tr></thead><tbody>
        ${i.evidencias.map(e => `<tr><td>${esc(e.arquivo)}${e.enviadoPor ? `<br><span class="sub">Enviado por ${esc(e.enviadoPor)}${e.enviadoEm ? " em " + esc(e.enviadoEm) : ""}</span>` : ""}</td>
          <td><span class="ev ev-${classeEv(e.status)}">${esc(e.status)}</span></td>
          <td>${e.revisor ? `${esc(e.revisor)}${e.revisadoEm ? ", " + esc(e.revisadoEm) : ""}` : `<span class="sub">Sem revisão</span>`}${e.nota ? `<br><span class="nota">“${esc(e.nota)}”</span>` : ""}</td>
          <td class="hash">${e.sha256 ? esc(e.sha256) : `<span class="sub">arquivo não armazenado</span>`}</td></tr>`).join("")}
      </tbody></table>` : `<p class="falta">Nenhuma evidência vinculada.</p>`}
    </article>`;
  const cabecalho = `
    <div class="org">${esc(r.organizacao.nome)}${r.organizacao.setor ? " · " + esc(r.organizacao.setor) : ""}</div>
    <h1>${esc(r.nome)} <span class="status ${r.status === "Publicado" ? "publicado" : ""}">${esc(r.status)}</span></h1>
    <div class="meta">Pacote de auditoria · Período: ${esc(r.periodo.texto)} (${esc(r.periodo.inicio)} a ${esc(r.periodo.fim)})<br>
      Gerado em ${esc(r.geradoEm)} por ${esc(r.geradoPor)}</div>`;
  const s = r.resumo, l = s.lacunas;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(r.nome)}</title>
<style>
  *{box-sizing:border-box} body{font-family:"Plus Jakarta Sans",Arial,sans-serif;color:#1c2b2b;margin:0 auto;padding:32px;max-width:210mm;font-size:12px;line-height:1.45}
  .barra{display:flex;justify-content:flex-end;margin-bottom:24px}
  .barra button{font:600 13px inherit;padding:9px 16px;border-radius:8px;border:none;background:#0a5252;color:#fff;cursor:pointer}
  header{border-bottom:2px solid #0a5252;padding-bottom:14px;margin-bottom:18px}
  .org{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#1a6b68;font-weight:700}
  h1{font-size:20px;margin:4px 0 6px} .meta{color:#5f6b70;font-size:11px}
  h2{font-size:16px;margin:0 0 12px;padding-bottom:6px;border-bottom:1px solid #cfd6d6} h3{font-size:13px;margin:0 0 2px} h4{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#5f6b70;margin:12px 0 4px}
  .status{display:inline-block;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;background:#e8ecec;color:#5a6468;vertical-align:middle}
  .status.publicado{background:#dff2e5;color:#1d6b3a}
  .numeros{display:flex;gap:28px;margin:0 0 20px} .numeros div{color:#5f6b70} .numeros strong{display:block;font-size:22px;color:#1c2b2b}
  .lacunas{display:grid;grid-template-columns:repeat(3,1fr);gap:14px} .lacuna{border:1px solid #e6e1d6;border-radius:8px;padding:10px 12px;break-inside:avoid}
  .lacuna .qtd{float:right;font-size:13px;color:#a15c00} .lacuna ul{margin:6px 0 0;padding-left:16px} .nenhuma{color:#1d6b3a;margin:6px 0 0}
  section.pilar{break-before:page;padding-top:4px} .ind{border-top:1px solid #e6e1d6;padding:12px 0 6px;break-inside:avoid-page}
  table{width:100%;border-collapse:collapse;margin-bottom:4px} th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#5f6b70;border-bottom:1px solid #cfd6d6;padding:4px 6px}
  td{vertical-align:top;padding:5px 6px;border-bottom:1px solid #eee9de} tr{break-inside:avoid} .num{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .sub{color:#5f6b70;font-size:10.5px} .falta{color:#a15c00;margin:2px 0} .nota{font-style:italic;color:#3d4a4a}
  .hash{font-family:Consolas,"Courier New",monospace;font-size:11px;white-space:nowrap}
  .tag{font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;background:#e7f0ef;color:#0a5252;vertical-align:middle} .tag.ods{background:#f8edcf;color:#7a5600}
  .ev{font-size:10px;font-weight:700;padding:1px 6px;border-radius:999px;white-space:nowrap} .ev-ok{background:#dff2e5;color:#1d6b3a} .ev-rej{background:#fbdcd8;color:#a13224} .ev-ana{background:#d9e9ee;color:#2b5a66}
  footer{margin-top:20px;font-size:10.5px;color:#5f6b70}
  @page{size:A4 portrait;margin:14mm} @media print{body{padding:0;max-width:none}.barra{display:none}}
</style></head><body>
<div class="barra"><button id="imprimir" type="button">Imprimir / salvar PDF</button></div>
<header>${cabecalho}</header>
<h2>Resumo</h2>
<div class="numeros">
  <div><strong>${s.indicadores}</strong>indicadores ativos</div>
  <div><strong>${s.comEvidenciaAprovada}</strong>com ao menos uma evidência aprovada</div>
  <div><strong>${s.comValor}</strong>com valor no período</div>
</div>
<h2>Lacunas</h2>
<div class="lacunas">
  ${lacuna("Sem evidência", l.semEvidencia, "Nenhum arquivo vinculado ao indicador.")}
  ${lacuna("Só evidências não aprovadas", l.soNaoAprovada, "Há arquivos, mas nenhum foi aprovado (em análise ou rejeitados).")}
  ${lacuna("Sem valor no período", l.semValor, "Nenhum registro com data de referência no período.")}
</div>
${r.categorias.map(c => `<section class="pilar"><h2>${esc(c.nome)} <span class="sub">· ${c.indicadores.length} ${c.indicadores.length === 1 ? "indicador" : "indicadores"}</span></h2>${c.indicadores.map(indicador).join("")}</section>`).join("")
  || `<p>Nenhum indicador ativo.</p>`}
<footer>Conteúdo congelado no momento da geração. O código SHA-256 (12 primeiros caracteres) identifica o conteúdo exato de cada arquivo armazenado: um arquivo entregue depois deve gerar o mesmo código. Gerado pelo Evidra.</footer>
</body></html>`;
}
$("lista-rel").addEventListener("click", e => {
  const abrir = e.target.closest("[data-abrir-rel]"), pub = e.target.closest("[data-publicar]"), arq = e.target.closest("[data-arquivar-rel]");
  if (abrir) { ocupar(abrir, () => abrirRelatorio(abrir.dataset.abrirRel)); return; }
  if (arq) {
    const r = relatorios.find(x => String(x.id) === arq.dataset.arquivarRel);
    if (!r) return;
    confirmar({
      titulo: "Arquivar relatório?",
      texto: `"${r.nome}" sai da lista de relatórios gerados. Nada é apagado${r.status === "Publicado" ? ": a versão publicada continua valendo" : ""}, e você pode restaurá-lo em "Ver arquivados".`,
      botao: "Arquivar"
    }).then(ok => ok && ocupar(arq, async () => {
      const resp = await fetch(`${API}/reports/${r.id}/archive`, { method: 'POST' }).catch(() => null);
      if (!resp || !resp.ok) { $("rel-erro").textContent = await erroResposta(resp, "Não foi possível arquivar."); $("rel-erro").style.display = "block"; return; }
      $("rel-erro").style.display = "none";
      await carregar();
      mostrarSucesso(`Relatório "${r.nome}" arquivado.`, "Para restaurá-lo, use Relatórios → Ver arquivados.");
    }));
    return;
  }
  if (!pub) return;
  const r = relatorios.find(x => String(x.id) === pub.dataset.publicar);
  confirmar({ titulo: "Publicar relatório?", texto: `"${r.nome}" passa a ser a versão oficial. Depois de publicado, ele não volta a rascunho.`, botao: "Publicar", perigo: false })
    .then(ok => ok && ocupar(pub, async () => {
      const resp = await fetch(`${API}/reports/${r.id}/publish`, { method: 'POST' }).catch(() => null);
      if (!resp || !resp.ok) { $("rel-erro").textContent = await erroResposta(resp, "Não foi possível publicar."); $("rel-erro").style.display = "block"; return; }
      $("rel-erro").style.display = "none";
      await carregar();
    }));
});

// equipe
const DICAS_PERFIL = {
  responsavel: "Cadastra indicadores, envia evidências, cuida das pendências e cria relatórios.",
  auditor: "Consulta tudo e revisa evidências. Não altera indicadores nem envia evidências.",
  admin: "Acesso completo, incluindo equipe e configurações."
};
const atualizarDicaPerfil = () => { $("convite-dica").textContent = DICAS_PERFIL[$("convite-role").value]; };
$("btn-convidar").addEventListener("click", () => {
  $("convite-form").reset();
  atualizarDicaPerfil();
  $("convite-erro").style.display = "none";
  $("modal-convite").showModal();
});
$("convite-role").addEventListener("change", atualizarDicaPerfil);
$("convite-cancelar").addEventListener("click", () => $("modal-convite").close());
$("convite-form").addEventListener("submit", e => {
  e.preventDefault();
  ocupar($("convite-enviar"), async () => {
    const erro = msg => { $("convite-erro").textContent = msg; $("convite-erro").style.display = "block"; };
    const nome = $("convite-nome").value.trim(), email = $("convite-email").value.trim();
    if (!nome) return erro("Informe o nome.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return erro("Informe um e-mail válido.");
    const resp = await fetch(`${API}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, role: $("convite-role").value })
    }).catch(() => null);
    if (!resp || !resp.ok) return erro(await erroResposta(resp, "Não foi possível convidar."));
    $("modal-convite").close();
    await carregar();
  });
});

// configurações
aoClicar("cfg-salvar", async () => {
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

// chip groups: one active at a time
function marcarChip(seletor, ativo) {
  document.querySelectorAll(seletor).forEach(x => { x.classList.toggle("ativo", x === ativo); x.setAttribute("aria-pressed", String(x === ativo)); });
}
// browser storage may be blocked (private mode); everything here works without it
const lerJSON = (k, padrao) => { try { return JSON.parse(localStorage.getItem(k)) ?? padrao; } catch { return padrao; } };
const gravarJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* not remembered, still works */ } };

// ================= Notificações =================
// built from what carregar() already loaded (tasks, evidence, activity);
// which ones were read is remembered per user, in this browser
const chaveLidas = () => `evidra:notif-lidas:${usuarioAtual().id ?? ""}`;
const PREFS_NOTIF = { prazos: "notif-prazos", evidencias: "notif-evidencias", atividade: "notif-atividade" };
const prefsNotif = () => ({ prazos: true, evidencias: true, atividade: true, ...lerJSON("evidra:notif-prefs", {}) });
let filtroNotif = "todas", notificacoes = [];

// days from today until a dd/mm/yyyy date (negative = already past), or null
const diasAte = br => {
  const iso = brParaISO(br);
  return iso ? Math.round((Date.parse(iso + "T12:00:00") - Date.parse(hojeISO() + "T12:00:00")) / 864e5) : null;
};

function montarNotificacoes() {
  const u = usuarioAtual(), eu = u.id, pref = prefsNotif(), l = [];
  if (pref.prazos) {
    tarefas.filter(t => t.origem !== "sistema" && !t.feita && t.responsavelId === eu).forEach(t => {
      const d = diasAte(t.Prazo);
      if (d == null || d > 7) return;
      l.push({ id: `pend-${t.id}-${t.Prazo}`, icone: "clip", tom: d < 0 ? "amarelo" : "", ordem: d < 0 ? 0 : 3,
        titulo: d < 0 ? `Pendência atrasada: ${t.texto}`
          : `Pendência vence ${d === 0 ? "hoje" : d === 1 ? "amanhã" : `em ${d} dias`}: ${t.texto}`,
        det: `Prazo ${t.Prazo} · prioridade ${t.prio.toLowerCase()}`, view: "pendencias" });
    });
    // outdated indicators: the owner's business; admins see all of them
    tarefas.filter(t => String(t.id).startsWith("sys-ind-") && (t.responsavelId === eu || u.role === "admin")).forEach(t => {
      const ind = indicadores.find(i => i.id === t.indicadorId);
      if (!ind) return;
      l.push({ id: `ind-${ind.id}-${t.Prazo}`, icone: "warn", tom: "amarelo", ordem: 2,
        titulo: `Indicador desatualizado: ${ind.nome}`,
        det: `${t.Prazo === "—" ? "Nenhum valor registrado ainda" : `Atualização prevista para ${t.Prazo}`}${t.responsavelId === eu ? "" : ` · ${t.quem}`}`,
        view: "indicadores", abrir: pode("indicadores") ? () => abrirAtualizar(ind) : null });
    });
  }
  if (pref.evidencias) {
    // what happened to the evidence I sent
    docs.filter(d => d.enviadoPorId === eu && d.revisor && d.status !== "Em análise").forEach(d => {
      const rej = d.status === "Rejeitada";
      l.push({ id: `rev-${d.id}-${d.status}`, icone: rej ? "warn" : "ok", tom: rej ? "amarelo" : "verde", ordem: rej ? 1 : 4,
        titulo: `${d.nome} foi ${rej ? "rejeitada" : "aprovada"} por ${d.revisor}`,
        det: rej && d.nota ? `Motivo: ${d.nota}` : `Em ${d.revisadoEm || "—"} · ${d.ind}`, view: "evidencias" });
    });
    // what waits for my review (nobody reviews their own upload)
    if (pode("revisar")) docs.filter(d => d.status === "Em análise" && d.enviadoPorId !== eu).forEach(d => {
      l.push({ id: `ev-${d.id}`, icone: "file", tom: "", ordem: 2,
        titulo: `Evidência aguardando revisão: ${d.nome}`, det: `Enviada por ${d.quem} em ${d.data} · ${d.ind}`, view: "evidencias" });
    });
  }
  if (pref.atividade) {
    atividades.filter(a => a.usuarioId != null && a.usuarioId !== eu).slice(0, 8).forEach(a => {
      l.push({ id: `at-${a.quando}-${a.usuarioId}-${a.acao}-${a.detalhe}`, icone: a.icone, tom: "verde", ordem: 5,
        titulo: `${a.nome} ${a.acao}`, det: a.det, view: "historico" });
    });
  }
  const lidas = new Set(lerJSON(chaveLidas(), []));
  l.forEach(n => { n.lida = lidas.has(n.id); });
  return l.sort((a, b) => a.ordem - b.ordem);
}

function renderNotificacoes() {
  notificacoes = montarNotificacoes();
  const naoLidas = notificacoes.filter(n => !n.lida).length;
  // bell: number of unread ones
  $("sino-contador").textContent = naoLidas ? (naoLidas > 9 ? "9+" : naoLidas) : "";
  $("btn-sino").setAttribute("aria-label", naoLidas ? `Notificações: ${naoLidas} não ${naoLidas === 1 ? "lida" : "lidas"}` : "Notificações");
  if (carregandoTelas.has("notificacoes")) return; // the bell stays current; the list waits for fresh data
  $("sub-notif").textContent = !notificacoes.length ? "Nada novo por aqui."
    : naoLidas ? `${naoLidas} não ${naoLidas === 1 ? "lida" : "lidas"} de ${notificacoes.length}. Clique em uma notificação para ir até ela.`
    : "Tudo lido. Clique em uma notificação para ir até ela.";
  $("btn-notif-lidas").disabled = !naoLidas;

  const l = notificacoes.filter(n => (filtroNotif === "todas" || !n.lida) && bate(n.titulo, n.det));
  $("lista-notif").innerHTML = l.length ? l.map(n => `
    <div class="linha notif ${n.lida ? "lida" : "nao-lida"}">
      <span class="ic-caixa ${n.tom}">${ic(n.icone)}</span>
      <div class="corpo"><strong>${esc(n.titulo)}</strong><small>${esc(n.det)}</small></div>
      ${n.lida ? "" : `<span class="ponto-novo" title="Não lida"><span class="sr-only">Não lida</span></span>
        <button class="btn-icone btn-notif-ler" data-notif-ler="${esc(n.id)}" aria-label="Marcar como lida: ${esc(n.titulo)}" title="Marcar como lida">${ic("check")}</button>`}
      <button class="btn-secundario btn-mini" data-notif-ir="${esc(n.id)}">${n.abrir ? "Atualizar" : "Ver"}</button>
    </div>`).join("")
    : vazio(filtroNotif === "nao-lidas" && notificacoes.length ? "Nenhuma notificação não lida." : "Você não tem notificações. Avisos de prazos, revisões e atividade da equipe aparecem aqui.");
}

// opening the center fetches everything again, so new tasks, reviews and activity show up
function abrirNotificacoes() {
  $("sub-notif").textContent = "Buscando avisos novos…";
  $("btn-notif-lidas").disabled = true;
  return comCarregamento("notificacoes", $("lista-notif"), "Carregando notificações…", carregar, renderNotificacoes);
}

function marcarLidas(ids) {
  // keep only ids that still exist, so the stored list doesn't grow forever
  const atuais = new Set(notificacoes.map(n => n.id));
  const lidas = new Set(lerJSON(chaveLidas(), []).filter(id => atuais.has(id)));
  ids.forEach(id => lidas.add(id));
  gravarJSON(chaveLidas(), [...lidas]);
  renderNotificacoes();
}
$("btn-sino").addEventListener("click", () => mostrarView("notificacoes"));
$("btn-notif-lidas").addEventListener("click", () => marcarLidas(notificacoes.map(n => n.id)));
document.querySelectorAll("[data-notif]").forEach(c => c.addEventListener("click", () => {
  filtroNotif = c.dataset.notif;
  marcarChip("[data-notif]", c);
  renderNotificacoes();
}));
$("lista-notif").addEventListener("click", e => {
  const ler = e.target.closest("[data-notif-ler]"), ir = e.target.closest("[data-notif-ir]");
  const n = notificacoes.find(x => x.id === (ler?.dataset.notifLer ?? ir?.dataset.notifIr));
  if (!n) return;
  marcarLidas([n.id]);
  if (ir) { mostrarView(n.view); if (n.abrir) n.abrir(); }
});
Object.entries(PREFS_NOTIF).forEach(([chave, id]) => {
  $(id).checked = prefsNotif()[chave];
  $(id).addEventListener("change", () => {
    gravarJSON("evidra:notif-prefs", { ...prefsNotif(), [chave]: $(id).checked });
    renderNotificacoes();
  });
});

// ================= Meu perfil =================
const FOCOS = { ambiental: "Ambiental", social: "Social", governanca: "Governança" };
const ACOES_PERFIL = [
  ["indicadores", "Cadastrar, atualizar e arquivar indicadores"],
  ["evidencias", "Enviar e vincular evidências"],
  ["pendencias", "Criar, editar e concluir pendências"],
  ["importar", "Importar indicadores de uma planilha (CSV)"],
  ["relatorios", "Gerar e arquivar relatórios"],
  ["auditoria", "Gerar o pacote de auditoria"],
  ["revisar", "Aprovar ou rejeitar evidências de outras pessoas"],
  ["publicar", "Publicar relatórios como versão oficial"],
  ["equipe", "Convidar, desativar e reativar membros"],
  ["config", "Alterar os dados da empresa"]
];
let perfilEditado = false; // while the form has unsaved changes, a refresh must not overwrite it

function renderPerfil() {
  const u = usuarioAtual();
  if (!u.nome) return;
  $("perfil-sigla").textContent = u.sigla || "";
  $("perfil-sigla").style.cssText = u.id != null ? corAvatar(u) : "";
  $("perfil-nome").textContent = u.nome;
  $("perfil-cargo").textContent = u.cargo || "Cargo não informado";
  $("perfil-email").textContent = u.email || "";
  $("perfil-pills").innerHTML = `<span class="pill ${u.role === "admin" ? "ok" : u.role === "auditor" ? "warn" : "mute"}">${PERFIS[u.role] || "—"}</span>`
    + (u.foco ? `<span class="pill info">${FOCOS[u.foco]}</span>` : "");

  const meusInd = indicadores.filter(i => i.donoId === u.id);
  const desat = meusInd.filter(i => i.status === "Desatualizado").length;
  const minhasPend = tarefas.filter(t => t.origem !== "sistema" && !t.feita && t.responsavelId === u.id);
  const atrasadas = minhasPend.filter(t => (diasAte(t.Prazo) ?? 0) < 0).length;
  const minhasEv = docs.filter(d => d.enviadoPorId === u.id);
  const aprovadas = minhasEv.filter(d => d.status === "Aprovada").length;
  const numero = (valor, rotulo, detalhe, view, icone) => `
    <div class="card perfil-numero">
      <div class="card-topo"><span>${rotulo}</span><span class="verde">${ic(icone)}</span></div>
      <span class="nota">${valor}</span>
      <p class="qtd">${detalhe}</p>
      <a href="#" class="link-pequeno" data-view="${view}">Ver ${rotulo.toLowerCase()} →</a>
    </div>`;
  $("perfil-numeros").innerHTML =
    numero(meusInd.length, "Indicadores", meusInd.length ? `sob sua responsabilidade${desat ? ` · ${desat} desatualizado${desat === 1 ? "" : "s"}` : ""}` : "nenhum sob sua responsabilidade", "indicadores", "chart")
    + numero(minhasPend.length, "Pendências", minhasPend.length ? `abertas para você${atrasadas ? ` · ${atrasadas} atrasada${atrasadas === 1 ? "" : "s"}` : ""}` : "nenhuma aberta para você", "pendencias", "clip")
    + numero(minhasEv.length, "Evidências", minhasEv.length ? `enviadas por você · ${aprovadas} aprovada${aprovadas === 1 ? "" : "s"}` : "nenhuma enviada por você", "evidencias", "file");

  if (!perfilEditado) {
    $("perfil-in-nome").value = u.nome;
    $("perfil-in-cargo").value = u.cargo || "";
    $("perfil-in-foco").value = u.foco || "social";
    $("perfil-in-email").value = u.email || "";
  }
  $("perfil-permissoes").innerHTML = ACOES_PERFIL.map(([acao, texto]) => {
    const sim = pode(acao);
    return `<li class="${sim ? "sim" : "nao"}">${ic(sim ? "check" : "eyeOff")}<span>${texto}</span><span class="sr-only">${sim ? "(permitido)" : "(não permitido)"}</span></li>`;
  }).join("");

  const minhas = (historico || atividades).filter(a => a.usuarioId === u.id).slice(0, 5);
  $("perfil-atividade").innerHTML = minhas.length ? minhas.map(a => itemAtividade({ ...a, quem: "Você" })).join("")
    : `<p class="vazio vazio-sem-pad">Você ainda não registrou nenhuma atividade.</p>`;
}
// opening the profile fetches the user, their counts and their history again
function abrirPerfil() {
  perfilEditado = false;
  $("perfil-conteudo").hidden = true;
  $("perfil-carregando").hidden = false;
  return comCarregamento("perfil", $("perfil-carregando"), "Carregando seu perfil…",
    () => Promise.all([carregar(), carregarHistorico()]),
    () => { renderPerfil(); $("perfil-carregando").hidden = true; $("perfil-conteudo").hidden = false; });
}
$("perfil-form").addEventListener("input", () => { perfilEditado = true; $("perfil-ok").hidden = true; });
$("perfil-form").addEventListener("submit", e => {
  e.preventDefault();
  ocupar($("perfil-salvar"), async () => {
    const erro = msg => { $("perfil-erro").textContent = msg; $("perfil-erro").style.display = "block"; };
    $("perfil-erro").style.display = "none";
    const dados = { nome: $("perfil-in-nome").value.trim(), cargo: $("perfil-in-cargo").value.trim(), foco: $("perfil-in-foco").value };
    if (!dados.nome) return erro("Informe o seu nome.");
    const resp = await fetch(`${API}/auth/me`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados)
    }).catch(() => null);
    if (!resp || !resp.ok) return erro(await erroResposta(resp, "Não foi possível salvar os seus dados."));
    localStorage.setItem('usuario', JSON.stringify({ ...usuarioAtual(), ...(await resp.json()) }));
    perfilEditado = false;
    await carregar(); // the name also shows on the team, indicators and tasks
    $("perfil-ok").hidden = false;
    setTimeout(() => { $("perfil-ok").hidden = true; }, 2500);
  });
});

// ================= Histórico de atividades =================
let historico = null, filtroHist = "todos", buscandoHist = null;
const HIST_LIMITE = 500;
function carregarHistorico() {
  if (buscandoHist) return buscandoHist;
  buscandoHist = (async () => {
    const resp = await fetch(`${API}/activity?limit=${HIST_LIMITE}`).catch(() => null);
    if (!resp || !resp.ok) {
      $("historico-erro").textContent = await erroResposta(resp, "Não foi possível carregar o histórico. Tente novamente.");
      $("historico-erro").style.display = "block";
      renderHistorico();
      return;
    }
    $("historico-erro").style.display = "none";
    historico = await resp.json();
    renderHistorico();
    renderPerfil();
  })().finally(() => { buscandoHist = null; });
  return buscandoHist;
}
function renderHistorico() {
  if (carregandoTelas.has("historico")) return; // the loader stays until the fresh list arrives
  if (historico === null) { $("lista-historico").innerHTML = ""; return; }
  $("sub-historico").textContent = `Tudo o que foi feito no Evidra, do mais recente ao mais antigo · ${historico.length} ${historico.length === 1 ? "registro" : "registros"}${historico.length >= HIST_LIMITE ? ` (os ${HIST_LIMITE} mais recentes)` : ""}.`;
  const l = historico.filter(a => (filtroHist === "todos" || a.icone === filtroHist) && bate(a.nome, a.acao, a.detalhe, a.quando));
  if (!l.length) { $("lista-historico").innerHTML = vazio(historico.length ? "Nenhuma atividade deste tipo." : "Nenhuma atividade registrada ainda."); return; }
  const hoje = hojeBR(), ontem = new Date(Date.now() - 864e5).toLocaleDateString("pt-BR");
  let dia = null, h = "";
  l.forEach(a => {
    const [data, hora] = (a.quando || "").split(" ");
    if (data !== dia) {
      dia = data;
      h += `<h3 class="hist-dia">${data === hoje ? "Hoje" : data === ontem ? "Ontem" : esc(data)}</h3>`;
    }
    h += `<div class="linha">
      <span class="ic-caixa verde">${ic(a.icone)}</span>
      <div class="corpo"><strong><b>${esc(a.nome)}</b> ${esc(a.acao)}</strong><small>${esc(a.detalhe)}</small></div>
      <span class="meta">${esc(hora || "")}</span>
    </div>`;
  });
  $("lista-historico").innerHTML = h;
}
document.querySelectorAll("[data-hist-filtro]").forEach(c => c.addEventListener("click", () => {
  filtroHist = c.dataset.histFiltro;
  marcarChip("[data-hist-filtro]", c);
  renderHistorico();
}));

// ================= Arquivados =================
let arquivados = null, abaArq = "indicadores";
async function carregarArquivados() {
  const [ri, rr] = await Promise.all([
    fetch(`${API}/indicators/archived`).catch(() => null),
    fetch(`${API}/reports?arquivados=true`).catch(() => null)
  ]);
  if (!ri || !ri.ok || !rr || !rr.ok) {
    $("arq-erro").textContent = await erroResposta(ri && !ri.ok ? ri : rr, "Não foi possível carregar os itens arquivados. Tente novamente.");
    $("arq-erro").style.display = "block";
    renderArquivados();
    return;
  }
  $("arq-erro").style.display = "none";
  arquivados = { indicadores: await ri.json(), relatorios: await rr.json() };
  renderArquivados();
}
function abrirArquivados(aba) {
  abaArq = aba;
  marcarChip("[data-arq]", document.querySelector(`[data-arq="${aba}"]`));
  mostrarView("arquivados");
}
function renderArquivados() {
  if (carregandoTelas.has("arquivados")) return; // the loader stays until the fresh lists arrive
  if (!arquivados) { $("lista-arquivados").innerHTML = ""; return; }
  $("arq-qtd-indicadores").textContent = arquivados.indicadores.length || "";
  $("arq-qtd-relatorios").textContent = arquivados.relatorios.length || "";
  if (abaArq === "indicadores") {
    const l = arquivados.indicadores.filter(i => bate(i.nome, i.cat, i.dono));
    $("lista-arquivados").innerHTML = l.length ? l.map(i => `
      <div class="linha">
        <span class="ic-caixa">${ic("chart")}</span>
        <div class="corpo"><strong>${esc(i.nome)}</strong>
          <small>${esc(i.cat)} · ${esc(i.dono || "Sem responsável")} · ${i.registros} ${i.registros === 1 ? "registro" : "registros"} · ${i.evidencias} ${i.evidencias === 1 ? "evidência" : "evidências"}</small></div>
        <span class="pill mute">Arquivado</span>
        <button class="btn-secundario btn-mini" data-arq-hist="${i.id}">Histórico</button>
        ${pode("indicadores") ? `<button class="btn-secundario btn-mini btn-com-icone" data-restaurar-ind="${i.id}">${ic("restore")}Restaurar</button>` : ""}
      </div>`).join("") : vazio("Nenhum indicador arquivado.");
  } else {
    const l = arquivados.relatorios.filter(r => bate(r.nome, r.modeloNome, r.periodo, r.status, r.data));
    $("lista-arquivados").innerHTML = l.length ? l.map(r => `
      <div class="linha">
        <span class="ic-caixa">${ic("report")}</span>
        <div class="corpo"><strong>${esc(r.nome)}</strong>
          <small>${r.modeloNome ? `${esc(r.modeloNome)} · ${esc(r.periodo)} · ` : ""}Gerado em ${esc(r.data)}</small></div>
        <span class="pill ${corStatus(r.status)}">${r.status}</span>
        ${r.temConteudo
          ? `<button class="btn-secundario btn-mini" data-arq-abrir-rel="${r.id}">Abrir</button>`
          : `<button class="btn-secundario btn-mini" disabled title="Criado antes dos relatórios com dados">Abrir</button>`}
        ${pode("relatorios") ? `<button class="btn-secundario btn-mini btn-com-icone" data-restaurar-rel="${r.id}">${ic("restore")}Restaurar</button>` : ""}
      </div>`).join("") : vazio("Nenhum relatório arquivado.");
  }
}
document.querySelectorAll("[data-ver-arquivados]").forEach(b => b.addEventListener("click", () => abrirArquivados(b.dataset.verArquivados)));
document.querySelectorAll("[data-arq]").forEach(c => c.addEventListener("click", () => {
  abaArq = c.dataset.arq;
  marcarChip("[data-arq]", c);
  renderArquivados();
}));
$("lista-arquivados").addEventListener("click", e => {
  const hist = e.target.closest("[data-arq-hist]"), abrir = e.target.closest("[data-arq-abrir-rel]");
  const rInd = e.target.closest("[data-restaurar-ind]"), rRel = e.target.closest("[data-restaurar-rel]");
  if (hist) {
    const ind = arquivados.indicadores.find(i => String(i.id) === hist.dataset.arqHist);
    if (ind) abrirHistorico(ind, hist);
    return;
  }
  if (abrir) { ocupar(abrir, () => abrirRelatorio(abrir.dataset.arqAbrirRel, $("arq-erro"))); return; }
  const btn = rInd || rRel;
  if (!btn) return;
  const item = rInd ? arquivados.indicadores.find(i => String(i.id) === rInd.dataset.restaurarInd)
                    : arquivados.relatorios.find(r => String(r.id) === rRel.dataset.restaurarRel);
  if (!item) return;
  ocupar(btn, async () => {
    const resp = await fetch(`${API}/${rInd ? "indicators" : "reports"}/${item.id}/restore`, { method: 'POST' }).catch(() => null);
    if (!resp || !resp.ok) { $("arq-erro").textContent = await erroResposta(resp, "Não foi possível restaurar."); $("arq-erro").style.display = "block"; return; }
    $("arq-erro").style.display = "none";
    await Promise.all([carregar(), carregarArquivados()]);
    mostrarSucesso(`${rInd ? "Indicador" : "Relatório"} "${item.nome}" restaurado.`,
      rInd ? "Ele voltou para a lista de Indicadores." : "Ele voltou para a lista de Relatórios gerados.");
  });
});

hidratarIcones();
function mostrarTela(qual) {
  $("landing").hidden = qual !== "landing";
  $("entrar").hidden = qual !== "entrar";
  $("app").hidden = qual !== "app";
}
function mostrarLogin() {
  localStorage.removeItem('token');
  esconderCarregando();
  mostrarTela("entrar");
}

function erroLogin(msg) {
  $("l-erro").textContent = msg;
  $("l-erro").style.display = "block";
}
async function entrar() {
  let resp;
  try {
    resp = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $("l-email").value.trim(), senha: $("l-senha").value })
    });
  } catch {
    resp = null; // server unreachable
  }
  if (resp && resp.status === 401) {
    // wrong e-mail or password: keep the e-mail, clear the password and focus it
    erroLogin("E-mail ou senha incorretos.");
    $("l-senha").value = "";
    $("l-senha").focus();
    return;
  }
  if (!resp || !resp.ok) {
    erroLogin("Não foi possível entrar. Tente novamente.");
    return;
  }
  const dados = await resp.json();
  localStorage.setItem('token', dados.token);
  localStorage.setItem('usuario', JSON.stringify(dados));
  $("l-senha").value = "";
  ocultarSenhas();
  $("l-erro").style.display = "none";
  await carregar();
}
// "Entrar" only works with both fields filled
function atualizarBotaoEntrar() {
  $("l-entrar").disabled = !$("l-email").value.trim() || !$("l-senha").value;
}
// ocupar() re-enables the button when it finishes, so check the fields again after it
$("l-entrar").addEventListener("click", () => ocupar($("l-entrar"), entrar).finally(atualizarBotaoEntrar));
["l-email", "l-senha"].forEach(id =>
  $(id).addEventListener("input", () => { $("l-erro").style.display = "none"; atualizarBotaoEntrar(); }));
atualizarBotaoEntrar();
$("l-senha").addEventListener("keydown", e => { if (e.key === "Enter") $("l-entrar").click(); });
$("btn-sair").addEventListener("click", e => {
  e.preventDefault();
  localStorage.removeItem('token');
  location.reload();
});

function aplicarUsuario() {
  const u = JSON.parse(localStorage.getItem('usuario') || '{}');
  if (!u.nome) return;
  $("user-nome").textContent = u.nome;
  $("user-cargo").textContent = PERFIS[u.role] || u.cargo || "";
  $("user-cargo").title = u.cargo || "";
  $("user-sigla").textContent = u.sigla || "";
  $("user-sigla").style.cssText = u.id != null ? corAvatar(u) : ""; // same color as on the team screen
  $("ola").textContent = `Olá, ${u.nome.split(" ")[0]}.`;
}

async function carregar() {
  if (!localStorage.getItem('token')) { mostrarTela("landing"); esconderCarregando(); return; }
  // full-screen loader only when entering the app; later refreshes keep the current screen
  const entrando = $("app").hidden;
  if (entrando) mostrarCarregando("Carregando seus indicadores…");
  try {
    const get = rota => fetch(API + rota).then(r => r.json());
    const [ind, ev, ta, re, pe, at, org, me] = await Promise.all([
      get('/indicators'), get('/evidence'), get('/tasks'),
      get('/reports'), get('/users?inativos=true'), get('/activity'), get('/organization'), get('/auth/me'),
    ]);
    if (me && me.role) localStorage.setItem('usuario', JSON.stringify({ ...usuarioAtual(), ...me }));
    indicadores = ind; docs = ev; tarefas = ta; relatorios = re; pessoas = pe; atividades = at;
    metaESG = org.meta;
    $("cfg-nome").value = org.nome;
    $("cfg-setor").value = org.setor || "";
    $("cfg-meta").value = org.meta;
  } catch (e) {
    console.error('Could not reach the API:', e);
  }
  if (!localStorage.getItem('token')) return; // login expired: already sent to the login screen
  mostrarTela("app");
  if (entrando) iniciarNavegacao(); // "Voltar" starts counting from the moment the app opens
  try { aplicarPermissoes(); renderTudo(); aplicarUsuario(); }
  finally { esconderCarregando(); }
  // screens that load their own data follow every change made elsewhere
  if (viewAtual === "historico" || viewAtual === "perfil") carregarHistorico();
}

aoClicar("sn-salvar", async () => {
  const erro = $("sn-erro");
  const mostrar = msg => { erro.textContent = msg; erro.style.display = "block"; };
  erro.style.display = "none";

  const atual = $("sn-atual").value, nova = $("sn-nova").value, repetir = $("sn-repetir").value;
  if (!atual || !nova) return mostrar("Preencha a senha atual e a nova senha.");
  if (nova.length < 8) return mostrar("A nova senha precisa ter pelo menos 8 caracteres.");
  if (nova !== repetir) return mostrar("As senhas novas não são iguais.");

  const resp = await fetch(`${API}/auth/change-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ atual, nova })
  });
  if (resp.ok) {
    ["sn-atual", "sn-nova", "sn-repetir"].forEach(id => { $(id).value = ""; });
    ocultarSenhas();
    $("sn-ok").hidden = false;
    setTimeout(() => { $("sn-ok").hidden = true; }, 3000);
    return;
  }
  const dados = await resp.json().catch(() => ({}));
  mostrar(dados.erro || "Não foi possível alterar a senha.");
});

document.querySelectorAll("[data-ir]").forEach(el => el.addEventListener("click", e => {
  e.preventDefault();
  const destino = el.dataset.ir;
  if (destino === "entrar" && localStorage.getItem('token')) { carregar(); return; }
  mostrarTela(destino);
}));
if (localStorage.getItem('token') && location.hash === "#entrar") carregar();
else { mostrarTela(location.hash === "#entrar" ? "entrar" : "landing"); esconderCarregando(); }
if (location.hash === "#entrar") history.replaceState(null, "", location.pathname);