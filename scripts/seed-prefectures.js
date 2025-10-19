/**
 * 47都道府県をFirestoreに登録するスクリプト
 * 
 * 使用方法:
 * node scripts/seed-prefectures.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Firebase Admin SDK の初期化
// 環境変数またはサービスアカウントキーを使用
if (!admin.apps.length) {
  try {
    // 環境変数から初期化を試みる
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Firebase初期化エラー:', error.message);
    console.log('\n環境変数 GOOGLE_APPLICATION_CREDENTIALS を設定してください。');
    console.log('または、サービスアカウントキーのパスを指定してください。\n');
    process.exit(1);
  }
}

const db = admin.firestore();

// 47都道府県のデータ（日本語名と英語名）
const prefectures = [
  { prefecture: '北海道', prefecture_en: 'Hokkaido' },
  { prefecture: '青森県', prefecture_en: 'Aomori' },
  { prefecture: '岩手県', prefecture_en: 'Iwate' },
  { prefecture: '宮城県', prefecture_en: 'Miyagi' },
  { prefecture: '秋田県', prefecture_en: 'Akita' },
  { prefecture: '山形県', prefecture_en: 'Yamagata' },
  { prefecture: '福島県', prefecture_en: 'Fukushima' },
  { prefecture: '茨城県', prefecture_en: 'Ibaraki' },
  { prefecture: '栃木県', prefecture_en: 'Tochigi' },
  { prefecture: '群馬県', prefecture_en: 'Gunma' },
  { prefecture: '埼玉県', prefecture_en: 'Saitama' },
  { prefecture: '千葉県', prefecture_en: 'Chiba' },
  { prefecture: '東京都', prefecture_en: 'Tokyo' },
  { prefecture: '神奈川県', prefecture_en: 'Kanagawa' },
  { prefecture: '新潟県', prefecture_en: 'Niigata' },
  { prefecture: '富山県', prefecture_en: 'Toyama' },
  { prefecture: '石川県', prefecture_en: 'Ishikawa' },
  { prefecture: '福井県', prefecture_en: 'Fukui' },
  { prefecture: '山梨県', prefecture_en: 'Yamanashi' },
  { prefecture: '長野県', prefecture_en: 'Nagano' },
  { prefecture: '岐阜県', prefecture_en: 'Gifu' },
  { prefecture: '静岡県', prefecture_en: 'Shizuoka' },
  { prefecture: '愛知県', prefecture_en: 'Aichi' },
  { prefecture: '三重県', prefecture_en: 'Mie' },
  { prefecture: '滋賀県', prefecture_en: 'Shiga' },
  { prefecture: '京都府', prefecture_en: 'Kyoto' },
  { prefecture: '大阪府', prefecture_en: 'Osaka' },
  { prefecture: '兵庫県', prefecture_en: 'Hyogo' },
  { prefecture: '奈良県', prefecture_en: 'Nara' },
  { prefecture: '和歌山県', prefecture_en: 'Wakayama' },
  { prefecture: '鳥取県', prefecture_en: 'Tottori' },
  { prefecture: '島根県', prefecture_en: 'Shimane' },
  { prefecture: '岡山県', prefecture_en: 'Okayama' },
  { prefecture: '広島県', prefecture_en: 'Hiroshima' },
  { prefecture: '山口県', prefecture_en: 'Yamaguchi' },
  { prefecture: '徳島県', prefecture_en: 'Tokushima' },
  { prefecture: '香川県', prefecture_en: 'Kagawa' },
  { prefecture: '愛媛県', prefecture_en: 'Ehime' },
  { prefecture: '高知県', prefecture_en: 'Kochi' },
  { prefecture: '福岡県', prefecture_en: 'Fukuoka' },
  { prefecture: '佐賀県', prefecture_en: 'Saga' },
  { prefecture: '長崎県', prefecture_en: 'Nagasaki' },
  { prefecture: '熊本県', prefecture_en: 'Kumamoto' },
  { prefecture: '大分県', prefecture_en: 'Oita' },
  { prefecture: '宮崎県', prefecture_en: 'Miyazaki' },
  { prefecture: '鹿児島県', prefecture_en: 'Kagoshima' },
  { prefecture: '沖縄県', prefecture_en: 'Okinawa' },
];

/**
 * 都道府県をFirestoreに登録
 */
async function seedPrefectures() {
  console.log('🚀 47都道府県の登録を開始します...\n');

  const batch = db.batch();
  let count = 0;

  try {
    // 既存データの確認
    const existingDocs = await db.collection('municipalities').get();
    
    if (!existingDocs.empty) {
      console.log(`⚠️  既に ${existingDocs.size} 件のデータが存在します。`);
      console.log('既存のデータを保持したまま、新しいデータを追加します。\n');
    }

    // 都道府県ごとに処理
    for (const prefectureData of prefectures) {
      // 重複チェック: 同じ都道府県名が既に存在するか確認
      const existingQuery = await db
        .collection('municipalities')
        .where('prefecture', '==', prefectureData.prefecture)
        .get();

      if (!existingQuery.empty) {
        console.log(`⏭️  スキップ: ${prefectureData.prefecture} は既に登録されています`);
        continue;
      }

      // 新規ドキュメント作成
      const docRef = db.collection('municipalities').doc();
      batch.set(docRef, {
        prefecture: prefectureData.prefecture,
        prefecture_en: prefectureData.prefecture_en,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ 登録準備: ${prefectureData.prefecture} (${prefectureData.prefecture_en})`);
      count++;

      // バッチは最大500件まで。念のため分割
      if (count % 500 === 0) {
        await batch.commit();
        console.log(`\n📦 ${count} 件をコミットしました\n`);
      }
    }

    // 残りをコミット
    if (count % 500 !== 0) {
      await batch.commit();
    }

    console.log(`\n✨ 完了！合計 ${count} 件の都道府県を登録しました！\n`);
    
    // 登録結果の確認
    const totalDocs = await db.collection('municipalities').get();
    console.log(`📊 現在の municipalities コレクション: ${totalDocs.size} 件\n`);

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    throw error;
  }
}

/**
 * 既存データを削除（オプション）
 */
async function clearExistingData() {
  console.log('🗑️  既存データを削除しています...\n');

  try {
    const snapshot = await db.collection('municipalities').get();
    
    if (snapshot.empty) {
      console.log('削除するデータはありません。\n');
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ ${snapshot.size} 件のデータを削除しました。\n`);
  } catch (error) {
    console.error('❌ 削除エラー:', error);
    throw error;
  }
}

/**
 * メイン処理
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldClear = args.includes('--clear');

  try {
    if (shouldClear) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      readline.question(
        '⚠️  本当に既存データを削除しますか？ (yes/no): ',
        async (answer) => {
          readline.close();
          
          if (answer.toLowerCase() === 'yes') {
            await clearExistingData();
            await seedPrefectures();
          } else {
            console.log('キャンセルしました。');
          }
          
          process.exit(0);
        }
      );
    } else {
      await seedPrefectures();
      process.exit(0);
    }
  } catch (error) {
    console.error('予期しないエラー:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

module.exports = { seedPrefectures, clearExistingData };

