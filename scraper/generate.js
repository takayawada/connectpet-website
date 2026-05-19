/**
 * ConnectPet — Content → HTML Generator
 * 
 * 使い方:
 *   node generate.js
 * 
 * scrape.js で生成した content.json を読み込んで
 * 全HTMLファイルを自動生成します
 */

const fs   = require('fs');
const path = require('path');

const CONTENT_FILE = path.join(__dirname, '..', 'scraper-output', 'content.json');
const OUT_DIR      = path.join(__dirname, '..');

if (!fs.existsSync(CONTENT_FILE)) {
  console.error('❌ content.json が見つかりません。先に node scrape.js を実行してください');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));

// ────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────
function getTexts(pageId, minLen = 5) {
  const d = data[pageId];
  if (!d || d.error) return [];
  return (d.sections || []).filter(s => s.text && s.text.length >= minLen);
}

function getH(pageId, tags = ['h1','h2','h3']) {
  return getTexts(pageId).filter(s => tags.includes(s.tag));
}

function getP(pageId) {
  return getTexts(pageId).filter(s => ['p','li'].includes(s.tag));
}

function getImg(pageId, minWidth = 200) {
  const d = data[pageId];
  if (!d) return [];
  return (d.images || []).filter(img => {
    if (img.isBg) return false;
    if (img.width > 0 && img.width < minWidth) return false;
    return true;
  });
}

function firstImg(pageId, fallback = '') {
  const imgs = getImg(pageId);
  if (imgs.length === 0) return fallback;
  const local = imgs.find(i => i.localFile);
  return local ? local.localFile : (imgs[0].src || fallback);
}

function ogImg(pageId) {
  const d = data[pageId];
  return d?.ogImage || firstImg(pageId, '');
}

// テキストからセクションを推測して抽出
function extractSections(pageId) {
  const texts = getTexts(pageId);
  const sections = [];
  let current = null;

  texts.forEach(t => {
    if (['h1','h2','h3'].includes(t.tag)) {
      if (current) sections.push(current);
      current = { heading: t.text, tag: t.tag, items: [] };
    } else if (current) {
      current.items.push(t.text);
    } else {
      sections.push({ heading: null, tag: null, items: [t.text] });
    }
  });
  if (current) sections.push(current);
  return sections;
}

// ────────────────────────────────────────
// 共通HTML部品
// ────────────────────────────────────────
const HEAD = (title, desc = '') => `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>${title}</title>
${desc ? `<meta name="description" content="${desc}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Shippori+Mincho+B1:wght@400;600;700;800&family=Noto+Sans+JP:wght@300;400;500;700&family=DM+Mono:wght@300;400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="common.css">
</head>
<body>`;

const CURSOR = `
<div id="cur"></div>
<div id="cur-r"></div>`;

const CAT_RUNNER = `
<div id="cat-runner" aria-hidden="true">
  <svg width="100" height="68" viewBox="0 0 100 68" fill="none">
    <g class="cg">
      <ellipse cx="48" cy="40" rx="26" ry="15" fill="#ff8c42"/>
      <circle cx="76" cy="26" r="14" fill="#ff8c42"/>
      <polygon points="66,16 60,3 73,12" fill="#ff8c42"/>
      <polygon points="82,12 80,1 90,10" fill="#ff8c42"/>
      <path d="M22 38 C8 28 3 14 9 6 C14 0 19 4 18 11 C17 17 23 30 22 38Z" fill="#ff8c42"/>
      <circle cx="79" cy="24" r="2.2" fill="#0a0e1a"/>
      <line x1="76" y1="32" x2="92" y2="29" stroke="rgba(255,255,255,.5)" stroke-width="1.1" stroke-linecap="round"/>
      <line x1="76" y1="34" x2="93" y2="36" stroke="rgba(255,255,255,.5)" stroke-width="1.1" stroke-linecap="round"/>
      <rect x="60" y="52" width="7" height="13" rx="3.5" fill="#ff8c42"/>
      <rect x="70" y="52" width="7" height="13" rx="3.5" fill="#ff8c42"/>
      <rect x="34" y="51" width="7" height="14" rx="3.5" fill="#ff8c42"/>
      <rect x="45" y="52" width="7" height="13" rx="3.5" fill="#ff8c42"/>
    </g>
  </svg>
</div>`;

const NAV = `
<nav id="nav">
  <a class="nav-logo" href="index.html">
    <img class="logo-img" src="images/logo.svg" alt="Connect Pet"
         onerror="this.style.display='none';document.getElementById('lf').style.display='flex'">
    <span class="logo-fb" id="lf" style="display:none">Connect<em>Pet</em></span>
  </a>
  <ul class="nav-links">
    <li><a href="about.html">について</a></li>
    <li><a href="service.html">サービス</a></li>
    <li><a href="carestore.html">にゃんほっと</a></li>
    <li><a href="homecare.html">HomeCare</a></li>
    <li><a href="news.html">ニュース</a></li>
    <li><a href="contact.html">お問い合わせ</a></li>
  </ul>
  <button id="mbtn" aria-label="メニューを開く" aria-expanded="false">
    <span class="mbl"></span><span class="mbl"></span><span class="mbl"></span>
  </button>
</nav>`;

const MENU = `
<div id="fullmenu" role="dialog" aria-modal="true">
  <div id="menu-bg"></div>
  <div id="menu-in">
    <nav class="m-nav">
      <a class="m-item" href="index.html"><span class="mn">00</span>トップ</a>
      <a class="m-item" href="about.html"><span class="mn">01</span>について</a>
      <a class="m-item" href="service.html"><span class="mn">02</span>サービス</a>
      <a class="m-item" href="carestore.html"><span class="mn">03</span>にゃんほっと</a>
      <a class="m-item" href="homecare.html"><span class="mn">04</span>HomeCare</a>
      <a class="m-item" href="news.html"><span class="mn">05</span>ニュース</a>
      <a class="m-item" href="contact.html"><span class="mn">06</span>お問い合わせ</a>
    </nav>
    <div class="m-foot">
      <div class="m-foot-row">
        <a href="legal.html">特定商取引法</a>
        <a href="privacy.html">プライバシーポリシー</a>
        <a href="mailto:info@connectpet.jp">info@connectpet.jp</a>
      </div>
      <p class="m-esc">esc or click to close</p>
    </div>
  </div>
</div>`;

// LINE浮きCTA
const LINE_CTA = `
<a id="line-cta" href="https://lin.ee/connectpet" target="_blank" rel="noopener" aria-label="LINEで相談する">
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.03 2 11.04c0 2.72 1.35 5.15 3.47 6.79L4 22l4.45-1.33c1.13.34 2.33.53 3.57.53 5.52 0 10-4.03 10-9.16C22 6.03 17.52 2 12 2z"/></svg>
  <span>LINE相談</span>
</a>`;

const FOOTER = `
<footer>
  <div class="ft-in">
    <div class="ft-top">
      <div>
        <div class="ft-name">Connect <em>Pet</em></div>
        <p class="ft-tag">ペットの殺処分ゼロをビジネスで実現し続ける、ソーシャルスタートアップカンパニー。</p>
        <div class="ft-sns">
          <a href="https://www.instagram.com/connectpet_nyan/" target="_blank" rel="noopener" aria-label="Instagram @connectpet_nyan">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
          <a href="https://www.instagram.com/nyanhot/" target="_blank" rel="noopener" aria-label="Instagram @nyanhot">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
        </div>
      </div>
      <div class="ft-col"><h4>Pages</h4><ul>
        <li><a href="index.html">トップ</a></li>
        <li><a href="about.html">について</a></li>
        <li><a href="service.html">サービス</a></li>
        <li><a href="news.html">ニュース</a></li>
        <li><a href="contact.html">お問い合わせ</a></li>
      </ul></div>
      <div class="ft-col"><h4>Services</h4><ul>
        <li><a href="carestore.html">にゃんほっと</a></li>
        <li><a href="carestore-cat.html">保護猫を迎える</a></li>
        <li><a href="homecare.html">HomeCare</a></li>
      </ul></div>
      <div class="ft-col"><h4>Legal</h4><ul>
        <li><a href="legal.html">特定商取引法</a></li>
        <li><a href="privacy.html">プライバシーポリシー</a></li>
      </ul></div>
    </div>
    <div class="ft-bot">
      <span>&copy; 2025 株式会社 Connect Pet. All rights reserved.</span>
      <div class="ft-bot-r"><a href="legal.html">特定商取引法</a><a href="privacy.html">プライバシーポリシー</a></div>
    </div>
  </div>
</footer>`;

const SCRIPTS = `
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/split-type@0.3.4/umd/index.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
<script src="common.js"></script>`;

const FOOT = `</body>\n</html>`;

// ────────────────────────────────────────
// ページ生成関数
// ────────────────────────────────────────

function buildPage(filename, bodyContent, pageId) {
  const d     = data[pageId] || {};
  const title = d.title || 'Connect Pet';
  const desc  = d.description || '';
  const html  = [
    HEAD(title, desc),
    CURSOR,
    CAT_RUNNER,
    NAV,
    MENU,
    bodyContent,
    LINE_CTA,
    FOOTER,
    SCRIPTS,
    FOOT,
  ].join('\n');

  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`✅ 生成: ${filename}`);
}

// ────────────────────────────────────────
// 各ページのHTML本文を生成
// ────────────────────────────────────────

// --- index.html ---
function buildIndex() {
  const d       = data.index || {};
  const heroImg = d.ogImage || firstImg('index', '');
  const sects   = extractSections('index');
  const h1Text  = getH('index',['h1'])[0]?.text || 'ペットの殺処分ゼロをビジネスで実現し続ける';
  const subText = getP('index')[0]?.text || '';

  const bodyContent = `
<main>

<!-- HERO -->
<section id="hero">
  <div class="hero-dots"></div>
  <div class="hero-glow"></div>
  <div class="hero-in">
    <div class="hero-txt">
      <div class="hero-ey" id="hEy">SOCIAL STARTUP · TOKYO</div>
      <h1 class="hero-h1" id="hH1">${h1Text}</h1>
      <div class="hero-rule" id="hRule"></div>
      <p class="hero-body" id="hBody">${subText}</p>
      <div class="hero-cta" id="hCta">
        <a class="btn-p magnetic" href="contact.html">無料相談をする <svg viewBox="0 0 14 14"><path d="M1 7h12M8 2l6 5-6 5"/></svg></a>
        <a class="btn-g magnetic" href="about.html">ConnectPetとは</a>
      </div>
    </div>
    <div class="hero-vis">
      <div class="hero-ring-d"></div>
      <div class="hero-frame" id="hFrame">
        ${heroImg ? `<img src="${heroImg}" alt="ConnectPet" loading="eager">` : '<div class="hero-ph"></div>'}
      </div>
    </div>
  </div>
  <div class="hero-sc" id="hSc"><div class="sc-line"></div><span>scroll</span></div>
</section>

<!-- TICKER -->
<div id="ticker" aria-hidden="true">
  <div class="ticker-track" id="tkTrk">
    ${Array(2).fill(`
    <div class="ti"><span class="td"></span><span class="ta">殺処分ゼロ</span>を目指して</div>
    <div class="ti"><span class="td"></span>保護猫と新しい家族を繋ぐ</div>
    <div class="ti"><span class="td"></span><span class="ta">にゃんほっと</span>保護猫譲渡施設</div>
    <div class="ti"><span class="td"></span><span class="ta">HomeCare</span>猫ケア家電サブスク</div>
    <div class="ti"><span class="td"></span>ソーシャルスタートアップ · 東京 · 銀座</div>
    <div class="ti"><span class="td"></span>ビジネスで、命を救う</div>`).join('')}
  </div>
</div>

<!-- MISSION -->
<section id="mission">
  <div class="mission-in">
    <div class="mission-left sr">
      <div class="eyebrow" style="margin-bottom:24px">MISSION</div>
      ${sects.slice(1, 4).map(s =>
        s.heading ? `<h2 class="mission-sub-h">${s.heading}</h2>` : ''
        + s.items.slice(0, 2).map(i => `<p class="mission-side">${i}</p>`).join('')
      ).join('')}
      <a class="alink" href="about.html">私たちのストーリー <span class="al-arr"></span></a>
    </div>
    <div class="mission-right">
      <p class="mission-stmt" id="mStmt">
        命を救うことを、<span class="ac">持続可能な<br>ビジネス</span>に変える。
      </p>
      <div class="mstats">
        <div class="ms sr"><div class="ms-val"><span class="cnt" data-to="150">0</span><span class="u">匹+</span></div><div class="ms-lbl">保護猫 譲渡実績</div></div>
        <div class="ms sr d1"><div class="ms-val"><span class="cnt" data-to="3">0</span><span class="u">年</span></div><div class="ms-lbl">活動年数</div></div>
        <div class="ms sr d2"><div class="ms-val"><span class="cnt" data-to="2">0</span><span class="u">ブランド</span></div><div class="ms-lbl">展開中のサービス</div></div>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section id="services">
  <div class="svc-in">
    <div class="sec-hd sr">
      <div class="sec-ey">SERVICES</div>
      <h2 class="sec-h2">2つのブランドで、猫との未来を。</h2>
    </div>
    <div class="svc-grid">
      <a class="svc-card sr" href="carestore.html">
        <div class="svc-img-w">
          <img class="svc-img-i" src="${data.carestore_cat?.ogImage || ''}" alt="にゃんほっと 保護猫譲渡施設" onerror="this.parentElement.classList.add('no-img')">
          <span class="svc-badge">ADOPTION</span>
        </div>
        <div class="svc-body">
          <div class="svc-bar"></div>
          <div class="svc-no">01 — CARESTORE</div>
          <div class="svc-name">にゃんほっと<br>保護猫譲渡特化型施設</div>
          <div class="svc-en">Nyan-Hot Care Store</div>
          <p class="svc-desc">${data.carestore_cat?.description || '保護された猫たちが新しい家族と出会う場所。最も殺処分数の多い猫の譲渡に特化した施設です。'}</p>
          <div class="svc-ft">
            <span class="svc-ft-info">東京 · 銀座エリア</span>
            <span class="alink">詳しくはこちら <span class="al-arr"></span></span>
          </div>
        </div>
      </a>
      <a class="svc-card sr d1" href="homecare.html">
        <div class="svc-img-w">
          <img class="svc-img-i" src="${data.hc_top?.ogImage || data.homecare?.ogImage || ''}" alt="にゃんほっとHomeCare" onerror="this.parentElement.classList.add('no-img')">
          <span class="svc-badge">SUBSCRIPTION</span>
        </div>
        <div class="svc-body">
          <div class="svc-bar"></div>
          <div class="svc-no">02 — HOMECARE</div>
          <div class="svc-name">にゃんほっと<br>HomeCare</div>
          <div class="svc-en">猫ケア家電サブスクサービス</div>
          <p class="svc-desc">${data.homecare?.description || data.hc_top?.description || '旅行中・勤務中でも安心。猫ケア家電をサブスクで。初月実質無料。'}</p>
          <div class="svc-ft">
            <span class="svc-ft-info">月額サブスク · 初月実質無料</span>
            <span class="alink">詳しくはこちら <span class="al-arr"></span></span>
          </div>
        </div>
      </a>
    </div>
  </div>
</section>

<!-- SNS -->
<section id="social">
  <div class="social-in">
    <div class="social-top">
      <div class="sr">
        <div class="eyebrow" style="margin-bottom:22px">FOLLOW US</div>
        <h2 class="social-h2">SNSでも発信中</h2>
        <p class="social-sub">保護猫の日常・譲渡情報・<br>HomeCare最新情報をお届けしています。</p>
      </div>
    </div>
    <div class="sns-grid">
      <a class="sns-card sr" href="https://www.instagram.com/connectpet_nyan/" target="_blank" rel="noopener">
        <div class="sns-ic"><svg viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></div>
        <div><div class="sns-at">@connectpet_nyan</div><div class="sns-name">Connect Pet</div><div class="sns-desc">保護猫の日常・譲渡情報・活動レポートを発信中</div></div>
      </a>
      <a class="sns-card sr d1" href="https://www.instagram.com/nyanhot/" target="_blank" rel="noopener">
        <div class="sns-ic"><svg viewBox="0 0 24 24" fill="white"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg></div>
        <div><div class="sns-at">@nyanhot</div><div class="sns-name">にゃんほっと</div><div class="sns-desc">にゃんほっとの保護猫たちとHomeCare情報を発信中</div></div>
      </a>
    </div>
  </div>
</section>

<!-- CTA -->
<section id="cta">
  <div class="cta-in">
    <div class="sr">
      <div class="cta-lbl">CONTACT</div>
      <h2 class="cta-h2">あなたの選択が、<br>命を救う。</h2>
      <p class="cta-body">猫を迎えたい。HomeCareを試したい。<br>どんなことでもお気軽にご相談ください。</p>
    </div>
    <div class="cta-btns sr d2">
      <a class="btn-w magnetic" href="contact.html">無料相談をする</a>
      <a class="btn-i magnetic" href="service.html">サービス一覧を見る</a>
    </div>
  </div>
</section>

</main>`;

  buildPage('index.html', bodyContent, 'index');
}

// --- 汎用コンテンツページ生成 ---
function buildContentPage(filename, pageId, pageTitle, breadcrumb) {
  const sections = extractSections(pageId);
  const imgs     = getImg(pageId, 300);

  const sectionsHtml = sections.map((s, i) => {
    if (!s.heading && s.items.length === 0) return '';
    const img = imgs[i] || imgs[0];
    const imgHtml = img ? `
    <div class="cp-img sr d1">
      <img src="${img.localFile || img.src}" alt="${img.alt || s.heading || ''}">
    </div>` : '';

    return `
  <div class="cp-section ${i % 2 === 1 ? 'cp-rev' : ''} sr">
    <div class="cp-text">
      ${s.heading ? `<${s.tag} class="cp-h">${s.heading}</${s.tag}>` : ''}
      ${s.items.map(t => `<p class="cp-p">${t}</p>`).join('\n      ')}
    </div>
    ${imgHtml}
  </div>`;
  }).filter(Boolean).join('\n');

  const bodyContent = `
<main>
  <div class="page-hero">
    <div class="page-hero-in">
      <div class="eyebrow">${breadcrumb}</div>
      <h1 class="page-h1">${pageTitle}</h1>
    </div>
  </div>
  <div class="cp-in">
    ${sectionsHtml || `<p class="cp-p">コンテンツを読み込んでいます...</p>`}
  </div>
  <section id="cta">
    <div class="cta-in">
      <div class="sr">
        <div class="cta-lbl">CONTACT</div>
        <h2 class="cta-h2">お気軽にご相談ください。</h2>
      </div>
      <div class="cta-btns sr d2">
        <a class="btn-w magnetic" href="contact.html">無料相談をする</a>
      </div>
    </div>
  </section>
</main>`;

  buildPage(filename, bodyContent, pageId);
}

// --- homecare.html (プラン付き) ---
function buildHomecare() {
  const d    = data.hc_top || data.homecare || {};
  const plan1 = data.hc_plan1 || {};
  const plan2 = data.hc_plan2 || {};
  const plan3 = data.hc_plan3 || {};

  function planTexts(pd) {
    return getTexts(pd.pageId || '', 4).slice(0, 10);
  }

  const bodyContent = `
<main>
  <div class="page-hero">
    <div class="page-hero-in">
      <div class="eyebrow">04 — HOMECARE</div>
      <h1 class="page-h1">にゃんほっとHomeCare</h1>
      <p class="page-sub">${d.description || '旅行中・勤務中でも安心・快適・便利に猫のケアが全自動でできる猫ケア家電のサブスクサービス'}</p>
    </div>
  </div>

  <!-- プラン -->
  <section id="plans">
    <div class="plans-in">
      <div class="sec-hd sr">
        <div class="sec-ey">PLANS</div>
        <h2 class="sec-h2">3つのプランからお選びください</h2>
        <p class="sec-sub">初月は実質無料でお試しいただけます。3年間の安心補償付き。</p>
      </div>
      <div class="plans-grid">

        <!-- PLAN 01 -->
        <div class="plan-card sr">
          <div class="plan-no">01</div>
          <h3 class="plan-name">生活快適プラン</h3>
          <div class="plan-price">¥4,378<span class="plan-tax">（税込）</span><span class="plan-unit">/月</span></div>
          <div class="plan-free">初月 実質無料</div>
          <ul class="plan-items">
            <li>自動トイレ</li>
            <li>自動トイレ専用猫砂（1ヶ月分/約7.5kg）</li>
            <li>自動清掃・自動脱臭機能</li>
            <li>携帯アプリでリモート操作可能</li>
            <li>3年間安心補償</li>
          </ul>
          <a class="btn-p" href="https://nyanhothomecare.com/plan/1" target="_blank" rel="noopener">このプランを選ぶ</a>
        </div>

        <!-- PLAN 02 -->
        <div class="plan-card plan-featured sr d1">
          <div class="plan-badge">POPULAR</div>
          <div class="plan-no">02</div>
          <h3 class="plan-name">お留守番プラン</h3>
          <div class="plan-price"><span class="plan-unit">生活快適プラン＋</span></div>
          <div class="plan-free">初月 実質無料</div>
          <ul class="plan-items">
            <li>生活快適プランの全内容</li>
            <li>自動給餌器 または 自動給水器（選択）</li>
            <li>フィルター・スポンジ定期便</li>
            <li>月額費用の一部が保護猫医療費に寄付</li>
            <li>3年間安心補償</li>
          </ul>
          <a class="btn-p" href="https://nyanhothomecare.com/" target="_blank" rel="noopener">このプランを選ぶ</a>
        </div>

        <!-- PLAN 03 -->
        <div class="plan-card sr d2">
          <div class="plan-no">03</div>
          <h3 class="plan-name">おでかけフルケアプラン</h3>
          <div class="plan-price"><span class="plan-unit">旅行・宿泊もOK！</span></div>
          <div class="plan-free">初月 実質無料</div>
          <ul class="plan-items">
            <li>自動トイレ</li>
            <li>自動給餌器</li>
            <li>自動給水器</li>
            <li>猫砂・フィルター・スポンジ・おやつ 定期便</li>
            <li>月額費用の一部が保護猫医療費に寄付</li>
            <li>3年間安心補償</li>
          </ul>
          <a class="btn-p" href="https://nyanhothomecare.com/" target="_blank" rel="noopener">このプランを選ぶ</a>
        </div>

      </div>
    </div>
  </section>

  <!-- FAQ -->
  <section id="faq">
    <div class="faq-in">
      <div class="sec-hd sr">
        <div class="sec-ey">FAQ</div>
        <h2 class="sec-h2">よくあるご質問</h2>
      </div>
      <div class="faq-list">
        <details class="faq-item sr">
          <summary>初月は本当に無料ですか？</summary>
          <p>お申し込み初月に物品がご自宅に到着した日から30日間は実質無料でご利用いただけます。クレジットカード決済は物品到着後31日後に初めて決済開始となります。</p>
        </details>
        <details class="faq-item sr d1">
          <summary>解約はできますか？</summary>
          <p>ご契約したプランの物品がご自宅に到着した日から30日以内に限り、解約が可能です。30日経過後は3年契約となり、原則解約はできません。</p>
        </details>
        <details class="faq-item sr d2">
          <summary>故障した場合はどうなりますか？</summary>
          <p>故意の故障と特約条件を除き、故障した場合は新品に交換保証いたします。3年間の安心補償が付いています。</p>
        </details>
        <details class="faq-item sr d3">
          <summary>解約時の家電はどうなりますか？</summary>
          <p>ご解約の際は「ご自身で廃棄」か「保護団体への寄付」をご選択いただけます。寄付を選択された方には別途寄付方法をご案内いたします。</p>
        </details>
        <details class="faq-item sr">
          <summary>各種アイテムの買い切りはできますか？</summary>
          <p>当サービスでは各種アイテムの買い切りは行っておりません。猫の負担を考え、契約期間中の家電チェンジによる負担・ストレスを軽減するため、同品目の家電については特例を除き新品とお取り替えする補償をお付けしております。</p>
        </details>
      </div>
    </div>
  </section>

  <section id="cta">
    <div class="cta-in">
      <div class="sr">
        <div class="cta-lbl">START</div>
        <h2 class="cta-h2">まずは無料で<br>お試しください。</h2>
        <p class="cta-body">それぞれの飼育状況に合わせたアレンジも可能です。無料Web面談でご相談ください。</p>
      </div>
      <div class="cta-btns sr d2">
        <a class="btn-w magnetic" href="https://nyanhothomecare.com/" target="_blank" rel="noopener">プランを選ぶ</a>
        <a class="btn-i magnetic" href="contact.html">無料相談をする</a>
      </div>
    </div>
  </section>
</main>`;

  buildPage('homecare.html', bodyContent, 'hc_top');
}

// ────────────────────────────────────────
// 全ページ生成
// ────────────────────────────────────────
console.log('\n🏗️  HTML 生成開始\n');

buildIndex();
buildContentPage('about.html',        'about',        'ConnectPetについて',          '01 — ABOUT');
buildContentPage('service.html',      'index',        'サービス一覧',                '02 — SERVICES');
buildContentPage('carestore.html',    'carestore',    'にゃんほっと',                '03 — CARESTORE');
buildContentPage('carestore-cat.html','carestore_cat','保護猫を迎える',               '03 — ADOPTION');
buildHomecare();
buildContentPage('contact.html',      'contact',      'お問い合わせ',                '06 — CONTACT');

// シンプルな legal / privacy / news
['legal','privacy','news'].forEach(id => {
  const map = { legal:'特定商取引法', privacy:'プライバシーポリシー', news:'ニュース' };
  buildContentPage(`${id}.html`, id, map[id], id.toUpperCase());
});

console.log('\n✅ 全ページ生成完了');
console.log('→', OUT_DIR, '\n');
