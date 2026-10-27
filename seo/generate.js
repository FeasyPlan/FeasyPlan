// Genera las páginas públicas de ejercicios (SEO):
//   /ejercicios                → índice de guías y biblioteca
//   /ejercicios/<guia>         → plan por patología/zona (imprimible en PDF)
//   /ejercicio/<ejercicio>     → ficha de cada ejercicio
// más sitemap.xml y robots.txt. Lo llama build.js: require('./seo/generate')('./dist')

const fs = require('fs');
const path = require('path');

const SITE = 'https://feasyplan.pro';
const LOGO = 'https://hqofqaqlhknyxrazgwtc.supabase.co/storage/v1/object/public/brand/logo-full.png';
const SYMBOL = 'https://hqofqaqlhknyxrazgwtc.supabase.co/storage/v1/object/public/brand/logo-symbol.png';
const TODAY = new Date().toISOString().slice(0, 10);

const ejercicios = require('./ejercicios.json');
const guias = require('./guias.js');

const ZONAS = { Core: 'Core y abdomen', Cadera: 'Cadera y glúteos', Piernas: 'Piernas y rodilla', Tobillo: 'Tobillo y pie', Hombros: 'Hombros, brazos y pecho', Cuello: 'Cuello', General: 'Cuerpo completo' };

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slugify = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const appUrl = (campaign) => `/?utm_source=web&utm_medium=seo&utm_campaign=${campaign}`;

// Un slug por nombre: los ejercicios repetidos en la biblioteca comparten ficha (la del id más bajo)
const porSlug = new Map();
for (const e of [...ejercicios].sort((a, b) => a.id - b.id)) {
  const slug = slugify(e.name);
  if (!porSlug.has(slug)) porSlug.set(slug, { ...e, slug });
}
const fichas = [...porSlug.values()];
const porId = new Map(ejercicios.map((e) => [e.id, porSlug.get(slugify(e.name))]));

function dosis(series, reps, segundos) {
  const s = Number(series) || 3;
  if (Number(segundos) > 0) return `${s} × ${segundos} s`;
  return `${s} × ${Number(reps) || 10} rep.`;
}
const dosisFicha = (e) => dosis(e.series, e.reps, e.duration);
const pasos = (texto) => texto.split(/(?<=\.)\s+/).map((p) => p.trim()).filter(Boolean);
const tags = (e) => String(e.tags || '').split(',').map((t) => t.trim()).filter(Boolean);

// ---------- Plantilla común ----------

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--navy:#0F172A;--navy2:#13213F;--blue:#2563EB;--blue-l:#EFF6FF;--blue-m:#93C5FD;--g50:#F7F8FA;--g100:#F1F3F7;--g200:#E4E8F0;--g400:#9CA3AF;--g600:#4B5563;--g900:#111827;--amber-l:#FFFBEB;--amber:#B45309}
html{-webkit-text-size-adjust:100%}
body{font-family:'DM Sans',system-ui,sans-serif;color:var(--g900);background:#fff;line-height:1.6;font-size:16px}
a{color:var(--blue)}
img{max-width:100%;display:block}
.wrap{max-width:1040px;margin:0 auto;padding:0 20px}
.top{background:#fff;border-bottom:1px solid var(--g200);position:sticky;top:0;z-index:10}
.top .wrap{display:flex;align-items:center;justify-content:space-between;height:60px;gap:12px}
.top img{height:40px;width:auto}
.top nav{display:flex;align-items:center;gap:18px}
.top nav a{color:var(--g600);text-decoration:none;font-size:14px;font-weight:500}
.top nav a.btn{color:#fff}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--blue);color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:11px 18px;border-radius:10px;border:0;cursor:pointer;font-family:inherit;line-height:1.2}
.btn:hover{background:#1D4ED8}
.btn-ghost{background:transparent;border:1px solid var(--g200);color:var(--g900)}
.btn-ghost:hover{background:var(--g50)}
.hero{background:radial-gradient(ellipse at 50% 120%,#1E40AF 0%,var(--navy) 60%);color:#fff;padding:40px 0 44px}
.crumbs{font-size:13px;color:var(--blue-m);margin-bottom:14px}
.crumbs a{color:var(--blue-m);text-decoration:none}
.kicker{font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:var(--blue-m);margin-bottom:10px}
h1{font-size:clamp(28px,4.6vw,42px);line-height:1.15;font-weight:700;letter-spacing:-.5px;max-width:780px}
.lead{font-size:18px;color:#CBD5E1;margin-top:14px;max-width:720px}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:20px}
.chip{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);color:#E2E8F0;font-size:13px;padding:5px 12px;border-radius:999px}
.actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:24px}
.hero .btn-ghost{color:#fff;border-color:rgba(255,255,255,.3)}
.hero .btn-ghost:hover{background:rgba(255,255,255,.08)}
main section{padding:36px 0 0}
h2{font-size:26px;line-height:1.25;letter-spacing:-.3px;margin-bottom:14px}
h3{font-size:18px;line-height:1.3}
p+p{margin-top:12px}
.prose{max-width:760px;color:#374151}
ul.list{list-style:none;display:grid;gap:8px;max-width:760px}
ul.list li{padding-left:28px;position:relative;color:#374151}
ul.list li::before{content:'';position:absolute;left:0;top:5px;width:16px;height:16px;border-radius:50%;background:var(--blue) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='20 6 9 17 4 12'/%3E%3C/svg%3E") center/10px no-repeat}
.sheet{border:1px solid var(--g200);border-radius:16px;overflow:hidden;background:#fff}
.sheet-head{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 20px;background:var(--g50);border-bottom:1px solid var(--g200);flex-wrap:wrap}
.sheet-head .meta{font-size:14px;color:var(--g600)}
.ex{display:grid;grid-template-columns:28px 120px 1fr;gap:16px;padding:18px 20px;border-bottom:1px solid var(--g100);align-items:start}
.ex:last-of-type{border-bottom:0}
.num{width:28px;height:28px;border-radius:50%;background:var(--blue);color:#fff;font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center}
.ex img{width:120px;height:120px;object-fit:contain;background:var(--g50);border-radius:12px}
.ex h3 a{color:var(--g900);text-decoration:none}
.ex h3 a:hover{color:var(--blue)}
.dose{display:inline-block;background:var(--blue-l);color:var(--blue);font-weight:700;font-size:13px;padding:3px 10px;border-radius:8px;margin:6px 0}
.ex p{font-size:15px;color:#374151}
.ex .nota{font-size:14px;color:var(--g600);margin-top:6px}
.ex .nota b{color:var(--g900)}
.sheet-notes{padding:14px 20px;background:var(--g50);border-top:1px solid var(--g200);font-size:14px;color:var(--g600)}
.print-only{display:none}
.warn{background:var(--amber-l);border:1px solid #FDE68A;border-radius:14px;padding:18px 20px;max-width:760px}
.warn h2{font-size:20px;color:var(--amber)}
.warn ul.list li::before{background-color:#D97706}
.cta{background:radial-gradient(ellipse at 80% 0%,#1E40AF 0%,var(--navy) 55%);color:#fff;border-radius:18px;padding:28px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center}
.cta p{color:#CBD5E1;margin-top:6px;max-width:560px}
.cta .kicker{margin-bottom:6px}
details{border:1px solid var(--g200);border-radius:12px;padding:14px 18px;max-width:760px}
details+details{margin-top:10px}
summary{font-weight:600;cursor:pointer}
details p{margin-top:8px;color:#374151}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}
.card{display:block;border:1px solid var(--g200);border-radius:14px;padding:16px;text-decoration:none;color:var(--g900);background:#fff;transition:border-color .15s,box-shadow .15s}
.card:hover{border-color:var(--blue);box-shadow:0 4px 18px rgba(37,99,235,.08)}
.card .thumbs{display:flex;gap:6px;margin-bottom:12px}
.card .thumbs img{width:56px;height:56px;object-fit:contain;background:var(--g50);border-radius:10px}
.card span{display:block;font-size:14px;color:var(--g600);margin-top:4px}
.lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.lib a{display:flex;align-items:center;gap:10px;padding:8px;border-radius:10px;text-decoration:none;color:var(--g900);font-size:15px}
.lib a:hover{background:var(--g50);color:var(--blue)}
.lib img{width:44px;height:44px;object-fit:contain;background:var(--g50);border-radius:8px;flex-shrink:0}
.ficha{display:grid;grid-template-columns:minmax(0,360px) 1fr;gap:32px;align-items:start}
.ficha .big{width:100%;aspect-ratio:1;object-fit:contain;background:var(--g50);border-radius:18px;border:1px solid var(--g200)}
ol.steps{list-style:none;counter-reset:p;display:grid;gap:12px}
ol.steps li{counter-increment:p;padding-left:40px;position:relative;color:#374151}
ol.steps li::before{content:counter(p);position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:var(--blue-l);color:var(--blue);font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center}
.facts{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-top:22px}
.fact{background:var(--g50);border-radius:12px;padding:12px 14px}
.fact small{display:block;font-size:12px;color:var(--g600);text-transform:uppercase;letter-spacing:1px;font-weight:600}
.fact b{font-size:16px}
.tagl{display:flex;flex-wrap:wrap;gap:6px}
.tagl span{background:var(--g100);border-radius:8px;padding:4px 10px;font-size:14px}
footer{margin-top:56px;background:var(--navy);color:#94A3B8;padding:32px 0;font-size:14px}
footer .wrap{display:grid;gap:18px}
footer a{color:#CBD5E1;text-decoration:none}
footer .cols{display:flex;flex-wrap:wrap;gap:8px 20px}
@media (max-width:720px){
  .top nav a:not(.btn){display:none}
  .hero{padding:28px 0 32px}
  .lead{font-size:16px}
  .ex{grid-template-columns:84px 1fr;gap:14px;padding:16px;position:relative}
  .ex .num{position:absolute;left:10px;top:10px;width:24px;height:24px;font-size:12px}
  .ex img{width:84px;height:84px}
  .cta{grid-template-columns:1fr;padding:22px}
  .ficha{grid-template-columns:1fr}
  h2{font-size:22px}
}
@media print{
  @page{margin:14mm}
  body{font-size:12px}
  .top,.hero,footer,main > section:not(.plan),.no-print,.sheet-head .btn{display:none!important}
  .print-only{display:block}
  .print-brand{display:flex!important;justify-content:space-between;align-items:center;border-bottom:2px solid #2563EB;padding-bottom:8px;margin-bottom:12px}
  .print-brand img{height:30px}
  main section{padding:0}
  .sheet{border:0}
  .sheet-head{background:none;padding:0 0 8px}
  .ex{grid-template-columns:22px 90px 1fr;padding:10px 0;break-inside:avoid}
  .ex img{width:90px;height:90px}
  .print-foot{display:block;margin-top:14px;font-size:10px;color:#6B7280;text-align:center}
}
`;

function jsonld(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;
}

function breadcrumbLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + url })),
  };
}

function crumbsHtml(items) {
  return `<nav class="crumbs" aria-label="Migas de pan">${items
    .map(([name, url], i) => (i < items.length - 1 ? `<a href="${url}">${esc(name)}</a> › ` : esc(name)))
    .join('')}</nav>`;
}

function layout({ title, description, url, image, ld = [], body }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${url}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="FeasyPlan">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${esc(image || LOGO)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0F172A">
<link rel="icon" type="image/png" href="${SYMBOL}">
<link rel="apple-touch-icon" href="${SYMBOL}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS.replace(/\n/g, '')}</style>
${ld.map(jsonld).join('\n')}
</head>
<body>
<header class="top"><div class="wrap">
  <a href="/" aria-label="FeasyPlan, inicio"><img src="${LOGO}" alt="FeasyPlan" width="150" height="40"></a>
  <nav><a href="/ejercicios">Ejercicios</a><a class="btn" href="${appUrl('cabecera')}">Crear plan gratis</a></nav>
</div></header>
${body}
<footer><div class="wrap">
  <div class="cols"><b style="color:#fff">Guías de ejercicios:</b>${guias.map((g) => `<a href="/ejercicios/${g.slug}">${esc(g.h1.replace(/^Ejercicios (para|de) (la |el )?/i, '').replace(/^Estiramientos y movilidad de /, ''))}</a>`).join('')}</div>
  <div class="cols"><a href="/">FeasyPlan</a><a href="/ejercicios">Biblioteca de ejercicios</a><a href="/terminos">Términos</a><a href="/privacidad">Privacidad</a><a href="/cookies">Cookies</a><a href="mailto:soporte@feasyplan.pro">soporte@feasyplan.pro</a></div>
  <div>La información de estas páginas es orientativa y no sustituye la valoración de un profesional sanitario. © ${new Date().getFullYear()} FeasyPlan.</div>
</div></footer>
</body>
</html>`;
}

function ctaHtml(campaign, titulo = '¿Eres fisioterapeuta? Envía este plan a tu paciente en 30 segundos') {
  return `<section class="no-print"><div class="wrap"><div class="cta">
  <div><div class="kicker">FeasyPlan · Gratis</div><h2 style="margin:0">${esc(titulo)}</h2>
  <p>Cambia ejercicios, series y notas, añade tu logo y el nombre del paciente, y envíalo por WhatsApp o email. Más de 100 ejercicios ilustrados.</p></div>
  <a class="btn" href="${appUrl(campaign)}">Crear plan gratis</a>
</div></div></section>`;
}

// ---------- Guía (plan por patología) ----------

function guiaPage(g) {
  const items = g.plan.map((p) => ({ ...p, e: porId.get(p.id) }));
  for (const it of items) if (!it.e) throw new Error(`Guía ${g.slug}: no existe el ejercicio ${it.id}`);
  const url = `/ejercicios/${g.slug}`;
  const crumbs = [['Inicio', '/'], ['Ejercicios', '/ejercicios'], [g.h1.split(' (')[0], url]];
  const relacionadas = g.relacionadas.map((s) => guias.find((x) => x.slug === s)).filter(Boolean);

  const body = `
<div class="hero"><div class="wrap">
  ${crumbsHtml(crumbs)}
  <div class="kicker">Plan de ejercicios · ${esc(g.zona)}</div>
  <h1>${esc(g.h1)}</h1>
  <p class="lead">${esc(g.lead)}</p>
  <div class="chips"><span class="chip">${items.length} ejercicios</span><span class="chip">${esc(g.frecuencia)}</span><span class="chip">Sin material o con material básico</span></div>
  <div class="actions"><a class="btn" href="#plan">Ver el plan</a><button class="btn btn-ghost" onclick="window.print()">Descargar en PDF</button></div>
</div></div>
<main>
<section><div class="wrap"><div class="prose">${g.intro.map((p) => `<p>${esc(p)}</p>`).join('')}</div></div></section>
<section><div class="wrap"><h2>Objetivos del plan</h2><ul class="list">${g.objetivos.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div></section>
<section class="plan" id="plan"><div class="wrap">
  <div class="print-only print-brand" style="display:none"><img src="${LOGO}" alt="FeasyPlan"><span>${esc(g.h1)}</span></div>
  <h2 class="no-print">El plan, ejercicio a ejercicio</h2>
  <div class="sheet">
    <div class="sheet-head"><div><b>${esc(g.h1)}</b><div class="meta">Frecuencia: ${esc(g.frecuencia)}</div></div><button class="btn btn-ghost" onclick="window.print()">Imprimir o guardar PDF</button></div>
    ${items.map((it, i) => `
    <article class="ex">
      <div class="num">${i + 1}</div>
      <img src="${esc(it.e.img)}" alt="Ilustración del ejercicio ${esc(it.e.name.toLowerCase())}" width="120" height="120" loading="${i < 2 ? 'eager' : 'lazy'}">
      <div>
        <h3><a href="/ejercicio/${it.e.slug}">${esc(it.e.name)}</a></h3>
        <span class="dose">${dosis(it.s, it.r, it.t)}</span>
        <p>${esc(it.e.description)}</p>
        ${it.nota ? `<p class="nota"><b>Nota:</b> ${esc(it.nota)}</p>` : ''}
      </div>
    </article>`).join('')}
    <div class="sheet-notes"><b>Indicaciones:</b> ${esc(g.notasPlan)}</div>
  </div>
  <p class="print-only print-foot">Plan orientativo creado con FeasyPlan · feasyplan.pro · No sustituye la valoración de un fisioterapeuta.</p>
</div></section>
<section><div class="wrap"><h2>Cómo progresar</h2><ul class="list">${g.progresion.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div></section>
<section><div class="wrap"><div class="warn"><h2>Precauciones</h2><ul class="list">${g.precauciones.map((o) => `<li>${esc(o)}</li>`).join('')}</ul></div></div></section>
${ctaHtml(g.slug)}
<section><div class="wrap"><h2>Preguntas frecuentes</h2>${g.faq.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div></section>
<section><div class="wrap"><h2>Otras guías de ejercicios</h2><div class="cards">${relacionadas.map(guiaCard).join('')}</div></div></section>
</main>`;

  return layout({
    title: g.title,
    description: g.description,
    url,
    image: items[0].e.img,
    ld: [
      breadcrumbLd(crumbs),
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: g.h1,
        description: g.description,
        image: items.map((it) => it.e.img),
        inLanguage: 'es',
        dateModified: TODAY,
        mainEntityOfPage: SITE + url,
        author: { '@type': 'Organization', name: 'FeasyPlan', url: SITE },
        publisher: { '@type': 'Organization', name: 'FeasyPlan', logo: { '@type': 'ImageObject', url: LOGO } },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
    ],
    body,
  });
}

function guiaCard(g) {
  const imgs = g.plan.slice(0, 3).map((p) => porId.get(p.id));
  return `<a class="card" href="/ejercicios/${g.slug}"><div class="thumbs">${imgs.map((e) => `<img src="${esc(e.img)}" alt="" width="56" height="56" loading="lazy">`).join('')}</div><h3>${esc(g.h1)}</h3><span>${g.plan.length} ejercicios · ${esc(g.frecuencia.split('·')[0].trim())}</span></a>`;
}

// ---------- Ficha de ejercicio ----------

function fichaPage(e) {
  const url = `/ejercicio/${e.slug}`;
  const zonaTxt = ZONAS[e.zona] || e.zona;
  const crumbs = [['Inicio', '/'], ['Ejercicios', '/ejercicios'], [e.name, url]];
  const enGuias = guias.filter((g) => g.plan.some((p) => porId.get(p.id)?.slug === e.slug));
  let parecidos = fichas.filter((x) => x.slug !== e.slug && x.zona === e.zona && x.tipo === e.tipo);
  if (parecidos.length < 6) parecidos = parecidos.concat(fichas.filter((x) => x.slug !== e.slug && x.zona === e.zona && x.tipo !== e.tipo));
  parecidos = parecidos.slice(0, 6);
  const steps = pasos(e.description);
  const material = e.material && e.material !== 'Ninguno' ? e.material : 'Sin material';
  const nombreMin = e.name.charAt(0).toLowerCase() + e.name.slice(1);
  const desc = `Cómo hacer ${nombreMin} paso a paso, con ilustración. ${steps[0]} Dosis orientativa: ${dosisFicha(e)}.`;

  const body = `
<div class="hero"><div class="wrap">
  ${crumbsHtml(crumbs)}
  <div class="kicker">${esc(e.tipo)} · ${esc(zonaTxt)}</div>
  <h1>${esc(e.name)}: cómo hacerlo correctamente</h1>
  <p class="lead">Ejercicio de ${esc(e.tipo.toLowerCase())} para ${esc(zonaTxt.toLowerCase())}. Trabaja: ${esc(tags(e).join(', '))}.</p>
</div></div>
<main>
<section><div class="wrap ficha">
  <img class="big" src="${esc(e.img)}" alt="Ilustración del ejercicio ${esc(nombreMin)}" width="360" height="360">
  <div>
    <h2>Cómo se hace</h2>
    <ol class="steps">${steps.map((p) => `<li>${esc(p)}</li>`).join('')}</ol>
    <div class="facts">
      <div class="fact"><small>Dosis orientativa</small><b>${dosisFicha(e)}</b></div>
      <div class="fact"><small>Tipo</small><b>${esc(e.tipo)}</b></div>
      <div class="fact"><small>Zona</small><b>${esc(e.zona)}</b></div>
      <div class="fact"><small>Material</small><b>${esc(material)}</b></div>
    </div>
    <h3 style="margin:22px 0 10px">Músculos y zonas que trabaja</h3>
    <div class="tagl">${tags(e).map((t) => `<span>${esc(cap(t))}</span>`).join('')}</div>
  </div>
</div></section>
${enGuias.length ? `<section><div class="wrap"><h2>Planes que incluyen este ejercicio</h2><div class="cards">${enGuias.map(guiaCard).join('')}</div></div></section>` : ''}
${ctaHtml(`ficha-${e.slug}`, '¿Eres fisioterapeuta? Añade este ejercicio a un plan para tu paciente')}
<section><div class="wrap"><h2>Ejercicios parecidos</h2><div class="lib">${parecidos.map(libLink).join('')}</div></div></section>
<section><div class="wrap"><p class="prose" style="font-size:14px;color:var(--g600)">Las series y repeticiones son orientativas. Si notas dolor durante el ejercicio, para y consulta con tu fisioterapeuta.</p></div></section>
</main>`;

  return layout({
    title: `${e.name}: cómo hacerlo correctamente | FeasyPlan`,
    description: desc.length > 160 ? desc.slice(0, 157).replace(/\s+\S*$/, '') + '…' : desc,
    url,
    image: e.img,
    ld: [
      breadcrumbLd(crumbs),
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: `Cómo hacer ${nombreMin}`,
        image: e.img,
        inLanguage: 'es',
        tool: material === 'Sin material' ? [] : [{ '@type': 'HowToTool', name: material }],
        step: steps.map((p, i) => ({ '@type': 'HowToStep', position: i + 1, text: p })),
      },
    ],
    body,
  });
}

function libLink(e) {
  return `<a href="/ejercicio/${e.slug}"><img src="${esc(e.img)}" alt="" width="44" height="44" loading="lazy">${esc(e.name)}</a>`;
}

// ---------- Índice ----------

function indicePage() {
  const url = '/ejercicios';
  const crumbs = [['Inicio', '/'], ['Ejercicios', url]];
  const grupos = Object.keys(ZONAS).map((z) => [z, fichas.filter((e) => e.zona === z).sort((a, b) => a.name.localeCompare(b.name, 'es'))]);
  const body = `
<div class="hero"><div class="wrap">
  ${crumbsHtml(crumbs)}
  <div class="kicker">Para fisioterapeutas y pacientes</div>
  <h1>Ejercicios de fisioterapia: planes en PDF para tus pacientes</h1>
  <p class="lead">Guías con ejercicios ilustrados, series y repeticiones para los problemas más habituales en consulta. Imprímelas gratis o personalízalas con tu logo en FeasyPlan.</p>
  <div class="actions"><a class="btn" href="#guias">Ver las guías</a><a class="btn btn-ghost" href="#biblioteca">Biblioteca de ${fichas.length} ejercicios</a></div>
</div></div>
<main>
<section id="guias"><div class="wrap"><h2>Planes de ejercicios por zona</h2><div class="cards">${guias.map(guiaCard).join('')}</div></div></section>
${ctaHtml('indice', 'Crea planes como estos en 30 segundos, con tu logo')}
<section id="biblioteca"><div class="wrap"><h2>Biblioteca de ejercicios</h2>
<p class="prose" style="margin-bottom:18px">Todos los ejercicios incluyen ilustración, explicación paso a paso y una dosis orientativa. Son los mismos que puedes usar en FeasyPlan para crear planes personalizados.</p>
${grupos.map(([z, lista]) => `<h3 style="margin:22px 0 8px">${esc(ZONAS[z])} <span style="color:var(--g400);font-weight:500">(${lista.length})</span></h3><div class="lib">${lista.map(libLink).join('')}</div>`).join('')}
</div></section>
</main>`;
  return layout({
    title: 'Ejercicios de fisioterapia en PDF: planes gratis para pacientes | FeasyPlan',
    description: 'Planes de ejercicios de fisioterapia con ilustraciones para lumbalgia, rodilla, cadera, hombro y más. Descárgalos en PDF gratis o personalízalos para tus pacientes.',
    url,
    ld: [
      breadcrumbLd(crumbs),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Ejercicios de fisioterapia',
        url: SITE + url,
        inLanguage: 'es',
        hasPart: guias.map((g) => ({ '@type': 'Article', headline: g.h1, url: `${SITE}/ejercicios/${g.slug}` })),
      },
    ],
    body,
  });
}

// ---------- Salida ----------

module.exports = function generate(outDir) {
  const write = (rel, html) => {
    const file = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, html);
  };
  write('ejercicios.html', indicePage());
  for (const g of guias) write(`ejercicios/${g.slug}.html`, guiaPage(g));
  for (const e of fichas) write(`ejercicio/${e.slug}.html`, fichaPage(e));

  const urls = [
    ['/', '1.0'], ['/ejercicios', '0.9'],
    ...guias.map((g) => [`/ejercicios/${g.slug}`, '0.8']),
    ...fichas.map((e) => [`/ejercicio/${e.slug}`, '0.6']),
    ['/terminos', '0.2'], ['/privacidad', '0.2'], ['/cookies', '0.2'],
  ];
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([u, p]) => `  <url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod><priority>${p}</priority></url>`).join('\n')}
</urlset>
`);
  write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
  console.log(`SEO: ${guias.length} guías, ${fichas.length} fichas, ${urls.length} URLs en el sitemap`);
};

if (require.main === module) module.exports(process.argv[2] || path.join(__dirname, '..', 'dist'));
