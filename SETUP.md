# セットアップガイド

このドキュメントでは、ごみカレ管理画面とReact Nativeアプリの初回セットアップ手順を説明します。

## 前提条件

- Node.js (v18以上)
- Firebaseプロジェクト（gomicale-23a9c）が作成済み
- Firestoreが有効化されている

## 1. 管理画面のセットアップ

### 1.1 依存関係のインストール

```bash
cd /Users/chakiryou/Desktop/gomicale-admin
npm install
```

### 1.2 環境変数の設定

`.env.example`をコピーして`.env.local`を作成し、実際の値を設定します。

```bash
cp .env.example .env.local
```

`.env.local`を編集して、以下の値を設定してください：

```
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### 1.3 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

### 1.4 Firestore Security Rulesの設定

1. Firebaseコンソール (https://console.firebase.google.com/) にアクセス
2. プロジェクト `gomicale-23a9c` を選択
3. 左メニューから「Firestore Database」を選択
4. 「ルール」タブをクリック
5. `firestore.rules` の内容をコピー＆ペースト
6. 「公開」ボタンをクリック

または、Firebase CLIを使用：

```bash
# Firebase CLIのインストール（未インストールの場合）
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクトの初期化（既存プロジェクトを選択）
firebase init firestore

# Rulesのデプロイ
firebase deploy --only firestore:rules
```

### 1.5 初期データの移行

1. 管理画面 http://localhost:3000 にアクセス
2. 「データ移行」を選択
3. 「データを移行」ボタンをクリック
4. 渋谷区のサンプルデータがFirestoreに登録されます

## 2. React Nativeアプリのセットアップ

### 2.1 依存関係のインストール

```bash
cd /Users/chakiryou/Desktop/gomicale
npm install
```

### 2.2 環境変数の設定

`.env.example`をコピーして`.env`を作成し、実際のFirebase設定を記入します。

```bash
cp .env.example .env
```

`.env`を編集して、以下の値を設定してください：

```
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
```

### 2.3 アプリの起動

#### iOSの場合

```bash
npm run ios
```

#### Androidの場合

```bash
npm run android
```

#### Expo Goを使用する場合

```bash
npm start
```

QRコードをスキャンしてExpo Goアプリで開きます。

### 2.4 地域の選択

1. アプリ起動後、市町村と地域を選択するモーダルが表示されます
2. 「渋谷区」の中から地域を選択（例: 渋谷1丁目）
3. 選択した地域のごみ収集スケジュールが表示されます

## 3. 新しい市町村の追加

### 3.1 管理画面での登録

1. 管理画面で「市町村管理」を選択
2. 「新規追加」をクリック
3. 都道府県と市町村名を入力
4. 「追加」をクリック

### 3.2 地域と収集スケジュールの設定

1. 追加した市町村の「地域管理」をクリック
2. 「新規追加」をクリック
3. 地域名を入力（例: ○○1丁目）
4. 各ごみカテゴリーの収集曜日を選択
   - 燃やすごみ
   - 燃やさないごみ
   - 資源ごみ
   - びん・缶
5. 「追加」をクリック

### 3.3 ごみ分別品目の登録

1. 管理画面で「ごみ分別管理」を選択
2. 市町村を選択
3. 「新規追加」をクリック
4. 品目情報を入力
   - 品目名（例: ペットボトル）
   - 分別カテゴリー
   - 出し方の説明
   - 具体例
5. 「追加」をクリック

## 4. PDFからの自動抽出（推奨）

市町村のごみ収集案内PDFがある場合、AIで自動抽出できます。

### 4.1 PDF一括インポート

1. 管理画面で「PDF一括インポート」を選択
2. 市町村を選択
3. PDFファイルをアップロード
4. 「AIで解析」をクリック
5. 抽出されたデータを確認・編集
6. 「データを保存」をクリック

### 4.2 注意事項

- PDFの形式によって抽出精度が異なります
- 抽出後は必ず内容を確認してください
- 誤りがある場合は手動で編集できます

## 5. トラブルシューティング

### Firestoreへの接続エラー

- Firebase設定が正しいか確認してください
  - `gomicale-admin/lib/firebase.ts`
  - `gomicale/src/config/firebase.js`
- FirestoreがFirebaseコンソールで有効化されているか確認してください

### データが表示されない

- 管理画面からデータが正しく登録されているか確認してください
- Firestore Security Rulesが正しく設定されているか確認してください
- ブラウザの開発者ツール（Console）でエラーを確認してください

### React Nativeアプリが起動しない

```bash
# キャッシュのクリア
npm start -- --clear

# 依存関係の再インストール
rm -rf node_modules
npm install
```

## 6. 本番環境への移行

### 6.1 Firebase Authentication の設定（推奨）

本番環境では、管理画面へのアクセスを認証で保護することを推奨します。

1. Firebaseコンソールで「Authentication」を有効化
2. 管理画面にログイン機能を追加
3. Security Rulesで認証チェックを追加

### 6.2 環境変数の使用

APIキーは環境変数で管理することを推奨します（既に実装済み）。

**重要なセキュリティ注意事項：**
- `.env.local`（管理画面）と`.env`（React Nativeアプリ）は絶対にGitにコミットしないでください
- これらのファイルは`.gitignore`に追加されています
- 本番環境では、環境変数を環境変数管理サービス（Vercel、Heroku等）で管理してください
- APIキーが漏洩した場合は、すぐにFirebaseコンソールとGoogle Cloud Consoleで無効化してください

Next.jsの場合（既に設定済み）：
- `.env.local` ファイルで環境変数を管理
- `NEXT_PUBLIC_` プレフィックスでクライアントサイドからアクセス可能

React Nativeの場合（既に設定済み）：
- `.env` ファイルで環境変数を管理
- `app.config.js`で読み込み、`expo-constants`経由でアクセス

## サポート

問題が発生した場合は、以下を確認してください：
- Firebaseコンソールのログ
- ブラウザの開発者ツール（Console）
- React Native Metro bundlerのログ

