// Shell de navegação (sidebar + topbar) compartilhado por todas as
// páginas do painel. Cada página só chama renderShell({active, title, subtitle}).
const NAV_ITEMS = [
  { key: 'dashboard', href: 'index.html', icon: '&#9635;', label: 'Dashboard' },
  { key: 'pedido', href: 'pedido-rapido.html', icon: '&#9998;', label: 'Pedido Rápido' },
  { key: 'rota', href: 'rota-do-dia.html', icon: '&#9679;', label: 'Rota do Dia' },
  { key: 'planejamento', href: 'planejamento.html', icon: '&#9201;', label: 'Planejamento' },
  { key: 'historico', href: 'historico.html', icon: '&#9776;', label: 'Histórico de Rotas' },
  { key: 'config', href: 'configuracoes.html', icon: '&#9881;', label: 'Configurações' },
];

function renderShell({ active, title, subtitle }){
  document.title = title + ' — Fashion Corner';

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = `
    <div class="sidebar-logo">FASHION<span>CORNER</span></div>
    <nav class="sidebar-nav">
      ${NAV_ITEMS.map(item => `
        <a href="${item.href}" class="${item.key === active ? 'active' : ''}">
          <span class="icon">${item.icon}</span><span class="label">${item.label}</span>
        </a>`).join('')}
    </nav>`;

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
}
