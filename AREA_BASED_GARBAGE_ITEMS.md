# エリアごとのごみ分別品目管理

## 📋 概要

ごみ分別品目（garbageItems）の管理を、都道府県単位からエリア単位に変更しました。
これにより、各エリアごとに異なるごみの出し方や注意点を登録・管理できるようになりました。

## 🔄 変更内容

### 1. Firestoreデータ構造の変更

#### 変更前
```
garbageItems/{itemId}
  - municipalityId: "..."
  - name_ja: "..."
  - category: "..."
  - description_ja: "..."
  - examples_ja: [...]
```

#### 変更後
```
municipalities/{prefectureId}/areas/{areaId}/garbageItems/{itemId}
  - name_ja: "..."
  - name_en: "..." (オプション)
  - category: "..."
  - description_ja: "..."
  - description_en: "..." (オプション)
  - examples_ja: [...]
  - examples_en: [...] (オプション)
```

**メリット:**
- エリアごとに異なるごみの出し方を登録可能
- 多言語対応
- データの階層構造が明確

### 2. アプリ側の変更

#### `src/data/garbageData.js`

**修正前:**
```javascript
export const fetchGarbageClassification = async (municipalityId) => {
  const q = query(
    collection(db, 'garbageItems'),
    where('municipalityId', '==', municipalityId)
  );
  // ...
}
```

**修正後:**
```javascript
export const fetchGarbageClassification = async (municipalityId, areaId) => {
  const garbageItemsSnapshot = await getDocs(
    collection(db, 'municipalities', municipalityId, 'areas', areaId, 'garbageItems')
  );
  // ...
}
```

#### `src/screens/SearchScreen.js`

**変更点:**
- 都道府県IDとエリアIDの両方を取得
- エリアが選択されていない場合は空配列を表示

```javascript
const prefectureId = await AsyncStorage.getItem('selectedPrefectureId');
const areaId = await AsyncStorage.getItem('selectedAreaId');

if (prefectureId && areaId) {
  const items = await fetchGarbageClassification(prefectureId, areaId);
  setGarbageClassification(items);
}
```

### 3. 管理画面の変更

#### `app/data-migration/page.tsx`

**変更点:**
- ごみ分別品目を各エリアのサブコレクションとして保存
- JSONインポート時に、すべてのエリアに同じgarbageItemsを登録

```typescript
// エリアのIDを保存
const areaIds: string[] = [];
for (const jsonArea of jsonData.areas) {
  const areaRef = await addDoc(
    collection(db, 'municipalities', municipalityId, 'areas'), 
    areaData
  );
  areaIds.push(areaRef.id);
}

// 各エリアにgarbageItemsを追加
for (const areaId of areaIds) {
  for (const item of jsonData.garbageItems) {
    await addDoc(
      collection(db, 'municipalities', municipalityId, 'areas', areaId, 'garbageItems'), 
      itemData
    );
  }
}
```

#### 新規ページ: `app/municipalities/[id]/areas/[areaId]/garbage-items/page.tsx`

エリアごとのごみ分別品目を管理する専用ページを作成しました。

**機能:**
- ✅ ごみ分別品目の一覧表示
- ✅ 新規追加（日本語・英語の両方）
- ✅ 削除
- ✅ カテゴリー選択（13種類に対応）
- ✅ 多言語入力フォーム

**アクセス方法:**
1. 都道府県一覧 → エリア管理
2. 各エリアの「分別品目」ボタンをクリック

#### `app/municipalities/[id]/areas/page.tsx`

**変更点:**
- 各エリアに「分別品目」ボタンを追加
- ごみ分別品目管理ページへのリンク

## 🎯 使用方法

### 管理画面での操作

#### 方法1: JSONインポート（一括登録）

1. `/data-migration` ページにアクセス
2. 都道府県を選択
3. 以下の形式のJSONファイルをアップロード：

```json
{
  "areas": [
    {
      "name": "上広瀬地区",
      "name_en": "Kami-Hirose District",
      "monthlySchedules": [...]
    }
  ],
  "garbageItems": [
    {
      "name_ja": "ペットボトル",
      "name_en": "PET Bottles",
      "category": "pet_bottles",
      "description_ja": "キャップとラベルを外して出してください",
      "description_en": "Remove cap and label before disposal",
      "examples_ja": ["飲料用ペットボトル"],
      "examples_en": ["Beverage bottles"]
    }
  ]
}
```

4. 「Firestoreにインポート」をクリック
5. すべてのエリアに同じgarbageItemsが登録されます

#### 方法2: 個別登録（エリアごとに異なる内容）

1. `/municipalities` → 都道府県を選択
2. エリア管理画面で対象エリアの「分別品目」をクリック
3. 新規追加フォームで以下を入力：
   - 品目名（日本語・英語）
   - カテゴリー
   - 出し方・説明（日本語・英語）
   - 具体例（日本語・英語）
4. 「追加」をクリック

### アプリでの確認

1. gomicaleアプリを起動
2. ホーム画面で都道府県とエリアを選択
3. 「検索」タブ（SearchScreen）をタップ
4. 登録したごみ分別品目が表示されます
5. 言語を切り替えると、英語版の情報が表示されます

## 📊 対応カテゴリー

全13種類のカテゴリーに対応：

1. 🔥 燃やすごみ (`burnable`)
2. 🚫 燃やさないごみ (`nonBurnable`)
3. ♻️ 資源ごみ (`recyclable`)
4. 🍶 びん (`bottles`)
5. 🥫 かん (`cans`)
6. 📦 容器包装プラスチック (`plastics`)
7. 🧴 ペットボトル (`pet_bottles`)
8. 📰 古布・紙類 (`paper_and_cloth`)
9. ⚠️ 危険・有害ごみ (`hazardous_and_dangerous`)
10. 🛢️ 家庭廃食用油 (`cooking_oil`)
11. ♻️ びん・缶・小型電化製品 (`bottles_and_cans`)
12. 📦 資源物 (`resources`)
13. 🍶 金属・陶器・ガラス (`metal_pottery_glass`)

## 🔍 データの流れ

```
管理画面
  ↓
Firestore: municipalities/{prefectureId}/areas/{areaId}/garbageItems/{itemId}
  ↓
fetchGarbageClassification(prefectureId, areaId)
  ↓
SearchScreen（アプリ）
```

## ⚠️ 移行手順（既存データがある場合）

既存のgarbageItemsコレクションからエリアベースへ移行する場合：

### ステップ1: データのバックアップ
```javascript
// 既存データをエクスポート（Firebaseコンソールまたはスクリプト）
```

### ステップ2: 新しい構造でインポート
1. data-migrationページでJSONファイルをインポート
2. または、個別に各エリアに登録

### ステップ3: 古いデータの削除
```javascript
// 古いgarbageItemsコレクションを削除（必要に応じて）
```

## 💡 ヒント

### エリアごとに異なる出し方を登録したい場合

同じ都道府県内でも、エリアによってごみの出し方が異なる場合：

1. 各エリアの「分別品目」ページで個別に登録
2. エリアAでは「ペットボトルはキャップ付きでOK」
3. エリアBでは「ペットボトルはキャップを外す」

### すべてのエリアで同じ出し方の場合

JSONインポートを使用すると、全エリアに同じ内容が一括登録されます。
その後、必要に応じて個別エリアで編集可能です。

### 多言語対応

- 日本語フィールド（`*_ja`）は必須
- 英語フィールド（`*_en`）はオプション
- 英語フィールドがない場合は、日本語がフォールバックとして使用されます

## 🚀 今後の拡張

- [ ] ごみ分別品目の編集機能
- [ ] ごみ分別品目のコピー機能（エリア間）
- [ ] 画像アップロード機能
- [ ] 分別検索の高度化（タグ、キーワード）
- [ ] 統計・分析機能

## 📚 関連ドキュメント

- [MULTILINGUAL.md](../../gomicale/MULTILINGUAL.md) - 多言語化の詳細
- [IMPORT_JSON_FORMAT.md](./IMPORT_JSON_FORMAT.md) - JSONインポート形式
- [AI_PROMPT_FOR_PDF.md](../../gomicale/AI_PROMPT_FOR_PDF.md) - PDFからJSON生成

