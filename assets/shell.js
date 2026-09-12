// Shell de navegação (sidebar + topbar) compartilhado por todas as
// páginas do painel. Cada página só chama renderShell({active, title, subtitle}).
//
// Estrutura preparada para o menu futuro (Visão Geral / Operação / Gestão /
// Administração). Itens cujas páginas ainda não existem ficam comentados
// abaixo — descomentar apenas quando a página correspondente for criada,
// pra nunca gerar link quebrado.
const NAV_GROUPS = [
  {
    section: null,
    items: [
      { key: 'dashboard', href: 'dashboard.html', icon: '&#9635;', label: 'Visão Geral' },
    ]
  },
  {
    section: 'Operação',
    items: [
      { key: 'rota', href: 'rota-do-dia.html', icon: '&#9679;', label: 'Rota do Dia' },
      { key: 'historico', href: 'historico.html', icon: '&#9776;', label: 'Histórico de Rotas' },
      // Futuro — páginas ainda não existem:
      // { key: 'pendencias', href: 'pendencias.html', icon: '&#9888;', label: 'Pendências' },
      // { key: 'espera', href: 'lista-espera.html', icon: '&#9203;', label: 'Lista de Espera' },
      // { key: 'atividades', href: 'atividades.html', icon: '&#9998;', label: 'Atividades' },
    ]
  },
  {
    section: 'Gestão',
    items: [
      // Futuro — páginas ainda não existem:
      // { key: 'financeiro', href: 'financeiro.html', icon: '&#36;', label: 'Financeiro' },
      // { key: 'conteudo', href: 'conteudo.html', icon: '&#128196;', label: 'Conteúdo' },
    ]
  },
  {
    section: 'Administração',
    items: [
      // Futuro — página ainda não existe:
      // { key: 'equipe', href: 'equipe.html', icon: '&#128101;', label: 'Equipe' },
      { key: 'config', href: 'configuracoes.html', icon: '&#9881;', label: 'Configurações' },
    ]
  },
];

// Lista achatada (mantida por compatibilidade, caso algo dependa do formato antigo).
const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items);

function renderShell({ active, title, subtitle }){
  document.title = title + ' — Fashion Corner';

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="sidebar-logo">FASHION<span>CORNER</span></div>
    <nav class="sidebar-nav">
      ${NAV_GROUPS.filter(group => group.items.length > 0).map(group => `
        ${group.section ? `<div class="sidebar-section">${group.section}</div>` : ''}
        ${group.items.map(item => `
          <a href="${item.href}" class="${item.key === active ? 'active' : ''}">
            <span class="icon">${item.icon}</span><span class="label">${item.label}</span>
          </a>`).join('')}
      `).join('')}
    </nav>
    <div class="sidebar-account">
      <div class="sidebar-account-email" id="sidebarAccountEmail">&nbsp;</div>
      <button class="sidebar-logout" id="sidebarLogoutBtn">Sair da conta</button>
    </div>`;

  const topbar = document.getElementById('topbar');
  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  topbar.innerHTML = `
    <div>
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
    </div>
    <div class="topbar-right">
      <div class="topbar-date">${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</div>
      <div class="avatar">FC</div>
    </div>`;

  document.getElementById('sidebarLogoutBtn').addEventListener('click', async () => {
    if(typeof sb !== 'undefined' && sb) await sb.auth.signOut();
    location.href = 'login.html';
  });

  if(typeof sb !== 'undefined' && sb){
    sb.auth.getSession().then(({ data }) => {
      const email = data.session && data.session.user && data.session.user.email;
      if(email) document.getElementById('sidebarAccountEmail').textContent = email;
    });
  }
}
