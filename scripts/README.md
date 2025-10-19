# Firestore データ登録スクリプト

## 📋 概要

このディレクトリには、Firestoreにデータを登録するためのスクリプトが含まれています。

## 🚀 使用方法

### 1. 環境設定

#### Firebase Admin SDK の認証情報を設定

**方法A: サービスアカウントキーを使用（推奨）**

1. Firebase Console → プロジェクト設定 → サービスアカウント
2. 「新しい秘密鍵の生成」をクリック
3. ダウンロードしたJSONファイルを安全な場所に保存
4. 環境変数を設定：

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

**方法B: プロジェクトルートに配置**

1. サービスアカウントキーを `gomicale-admin/serviceAccountKey.json` として保存
2. `.gitignore` に追加されていることを確認

### 2. 依存関係のインストール

```bash
cd gomicale-admin
npm install firebase-admin
```

### 3. スクリプトの実行

#### 47都道府県を登録

```bash
# 基本の実行（既存データは保持）
node scripts/seed-prefectures.js

# 既存データを削除してから登録
node scripts/seed-prefectures.js --clear
```

## 📝 スクリプト詳細

### `seed-prefectures.js`

47都道府県を日本語名と英語名の両方でFirestoreに登録します。

#### データ構造

```json
{
  "prefecture": "東京都",
  "prefecture_en": "Tokyo",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

#### 機能

- ✅ 47都道府県の一括登録
- ✅ 重複チェック（同じ都道府県名が既に存在する場合はスキップ）
- ✅ タイムスタンプの自動設定
- ✅ エラーハンドリング
- ✅ 進捗状況の表示

#### オプション

- `--clear`: 既存データを削除してから登録（確認プロンプトあり）

#### 登録される都道府県

| 日本語 | 英語 |
|--------|------|
| 北海道 | Hokkaido |
| 青森県 | Aomori |
| 岩手県 | Iwate |
| ... | ... |
| 沖縄県 | Okinawa |

（全47都道府県）

## ⚠️ 注意事項

### セキュリティ

- **サービスアカウントキーは絶対にGitにコミットしないでください**
- `.gitignore` に以下を追加：
  ```
  serviceAccountKey.json
  *-serviceAccountKey.json
  ```

### 実行環境

- Node.js 14以上が必要
- Firebase Admin SDK がインストールされている必要があります

### データの保護

- `--clear` オプションは慎重に使用してください
- 本番環境で実行する前に、必ずバックアップを取ってください

## 🔧 トラブルシューティング

### エラー: "Firebase初期化エラー"

**原因**: 認証情報が設定されていない

**解決策**:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"
```

### エラー: "Permission denied"

**原因**: サービスアカウントに適切な権限がない

**解決策**:
1. Firebase Console → IAM と管理
2. サービスアカウントに「Cloud Datastore ユーザー」ロールを付与

### エラー: "Module not found: firebase-admin"

**解決策**:
```bash
npm install firebase-admin
```

## 📦 パッケージの追加

`package.json` に以下を追加（まだない場合）:

```json
{
  "scripts": {
    "seed:prefectures": "node scripts/seed-prefectures.js",
    "seed:prefectures:clear": "node scripts/seed-prefectures.js --clear"
  },
  "dependencies": {
    "firebase-admin": "^12.0.0"
  }
}
```

その後、以下のコマンドで実行可能：

```bash
npm run seed:prefectures
npm run seed:prefectures:clear
```

## 🎯 今後の拡張

### 追加予定のスクリプト

- `seed-sample-areas.js` - サンプルエリアデータの登録
- `seed-sample-garbage-items.js` - サンプルごみ分別データの登録
- `backup-firestore.js` - Firestoreデータのバックアップ
- `restore-firestore.js` - バックアップからの復元

## 💡 ヒント

### スクリプトの実行ログを保存

```bash
node scripts/seed-prefectures.js > logs/seed-$(date +%Y%m%d-%H%M%S).log 2>&1
```

### 本番環境での実行

```bash
# 本番環境の認証情報を使用
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/production-serviceAccountKey.json"
node scripts/seed-prefectures.js
```

### 開発環境での実行

```bash
# 開発環境の認証情報を使用
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/development-serviceAccountKey.json"
node scripts/seed-prefectures.js --clear
```

