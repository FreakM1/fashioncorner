// Utilitários pequenos e genéricos usados pelos módulos internos novos
// (Pendências, Lista de Espera, Atividades, Conteúdo, Equipe). Não é
// consumido por nenhuma página de rota — só reaproveita loadDoc/saveDoc/
// escapeHtml/dateSuffix, que já são genéricos em assets/shared.js.

function genId(){ return 'm' + Date.now() + Math.random().toString(36).slice(2, 8); }

function fmtDateBR(d){ return d ? d.split('-').reverse().join('/') : '—'; }

// datalist de responsáveis sugeridos a partir do cadastro de Equipe —
// puramente uma sugestão de digitação; o campo continua texto livre, já
// que ainda não existe vínculo formal entre "responsável" e uma conta.
async function loadEquipeNames(){
  const equipe = await loadDoc('equipe-db', []);
  return (Array.isArray(equipe) ? equipe : []).map(p => p.nome).filter(Boolean);
}
