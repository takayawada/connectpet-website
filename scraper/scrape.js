/**
 * ConnectPet + NyanhotHomeCare — Full Content Scraper
 * 
 * 使い方:
 *   cd ~/Desktop/clients/connectpet/scraper
 *   npm install
 *   npx playwright install chromium
 *   node scrape.js
 * 
 * 出力:
 *   content.json  ← 全テキスト・画像URL
 *   images/       ← ダウンロードされた画像
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');
const https = require('https');
const http  = require('http');
const url   = require('url');

// ────────────────────────────────────────
// スクレイプ対象ページ
// ────────────────────────────────────────
const PAGES = [
  // ConnectPet
  { id: 'index',         site: 'connectpet',  url: 'https://connectpet.jp/' },
  { id: 'about',         site: 'connectpet',  url: 'https://connectpet.jp/about' },
  { id: 'carestore',     site: 'connectpet',  url: 'https://connectpet.jp/carestore' },
  { id: 'carestore_cat', site: 'connectpet',  url: 'https://connectpet.jp/carestore/cat' },
  { id: 'homecare',      site: 'connectpet',  url: 'https://connectpet.jp/homecare' },
  { id: 'contact',       site: 'connectpet',  url: 'https://connectpet.jp/contact' },
  // NyanhotHomeCare
  { id: 'hc_top',        site: 'homecare',    url: 'https://nyanhothomecare.com/' },
  { id: 'hc_plan1',      site: 'homecare',    url: 'https://nyanhothomecare.com/plan/1' },
  { id: 'hc_plan2',      site: 'homecare',    url: 'https://nyanhothomecare.com/plan/2' },
  { id: 'hc_plan3',      site: 'homecare',    url: 'https://nyanhothomecare.com/plan/3' },
  { id: 'hc_faq',        site: 'homecare',    url: 'https://nyanhothomecare.com/faq' },
];

const OUT_DIR    = path.join(__dirname, '..', 'scraper-output');
const IMG_DIR    = path.join(OUT_DIR, 'images');
const RESULT_FILE = path.join(OUT_DIR, 'content.json');

// ────────────────────────────────────────
// ユーティリティ
// ────────────────────────────────────────
function mkdirSafe(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sanitizeFilename(str) {
  return str.replace(/[^a-zA-Z0-9_\-\.]/g, '_').replace(/_{2,}/g, '_').slice(0, 80);
}

function downloadImage(imgUrl, destDir) {
  return new Promise((resolve) => {
    try {
      const parsed   = new url.URL(imgUrl);
      const ext      = path.extname(parsed.pathname) || '.jpg';
      const filename = sanitizeFilename(parsed.pathname.replace(/\//g, '_')) + ext;
      const dest     = path.join(destDir, filename);

      if (fs.existsSync(dest)) { resolve(filename); return; }

      const proto = parsed.protocol === 'https:' ? https : http;
      const file  = fs.createWriteStream(dest);

      proto.get(imgUrl, { timeout: 10000 }, (res) => {
        if (res.statusCode === 200) {
          res.pipe(file);
          file.on('finish', () => { file.close(); resolve(filename); });
        } else {
          file.close();
          fs.unlink(dest, () => {});
          resolve(null);
        }
      }).on('error', () => { fs.unlink(dest, () => {}); resolve(null); });

    } catch (e) { resolve(null); }
  });
}

// ────────────────────────────────────────
// ページコンテンツ抽出（ブラウザ内で実行）
// ────────────────────────────────────────
async function extractContent(page, pageId) {
  return await page.evaluate((pid) => {

    // 非表示・装飾要素を除外するセレクター
    const SKIP = ['script','style','noscript','head','svg','canvas',
                  'path','circle','rect','defs','symbol','use'];

    function isVisible(el) {
      const st = window.getComputedStyle(el);
      if (st.display === 'none' || st.visibility === 'hidden' || st.opacity === '0') return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 || r.height > 0;
    }

    function cleanText(t) {
      return (t || '').replace(/\s+/g, ' ').trim();
    }

    // ─── テキストブロック収集 ───
    const sections = [];
    const seen     = new Set();

    document.querySelectorAll(
      'h1,h2,h3,h4,h5,h6,p,li,a[href],button,span,div,label,td,th'
    ).forEach(el => {
      if (SKIP.includes(el.tagName.toLowerCase())) return;
      if (!isVisible(el)) return;

      const txt = cleanText(el.innerText || el.textContent);
      if (!txt || txt.length < 2 || seen.has(txt)) return;

      // div/span は子テキストノードのみ（子要素のテキストを重複させない）
      if (['DIV','SPAN'].includes(el.tagName)) {
        let directText = '';
        el.childNodes.forEach(n => {
          if (n.nodeType === Node.TEXT_NODE) directText += n.textContent;
        });
        directText = cleanText(directText);
        if (!directText || directText.length < 3) return;
        if (seen.has(directText)) return;
        seen.add(directText);
        sections.push({ tag: el.tagName.toLowerCase(), text: directText });
        return;
      }

      seen.add(txt);
      const entry = { tag: el.tagName.toLowerCase(), text: txt };
      if (el.tagName === 'A' && el.href) entry.href = el.href;
      sections.push(entry);
    });

    // ─── 画像収集 ───
    const images = [];
    const imgSeen = new Set();

    document.querySelectorAll('img').forEach(img => {
      const src = img.src || img.getAttribute('src') || '';
      if (!src || imgSeen.has(src)) return;
      if (src.startsWith('data:')) return; // base64 除外
      imgSeen.add(src);
      images.push({
        src,
        alt: cleanText(img.alt),
        width:  img.naturalWidth  || img.width  || 0,
        height: img.naturalHeight || img.height || 0,
      });
    });

    // background-image も収集
    document.querySelectorAll('*').forEach(el => {
      const bg = window.getComputedStyle(el).backgroundImage;
      if (!bg || bg === 'none') return;
      const m = bg.match(/url\(["']?([^"')]+)["']?\)/g);
      if (!m) return;
      m.forEach(u => {
        const imgUrl = u.replace(/url\(["']?|["']?\)/g, '');
        if (!imgUrl || imgUrl.startsWith('data:') || imgSeen.has(imgUrl)) return;
        imgSeen.add(imgUrl);
        images.push({ src: imgUrl, alt: '', width: 0, height: 0, isBg: true });
      });
    });

    // ─── メタ情報 ───
    const getMeta = (name) =>
      (document.querySelector(`meta[name="${name}"]`) ||
       document.querySelector(`meta[property="${name}"]`))?.content || '';

    return {
      pageId:      pid,
      url:         window.location.href,
      title:       document.title,
      description: getMeta('description') || getMeta('og:description'),
      ogImage:     getMeta('og:image'),
      sections,
      images,
    };
  }, pageId);
}

// ────────────────────────────────────────
// メイン
// ────────────────────────────────────────
(async () => {
  mkdirSafe(OUT_DIR);
  mkdirSafe(IMG_DIR);

  console.log('\n🐱 ConnectPet Scraper 起動\n');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
               '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1440, height: 900 },
    locale: 'ja-JP',
  });

  const allData = {};

  for (const target of PAGES) {
    console.log(`📄 Scraping: ${target.url}`);
    const page = await context.newPage();

    try {
      await page.goto(target.url, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });

      // JSレンダリング待機（Studio.Design 対応）
      await page.waitForTimeout(2500);

      // スクロールして lazy-load 画像を取得
      await page.evaluate(async () => {
        await new Promise(resolve => {
          let total = 0;
          const timer = setInterval(() => {
            window.scrollBy(0, 300);
            total += 300;
            if (total > document.body.scrollHeight) { clearInterval(timer); resolve(); }
          }, 100);
        });
      });
      await page.waitForTimeout(1000);

      const data = await extractContent(page, target.id);

      // 画像ダウンロード
      console.log(`  → ${data.sections.length}テキスト, ${data.images.length}画像`);
      let downloadCount = 0;

      for (const img of data.images) {
        if (!img.src.startsWith('http')) continue;
        // 小さいサイズ・アイコンは除外（width/height が指定されている場合）
        if (img.width > 0 && img.width < 50 && img.height < 50) continue;

        const filename = await downloadImage(img.src, IMG_DIR);
        if (filename) {
          img.localFile = `images/${filename}`;
          downloadCount++;
        }
      }
      console.log(`  → ${downloadCount}枚ダウンロード完了`);

      allData[target.id] = data;

    } catch (err) {
      console.error(`  ❌ エラー: ${err.message}`);
      allData[target.id] = { pageId: target.id, url: target.url, error: err.message };
    }

    await page.close();
  }

  await browser.close();

  // 結果を保存
  fs.writeFileSync(RESULT_FILE, JSON.stringify(allData, null, 2), 'utf8');
  console.log(`\n✅ 完了! → ${RESULT_FILE}`);

  // サマリー表示
  console.log('\n📊 収集サマリー:');
  Object.entries(allData).forEach(([id, d]) => {
    if (d.error) {
      console.log(`  ❌ ${id}: ${d.error}`);
    } else {
      const imgCount = (d.images || []).filter(i => i.localFile).length;
      console.log(`  ✅ ${id}: ${(d.sections||[]).length}テキスト / ${imgCount}画像`);
    }
  });

  console.log('\n次のステップ:');
  console.log('  content.json をこのチャットに貼り付けてください');
  console.log('  または scraper-output/ フォルダを共有してください\n');

})();
