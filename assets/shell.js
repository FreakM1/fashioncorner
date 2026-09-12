// Shell de navegação (sidebar + topbar) compartilhado por todas as
// páginas do painel. Cada página só chama renderShell({active, title, subtitle}).
// `primaryAction` é opcional (ex: { label, href } pra um botão no topo) —
// páginas que não passam esse campo continuam exatamente como antes.
//
// Estrutura em seções (Operação / Gestão / Administração). Os módulos
// Pendências, Lista de Espera, Atividades, Financeiro, Conteúdo e Equipe já
// existem como páginas reais — se algum dia um novo item for adicionado
// antes de a página existir, use `disabled: true` (fica esmaecido, sem
// href) pra nunca gerar link quebrado.

// Ícones lineares (thin line icons) — SVGs pequenos e neutros, sem
// depender de nenhuma biblioteca externa.
const ICONS = {
  grid: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="6" height="6" rx="1.4"/><rect x="10" y="2" width="6" height="6" rx="1.4"/><rect x="2" y="10" width="6" height="6" rx="1.4"/><rect x="10" y="10" width="6" height="6" rx="1.4"/></svg>',
  pin: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 16s6-5.6 6-9.7A6 6 0 0 0 3 6.3C3 10.4 9 16 9 16Z"/><circle cx="9" cy="6.4" r="2"/></svg>',
  alert: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2 1.3 16h15.4L9 2Z"/><line x1="9" y1="7.5" x2="9" y2="10.8"/><line x1="9" y1="13.2" x2="9" y2="13.3"/></svg>',
  hourglass: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2h9M4.5 16h9M5.5 2c0 4 3.5 4.7 3.5 7s-3.5 3-3.5 7M12.5 2c0 4-3.5 4.7-3.5 7s3.5 3 3.5 7"/></svg>',
  activity: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,10 6,10 8,4 11,15 13,10 16,10"/></svg>',
  dollar: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><line x1="9" y1="1.2" x2="9" y2="16.8"/><path d="M12.3 4.8c0-1.5-1.6-2.3-3.3-2.3s-3.3.9-3.3 2.3 1.5 2 3.3 2.5c1.8.5 3.3 1 3.3 2.5s-1.6 2.3-3.3 2.3-3.3-.8-3.3-2.3"/></svg>',
  file: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 2h6l3 3v11h-9Z"/><path d="M10.5 2v3h3"/></svg>',
  clapper: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.5h13v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-7Z"/><path d="M2.5 7.5 3.3 3.8a1 1 0 0 1 1-.8h9.4a1 1 0 0 1 1 .8l.8 3.7M5.5 3.3l1 4.2M9.5 3.1l1 4.4"/></svg>',
  users: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="6.7" cy="6.2" r="2.4"/><path d="M2.2 15.6c0-2.5 2-4.4 4.5-4.4s4.5 1.9 4.5 4.4"/><circle cx="13.3" cy="6.8" r="1.9"/><path d="M12 11.4c1.7.3 2.9 1.8 2.9 4.2"/></svg>',
  gear: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="2.4"/><path d="M9 1.6v2.1M9 14.3v2.1M3.2 4.2l1.5 1.5M13.3 12.3l1.5 1.5M1.6 9h2.1M14.3 9h2.1M3.2 13.8l1.5-1.5M13.3 5.7l1.5-1.5"/></svg>',
  logout: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v7.2"/><path d="M4.6 4.7a6 6 0 1 0 8.8 0"/></svg>',
  bell: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2.3a4 4 0 0 0-4 4v2.6L3.4 12h11.2L13 8.9V6.3a4 4 0 0 0-4-4Z"/><path d="M7.4 14.8a1.6 1.6 0 0 0 3.2 0"/></svg>',
  chevronDown: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="4.5,7 9,11.5 13.5,7"/></svg>',
  calendar: '<svg viewBox="0 0 18 18" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3.4" width="14" height="12.2" rx="1.6"/><line x1="2" y1="7.2" x2="16" y2="7.2"/><line x1="6" y1="1.4" x2="6" y2="4.6"/><line x1="12" y1="1.4" x2="12" y2="4.6"/></svg>',
};

const NAV_GROUPS = [
  {
    section: 'Operação',
    items: [
      { key: 'dashboard', href: 'dashboard.html', icon: ICONS.grid, label: 'Visão Geral' },
      { key: 'rota', href: 'rota-do-dia.html', icon: ICONS.pin, label: 'Rotas' },
      { key: 'historico', href: 'historico.html', icon: ICONS.file, label: 'Histórico' },
      { key: 'pendencias', href: 'pendencias.html', icon: ICONS.alert, label: 'Pendências' },
      { key: 'lista-espera', href: 'lista-espera.html', icon: ICONS.hourglass, label: 'Lista de Espera' },
      { key: 'atividades', href: 'atividades.html', icon: ICONS.activity, label: 'Atividades' },
    ]
  },
  {
    section: 'Gestão',
    items: [
      { key: 'financeiro', href: 'financeiro.html', icon: ICONS.dollar, label: 'Financeiro' },
      { key: 'conteudo', href: 'conteudo.html', icon: ICONS.clapper, label: 'Conteúdo' },
    ]
  },
  {
    section: 'Administração',
    items: [
      { key: 'equipe', href: 'equipe.html', icon: ICONS.users, label: 'Equipe' },
      { key: 'config', href: 'configuracoes.html', icon: ICONS.gear, label: 'Configurações' },
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

function renderShell({ active, title, subtitle, primaryAction }){
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
        <button class="sidebar-logout" id="sidebarLogoutBtn" title="Sair da conta" aria-label="Sair da conta">${ICONS.logout}</button>
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
      <div class="date-pill">${ICONS.calendar}${dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</div>
      ${primaryAction ? `<a href="${primaryAction.href}" class="btn btn-primary">${primaryAction.label}</a>` : ''}
      <button class="icon-btn" type="button" aria-label="Notificações" title="Notificações">${ICONS.bell}</button>
      <div class="brand-chip">
        <div class="avatar">FC</div>
        <span class="brand-chip-label">FASHION CORNER</span>
        ${ICONS.chevronDown}
      </div>
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
