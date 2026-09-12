// Config e utilitários compartilhados entre as páginas do painel (Rota do
// Dia, Histórico, Detalhes da Rota, Dashboard). Não duplicar essa lógica —
// sempre carregar este arquivo antes do script de cada página.

// Chave usada para chamar a Routes API do Google (otimização de rota e
// cálculo de trechos de deslocamento). O placeholder abaixo é substituído
// em tempo de deploy pelo valor da variável de ambiente
// GOOGLE_MAPS_API_KEY (ver docker-entrypoint.d/). Restrinja essa chave por
// referenciador HTTP no Google Cloud Console e habilite a "Routes API" no
// projeto correspondente.
const GOOGLE_MAPS_API_KEY = "__GOOGLE_MAPS_API_KEY__";
function hasGoogleMapsKey(){ return !!GOOGLE_MAPS_API_KEY && !GOOGLE_MAPS_API_KEY.startsWith('__'); }

// ---------- KILL SWITCH TEMPORÁRIO: Compute Route Matrix ----------
// A cobrança do Google Cloud disparou e o relatório aponta a SKU
// "Routes: Compute Route Matrix Enterprise". Enquanto a causa não for
// confirmada e corrigida, NENHUMA chamada real a computeRouteMatrix deve
// sair do app — computeRouteMatrixRequest() abaixo já verifica esta flag
// e recusa a chamada antes de qualquer fetch. O código da função não foi
// removido, só a execução foi travada. Só volte pra true depois de
// confirmar (fora do TWO_WHEELER, que é o suspeito nº 1) o que está
// empurrando a chamada pra SKU Enterprise.
const ROUTE_MATRIX_ENABLED = false;

// Escapa texto antes de jogar em innerHTML — todo campo digitado pelo
// usuário (nome, endereço, telefone, observações etc.) passa por aqui
// antes de entrar num template de HTML, pra evitar XSS armazenado.
function escapeHtml(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// Persistência via Supabase (tabela "documents", protegida por RLS —
// cada usuário só lê/escreve os documentos que ele mesmo é owner_id).
// O cliente `sb` já vem inicializado por assets/supabase-config.js,
// carregado antes deste arquivo em toda página do painel.
let LIVE = false;
let currentUserId = null;

async function ensureAuth(){
  if(typeof sb === 'undefined' || !sb){ LIVE = false; return; }
  try {
    const { data } = await sb.auth.getSession();
    if(data.session && data.session.user){
      currentUserId = data.session.user.id;
      LIVE = true;
    } else {
      LIVE = false;
    }
  } catch(e){ LIVE = false; }
}

function dateSuffix(){ return new Date().toISOString().slice(0,10); }
// orders-YYYY-MM-DD: hoje guarda a pool "Não atribuídos" da Rota do Dia —
// pedidos ainda sem rota (era, antes das rotas múltiplas, o rascunho único
// do dia). configKey()/finalizedKey() ficam só pra ler dados antigos na
// migração de uma rota em montagem sob o modelo anterior.
function todayKey(){ return 'orders-' + dateSuffix(); }
function finalizedKey(){ return 'finalized-' + dateSuffix(); }
function configKey(){ return 'config-' + dateSuffix(); }

// Leitura/escrita genérica pros documentos do app (pedidos do dia, rota
// finalizada, configuração do dia, relatório calculado, base de clientes).
// Sempre espelha no localStorage — cada página é um documento HTML
// separado e não compartilha memória JS entre navegações — e também no
// Supabase quando LIVE, pro dado sincronizar entre dispositivos e ficar
// restrito à conta autenticada (nunca público).
async function loadDoc(id, fallback){
  let local = fallback;
  try {
    const raw = localStorage.getItem('pr_' + id);
    if(raw !== null) local = JSON.parse(raw);
  } catch(e){}
  if(!LIVE) return local;
  try {
    const { data, error } = await sb.from('documents').select('value').eq('id', id).maybeSingle();
    if(error) throw error;
    return data ? data.value : local;
  } catch(e){ return local; }
}
async function saveDoc(id, value){
  try { localStorage.setItem('pr_' + id, JSON.stringify(value)); } catch(e){}
  if(!LIVE) return;
  try {
    const { error } = await sb.from('documents').upsert({ id, value, owner_id: currentUserId, updated_at: new Date().toISOString() });
    if(error) throw error;
  } catch(e){ /* fica salvo local; sincroniza quando a conexão voltar */ }
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
      travelMode: 'TWO_WHEELER', // moto — motoboy, não carro
      optimizeWaypointOrder: !!optimizeWaypointOrder
    })
  });
  if(!res.ok){
    const errBody = await res.json().catch(() => null);
    throw new Error(errBody?.error?.message || `Erro ${res.status} na Routes API`);
  }
  return res.json();
}

// Busca os trechos (distância/tempo) de uma rota já com a ordem definida —
// usado pela Rota do Dia (km/tempo pra finalizar e pro histórico). Fonte
// única, evita duplicar o parsing.
async function fetchRouteLegs(orders){
  const addresses = orders.map(o => o.address);
  const data = await computeRoutesRequest({
    origin: addresses[0],
    destination: addresses[addresses.length - 1],
    intermediates: addresses.slice(1, -1),
    optimizeWaypointOrder: false,
    fieldMask: 'routes.legs.duration,routes.legs.distanceMeters,routes.duration,routes.distanceMeters'
  });
  const route = data.routes && data.routes[0];
  if(!route || !route.legs) throw new Error('A API não retornou os trechos da rota');
  return route.legs.map(l => ({
    durationSec: parseInt(l.duration, 10) || 0,
    distanceMeters: l.distanceMeters || 0
  }));
}

// ---------- Status da parada (Rota do Dia / Histórico / Detalhes) ----------
const STOP_STATUS_LABELS = {
  pendente: 'Pendente', entregue: 'Entregue', nao_entregue: 'Não entregue',
  trocado: 'Trocado', retirado: 'Retirado', deixado: 'Deixado'
};
function stopStatusTagClass(status){
  switch(status){
    case 'entregue': return 'tag-delivered';
    case 'nao_entregue': return 'tag-not-delivered';
    case 'trocado': return 'tag-swapped';
    case 'retirado': case 'deixado': return 'tag-progress';
    default: return 'tag-pending';
  }
}

// ---------- Registro histórico de rotas ----------
// Cada rota finalizada (ou em edição) é um documento próprio
// route-YYYY-MM-DD-N (N = 1ª, 2ª... rota daquele dia), listado num índice
// leve routes-index-YYYY-MM-DD. Tudo via loadDoc/saveDoc — mesmo mecanismo
// (Firestore + espelho em localStorage) já usado pra orders/config/report.
const ROUTE_STATUS = { ATIVA: 'em_andamento', FINALIZADA: 'finalizada' };
function routeIndexKey(dateStr){ return 'routes-index-' + dateStr; }
function routeDocKey(dateStr, seq){ return 'route-' + dateStr + '-' + seq; }

async function loadRouteIndex(dateStr){
  return await loadDoc(routeIndexKey(dateStr), { count: 0, ids: [] });
}

async function loadRoutesForDate(dateStr){
  const index = await loadRouteIndex(dateStr);
  const routes = [];
  for(const id of index.ids){
    const r = await loadDoc(id, null);
    if(r) routes.push(r);
  }
  return routes.sort((a, b) => a.seq - b.seq);
}

// cria uma rota nova pro dia (a N-ésima) e já grava no índice — usada pela
// Rota do Dia tanto pra "+ Nova rota" quanto pra migrar automaticamente a
// rota em montagem sob o modelo antigo (uma só por dia) pra "Rota 1".
async function createRoute(dateStr, config){
  const index = await loadRouteIndex(dateStr);
  const seq = index.count + 1;
  const route = {
    id: routeDocKey(dateStr, seq), date: dateStr, seq,
    status: ROUTE_STATUS.ATIVA, orders: [], legs: null, config,
    history: [{ at: Date.now(), note: 'Rota criada' }]
  };
  index.count = seq;
  index.ids.push(route.id);
  await saveDoc(route.id, route);
  await saveDoc(routeIndexKey(dateStr), index);
  return route;
}

// marca uma rota (já existente como documento — ver createRoute) como
// finalizada, com os pedidos e trechos definitivos.
async function finalizeRoute(route, legs){
  route.legs = legs;
  route.status = ROUTE_STATUS.FINALIZADA;
  route.updatedAt = Date.now();
  route.finalizedAt = Date.now();
  route.history.push({ at: Date.now(), note: 'Rota concluída' });
  await saveDoc(route.id, route);
  return route;
}

// reabre uma rota finalizada pra edição — a rota já é o próprio documento
// editável (cada rota do dia tem o seu), então só muda o status.
async function reopenRoute(route){
  route.status = ROUTE_STATUS.ATIVA;
  route.updatedAt = Date.now();
  route.history.push({ at: Date.now(), note: 'Reaberta para edição' });
  await saveDoc(route.id, route);
  return route;
}

function dateRangeArray(startStr, endStr){
  const out = [];
  let cur = new Date(startStr + 'T00:00:00');
  const end = new Date(endStr + 'T00:00:00');
  while(cur <= end){
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

async function loadRoutesInRange(startStr, endStr){
  const all = [];
  for(const d of dateRangeArray(startStr, endStr)){
    all.push(...(await loadRoutesForDate(d)));
  }
  return all;
}

// só as rotas concluídas — usado pelo Histórico e pelo card de "última rota
// concluída" do Dashboard. O Histórico só deve considerar a rota a partir
// do momento em que ela for concluída, nunca enquanto está em andamento.
async function loadFinalizedRoutesInRange(startStr, endStr){
  return (await loadRoutesInRange(startStr, endStr)).filter(r => r.status === ROUTE_STATUS.FINALIZADA);
}

// "HH:MM" a partir de minutos desde a meia-noite — usado pela previsão de
// chegada na Rota do Dia e no relatório do Planejamento.
function fmtTime(minutesFromMidnight){
  const totalMin = Math.round(minutesFromMidnight);
  const h = Math.floor(totalMin / 60) % 24;
  const m = ((totalMin % 60) + 60) % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

// resumo agregado de uma rota — paradas por tipo, não entregues, km/tempo
// (quando já tiver legs calculados). Usado pelo Dashboard, Rota do Dia,
// Histórico e Detalhes — não duplicar essa conta em cada página.
function summarizeRoute(route){
  const orders = route.orders || [];
  const intermediates = orders.length > 2 ? orders.slice(1, -1) : [];
  const legs = route.legs || null;
  let km = 0, driveMin = 0;
  if(legs){ for(const l of legs){ km += (l.distanceMeters || 0) / 1000; driveMin += (l.durationSec || 0) / 60; } }
  const count = (pred) => intermediates.filter(pred).length;
  return {
    paradas: intermediates.length,
    entregas: count(o => hasMode(o.modes, 'ENTREGA')),
    trocas: count(o => hasMode(o.modes, 'TROCA')),
    provas: count(o => hasMode(o.modes, 'PROVA NA HORA')),
    retiradas: count(o => hasMode(o.modes, 'RETIRADA') || hasMode(o.modes, 'RETIRAR MALA')),
    naoEntregues: count(o => o.status === 'nao_entregue'),
    comHorario: count(o => o.timeWindow && o.timeWindow.type !== 'none'),
    km, driveMin
  };
}

// Texto amigável pro horário de uma entrega — lista do Pedido Rápido e
// relatório do Planejamento da Rota.
function timeWindowLabel(tw){
  if(!tw || tw.type === 'none' || !tw.time) return '';
  return (tw.type === 'before' ? 'Antes de ' : 'Depois de ') + tw.time;
}

// ---------- Matemática de horário compartilhada ----------
// Usada pela heurística de "Organizar rota" e pela previsão de chegada da
// Rota do Dia, e pelos Detalhes da Rota — fonte única, pra nunca discordar
// sobre o que conta como violação ou sobre o horário previsto de uma parada.
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

// horário de saída + trechos (legs já numa ordem fixa, salvos na conclusão
// da rota) + tempo de serviço de cada parada — devolve o horário previsto
// de chegada em cada posição. Usado pra rota já com ordem definida
// (Detalhes da Rota, e o aviso de intervalo entre rotas da Rota do Dia
// olhando a rota anterior). Pro cálculo AO VIVO enquanto uma rota ainda
// está sendo montada — que precisa recalcular a qualquer reordenação sem
// rebuscar a API — a Rota do Dia usa sua própria travelMatrix (mesma
// fórmula, indexada por par de pontos em vez de sequência fixa).
function computeEtasFromLegs(orders, legs, cfg){
  if(!legs || legs.length !== orders.length - 1 || !cfg || !cfg.saida) return null;
  let t = timeToMinutes(cfg.saida);
  const etas = [];
  for(let i = 0; i < orders.length; i++){
    if(i > 0) t += legs[i-1].durationSec / 60;
    etas.push(t);
    const isEdge = (i === 0 || i === orders.length - 1);
    if(!isEdge) t += serviceTimeFor(orders[i], cfg);
  }
  return etas;
}

// Chamada à Route Matrix da Routes API — devolve tempo/distância entre
// TODOS os pares de um conjunto de endereços numa única requisição (em vez
// de uma chamada por par). Usada pela heurística de "Organizar rota" que
// precisa considerar horários (computeRoutes com optimizeWaypointOrder não
// suporta janela de tempo, então a ordenação nesse caso é resolvida aqui
// no cliente, com esses tempos como insumo). Limite do Google: 25×25
// pontos por requisição.
async function computeRouteMatrixRequest(addresses){
  if(!ROUTE_MATRIX_ENABLED){
    throw new Error('ROUTE_MATRIX_DISABLED: chamadas a computeRouteMatrix estão temporariamente desativadas (assets/shared.js) por causa da cobrança Enterprise — ver CLAUDE.md / commit desta mudança.');
  }
  const waypoints = addresses.map(address => ({ waypoint: { address } }));
  const res = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition'
    },
    body: JSON.stringify({ origins: waypoints, destinations: waypoints, travelMode: 'TWO_WHEELER' }) // moto — motoboy, não carro
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
