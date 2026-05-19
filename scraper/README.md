# ConnectPet サイト自動構築スクリプト

## これは何？

`connectpet.jp` と `nyanhothomecare.com` から
テキスト・画像を自動取得して、全HTMLファイルを生成します。

## 必要なもの

- Node.js 18以上
- npm

## 1コマンドで全部できる

```bash
cd ~/Desktop/clients/connectpet/scraper
chmod +x run.sh
./run.sh
```

## 個別実行

```bash
# 1. インストール
npm install
npx playwright install chromium

# 2. スクレイピング（コンテンツ取得）
node scrape.js
# → scraper-output/content.json が生成される
# → scraper-output/images/ に画像がダウンロードされる

# 3. HTML生成
node generate.js
# → scraper-output/*.html が生成される
# → common.css / common.js もコピー
```

## 生成されるファイル

```
scraper-output/
├── content.json       ← 全サイトのテキスト・画像URL
├── images/            ← ダウンロードされた画像
├── index.html
├── about.html
├── service.html
├── carestore.html
├── carestore-cat.html
├── homecare.html      ← nyanhothomecare.com の内容
├── news.html
├── contact.html
├── legal.html
└── privacy.html

common.css             ← 共通スタイル
common.js              ← 共通JS (Lenis/GSAP/ScrollTrigger)
```

## デプロイ

```bash
# scraper-output/ の中身を connectpet/ に移動して
git add .
git commit -m "feat: スクレイピングベースの新サイト"
git push
# → Vercel が自動デプロイ
```

## 注意

- 初回はChromiumのダウンロードで数分かかります
- 各ページのスクレイピングに5〜10秒かかります（合計約2分）
- connectpet.jp は Studio.Design 製のため JS レンダリングが必要
  → Playwright (Chromium) で解決済み
