# AGENTS.md

## プロジェクト概要

このプロジェクトは、tukurun-Lab のサイトを育てるための Astro 製Webサイトです。  
もともとは `otoyo/astro-notion-blog` を取り込んだ構成で、NotionデータベースをBlog記事のソースとして利用できます。

現在の主な目的は以下です。

- tukurun-Lab らしい雰囲気のTOPページを育てる
- Notionテンプレートや小さなツールを紹介する
- SUZURIで販売中のテンプレートへの導線を整える
- 将来的にBlog記事や販売導線を少しずつ拡張する

## 技術スタック

- Astro 3系
- React 18
- TypeScript / Astro components
- Notion API
- Cloudflare Pages
- npm

## 実行環境

- Node.js は `22.16.0` を前提にする
- npm は 10系を前提にする
- package manager は npm に統一する
- `yarn.lock` は使用しない
- Cloudflare Pages は Build system version 3 を想定する

Cloudflare Pages の基本設定は以下を想定する。

- Install command: `npm ci`
- Build command: `npm run build`
- Build output directory: `dist`
- Node.js: `22.16.0`

## 基本ルール

- 回答・説明・コミットメッセージ案は日本語を基本にする
- 作業前に、何を変更するかを簡潔に説明する
- 既存のデザインや文章の温度感を大きく崩さない
- tukurun-Lab の雰囲気として、「自分らしさ」「無理なく少しずつ」「楽しみながらつくる」を大切にする
- 押しつけがましい表現、上から目線の表現、売り込み感が強すぎる表現は避ける
- 不明点があり、判断によって方向性が大きく変わる場合は確認する
- 小さく安全に直せるものは、合理的な仮定を置いて進めてよい

## デザイン・コンテンツ方針

- TOPページは、Notionテンプレートの販売ページというより「tukurun-Labの入口」として扱う
- SUZURIへの導線は置くが、過度に販売感を出さない
- Stripeなど未実装の構想は、実装前にTOPで強く出さない
- 見出しの改行位置は日本語として自然な意味の切れ目を重視する
- テンプレート画像は情報が切れないよう、原則 `object-fit: contain` 寄りで扱う
- 画像サムネイルは見切れよりも、余白や背景で整える方向を優先する

## Notion連携

Blog連携に使う主な環境変数は以下。

```env
NOTION_API_SECRET=
DATABASE_ID=
```

Notionデータベースの想定プロパティは以下。

- `Page` : Title
- `Slug` : Rich text
- `Date` : Date
- `Published` : Checkbox
- `Tags` : Multi-select
- `Excerpt` : Rich text
- `FeaturedImage` : Files & media
- `Rank` : Number

`NOTION_API_SECRET` と `DATABASE_ID` が未設定でも、TOPページだけはビルドできる状態を維持する。

## 秘密情報の扱い

- `.env` は編集・表示・コミットしない
- APIキー、Notionトークン、シークレット情報を出力しない
- `.env.example` には値を入れず、キー名だけを書く
- Git操作前には `.env` が `git status` に出ていないことを確認する

## 変更時の注意

- 不要なライブラリを勝手に追加しない
- npm と yarn を混在させない
- `package-lock.json` を正とする
- Cloudflare Pages v3 でのビルドを意識する
- Astroのメジャーバージョンを上げる場合は、公式integrationも合わせて確認する
- `astro.config.mjs` の互換設定は、見た目の差分を抑えるために慎重に扱う

## 確認コマンド

通常の確認。

```bash
npm run build
```

ローカル表示確認。

```bash
npm run dev
```

本番ビルド後に近い確認。

```bash
npm run build
npm run preview
```

Git確認。

```bash
git status --short
git diff --stat
```

## Git運用メモ

- コミット前に `git status --short` を確認する
- `.env` が表示されたらコミットしない
- コミットメッセージは日本語でよい
- 例: `TOPページを刷新しAstro 3へ移行`

## 現在の方向性メモ

- TOPコピーは「毎日に、自分らしさを少しずつ。」を基調にしている
- Aboutでは、Notion初心者だった頃の戸惑いを忘れず、少しずつ触れて自分に合う形を見つけるニュアンスを大切にする
- テンプレートカードは、画像を見切らず、プレートに載せるように表示する
- Blogはまだ空でもよく、Notion設定後に少しずつ育てる
