#!/bin/bash
# =====================================================
# ConnectPet スクレイパー + HTML生成 — 1コマンド実行
# 
# 使い方:
#   cd ~/Desktop/clients/connectpet/scraper
#   chmod +x run.sh
#   ./run.sh
# =====================================================

set -e

echo ""
echo "🐱 ConnectPet サイト自動構築スクリプト"
echo "========================================"
echo ""

# Step 1: npm install
echo "📦 パッケージをインストール中..."
npm install --silent

# Step 2: Playwright ブラウザインストール
echo "🌐 Chromiumをインストール中（初回のみ数分かかります）..."
npx playwright install chromium

# Step 3: スクレイピング
echo ""
echo "🔍 connectpet.jp + nyanhothomecare.com をスクレイピング中..."
echo "   （各ページ約5〜10秒かかります）"
echo ""
node scrape.js

# Step 4: HTML生成
echo ""
echo "🏗️  HTMLファイルを生成中..."
node generate.js

# Step 5: 共通ファイルをコピー
echo ""
echo "📁 共通ファイルをコピー中..."
cp common.css ../common.css
cp common.js  ../common.js

echo ""
echo "✅ 完了！"
echo ""
echo "生成されたファイル:"
echo "  ~/Desktop/clients/connectpet/"
ls -la ../scraper-output/*.html 2>/dev/null | awk '{print "  " $NF}' || echo "  （scraper-output/ フォルダを確認してください）"
echo ""
echo "次のステップ:"
echo "  1. ファイルをCursorで開いて確認"
echo "  2. git push → Vercel自動デプロイ"
echo ""
