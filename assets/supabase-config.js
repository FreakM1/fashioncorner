// Configuração do cliente Supabase (autenticação). URL e chave pública são
// injetadas no deploy pelo docker-entrypoint.d/50-inject-supabase-keys.sh, a
// partir das env vars SUPABASE_URL / SUPABASE_ANON_KEY configuradas no
// EasyPanel — mesmo padrão usado pra GOOGLE_MAPS_API_KEY em shared.js.
// A anon/publishable key é feita pra ser pública (o acesso ao banco é
// controlado por Row Level Security no Supabase, não pelo sigilo da chave).
const SUPABASE_URL = "__SUPABASE_URL__";
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";

function hasSupabaseConfig(){
  return !!SUPABASE_URL && !SUPABASE_URL.startsWith('__') && !!SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.startsWith('__');
}

const sb = (typeof supabase !== 'undefined' && hasSupabaseConfig())
  ? supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Gate das páginas do painel: roda no <head>, antes do resto da página
// carregar, e redireciona pro login se não houver sessão local do Supabase.
// É uma checagem de presença do token (sem round-trip de rede) — gate de UX,
// não de segurança; a proteção real dos dados é responsabilidade das regras
// de acesso no backend. Sem SUPABASE_URL/ANON_KEY configurados, não bloqueia.
function guardDashboardAuth(){
  if(!hasSupabaseConfig()) return;
  const ref = SUPABASE_URL.replace('https://', '').split('.')[0];
  if(!localStorage.getItem('sb-' + ref + '-auth-token')){
    location.href = 'login.html';
  }
}
