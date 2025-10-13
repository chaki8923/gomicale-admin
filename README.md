# ごみカレ 管理画面

React Nativeアプリケーションgomicaleのごみ収集データをFirestoreに登録・管理するためのNext.js管理画面です。

## 機能

- 市町村・地域の登録と管理
- ごみ分別品目の登録と管理
- PDFからのAI自動抽出（Gemini 2.0 Flash Exp）
- サンプルデータの移行

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`をコピーして`.env.local`を作成し、実際の値を設定してください。

```bash
cp .env.example .env.local
```

`.env.local`を開いて、FirebaseとGemini APIの設定を記入します。

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## 使い方

### 1. サンプルデータの移行（初回のみ）

1. ダッシュボードから「データ移行」を選択
2. 「データを移行」ボタンをクリック
3. 渋谷区のサンプルデータがFirestoreに登録されます

### 2. 市町村の登録

1. ダッシュボードから「市町村管理」を選択
2. 「新規追加」ボタンから市町村を追加
3. 「地域管理」ボタンから各地域の収集スケジュールを設定

### 3. ごみ分別品目の登録

1. ダッシュボードから「ごみ分別管理」を選択
2. 市町村を選択
3. 「新規追加」ボタンから品目を追加
   - 品目名、分別カテゴリー、説明、具体例を入力

### 4. PDFからの自動抽出

1. ダッシュボードから「PDF一括インポート」を選択
2. 市町村を選択
3. PDFファイルをアップロード
4. 「AIで解析」ボタンをクリック
5. 抽出されたデータを確認・編集
6. 「データを保存」でFirestoreに保存

## Firestore Security Rules の設定

`firestore.rules` ファイルをFirebaseコンソールからデプロイしてください。

```bash
# Firebase CLIを使用する場合
firebase deploy --only firestore:rules
```

または、Firebaseコンソールから手動でコピー＆ペーストしてください。

## 技術スタック

- Next.js 15.x
- React
- TypeScript
- Firebase (Firestore)
- Tailwind CSS
- Google Generative AI (Gemini)

## ファイル構成

```
gomicale-admin/
├── app/
│   ├── page.tsx                        # ダッシュボード
│   ├── municipalities/
│   │   ├── page.tsx                    # 市町村一覧
│   │   └── [id]/areas/page.tsx         # 地域管理
│   ├── garbage-items/page.tsx          # ごみ分別管理
│   ├── pdf-import/page.tsx             # PDF一括インポート
│   └── data-migration/page.tsx         # データ移行
├── lib/
│   ├── firebase.ts                     # Firebase設定
│   └── gemini.ts                       # Gemini API連携
└── firestore.rules                     # Firestore Security Rules
```

## 注意事項

- 本番環境では、Firebase Authenticationを使用して管理者のみがアクセスできるように設定することを推奨します
- APIキーは環境変数で管理することを推奨します
- PDFの解析精度はPDFの形式によって異なります
# gomicale-admin
