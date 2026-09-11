// Config e utilitários compartilhados entre index.html (Pedido Rápido) e
// planejamento.html (Planejamento da Rota). Não duplicar essa lógica nas
// páginas — sempre carregar este arquivo antes do script de cada página.

// =====================================================================
// COLE AQUI a configuração copiada do Firebase (Configurações do projeto
// → Seus apps → ícone </> → firebaseConfig). Substitua o objeto inteiro
// abaixo pelo que você copiou de lá.
// =====================================================================
const firebaseConfig = {
  apiKey: "AIzaSyClU_H8qtpFLsa7jNhJWFQstVRvP3A2kXM",
  authDomain: "entregas-fashion-corner.firebaseapp.com",
  projectId: "entregas-fashion-corner",
  storageBucket: "entregas-fashion-corner.firebasestorage.app",
  messagingSenderId: "87444520790",
  appId: "1:87444520790:web:a3bb5e54582b5d694ce0f7"
};

// Chave usada para chamar a Routes API do Google (otimização de rota e
// cálculo de trechos de deslocamento). O placeholder abaixo é substituído
// em tempo de deploy pelo valor da variável de ambiente
// GOOGLE_MAPS_API_KEY (ver docker-entrypoint.d/). Restrinja essa chave por
// referenciador HTTP no Google Cloud Console e habilite a "Routes API" no
// projeto correspondente.
const GOOGLE_MAPS_API_KEY = "__GOOGLE_MAPS_API_KEY__";
function hasGoogleMapsKey(){ return !!GOOGLE_MAPS_API_KEY && !GOOGLE_MAPS_API_KEY.startsWith('__'); }

let LIVE = false;
let db = null;
try {
  if(firebaseConfig.apiKey !== "SUA_API_KEY"){
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    LIVE = true;
  }
} catch(e){ LIVE = false; }

async function ensureAuth(){
  if(!LIVE) return;
  try {
    await new Promise((resolve, reject) => {
      firebase.auth().onAuthStateChanged(user => {
        if(user){ resolve(user); return; }
        firebase.auth().signInAnonymously().catch(reject);
      }, reject);
    });
  } catch(e){ LIVE = false; }
}

const COL = 'pedido_rapido';
function dateSuffix(){ return new Date().toISOString().slice(0,10); }
function todayKey(){ return 'orders-' + dateSuffix(); }
function finalizedKey(){ return 'finalized-' + dateSuffix(); }
function configKey(){ return 'config-' + dateSuffix(); }
function reportKey(){ return 'report-' + dateSuffix(); }

// Leitura/escrita genérica pros documentos novos (rota finalizada,
// configuração do dia, relatório calculado). Sempre espelha no
// localStorage — index.html e planejamento.html são páginas separadas e
// não compartilham memória JS entre navegações — e também no Firestore
// quando LIVE, pro dado sincronizar entre dispositivos.
async function loadDoc(id, fallback){
  let local = fallback;
  try {
    const raw = localStorage.getItem('pr_' + id);
    if(raw !== null) local = JSON.parse(raw);
  } catch(e){}
  if(!LIVE) return local;
  try {
    const doc = await db.collection(COL).doc(id).get();
    return doc.exists ? doc.data().value : local;
  } catch(e){ return local; }
}
async function saveDoc(id, value){
  try { localStorage.setItem('pr_' + id, JSON.stringify(value)); } catch(e){}
  if(!LIVE) return;
  try { await db.collection(COL).doc(id).set({ value, updatedAt: Date.now() }); }
  catch(e){ /* fica salvo local; sincroniza quando a conexão voltar */ }
}

// Tipos de atendimento — usado no formulário do Pedido Rápido e no
// cálculo de tempos do Planejamento da Rota.
const MODES = [
  {key:'ENTREGA', label:'Entrega'},
  {key:'RETIRAR MALA', label:'Retirar mala'},
  {key:'RETIRADA', label:'Retirada'},
  {key:'DEIXAR MALA', label:'Deixar mala'},
  {key:'PROVA NA HORA', label:'Prova na hora'},
  {key:'TROCA', label:'Troca'},
  {key:'PIPOCA', label:'Pipoca'},
  {key:'CORREIO', label:'Correio'},
];
function hasMode(modes, key){
  if(key === 'CORREIO') return (modes||[]).some(m => m.startsWith('CORREIO'));
  return (modes||[]).includes(key);
}

// Chamada genérica à Routes API do Google — usada tanto pra otimizar a
// ordem da rota (index.html) quanto pra calcular os trechos/tempos de
// deslocamento da rota já finalizada (planejamento.html).
async function computeRoutesRequest({ origin, destination, intermediates, optimizeWaypointOrder, fieldMask }){
  const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': fieldMask
    },
    body: JSON.stringify({
      origin: { address: origin },
      destination: { address: destination },
      intermediates: intermediates.map(address => ({ address })),
      travelMode: 'DRIVE',
      optimizeWaypointOrder: !!optimizeWaypointOrder
    })
  });
  if(!res.ok){
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Erro ${res.status} na Routes API`);
  }
  return res.json();
}

// Texto amigável pro horário de uma entrega — lista do Pedido Rápido e
// relatório do Planejamento da Rota.
function timeWindowLabel(tw){
  if(!tw || tw.type === 'none' || !tw.time) return '';
  return (tw.type === 'before' ? 'Antes de ' : 'Depois de ') + tw.time;
}

// ---------- Matemática de horário compartilhada ----------
// Usada tanto pela heurística de "Organizar rota" (index.html, que precisa
// simular chegadas pra decidir a ordem) quanto pelo relatório do
// Planejamento (planejamento.html, que só reporta) — fonte única, pra as
// duas partes nunca discordarem sobre o que conta como violação.
function timeToMinutes(hhmm){
  if(!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}
function serviceTimeFor(o, cfg){
  return cfg.tempoPadrao + (hasMode(o.modes, 'PROVA NA HORA') ? cfg.tempoProva : 0);
}
function violatesWindow(tw, etaMin){
  if(!tw || tw.type === 'none' || !tw.time) return false;
  const limit = timeToMinutes(tw.time);
  if(tw.type === 'before') return etaMin > limit;
  if(tw.type === 'after') return etaMin < limit;
  return false;
}

// Chamada à Route Matrix da Routes API — devolve tempo/distância entre
// TODOS os pares de um conjunto de endereços numa única requisição (em vez
// de uma chamada por par). Usada pela heurística de "Organizar rota" que
// precisa considerar horários (computeRoutes com optimizeWaypointOrder não
// suporta janela de tempo, então a ordenação nesse caso é resolvida aqui
// no cliente, com esses tempos como insumo). Limite do Google: 25×25
// pontos por requisição.
async function computeRouteMatrixRequest(addresses){
  const waypoints = addresses.map(address => ({ waypoint: { address } }));
  const res = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition'
    },
    body: JSON.stringify({ origins: waypoints, destinations: waypoints, travelMode: 'DRIVE' })
  });
  if(!res.ok){
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Erro ${res.status} na Route Matrix API`);
  }
  const elements = await res.json();
  const n = addresses.length;
  const durationMin = Array.from({length: n}, () => new Array(n).fill(Infinity));
  const distanceMeters = Array.from({length: n}, () => new Array(n).fill(Infinity));
  for(let i = 0; i < n; i++){ durationMin[i][i] = 0; distanceMeters[i][i] = 0; }
  for(const el of elements){
    if(el.condition && el.condition !== 'ROUTE_EXISTS') continue;
    const i = el.originIndex ?? 0;
    const j = el.destinationIndex ?? 0;
    durationMin[i][j] = (parseInt(el.duration, 10) || 0) / 60;
    distanceMeters[i][j] = el.distanceMeters || 0;
  }
  return { durationMin, distanceMeters };
}
