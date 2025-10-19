# 47都道府県データの登録方法

## 🚀 クイックスタート

### 1. 必要なパッケージをインストール

```bash
cd gomicale-admin
npm install
```

### 2. Firebase認証情報を設定

#### 方法A: 環境変数を使用（推奨）

1. Firebase Console を開く
   - https://console.firebase.google.com/
   - プロジェクトを選択

2. サービスアカウントキーを生成
   - ⚙️ (設定) → プロジェクトの設定
   - 「サービスアカウント」タブ
   - 「新しい秘密鍵の生成」をクリック
   - JSONファイルがダウンロードされます

3. 環境変数を設定

**Mac/Linux:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"
```

**Windows (PowerShell):**
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\your\serviceAccountKey.json"
```

**永続的に設定する場合:**
```bash
# ~/.bashrc または ~/.zshrc に追加
echo 'export GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/serviceAccountKey.json"' >> ~/.zshrc
source ~/.zshrc
```

#### 方法B: プロジェクトルートに配置

1. ダウンロードしたJSONファイルを `gomicale-admin/serviceAccountKey.json` として保存
2. スクリプトが自動的に検出します
3. ⚠️ **絶対にGitにコミットしないでください**（.gitignoreに追加済み）

### 3. スクリプトを実行

#### 基本の実行（既存データを保持）

```bash
npm run seed:prefectures
```

または

```bash
node scripts/seed-prefectures.js
```

#### 既存データを削除してから登録

```bash
npm run seed:prefectures:clear
```

または

```bash
node scripts/seed-prefectures.js --clear
```

## 📊 実行結果の例

```
🚀 47都道府県の登録を開始します...

✅ 登録準備: 北海道 (Hokkaido)
✅ 登録準備: 青森県 (Aomori)
✅ 登録準備: 岩手県 (Iwate)
...
✅ 登録準備: 沖縄県 (Okinawa)

✨ 完了！合計 47 件の都道府県を登録しました！

📊 現在の municipalities コレクション: 47 件
```

## 🎯 登録されるデータ

### データ構造

```json
{
  "prefecture": "東京都",
  "prefecture_en": "Tokyo",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z"
}
```

### 全都道府県リスト

| 地域 | 都道府県 | 英語表記 |
|------|----------|----------|
| 北海道 | 北海道 | Hokkaido |
| 東北 | 青森県 | Aomori |
| 東北 | 岩手県 | Iwate |
| 東北 | 宮城県 | Miyagi |
| 東北 | 秋田県 | Akita |
| 東北 | 山形県 | Yamagata |
| 東北 | 福島県 | Fukushima |
| 関東 | 茨城県 | Ibaraki |
| 関東 | 栃木県 | Tochigi |
| 関東 | 群馬県 | Gunma |
| 関東 | 埼玉県 | Saitama |
| 関東 | 千葉県 | Chiba |
| 関東 | 東京都 | Tokyo |
| 関東 | 神奈川県 | Kanagawa |
| 中部 | 新潟県 | Niigata |
| 中部 | 富山県 | Toyama |
| 中部 | 石川県 | Ishikawa |
| 中部 | 福井県 | Fukui |
| 中部 | 山梨県 | Yamanashi |
| 中部 | 長野県 | Nagano |
| 中部 | 岐阜県 | Gifu |
| 中部 | 静岡県 | Shizuoka |
| 中部 | 愛知県 | Aichi |
| 近畿 | 三重県 | Mie |
| 近畿 | 滋賀県 | Shiga |
| 近畿 | 京都府 | Kyoto |
| 近畿 | 大阪府 | Osaka |
| 近畿 | 兵庫県 | Hyogo |
| 近畿 | 奈良県 | Nara |
| 近畿 | 和歌山県 | Wakayama |
| 中国 | 鳥取県 | Tottori |
| 中国 | 島根県 | Shimane |
| 中国 | 岡山県 | Okayama |
| 中国 | 広島県 | Hiroshima |
| 中国 | 山口県 | Yamaguchi |
| 四国 | 徳島県 | Tokushima |
| 四国 | 香川県 | Kagawa |
| 四国 | 愛媛県 | Ehime |
| 四国 | 高知県 | Kochi |
| 九州 | 福岡県 | Fukuoka |
| 九州 | 佐賀県 | Saga |
| 九州 | 長崎県 | Nagasaki |
| 九州 | 熊本県 | Kumamoto |
| 九州 | 大分県 | Oita |
| 九州 | 宮崎県 | Miyazaki |
| 九州 | 鹿児島県 | Kagoshima |
| 沖縄 | 沖縄県 | Okinawa |

## ✨ 機能

- ✅ **重複チェック**: 既に存在する都道府県はスキップ
- ✅ **バッチ処理**: 効率的な一括登録
- ✅ **エラーハンドリング**: 問題が発生した場合も適切に処理
- ✅ **進捗表示**: リアルタイムで登録状況を確認
- ✅ **タイムスタンプ**: 作成日時と更新日時を自動記録

## ⚠️ トラブルシューティング

### エラー: "Firebase初期化エラー"

**原因**: 認証情報が正しく設定されていません

**解決策**:
1. 環境変数が正しく設定されているか確認
   ```bash
   echo $GOOGLE_APPLICATION_CREDENTIALS
   ```
2. JSONファイルのパスが正しいか確認
3. JSONファイルの内容が破損していないか確認

### エラー: "Module not found: firebase-admin"

**解決策**:
```bash
npm install
```

### エラー: "Permission denied"

**原因**: サービスアカウントに十分な権限がありません

**解決策**:
1. Firebase Console → IAM と管理
2. サービスアカウントに以下のロールを付与:
   - `Cloud Datastore ユーザー`
   - または `Firebase Admin SDK 管理者サービス エージェント`

### 既に登録済みのデータがある場合

スクリプトは自動的に重複をチェックします：

```
⚠️  既に 47 件のデータが存在します。
既存のデータを保持したまま、新しいデータを追加します。

⏭️  スキップ: 東京都 は既に登録されています
```

完全に再登録したい場合:
```bash
npm run seed:prefectures:clear
```

## 🔐 セキュリティに関する注意

### やってはいけないこと ❌

- ❌ サービスアカウントキーをGitにコミット
- ❌ サービスアカウントキーをSlack/Discord等で共有
- ❌ サービスアカウントキーをパブリックな場所に公開

### やるべきこと ✅

- ✅ サービスアカウントキーは安全な場所に保管
- ✅ `.gitignore` に追加されていることを確認
- ✅ 環境変数を使用
- ✅ 使用しなくなったキーは削除

## 📚 次のステップ

1. ✅ **都道府県を登録** ← いまここ
2. 各都道府県の「エリア管理」からエリアを登録
3. `/data-migration` ページでJSONファイルをインポート
4. アプリで確認

## 💡 参考情報

- [Firebase Admin SDK のドキュメント](https://firebase.google.com/docs/admin/setup)
- [Firestore のドキュメント](https://firebase.google.com/docs/firestore)
- [サービスアカウントについて](https://cloud.google.com/iam/docs/service-accounts)

