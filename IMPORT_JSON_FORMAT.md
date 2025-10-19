# データインポート用JSON形式（多言語対応）

## 📋 概要

data-migrationページで使用できるJSONファイルの形式を説明します。
日本語のみ、または日英両言語のデータをインポートできます。

## 🌍 多言語対応

### 対応フィールド

#### エリアデータ
- `name`: エリア名（日本語）- **必須**
- `name_en`: エリア名（英語）- オプション

#### ごみ分別品目
- `name` または `name_ja`: 品目名（日本語）- **必須**
- `name_en`: 品目名（英語）- オプション
- `description` または `description_ja`: 説明（日本語）- **必須**
- `description_en`: 説明（英語）- オプション
- `examples` または `examples_ja`: 例（日本語）- **必須**
- `examples_en`: 例（英語）- オプション

### 互換性

以下の両方の形式をサポートしています：

1. **従来形式**（日本語のみ）
   ```json
   {
     "name": "もやすごみ",
     "description": "収集日当日の朝8時までに出してください",
     "examples": ["生ごみ", "紙おむつ"]
   }
   ```

2. **多言語形式**（日英両対応）
   ```json
   {
     "name_ja": "もやすごみ",
     "name_en": "Burnable Waste",
     "description_ja": "収集日当日の朝8時までに出してください",
     "description_en": "Put out by 8:00 AM on collection day",
     "examples_ja": ["生ごみ", "紙おむつ"],
     "examples_en": ["Food waste", "Diapers"]
   }
   ```

## 📝 JSON形式

### 基本構造

```json
{
  "areas": [
    {
      "name": "エリア名",
      "name_en": "Area Name",
      "monthlySchedules": [
        {
          "month": "2025-04",
          "schedule": {
            "category_key": [1, 8, 15, 22, 29]
          }
        }
      ]
    }
  ],
  "garbageItems": [
    {
      "name_ja": "品目名",
      "name_en": "Item Name",
      "category": "category_key",
      "description_ja": "説明",
      "description_en": "Description",
      "examples_ja": ["例1", "例2"],
      "examples_en": ["Example 1", "Example 2"]
    }
  ]
}
```

### カテゴリーキー

以下の標準カテゴリーキーを使用してください：

| カテゴリーキー | 日本語名 | 英語名 |
|--------------|---------|--------|
| `burnable` | 燃やすごみ | Burnable Waste |
| `nonBurnable` | 燃やさないごみ | Non-Burnable Waste |
| `recyclable` | 資源ごみ | Recyclables |
| `bottles` | びん | Bottles |
| `cans` | かん | Cans |
| `plastics` | 容器包装プラスチック | Plastic Containers |
| `pet_bottles` | ペットボトル | PET Bottles |
| `paper_and_cloth` | 古布・紙類 | Paper & Cloth |
| `hazardous_and_dangerous` | 危険・有害ごみ | Hazardous Waste |
| `cooking_oil` | 家庭廃食用油 | Cooking Oil |
| `bottles_and_cans` | びん・缶・小型電化製品 | Bottles, Cans & Small Appliances |
| `resources` | 資源物 | Resources |
| `metal_pottery_glass` | 金属・陶器・ガラス | Metal, Pottery & Glass |

## 📄 完全なサンプル（多言語対応）

```json
{
  "areas": [
    {
      "name": "上広瀬、広瀬台、下広瀬、広瀬、広瀬東、つつじ野、根岸、笹井地区",
      "name_en": "Kami-Hirose, Hirose-dai, Shimo-Hirose, Hirose, Hirose-Higashi, Tsutsujino, Negishi, Sasai District",
      "monthlySchedules": [
        {
          "month": "2025-04",
          "schedule": {
            "burnable": [1, 4, 8, 11, 15, 18, 22, 25, 29],
            "nonBurnable": [23],
            "plastics": [3, 10, 17, 24],
            "pet_bottles": [9],
            "bottles_and_cans": [7, 21],
            "paper_and_cloth": [14, 28]
          }
        },
        {
          "month": "2025-05",
          "schedule": {
            "burnable": [2, 6, 9, 13, 16, 20, 23, 27, 30],
            "nonBurnable": [28],
            "plastics": [1, 8, 15, 22, 29],
            "pet_bottles": [14],
            "bottles_and_cans": [5, 19],
            "paper_and_cloth": [12, 26]
          }
        }
      ]
    }
  ],
  "garbageItems": [
    {
      "name_ja": "もやすごみ",
      "name_en": "Burnable Waste",
      "category": "burnable",
      "description_ja": "収集日当日の朝8時までに出してください。生ごみは水分を切ってください。",
      "description_en": "Put out by 8:00 AM on collection day. Drain water from food waste.",
      "examples_ja": [
        "生ごみ",
        "食用油",
        "紙おむつ"
      ],
      "examples_en": [
        "Food waste",
        "Cooking oil",
        "Diapers"
      ]
    },
    {
      "name_ja": "ペットボトル",
      "name_en": "PET Bottles",
      "category": "pet_bottles",
      "description_ja": "PETマークのあるものに限ります。キャップとラベルを外して、中をすすいでください。",
      "description_en": "Only bottles with PET mark. Remove cap and label, rinse inside.",
      "examples_ja": [
        "飲料用・酒類用",
        "醤油・みりん用"
      ],
      "examples_en": [
        "Beverages, Alcoholic drinks",
        "Soy sauce, Mirin"
      ]
    },
    {
      "name_ja": "びん・缶・小型電化製品",
      "name_en": "Bottles, Cans and Small Appliances",
      "category": "bottles_and_cans",
      "description_ja": "スプレー缶、乾電池、小型電化製品は、それぞれ別袋で出してください。",
      "description_en": "Put spray cans, dry batteries, and small appliances in separate bags.",
      "examples_ja": [
        "飲料用・食品用等のびん・缶",
        "スプレー缶",
        "乾電池",
        "小型電化製品"
      ],
      "examples_en": [
        "Bottles and cans for beverages and food",
        "Spray cans",
        "Dry batteries",
        "Small appliances"
      ]
    }
  ]
}
```

## 📄 従来形式のサンプル（日本語のみ）

従来の形式も引き続き使用できます。この場合、`name`、`description`、`examples`は自動的に`name_ja`、`description_ja`、`examples_ja`として保存されます。

```json
{
  "areas": [
    {
      "name": "上広瀬地区",
      "monthlySchedules": [
        {
          "month": "2025-04",
          "schedule": {
            "burnable": [1, 8, 15, 22, 29],
            "recyclable": [5, 12, 19, 26]
          }
        }
      ]
    }
  ],
  "garbageItems": [
    {
      "name": "もやすごみ",
      "category": "burnable",
      "description": "収集日当日の朝8時までに出してください",
      "examples": ["生ごみ", "紙おむつ"]
    }
  ]
}
```

## 🔄 データの自動変換

インポート時、以下の自動変換が行われます：

### エリア名
- `name` フィールドは常に必須
- `name_en` があれば、英語名として保存

### ごみ分別品目
- `name` → `name_ja`（`name_ja`がない場合）
- `description` → `description_ja`（`description_ja`がない場合）
- `examples` → `examples_ja`（`examples_ja`がない場合）
- 多言語フィールド（`*_en`）があれば、そのまま保存

## ✅ インポート手順

1. **都道府県を選択**
   - `/municipalities`ページで事前に登録

2. **JSONファイルを作成**
   - 上記の形式に従ってJSONを作成
   - UTF-8エンコーディングで保存

3. **data-migrationページでインポート**
   - JSONファイルを選択
   - プレビューで確認
   - 「Firestoreにインポート」をクリック

4. **アプリで確認**
   - gomicaleアプリを起動
   - 言語を切り替えて表示を確認

## 💡 ヒント

### 地名の英語表記
- 区名や地区名はローマ字表記が推奨
  - 例: 「渋谷区」→ "Shibuya"
  - 例: 「上広瀬地区」→ "Kami-Hirose District"
- 複数の地名を列挙する場合は、カンマで区切る
  - 例: "Kami-Hirose, Hirose-dai, Shimo-Hirose District"

### 品目名の翻訳
- 一般的な英語表現を使用
  - 「もやすごみ」→ "Burnable Waste"
  - 「ペットボトル」→ "PET Bottles"
  - 「びん・缶」→ "Bottles and Cans"

### 説明文の翻訳
- 簡潔で明確な表現を使用
- 命令形を使用
  - 「出してください」→ "Put out"
  - 「すすいでください」→ "Rinse"
  - 「切ってください」→ "Cut" / "Drain"

## 🚨 注意事項

### 必須フィールド

#### エリアデータ
- ✅ `name` - 必須
- ✅ `monthlySchedules` - 必須
- ❌ `name_en` - オプション

#### ごみ分別品目
- ✅ `name` または `name_ja` - 必須
- ✅ `category` - 必須
- ✅ `description` または `description_ja` - 必須
- ✅ `examples` または `examples_ja` - 必須
- ❌ 英語フィールド（`*_en`）- すべてオプション

### データの整合性
- カテゴリーキーは標準のものを使用
- 月の形式は "YYYY-MM"（例: "2025-04"）
- 日付は配列で数字のみ（例: [1, 8, 15, 22, 29]）

## 🔗 関連ドキュメント

- [AI_PROMPT_FOR_PDF.md](../gomicale/AI_PROMPT_FOR_PDF.md) - PDFから自動生成する方法
- [MULTILINGUAL.md](../gomicale/MULTILINGUAL.md) - 多言語化の詳細

