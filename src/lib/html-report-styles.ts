/**
 * Shared CSS and JS for HTML reports (full + schema-only).
 * Keeps both generators visually consistent.
 */

export function getReportCSS(): string {
  return CSS
}

export function getReportJS(): string {
  return JS
}

const CSS = `
:root {
  --bg: #ffffff;
  --bg-card: #f8f9fa;
  --bg-sidebar: #1a1a2e;
  --text: #1a1a2e;
  --text-muted: #6b7280;
  --text-sidebar: #e2e8f0;
  --border: #e5e7eb;
  --accent: #6366f1;
  --accent-light: #eef2ff;
  --green: #10b981;
  --yellow: #f59e0b;
  --red: #ef4444;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  --mono: "SF Mono", SFMono-Regular, ui-monospace, "DejaVu Sans Mono", Menlo, Consolas, monospace;
  --radius: 8px;
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  --sidebar-w: 240px;
}

@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --bg: #0f172a;
    --bg-card: #1e293b;
    --bg-sidebar: #0c0c1d;
    --text: #e2e8f0;
    --text-muted: #94a3b8;
    --border: #334155;
    --accent-light: #1e1b4b;
    --shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
}

.light {
  --bg: #ffffff;
  --bg-card: #f8f9fa;
  --text: #1a1a2e;
  --text-muted: #6b7280;
  --border: #e5e7eb;
  --accent-light: #eef2ff;
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
}

.dark {
  --bg: #0f172a;
  --bg-card: #1e293b;
  --bg-sidebar: #0c0c1d;
  --text: #e2e8f0;
  --text-muted: #94a3b8;
  --border: #334155;
  --accent-light: #1e1b4b;
  --shadow: 0 1px 3px rgba(0,0,0,0.3);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font);
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
  display: flex;
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: var(--sidebar-w);
  height: 100vh;
  background: var(--bg-sidebar);
  color: var(--text-sidebar);
  overflow-y: auto;
  padding: 20px 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.sidebar-brand {
  padding: 0 20px 16px;
  font-weight: 700;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.9;
}

.sidebar-link {
  display: block;
  padding: 6px 20px;
  color: var(--text-sidebar);
  text-decoration: none;
  font-size: 13px;
  opacity: 0.7;
  transition: opacity 0.15s, background 0.15s;
}
.sidebar-link:hover, .sidebar-link.active { opacity: 1; background: rgba(255,255,255,0.08); }
.sidebar-link-table { font-size: 12px; padding-left: 28px; }
.sidebar-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 12px 20px; }
.sidebar-label { padding: 4px 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.5; }
.sidebar-footer { margin-top: auto; padding: 12px 20px; }

.theme-toggle {
  background: rgba(255,255,255,0.1);
  border: none;
  color: var(--text-sidebar);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.theme-toggle:hover { background: rgba(255,255,255,0.2); }

.content {
  margin-left: var(--sidebar-w);
  flex: 1;
  max-width: 960px;
  padding: 40px 48px;
}

.header { margin-bottom: 40px; }
.header-top { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; }
.header h1 { font-size: 28px; font-weight: 700; }
.header-meta { font-size: 14px; color: var(--text-muted); }
.header-meta code { font-family: var(--mono); font-size: 12px; background: var(--bg-card); padding: 2px 6px; border-radius: 4px; }
.header-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
.header-sub a { color: var(--accent); text-decoration: none; }
.trust-line { color: var(--green); font-size: 12px; }
.verdict { font-size: 15px; color: var(--text); margin-top: 12px; line-height: 1.5; padding: 12px 16px; background: var(--bg-card); border-radius: var(--radius); border-left: 4px solid var(--accent); }

.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}
.badge-warn { background: var(--yellow); }
.badge-info { background: var(--accent); font-size: 10px; padding: 1px 6px; }
.badge-muted { background: var(--text-muted); font-size: 11px; }

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
  margin: 16px 0 32px;
}
.cards-small { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  text-align: center;
  box-shadow: var(--shadow);
}
.card-value { font-size: 28px; font-weight: 700; color: var(--accent); }
.card-label { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

section { margin-bottom: 40px; }
h2 { font-size: 20px; font-weight: 700; margin-bottom: 16px; border-bottom: 2px solid var(--border); padding-bottom: 8px; }
h3 { font-size: 16px; font-weight: 600; margin: 20px 0 10px; }
h4 { font-size: 14px; font-weight: 600; margin-bottom: 6px; }
h4 code { font-weight: 400; color: var(--text-muted); font-size: 12px; margin-left: 6px; }

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  margin: 8px 0 16px;
}
.data-table th {
  text-align: left;
  padding: 8px 12px;
  background: var(--bg-card);
  border-bottom: 2px solid var(--border);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}
.data-table td {
  padding: 6px 12px;
  border-bottom: 1px solid var(--border);
  vertical-align: top;
}
.data-table code { font-family: var(--mono); font-size: 12px; background: var(--bg-card); padding: 1px 4px; border-radius: 3px; }
.data-table-compact { font-size: 12px; }
.data-table-compact td, .data-table-compact th { padding: 4px 10px; }
tr.unused td { color: var(--text-muted); font-style: italic; }
.high-null { color: var(--red); font-weight: 600; }
.mid-null { color: var(--yellow); }

.callout {
  padding: 12px 16px;
  border-radius: var(--radius);
  font-size: 13px;
  margin: 12px 0;
  border-left: 4px solid;
}
.callout-warn { background: #fef3c7; border-color: var(--yellow); color: #92400e; }
.dark .callout-warn, :root:not(.light) .callout-warn { background: #422006; color: #fbbf24; }
@media (prefers-color-scheme: light) { :root:not(.dark) .callout-warn { background: #fef3c7; color: #92400e; } }

.table-section { border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 12px; overflow: hidden; }
.table-header {
  font-size: 16px;
  padding: 14px 20px;
  margin: 0;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  user-select: none;
  transition: background 0.15s;
}
.table-header:hover { background: var(--accent-light); }
.collapse-icon { font-size: 12px; transition: transform 0.2s; width: 16px; }
.table-header.open .collapse-icon { transform: rotate(90deg); }
.table-meta { font-size: 12px; font-weight: 400; color: var(--text-muted); margin-left: auto; }
.table-body { padding: 20px; }
.table-body.collapsed { display: none; }

.field-detail {
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
}
.field-detail:last-child { border-bottom: none; }
.field-stats { font-size: 13px; color: var(--text-muted); margin: 4px 0; }
.field-stats strong { color: var(--text); }

.progress-bar {
  height: 6px;
  background: var(--border);
  border-radius: 3px;
  margin: 6px 0;
  overflow: hidden;
}
.progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s; }

.flag {
  font-size: 12px;
  color: var(--yellow);
  padding: 2px 0;
  margin-top: 4px;
}
.flag::before { content: "⚠ "; }

.footer {
  margin-top: 60px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  color: var(--text-muted);
}
.footer a { color: var(--accent); text-decoration: none; }

@media (max-width: 768px) {
  .sidebar { display: none; }
  .content { margin-left: 0; padding: 20px; }
  .cards { grid-template-columns: repeat(2, 1fr); }
}

@media print {
  .sidebar { display: none; }
  .content { margin-left: 0; max-width: 100%; }
  .table-body.collapsed { display: block !important; }
  .theme-toggle { display: none; }
}
`

const JS = `
function toggleSection(header) {
  const body = header.nextElementSibling;
  header.classList.toggle('open');
  body.classList.toggle('collapsed');
}

const links = document.querySelectorAll('.sidebar-link');
const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      links.forEach(l => l.classList.remove('active'));
      const link = document.querySelector('.sidebar-link[href="#' + entry.target.id + '"]');
      if (link) link.classList.add('active');
    }
  }
}, { rootMargin: '-20% 0px -70% 0px' });

document.querySelectorAll('section[id]').forEach(s => observer.observe(s));

function toggleTheme() {
  const html = document.documentElement;
  if (html.classList.contains('dark')) {
    html.classList.remove('dark');
    html.classList.add('light');
  } else if (html.classList.contains('light')) {
    html.classList.remove('light');
    html.classList.add('dark');
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    html.classList.add(isDark ? 'light' : 'dark');
  }
}

document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const header = target.querySelector('.table-header');
      if (header && !header.classList.contains('open')) {
        toggleSection(header);
      }
    }
  });
});
`
