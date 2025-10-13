import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!apiKey) {
  throw new Error('NEXT_PUBLIC_GEMINI_API_KEY is not defined in environment variables');
}

const genAI = new GoogleGenerativeAI(apiKey);

// ごみのカテゴリー
export type GarbageCategory = 
  | 'burnable'              // 燃やすごみ
  | 'nonBurnable'           // 燃やさないごみ
  | 'recyclable'            // 資源ごみ（一般）
  | 'bottles'               // びん
  | 'cans'                  // かん
  | 'plastics'              // 容器包装プラスチック
  | 'pet_bottles'           // ペットボトル
  | 'paper_and_cloth'       // 古布・紙類
  | 'hazardous_and_dangerous' // 危険・有害ごみ
  | 'cooking_oil';          // 家庭廃食用油

// 月ごとのスケジュール（特定の日付の配列）
export interface MonthlySchedule {
  burnable?: number[];                // 燃やすごみ（1-31）
  nonBurnable?: number[];             // 燃やさないごみ
  recyclable?: number[];              // 資源ごみ（一般）
  bottles?: number[];                 // びん
  cans?: number[];                    // かん
  plastics?: number[];                // 容器包装プラスチック
  pet_bottles?: number[];             // ペットボトル
  paper_and_cloth?: number[];         // 古布・紙類
  hazardous_and_dangerous?: number[]; // 危険・有害ごみ
  cooking_oil?: number[];             // 家庭廃食用油
}

// 地域のスケジュール（月ごと）
export interface GarbageSchedule {
  [month: string]: MonthlySchedule;  // "1", "2", ... "12"
}

export interface Area {
  name: string;
  schedule: GarbageSchedule;
}

export interface GarbageItem {
  name: string;
  category: GarbageCategory;
  description: string;
  examples: string[];
}

export interface ExtractedData {
  areas: Area[];
  garbageItems: GarbageItem[];
}

// テキストを指定した文字数で分割
function splitTextIntoChunks(text: string, chunkSize: number = 5000): string[] {
  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    // チャンクの境界が文の途中にならないよう、改行で区切る
    if (endIndex < text.length) {
      const nextNewline = text.indexOf('\n', endIndex);
      if (nextNewline !== -1 && nextNewline < endIndex + 500) {
        endIndex = nextNewline + 1;
      }
    }
    
    chunks.push(text.slice(startIndex, endIndex));
    startIndex = endIndex;
  }
  
  return chunks;
}

// レート制限を回避するための待機関数
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// チャンクからデータを抽出
async function extractFromChunk(
  chunk: string,
  municipalityName: string,
  chunkIndex: number,
  totalChunks: number
): Promise<ExtractedData> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
あなたはごみ収集カレンダーとごみ分別情報を抽出するアシスタントです。
以下の年間カレンダーPDFテキストの一部（${chunkIndex + 1}/${totalChunks}）から情報を抽出し、JSON形式で返してください。

市町村名: ${municipalityName}

PDFテキスト（部分 ${chunkIndex + 1}/${totalChunks}）:
${chunk}

以下のJSON形式で返してください（必ず正しいJSONフォーマットで返してください）：
{
  "areas": [
    {
      "name": "地域名",
      "schedule": {
        "1": {
          "burnable": [1月の燃やすごみ収集日（1-31）の配列],
          "nonBurnable": [1月の燃やさないごみ収集日の配列],
          "recyclable": [1月の資源ごみ収集日の配列],
          "bottles": [1月のびん収集日の配列],
          "cans": [1月のかん収集日の配列],
          "plastics": [1月の容器包装プラスチック収集日の配列],
          "pet_bottles": [1月のペットボトル収集日の配列],
          "paper_and_cloth": [1月の古布・紙類収集日の配列],
          "hazardous_and_dangerous": [1月の危険・有害ごみ収集日の配列],
          "cooking_oil": [1月の家庭廃食用油収集日の配列]
        },
        "2": {
          "burnable": [2月の燃やすごみ収集日の配列],
          ...
        },
        ...
        "12": {
          "burnable": [12月の燃やすごみ収集日の配列],
          ...
        }
      }
    }
  ],
  "garbageItems": [
    {
      "name": "品目名",
      "category": "burnable, nonBurnable, recyclable, bottles, cans, plastics, pet_bottles, paper_and_cloth, hazardous_and_dangerous, cooking_oil のいずれか",
      "description": "出し方の説明",
      "examples": ["例1", "例2"]
    }
  ]
}

カテゴリー一覧：
- burnable: 燃やすごみ
- nonBurnable: 燃やさないごみ
- recyclable: 資源ごみ（一般）
- bottles: びん
- cans: かん
- plastics: 容器包装プラスチック
- pet_bottles: ペットボトル
- paper_and_cloth: 古布・紙類
- hazardous_and_dangerous: 危険・有害ごみ
- cooking_oil: 家庭廃食用油

注意事項：
- このテキスト部分から抽出できる情報のみを返してください
- 情報がない場合は空の配列を返してください
- 収集日は月内の日付（1-31）の数値配列で返してください
- 月は文字列のキー（"1", "2", ... "12"）で指定してください
- categoryは上記のいずれかを指定してください
- JSON形式のみ返し、説明文は含めないでください
- カレンダー形式のPDFから、各月のごみ収集日を正確に読み取ってください
`;

  const result = await model.generateContent(prompt);
  const response = result.response;
  const text = response.text();
  
  // JSONブロックから抽出
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
  const jsonText = jsonMatch ? jsonMatch[1] : text;
  
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error(`Chunk ${chunkIndex + 1} JSON parse error:`, error);
    console.error('Response text:', text);
    // エラーの場合は空のデータを返す
    return { areas: [], garbageItems: [] };
  }
}

// 複数のExtractedDataをマージ
function mergeExtractedData(dataArray: ExtractedData[]): ExtractedData {
  const areaMap = new Map<string, Area>();
  const mergedGarbageItems: GarbageItem[] = [];
  const itemNames = new Set<string>();

  for (const data of dataArray) {
    // 地域のマージ（同じ地域名のスケジュールを統合）
    for (const area of data.areas) {
      if (areaMap.has(area.name)) {
        // 既存の地域にスケジュールをマージ
        const existingArea = areaMap.get(area.name)!;
        for (const month in area.schedule) {
          if (!existingArea.schedule[month]) {
            existingArea.schedule[month] = area.schedule[month];
          } else {
            // 月ごとのスケジュールをマージ
            const existingMonth = existingArea.schedule[month];
            const newMonth = area.schedule[month];
            
            const categories: (keyof MonthlySchedule)[] = [
              'burnable', 'nonBurnable', 'recyclable', 'bottles', 'cans', 
              'plastics', 'pet_bottles', 'paper_and_cloth', 
              'hazardous_and_dangerous', 'cooking_oil'
            ];
            
            for (const category of categories) {
              if (newMonth[category] && newMonth[category]!.length > 0) {
                if (!existingMonth[category]) {
                  existingMonth[category] = newMonth[category];
                } else {
                  // 重複を除いてマージ
                  const mergedDates = new Set([...existingMonth[category]!, ...newMonth[category]!]);
                  existingMonth[category] = Array.from(mergedDates).sort((a, b) => a - b);
                }
              }
            }
          }
        }
      } else {
        // 新しい地域を追加
        areaMap.set(area.name, area);
      }
    }

    // ごみ品目のマージ（重複を除く）
    for (const item of data.garbageItems) {
      if (!itemNames.has(item.name)) {
        itemNames.add(item.name);
        mergedGarbageItems.push(item);
      }
    }
  }

  return {
    areas: Array.from(areaMap.values()),
    garbageItems: mergedGarbageItems
  };
}

export async function extractGarbageDataFromPDF(
  pdfText: string,
  municipalityName: string
): Promise<ExtractedData> {
  // PDFテキストを5000文字ごとに分割
  const chunks = splitTextIntoChunks(pdfText, 5000);
  console.log(`PDFテキストを${chunks.length}個のチャンクに分割しました`);

  const extractedDataArray: ExtractedData[] = [];

  // 各チャンクを順次処理（レート制限を回避するため）
  for (let i = 0; i < chunks.length; i++) {
    console.log(`チャンク ${i + 1}/${chunks.length} を処理中...`);
    
    try {
      const data = await extractFromChunk(chunks[i], municipalityName, i, chunks.length);
      extractedDataArray.push(data);
      
      // レート制限を回避するため、次のチャンクまで2秒待機
      if (i < chunks.length - 1) {
        console.log('レート制限を回避するため2秒待機中...');
        await sleep(2000);
      }
    } catch (error) {
      console.error(`チャンク ${i + 1} の処理中にエラーが発生:`, error);
      // エラーが発生しても処理を継続
      extractedDataArray.push({ areas: [], garbageItems: [] });
    }
  }

  // 結果をマージ
  const mergedData = mergeExtractedData(extractedDataArray);
  console.log(`マージ完了: 地域${mergedData.areas.length}件、品目${mergedData.garbageItems.length}件`);

  return mergedData;
}

