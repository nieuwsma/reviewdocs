// Foundation remains an adopter-owned dependency. Supply the actual components,
// rather than copying their implementation or styling into this toolkit.
export function createFoundationDocs({ React, AppShell, PageLayout, TextField, Button, Breadcrumbs }) {
  const h = React.createElement;
  function Navigation({ items, links }) {
    const [query, setQuery] = React.useState('');
    return h('div', { className: 'docs-navigation' },
      h(TextField, { label: 'Find a page', type: 'search', value: query, onChange: e => setQuery(e.target.value) }),
      h('ul', null, items.filter(item => item.label.toLowerCase().includes(query.toLowerCase())).map((item, index) => h('li', { key: index },
        item.group ? h('small', { className: 'docs-nav-group' }, item.group) : null,
        h('a', { href: item.href, 'aria-current': item.current ? 'page' : undefined }, item.label)))),
      links.length ? h('div', { className: 'docs-artifacts' }, links.map((item, index) => h('a', { key: index, href: item.href }, item.label))) : null);
  }
  return function Docs({ page }) {
    React.useEffect(() => { document.dispatchEvent(new Event('reviewdocs:rendered')); }, []);
    return h(AppShell, {
      productName: page.title, environment: page.options?.environment ?? 'Documentation', corporateBrand: false,
      applicationBrand: { label: page.options?.brandLabel ?? page.title, href: page.homeHref, mark: page.options?.brandImage ? h('img', { src: `${page.assetPrefix ?? ''}_presentation/${page.options.brandImage}`, alt: '', 'aria-hidden': true }) : h('span', null, page.options?.brandMark ?? 'D') },
      navigationBehavior: 'adaptive', navigationLabel: 'Documentation',
      navigation: page.navigation?.length ? h(Navigation, { items: page.navigation, links: page.links ?? [] }) : undefined,
      contextBar: h('div', { className: 'docs-context' }, h(Breadcrumbs, { items: [{ label: page.title, href: page.homeHref }, { label: page.label }] }), h(Button, { 'data-print': true }, 'Print')),
      footer: 'Generated from maintained documentation sources.'
    }, h(PageLayout, null, h('article', { id: 'content', className: 'docs-prose', dangerouslySetInnerHTML: { __html: page.body } })));
  };
}
export function createFoundationRenderer({ React, renderToStaticMarkup, DataTable, Docs }) {
  return function renderPage(page) {
    // Use Foundation's table component for Markdown tables, including its scroll container.
    page = { ...page, body: page.body.replace(/<table>([\s\S]*?)<\/table>/g, (_, inner) => renderToStaticMarkup(React.createElement(DataTable, { dangerouslySetInnerHTML: { __html: inner } }))) };
    const json = JSON.stringify(page).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
    const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    const prefix = page.assetPrefix ?? '';
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escape(page.label)} · ${escape(page.title)}</title><link rel="stylesheet" href="${prefix}_presentation/theme.css">${page.options?.brandImage ? `<link rel="icon" type="image/png" href="${prefix}_presentation/${escape(page.options.brandImage)}">` : ""}</head><body><a class="docs-skip" href="#content">Skip to content</a><div id="reviewdocs-root">${renderToStaticMarkup(React.createElement(Docs, { page }))}</div><script id="reviewdocs-page" type="application/json">${json}</script><script src="${prefix}site.js"></script><script defer src="${prefix}_presentation/theme.js"></script></body></html>\n`;
  };
}
