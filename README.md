# ConnectPet Website

保護猫の幸せな未来をつなぐ - ConnectPet公式ウェブサイト

## 概要

ConnectPetは、保護猫の譲渡、ケアストア、ホームケアサービスを提供する会社のウェブサイトです。

## 特徴

- 📱 完全レスポンシブデザイン（スマホ対応）
- 🎨 紺（#0a0e1a）とオレンジ（#ff8c42）のカラースキーム
- ✨ GSAPを使用した滑らかなアニメーション
- 📰 JavaScript配列で管理されるニュースシステム
- 🚀 Vercelでのデプロイ対応

## ページ構成

- `index.html` - トップページ
- `about.html` - 会社概要
- `service.html` - サービス紹介
- `carestore.html` - ケアストア
- `homecare.html` - ホームケアサービス
- `news.html` - お知らせ（JavaScript配列で管理）
- `contact.html` - お問い合わせフォーム
- `legal.html` - 特定商取引法に基づく表記
- `privacy.html` - プライバシーポリシー

## 技術スタック

- HTML5
- CSS3（カスタムプロパティ使用）
- JavaScript（ES6+）
- GSAP（アニメーション）
- Vercel（ホスティング）

## ローカル開発

```bash
# リポジトリをクローン
git clone https://github.com/takayawada/connectpet-website.git

# ディレクトリに移動
cd connectpet-website

# ローカルサーバーで開く（例：Live Server、Python、Node.jsなど）
python -m http.server 8000
# または
npx serve
```

ブラウザで `http://localhost:8000` を開く

## デプロイ

Vercelへのデプロイ：

```bash
# Vercel CLIをインストール（初回のみ）
npm install -g vercel

# デプロイ
vercel
```

## ニュースの管理

ニュース記事は `js/main.js` の `newsData` 配列で管理されています。新しいニュースを追加するには：

```javascript
const newsData = [
  {
    date: '2026.05.15',
    category: 'お知らせ',
    title: 'タイトル',
    content: '本文'
  },
  // 新しいニュースを追加
];
```

## ライセンス

© 2026 ConnectPet. All rights reserved.
