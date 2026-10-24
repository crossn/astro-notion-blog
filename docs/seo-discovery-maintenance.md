# SEO公開基盤の保守記録（2026-10-24）

## 依頼と調査範囲

依頼は、最初にread-onlyで現状を調べ、必要性を確認できた小さな保守を専用ブランチで修正・検証し、Draft PRを1件作ること。merge・本番deploy・Cloudflare設定変更・記事公開・Notion更新は行わない。

- Repository: `crossn/astro-notion-blog`
- 調査時main: `4789b9b37fae10a23ef6459c1401a08d662f6908`（remoteとGitHub APIで照合）
- 開始時: `work`ブランチ、未コミット変更なし。新規ブランチ: `fix/seo-discovery-foundation`
- Open PR: 0件。#17はmerge済み（`ce5c993d858db3867a40fa463480c1aa42e7b3b8`）。#18もmerge済み（現在のmain）。未マージPRとの重複なし。既存の刷新・保守ブランチには変更を加えていない。
- mainのCloudflare Pages checkはsuccess。本番HTMLに刷新後のHome・共通header・OGPを確認。ただし、checkの成功だけでは現在配信中の完全なcommit一致は証明できない。Notionの記事数も過去の9件から現在の12件へ増えているため、mainだけを本番状態と見なしていない。
- Astroはpackage.jsonとlockでは5系（実行時5.18.2）。AGENTS.mdの3系表記は古い。検証は指定のNode 22.16.0 / npm 10.8.2で実行。

Notion設計書 [tsukurun-Lab Site Refresh｜Concept 2026](https://app.notion.com/p/3e6d5238b58c81a49bdff2a5a8a2fdf4?pvs=204) を取得できた。取得結果の最終編集日時は2026-10-11 03:17 JST。既存URL・RSS・Notion静的生成・Like/Signals契約の維持と、過去のfallback課題を確認した。「PR #17 Open」等の履歴記載は現時点のGitHubとは異なるため、現在のPR状態にはGitHubを採用した。

## 公開HTTPとコードの調査結果

2026-10-24 13:35〜13:39 JSTにGETで再確認。以前の調査結果の転記ではない。

| 対象 | 公開サイトでの結果 | mainの実装 |
| --- | --- | --- |
| `/robots.txt` | 200 / `text/html`、Homeと本文SHA-256一致 | ファイル・endpointなし |
| `/sitemap.xml`, `/sitemap-index.xml` | 200 / `text/html`、Homeと本文SHA-256一致 | sitemap integration・生成処理なし |
| `/seo-audit-missing-20261024`, `/blog/seo-audit-missing-20261024` | 200 / Home HTML、canonicalはHome | 404ページ・独自catch-all・redirect設定なし。FunctionsはAPIのみ |
| Home | 200、ページ固有description、canonical / og:url / og:imageは本番domain | Layoutの既存SEO設定 |
| Blog | `/blog`から`/blog/`へ転送、200。canonical / og:urlは`/blog` | description未指定のためサイト共通の英語文 |
| RSSに掲載された全12記事 | 全件200。canonical / OGPは本番domain、各descriptionあり。OGP画像全12件200 / image/png | `getAllPosts()`がPublished=trueかつDate<=現在を取得し静的生成 |
| 既存記事URL | 例: `/blog/notion-codex-skill-sync` → 308 → 同URLに末尾`/` → 200 | canonicalとRSSのlinkは末尾`/`なし |
| `/rss.xml`, `/feed` | 各200、XML解析成功・各12 items・本文一致。前者はapplication/xml、後者はapplication/octet-stream | 同一GETを再利用。公開記事のみ |
| Preview | 既存 `phase-5f-review.tsukurun-lab.pages.dev` のHome応答で`X-Robots-Tag: noindex` | siteはCloudflareのbranchにより本番/Preview/localへ分岐 |

Homeとfallbackの本文SHA-256: `500b0860a54cf23f58fb2bd9c5e2ab6b4a7bbd43c1225380d9a3225202d85756`。

Home・Blog・全12記事のcanonical / OGPとRSSにlocalhost・pages.devの混入なし。刷新記事の本文にはPreviewへの参照があるが、SEOメタデータへの混入ではない。

404の原因は、トップレベル`404.html`がない場合に未知のパスへrootを返す[Cloudflare Pagesの標準SPA動作](https://developers.cloudflare.com/pages/configuration/serving-pages/#single-page-application-spa-rendering)と一致する。リポジトリと生成物に404.htmlがなく、実際の応答も一致する。Cloudflare管理画面の全ルールは閲覧していないため、追加の配信設定の有無までは断定しない。404修正は未知のURL全体の挙動に関わるため別課題にした。

### Search Console

公開HTMLとrepoに`google-site-verification`は見つからず、公開DNSのapex TXT問い合わせにも検証用TXTは返らなかった。既存GAタグは本番HTMLに存在する。GA等を利用した別の所有権確認はあり得るため、この結果からSearch Console未連携とは断定できない。管理画面/API接続がなく、property・所有権・サイトマップ送信・検索実績は未確認。新しいログイン、権限変更、GA設定変更はしていない。

## 選定と実装

sitemap / robotsの不足を1件の独立した保守として対応する。既存ページ・記事・デザイン・APIの変更なしで追加でき、新規ランニングコストもない。

- `astro.config.mjs`: 標準`@astrojs/sitemap`を本番Cloudflare mainビルドでのみ有効化。静的生成されたHome / Blog / 記事 / tag / paginationを自動収録する。serializeで既存canonicalの末尾スラッシュ規則に合わせる。routeやredirectは変更しない。
- `src/pages/robots.txt.ts`: 本番mainはAllowと実際に生成する`/sitemap-index.xml`を記載。Preview / localはDisallow、Sitemap行なし。
- `package.json`, `package-lock.json`: `@astrojs/sitemap@3.7.4`を固定追加。間接依存はsitemap / zod / arg / SAX型等。sitemapの要件によりlock内の`@types/node`が18系から24系へ解決され、undici-typesも追加された。Node実行環境のバージョンは変更しない。sitemapのNode>=20.19.5 / npm>=10.8.2要件を満たす環境で検証した。
- `tests/fixtures/notion-seo.mjs`: Notion SDKのrequestをテスト時のみ置き換えるオフラインfixture。公開12記事、下書き1件、未来日付1件。実際のgetAllPostsがPublished/Date条件を渡すことをassertし、その結果から既存ルートを生成する。実Notionへ接続しない。
- `tests/verify-seo-discovery.py`: XML、URL集合、公開/未公開、robots、metadata、RSS、変更前後の比較を標準ライブラリで検証。
- この作業記録。

独自XML endpointを作る代替案も検討したが、XML処理とルート収集の独自保守が増えるため、Astro標準integrationを選択した。既存RSSをsitemapとして流用していない。

本番判定は既存配信方式に合わせて`CF_PAGES`が設定済み、かつ`CF_PAGES_BRANCH=main`。本番domainは既存`site`設定を再利用する。Previewにはサイトマップを生成せず、既存Cloudflareのnoindexヘッダーを変更しない。robotsはアクセス制御ではなく、検索結果からの完全な除外を保証するものでもない。

## 検証結果

- `npm ci`: PASS（713 packages）。既存依存の非推奨警告あり。
- `npm run lint`: PASS。
- `npm run build`: PASS。実Notion未設定でもHome / Blog / RSS / robotsを生成できる。
- `git diff --check`: PASS。
- Viteの500KB超chunk警告は変更前から存在。

| ローカルビルド条件 | 結果 |
| --- | --- |
| 本番main + 公開12件fixture | 8検証PASS。sitemap index / urlsetをXML解析。17ページのcanonical集合と一致。12記事収録、draft / future除外、本番domainのみ |
| Preview + 同fixture | 7 PASS / baseline比較1 skip。sitemapファイルなし、robotsはDisallow、Sitemap行なし |
| local + 同fixture | 7 PASS / baseline比較1 skip。同様に公開用sitemapなし |
| local + Notion未設定 | 7 PASS / baseline比較1 skip。記事0件でもbuild成功 |
| 本番main + Notion未設定 | 7 PASS / baseline比較1 skip。Home / Blogのsitemap生成、記事0件でもbuild成功 |

構成別集計は36成功・4意図的skip（比較用baselineは本番fixtureの1構成だけに適用）。本番fixtureでは変更前に保存した全17ページHTMLと`/feed`・`/rss.xml`が、変更後とバイト単位で一致した。Home、一覧、記事詳細、tag / pagination、既存12 slugの出力を維持した。

本番条件で作ったdistを`npm run preview`で配信し、ローカルHTTPでrobots.txtが200 / text/plainで正しい本文、sitemap-index.xmlが200 / text/xmlで返ることも確認。実際のCloudflare上での今回の変更のHTTP応答は未確認。公開サイト調査の結果と、変更後ローカルビルドの結果を混同しない。

### 再実行

Node 22.16.0 / npm 10.8.2、Python 3を使用。テストfixtureは本文を含む実Notionデータの再現ではない。

```bash
npm ci
npm run lint
npm run build
python3 tests/verify-seo-discovery.py --mode local --site http://localhost:4321 --articles 0

CF_PAGES=1 CF_PAGES_BRANCH=main CF_PAGES_URL=https://test.tsukurun-lab.pages.dev \
  NODE_OPTIONS='--import ./tests/fixtures/notion-seo.mjs' npm run build
python3 tests/verify-seo-discovery.py --mode production --site https://tsukurun-lab.com

CF_PAGES=1 CF_PAGES_BRANCH=seo-review CF_PAGES_URL=https://seo-review.tsukurun-lab.pages.dev \
  NODE_OPTIONS='--import ./tests/fixtures/notion-seo.mjs' npm run build
python3 tests/verify-seo-discovery.py --mode preview --site https://seo-review.tsukurun-lab.pages.dev

env -u CF_PAGES -u CF_PAGES_BRANCH -u CF_PAGES_URL \
  NODE_OPTIONS='--import ./tests/fixtures/notion-seo.mjs' npm run build
python3 tests/verify-seo-discovery.py --mode local --site http://localhost:4321

git diff --check
```

変更前比較を再現する場合は、main SHAの独立checkoutにfixtureだけをコピーして同じ本番fixture条件でbuildし、distを別の場所へ保存する。変更後の検証に`--baseline /path/to/before-dist`を渡す。fixtureを通常のCloudflareビルドへ設定しない。

## 未対応・Human Review

- 404/soft-404: 別PRで404ページとCloudflare配信を検証する。
- Blog固有description、canonicalと308の末尾slash整合、`/feed`のContent-Type: 既存挙動を維持。別検討。
- Search Console: 人間が既存propertyの所有権・送信状況を確認し、将来の本番反映後にsitemapを送信するか判断する。
- 実Notion認証を用いた最新記事全件のビルド、今回のCloudflare Preview HTTP、本番HTTP、non-root BASE_PATHは未確認。fixture検証を実データ検証と表現しない。
- 人間は依存追加と本番branch判定をレビューし、Previewでrobots / noindex、将来本番でsitemap indexと実記事収録を確認する。
- 記事本文、Notion構造、GA、Like、Signals、D1、Worker、Cron、Secret、本番Cloudflare設定は変更しない。merge / 本番deployは別途承認事項。

## Blog記事化用の事実記録

記事候補: 「AIに新機能を作らせるより、面倒な保守をPRまで任せる方が効くかも」。記事本文の作成・公開とNotion更新は行っていない。

- 最初の指示: read-only調査から、小さな保守の選定、実装、検証、Draft PRと事実記録まで。既存刷新作業と本番環境を守る。
- 発見: robots / sitemapのURLが200でも実体はHome HTML。未知のslugも同様。RSSとSEOメタデータは概ね機能し、公開記事は12件。
- Codexの提案と実施: sitemap標準integrationと環境別robotsを追加。404は別課題とし、既存のSEOメタデータ・配信・本文を変更しない。
- 修正のやり直し: 機能実装案の差し替え0回。追加した検証は初回成功。レビュー中に整形を調整した。
- 調査時の復旧: Python requestsが未導入、続くurllibが403となったため、既存のcurlで取得する方式へ2回切り替え。追加パッケージや新規ログインは不要だった。
- Git操作の停止と復旧: 初回pushがGitHubのGH007（private email保護）で拒否された。GitHub APIでユーザーlogin / IDを確認し、未公開commitのauthor / committerをnoreplyメールへ変更して再試行した。アカウントのメール公開設定・global Git設定は変更していない。実装のやり直しとは別のGitメタデータ修正1回。
- 作業が止まった点: ユーザー判断待ちの停止なし。実Notion認証とSearch Console接続がない部分は、未確認と明示して独立した検証を進めた。
- Codexだけで完了: repo/PR/仕様/HTTPの照合、スコープ選定、専用branch、実装、fixture、build比較、Draft PRの準備と作成。
- 人間の指示・判断: 今回の依頼と制約が作業範囲を定義した。作業途中の追加判断は求めていない。merge、配信後の確認、Search Consoleの状態・送信判断は人間に残る。
- 自動検証で確認: XMLの構造、生成ルートとcanonicalの一致、公開条件、domain、robots、RSS、fixtureでの変更前後の出力一致。
- 自動検証で未確認: 実Notion最新データ、今回のCloudflare配信、検索登録・検索順位・流入増加、実利用時のLike/Signals。本PRはSEO効果の測定結果を含まない。
- PR完成までの技術的blocker: なし。実データ・配信確認はレビュー項目として残す。
- 作業開始: 2026-10-24 13:34:15 JST。最終検証完了: 13:42:16 JST（clockツールの差分8分1秒、commit / push / PR作成の時間は含まない）。利用token・料金・人間の作業時間は未計測。

## PR #19 第三者レビュー対応（2026-10-24）

### 追加変更と検証

既存ESLint / Buildを維持し、同じCI workflowへ`SEO (production)` / `SEO (preview)`のmatrixを追加した。実NotionのSecretは参照しない。各ジョブでnpm ci後、NODE_OPTIONSで既存fixtureを読み込み、CF_PAGES=1・branch=mainまたはseo-reviewでbuildし、既存のPython検証を実行する。

fixtureにはHTTP / HTTPSのrequest / getとglobal fetchを拒否するガードを追加した。SDKのrequest置換で想定外の呼び出しも拒否する。テストデータに画像・外部埋込はなく、build中の実Notionアクセスは不要。Node標準モジュールのnamed exportにもガードを反映する。インストール用ネットワークはnpm ciの段階に限り必要であり、実Notionへの認証・接続とは分ける。

ローカルのNode 22.16.0 / npm 10.8.2でnpm ci・lint・通常buildが成功。本番相当 / Preview相当は各7成功・baseline比較1 skip（既存の変更前後比較は今回再実施しない）。HTTP / HTTPS / fetchの拒否も個別に確認。新しいGitHub CIの結果はPR本文とチャットの完了報告へ記録する。サイト実装、canonical、RSS、記事URL、package-lockは今回変更しない。

### URL正規化の調査（read-only）

再確認した本番の`/blog`、`/blog/notion-codex-skill-sync`、`/blog/tag/AI`、`/blog/page/2`は、末尾`/`付きへ308。Blogと記事の転送先は200。

Astroではbuild.formatの上書きがなく、既定のdirectory形式で`blog/<slug>/index.html`等を生成する。一方、`pathJoin`は空のpath要素を除去するため、getPostLink / getTagLink / getPageLink等は末尾slashなしを返す。Layoutも受け取ったpathからcanonical / og:urlを生成し、Blog / tag / paginationのpathは直接slashなしで指定される。本PRのsitemap serializeもその既存canonicalに合わせている。独自_redirectsはrepoにない。

[Cloudflare Pagesの配信仕様](https://developers.cloudflare.com/pages/configuration/serving-pages/)ではdirectory indexの正規配信URLを`/about/`として説明しており、生成形式・実HTTPと一致する。Cloudflare管理画面の追加ルールは閲覧できていないため、その不存在までは断定しない。

Googleの説明では[redirectとrel=canonicalは強いシグナル、sitemapは弱いシグナル](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)。[308は永続転送として転送先の正規化を示す](https://developers.google.com/search/docs/crawling-indexing/301-redirects)。現在はredirectがslashあり、canonical / sitemapがslashなしを示しており、シグナルが競合する。Googleが指定canonicalを採用しない可能性や余分な転送はあるが、実際の採用URLや順位・流入への影響はSearch Console未接続のため未確認。ペナルティや順位低下は断定しない。

別PRでは**現在200を返す末尾slashありをHTMLページの正規URLとする**ことを推奨する。slashなしを選ぶ場合は、Astroの出力形式やCloudflareの配信・redirectの再設計が必要になるため範囲が広い。

別PRの変更候補:

- HTMLページ専用のURL正規化を導入し、Layoutのcanonical / og:url、Home / Blog / article / tag / paginationの内部リンクを揃える。pathJoinを一律変更するとassetやAPIにも波及するため避ける。navのactive判定も回帰確認する。
- sitemap serializeのslash除去を見直し、canonical集合・200最終URLとの一致を検証する。
- RSS linkをslashありへ揃える場合、`@astrojs/rss`がlinkからguidも生成することに注意する。既存guidを明示的に維持する方法を検証し、購読者への重複配信を防ぐ。`/feed`・`/rss.xml`というfeed自体のURLは維持する。
- 旧slashなしURLの308継続と、転送ループがないことを確認する。slug、Notionデータ、Like/Signalsのslug key、API・assetのURLは変えない。
- タグの日本語エンコード、query/hash、Preview/local、BASE_PATH、RSS guid、全HTML内部リンクを対象に回帰確認する。404は引き続き別課題とする。

### PreviewとProduction branchの確認範囲

調査時のPR head `ab0751a432c437536a156d1d16425adeb1d89cfa`にはESLint / Buildの成功checkだけがあり、Cloudflare check・Preview案内コメントはない。GitHub deployment APIもbranch指定・SHA指定とも0件だった。

`fix-seo-discovery-foundation.tsukurun-lab.pages.dev`という候補aliasへread-onlyで問い合わせたが、Home / sitemap-index.xmlは404。robots.txtだけは200 / text/plainでCloudflareのContent Signalsの説明を返し、アプリのDisallowを確認する応答ではなかった。候補aliasをPR #19のPreviewと認定しない。**PRに紐づくPreviewは発見できず、要求された3つのHTTP確認は未確認**。手動deployは実施しない。

mainには過去のCloudflare Pages成功checkがあるが、これはProduction branchの現在の設定値を証明しない。利用可能なCloudflare connector / runtime credentialがなく、Production branch設定は未確認。人間レビューでCloudflare PagesのProduction branch=mainを確認する必要がある。

### @types/nodeの影響評価

追加したsitemap@9.0.1が`@types/node ^24.9.2`を要求し、lockでは24.19.2へdedupeされている。npm lsではsitemapだけでなくvite / @types/node-fetchもこの型を参照する。

これはTypeScriptの型定義の変更であり、Node実行環境を24へ変更するものではない。アプリのNode 22.16.0 / npm 10.8.2でinstall / lint / buildは成功している。現在のCIに独立したtypecheckはなく、Astro buildは完全な型検証を代替しない。将来Node 24専用APIを誤って型上利用可能と扱うリスクは残る。必要なら別の依存整理でプロジェクト用@types/nodeを22系へ明示し、sitemap用24系をnestedにする案を検討する。今回の軽微なCI追加ではlockや依存を再変更しない。
