# セキュリティガイド

## 環境変数の管理

### 重要事項

このプロジェクトでは、APIキーと機密情報を環境変数で管理しています。

### ファイル構成

- `.env.local` - 実際のAPIキーを含む（**Gitにコミットしない**）
- `.env.example` - テンプレートファイル（Gitにコミット可）

### 保護されているファイル

以下のファイルは`.gitignore`に追加されており、Gitにコミットされません：

```
.env.local
.env*.local
```

### 環境変数一覧

#### Firebase設定
- `NEXT_PUBLIC_FIREBASE_API_KEY` - Firebase API Key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` - Firebase Auth Domain
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID` - Firebase Project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` - Firebase Storage Bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` - Firebase Messaging Sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID` - Firebase App ID
- `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` - Firebase Measurement ID

#### Gemini AI設定
- `NEXT_PUBLIC_GEMINI_API_KEY` - Google Gemini API Key

## セキュリティベストプラクティス

### 1. APIキーの保護

- 絶対に`.env.local`ファイルをGitにコミットしない
- APIキーをコード内にハードコーディングしない
- 公開リポジトリにプッシュする前に、機密情報が含まれていないか確認

### 2. APIキーが漏洩した場合

万が一、APIキーが漏洩した場合は、直ちに以下の手順を実行してください：

#### Firebase APIキー
1. [Firebase Console](https://console.firebase.google.com/)にアクセス
2. プロジェクトを選択
3. プロジェクト設定 > 一般 タブ
4. ウェブアプリを削除して再作成

#### Gemini API Key
1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. 漏洩したAPIキーを削除
3. 新しいAPIキーを作成
4. `.env.local`を更新

### 3. 本番環境への展開

本番環境では、以下のサービスを使用して環境変数を管理してください：

- **Vercel**: 環境変数の設定画面から追加
- **Netlify**: Site settings > Environment variables
- **Heroku**: Config Varsから設定
- **Firebase Hosting**: Firebase CLI経由で設定

### 4. チーム開発

チームで開発する場合：

1. `.env.example`ファイルをリポジトリにコミット
2. 各開発者が`.env.example`をコピーして`.env.local`を作成
3. 機密情報は安全なパスワードマネージャーで共有
4. Slackやメールで機密情報を送らない

### 5. Firebase Security Rules

Firestoreのセキュリティルールを適切に設定してください：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 読み取りは全員許可、書き込みは認証済みユーザーのみ
    match /municipalities/{municipality} {
      allow read: if true;
      allow write: if request.auth != null;
      
      match /areas/{area} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
    
    match /garbageItems/{item} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 6. 定期的な監査

- 定期的にFirebaseコンソールでアクセスログを確認
- 不審なアクティビティがないかチェック
- 使用していないAPIキーは削除

## トラブルシューティング

### 環境変数が読み込まれない

1. `.env.local`ファイルが正しい場所にあるか確認（プロジェクトのルートディレクトリ）
2. ファイル名が正確か確認（スペースや余分な文字がないか）
3. 開発サーバーを再起動（環境変数の変更は再起動が必要）

```bash
# 開発サーバーを停止して再起動
npm run dev
```

### Next.jsで環境変数が undefined になる

- クライアントサイドでアクセスする変数には `NEXT_PUBLIC_` プレフィックスが必要
- サーバーサイドのみで使用する変数にはプレフィックス不要

## 参考リンク

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Firebase Security](https://firebase.google.com/docs/rules)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)

