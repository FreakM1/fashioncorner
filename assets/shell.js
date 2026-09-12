// Shell de navegação (sidebar + topbar) compartilhado por todas as
// páginas do painel. Cada página só chama renderShell({active, title, subtitle}).
//
// Estrutura preparada para o menu futuro (Operação / Gestão / Administração).
// Itens cujas páginas ainda não existem ficam com `disabled: true` — aparecem
// esmaecidos, sem href, só pra dar contexto do que vem por aí, sem nunca
// gerar link quebrado.
const NAV_GROUPS = [
  {
    section: 'Operação',
    items: [
      { key: 'dashboard', href: 'dashboard.html', icon: '&#9635;', label: 'Visão Geral' },
      { key: 'rota', href: 'rota-do-dia.html', icon: '&#9679;', label: 'Rotas' },
      { key: 'historico', href: 'historico.html', icon: '&#9776;', label: 'Histórico' },
      { key: 'pendencias', icon: '&#9888;', label: 'Pendências', disabled: true },
      { key: 'espera', icon: '&#9203;', label: 'Lista de Espera', disabled: true },
      { key: 'atividades', icon: '&#9998;', label: 'Atividades', disabled: true },
    ]
  },
  {
    section: 'Gestão',
    items: [
      { key: 'financeiro', icon: '&#36;', label: 'Financeiro', disabled: true },
      { key: 'conteudo', icon: '&#128196;', label: 'Conteúdo', disabled: true },
    ]
  },
  {
    section: 'Administração',
    items: [
      { key: 'equipe', icon: '&#128101;', label: 'Equipe', disabled: true },
      { key: 'config', href: 'configuracoes.html', icon: '&#9881;', label: 'Configurações' },
    ]
  },
];

// Lista achatada (mantida por compatibilidade, caso algo dependa do formato antigo).
const NAV_ITEMS = NAV_GROUPS.flatMap(g => g.items).filter(item => !item.disabled);

function renderNavItem(item, active){
  if(item.disabled){
    return `
      <a class="disabled" aria-disabled="true">
        <span class="icon">${item.icon}</span><span class="label">${item.label}</span>
        <span class="soon-tag">Em breve</span>
      </a>`;
  }
  return `
    <a href="${item.href}" class="${item.key === active ? 'active' : ''}">
      <span class="icon">${item.icon}</span><span class="label">${item.label}</span>
    </a>`;
}

function renderShell({ active, title, subtitle }){
  document.title = title + ' — Fashion Corner';

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="brand-row">
      <div class="sidebar-logo">FASHION<span>CORNER</span></div>
    </div>
    <nav class="sidebar-nav">
      ${NAV_GROUPS.map(group => `
        ${group.section ? `<div class="sidebar-section">${group.section}</div>` : ''}
        ${group.items.map(item => renderNavItem(item, active)).join('')}
      `).join('')}
    </nav>
    <div class="sidebar-account">
      <div class="account-row">
        <div class="account-avatar" id="sidebarAccountAvatar">&nbsp;</div>
        <div class="account-info">
          <div class="sidebar-account-email" id="sidebarAccountEmail">&nbsp;</div>
        </div>
        <button class="sidebar-logout" id="sidebarLogoutBtn" title="Sair da conta" aria-label="Sair da conta">&#9211;</button>
      </div>
    </div>`;

  const topbar = document.getElementById('topbar');
  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  topbar.innerHTML = `
    <div>
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
    </div>
    <div class="topbar-right">
      <div class="date-pill"><span class="icon">&#128197;</span>${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</div>
      <div class="avatar">FC</div>
    </div>`;

  document.getElementById('sidebarLogoutBtn').addEventListener('click', async () => {
    if(typeof sb !== 'undefined' && sb) await sb.auth.signOut();
    location.href = 'login.html';
  });

  if(typeof sb !== 'undefined' && sb){
    sb.auth.getSession().then(({ data }) => {
      const email = data.session && data.session.user && data.session.user.email;
      if(email){
        document.getElementById('sidebarAccountEmail').textContent = email;
        const avatarEl = document.getElementById('sidebarAccountAvatar');
        if(avatarEl) avatarEl.textContent = email.charAt(0).toUpperCase();
      }
    });
  }
}
