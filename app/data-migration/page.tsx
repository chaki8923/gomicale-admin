'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Upload, CheckCircle, AlertCircle, RefreshCw, FileSpreadsheet } from 'lucide-react';
import type { GarbageSchedule, MonthlySchedule, GarbageCategory } from '@/lib/gemini';

interface Municipality {
  id: string;
  prefecture: string;
}

interface JsonMonthlySchedule {
  month: string; // "2025-04" 形式
  schedule: {
    [key: string]: number[];
  };
}

interface JsonArea {
  id: string;
  name: string;
  name_en?: string; // 英語名（オプション）
  schedule?: {
    [month: string]: {
      [category: string]: number[];
    };
  }; // 新形式のスケジュール
  monthlySchedules?: JsonMonthlySchedule[]; // 旧形式のスケジュール
}

interface JsonCity {
  id: string;
  name: string;
  name_en?: string;
  type?: string; // city, ward, town, village
  areas: JsonArea[];
}

interface JsonMunicipality {
  id: string;
  prefecture: string;
  prefecture_en?: string;
  cities: JsonCity[];
}

interface JsonGarbageItem {
  name?: string;
  name_ja?: string; // 日本語名（オプション）
  name_en?: string; // 英語名（オプション）
  category: string;
  description?: string;
  description_ja?: string; // 日本語説明（オプション）
  description_en?: string; // 英語説明（オプション）
  examples?: string[];
  examples_ja?: string[]; // 日本語例（オプション）
  examples_en?: string[]; // 英語例（オプション）
}

// 新形式のJSON構造
interface NewJsonData {
  municipalities: JsonMunicipality[];
  garbageItems?: JsonGarbageItem[];
}

// 旧形式のJSON構造（後方互換性のため）
interface OldJsonArea {
  name: string;
  name_en?: string;
  monthlySchedules: JsonMonthlySchedule[];
}

interface OldJsonData {
  areas: OldJsonArea[];
  garbageItems: JsonGarbageItem[];
}

// 両方の形式に対応
type JsonData = NewJsonData | OldJsonData;

export default function DataMigrationPage() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>('');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [jsonData, setJsonData] = useState<NewJsonData | OldJsonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [normalizeLoading, setNormalizeLoading] = useState(false);
  const [normalizeStatus, setNormalizeStatus] = useState<string>('');

  useEffect(() => {
    fetchMunicipalities();
  }, []);

  const fetchMunicipalities = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'municipalities'));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Municipality));
      setMunicipalities(data);
      if (data.length > 0) {
        setSelectedMunicipalityId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching municipalities:', error);
      setError('都道府県データの取得に失敗しました');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setJsonFile(file);
    setJsonText('');
    setCsvFile(null);
    setCsvText('');
    setError('');
    setJsonData(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      setJsonData(data);
      
      // データ形式を判定してステータスメッセージを生成
      const statusMessage = getDataStatusMessage(data);
      setStatus(statusMessage);
    } catch (err) {
      setError('JSONファイルの読み込みに失敗しました: ' + (err as Error).message);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJsonText(text);
    setJsonFile(null);
    setCsvFile(null);
    setCsvText('');
    setError('');
    setJsonData(null);
    setStatus('');

    // テキストが空の場合は処理しない
    if (!text.trim()) {
      return;
    }

    // JSONのパースを試みる
    try {
      const data = JSON.parse(text);
      setJsonData(data);
      
      // データ形式を判定してステータスメッセージを生成
      const statusMessage = getDataStatusMessage(data);
      setStatus(statusMessage);
    } catch (err) {
      setError('JSONテキストの読み込みに失敗しました: ' + (err as Error).message);
    }
  };

  // CSV行をパース（ダブルクォート対応）
  const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされたダブルクォート
          current += '"';
          i++; // 次の文字をスキップ
        } else {
          // クォートの開始/終了
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        // デリミタ（クォート外）
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  // CSVをパースしてJSONに変換
  const parseCSV = (csv: string): JsonData => {
    const lines = csv.trim().split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSVデータが不正です');
    }

    // デリミタを自動検出（カンマまたはタブ）
    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : ',';

    // ヘッダー行を解析
    const headers = parseCSVLine(firstLine, delimiter).map(h => h.trim());
    
    // CSV形式を判定（スケジュールCSV vs 品目CSV）
    const isScheduleCSV = headers.includes('name') && headers.includes('month');
    const isItemCSV = headers.includes('item_name_ja') && headers.includes('category');
    
    if (!isScheduleCSV && !isItemCSV) {
      throw new Error('不明なCSV形式です。スケジュールCSV（必須: name, month）または品目CSV（必須: item_name_ja, category）の形式で入力してください');
    }

    if (isScheduleCSV) {
      return parseScheduleCSV(lines, headers, delimiter);
    } else {
      return parseItemCSV(lines, headers, delimiter);
    }
  };

  // スケジュールCSVをパース
  const parseScheduleCSV = (lines: string[], headers: string[], delimiter: string): JsonData => {
    // 地域ごとにデータをグループ化
    const areaMap = new Map<string, JsonArea>();

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], delimiter);
      if (values.length !== headers.length) {
        console.warn(`行 ${i + 1} のカラム数が不正です（期待: ${headers.length}, 実際: ${values.length}）。スキップします。`);
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index].trim();
      });

      const areaName = row['name'];
      const areaNameEn = row['name_en'] || undefined;
      const month = row['month'];

      if (!areaName || !month) {
        console.warn(`行 ${i + 1} に必須データがありません。スキップします。`);
        continue;
      }

      // 地域を取得または作成
      if (!areaMap.has(areaName)) {
        areaMap.set(areaName, {
          name: areaName,
          name_en: areaNameEn,
          monthlySchedules: []
        });
      }

      const area = areaMap.get(areaName)!;

      // 月のスケジュールを作成
      const schedule: { [key: string]: number[] } = {};

      // カテゴリーマッピング
      const categoryMapping: Record<string, string> = {
        'burnable_dates': 'burnable',
        'burnable': 'burnable',
        'non_burnable_dates': 'nonBurnable',
        'non_burnable': 'nonBurnable',
        'recyclable_dates': 'recyclable',
        'recyclable': 'recyclable',
        'resource_dates': 'recyclable',
        'resources': 'recyclable',
        'bottles_dates': 'bottles',
        'bottles': 'bottles',
        'cans_dates': 'cans',
        'cans': 'cans',
        'plastics_dates': 'plastics',
        'plastics': 'plastics',
        'pet_bottles_dates': 'pet_bottles',
        'pet_bottles': 'pet_bottles',
        'paper_cloth_dates': 'paper_and_cloth',
        'paper_and_cloth_dates': 'paper_and_cloth',
        'paper_and_cloth': 'paper_and_cloth',
        'hazardous_dates': 'hazardous_and_dangerous',
        'dangerous_dates': 'hazardous_and_dangerous',
        'hazardous_and_dangerous': 'hazardous_and_dangerous',
        'metal_pottery_dates': 'nonBurnable',
        'metal_pottery': 'nonBurnable',
        'metal_pottery_glass': 'nonBurnable',
        'cooking_oil_dates': 'cooking_oil',
        'cooking_oil': 'cooking_oil'
      };

      // 各カテゴリーの日付を解析
      for (const [csvColumn, category] of Object.entries(categoryMapping)) {
        if (row[csvColumn]) {
          const dates = row[csvColumn]
            .split(',')
            .map(d => parseInt(d.trim(), 10))
            .filter(d => !isNaN(d) && d >= 1 && d <= 31);
          
          if (dates.length > 0) {
            schedule[category] = dates;
          }
        }
      }

      // 月のスケジュールを追加
      area.monthlySchedules.push({
        month: month,
        schedule: schedule
      });
    }

    // 結果を生成
    const areas = Array.from(areaMap.values());
    
    return {
      areas: areas,
      garbageItems: []
    };
  };

  // 品目CSVをパース
  const parseItemCSV = (lines: string[], headers: string[], delimiter: string): JsonData => {
    const garbageItems: JsonGarbageItem[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], delimiter);
      if (values.length !== headers.length) {
        console.warn(`行 ${i + 1} のカラム数が不正です（期待: ${headers.length}, 実際: ${values.length}）。スキップします。`);
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index].trim();
      });

      const itemNameJa = row['item_name_ja'];
      const category = row['category'];

      if (!itemNameJa || !category) {
        console.warn(`行 ${i + 1} に必須データがありません。スキップします。`);
        continue;
      }

      // カテゴリーが有効かチェック
      const validCategories = [
        'burnable', 'nonBurnable', 'recyclable', 'bottles', 'cans', 
        'plastics', 'pet_bottles', 'paper_and_cloth', 
        'hazardous_and_dangerous', 'cooking_oil'
      ];
      
      if (!validCategories.includes(category)) {
        console.warn(`行 ${i + 1} のカテゴリー "${category}" は無効です。スキップします。`);
        continue;
      }

      const item: JsonGarbageItem = {
        category: category as any
      };

      // 日本語名
      if (itemNameJa) {
        item.name_ja = itemNameJa;
      }

      // 英語名
      if (row['item_name_en']) {
        item.name_en = row['item_name_en'];
      }

      // 説明（日本語）
      if (row['description_ja']) {
        item.description_ja = row['description_ja'];
      }

      // 説明（英語）
      if (row['description_en']) {
        item.description_en = row['description_en'];
      }

      // 例（日本語）- パイプ(|)で区切られた文字列を配列に変換
      if (row['examples_ja']) {
        item.examples_ja = row['examples_ja'].split('|').map(ex => ex.trim()).filter(ex => ex);
      }

      // 例（英語）- パイプ(|)で区切られた文字列を配列に変換
      if (row['examples_en']) {
        item.examples_en = row['examples_en'].split('|').map(ex => ex.trim()).filter(ex => ex);
      }

      garbageItems.push(item);
    }

    return {
      areas: [],
      garbageItems: garbageItems
    };
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvFile(file);
    setCsvText('');
    setJsonFile(null);
    setJsonText('');
    setError('');
    setJsonData(null);

    try {
      const text = await file.text();
      const data = parseCSV(text);
      setJsonData(data);
      
      // インポートしたデータの種類を表示
      const parts: string[] = [];
      if (data.areas.length > 0) {
        parts.push(`地域${data.areas.length}件`);
      }
      if (data.garbageItems.length > 0) {
        parts.push(`品目${data.garbageItems.length}件`);
      }
      setStatus(`✓ CSVファイルを読み込みました: ${parts.join('、')}`);
    } catch (err) {
      setError('CSVファイルの読み込みに失敗しました: ' + (err as Error).message);
    }
  };

  const handleCsvTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCsvText(text);
    setCsvFile(null);
    setJsonFile(null);
    setJsonText('');
    setError('');
    setJsonData(null);
    setStatus('');

    // テキストが空の場合は処理しない
    if (!text.trim()) {
      return;
    }

    // CSVのパースを試みる
    try {
      const data = parseCSV(text);
      setJsonData(data);
      
      // インポートしたデータの種類を表示
      const parts: string[] = [];
      if (data.areas.length > 0) {
        parts.push(`地域${data.areas.length}件`);
      }
      if (data.garbageItems.length > 0) {
        parts.push(`品目${data.garbageItems.length}件`);
      }
      setStatus(`✓ CSVテキストを読み込みました: ${parts.join('、')}`);
    } catch (err) {
      setError('CSVテキストの読み込みに失敗しました: ' + (err as Error).message);
    }
  };

  // データ形式を判定してステータスメッセージを生成
  const getDataStatusMessage = (data: any): string => {
    if (isNewFormat(data)) {
      const newData = data as NewJsonData;
      let totalCities = 0;
      let totalAreas = 0;
      newData.municipalities.forEach(m => {
        totalCities += m.cities.length;
        m.cities.forEach(c => {
          totalAreas += c.areas.length;
        });
      });
      const itemCount = newData.garbageItems?.length || 0;
      return `✓ JSONを読み込みました: 都道府県${newData.municipalities.length}件、市区町村${totalCities}件、地域${totalAreas}件、品目${itemCount}件`;
    } else {
      const oldData = data as OldJsonData;
      return `✓ JSONを読み込みました（旧形式）: 地域${oldData.areas.length}件、品目${oldData.garbageItems.length}件`;
    }
  };

  // 新形式かどうかを判定
  const isNewFormat = (data: any): data is NewJsonData => {
    return data && Array.isArray(data.municipalities);
  };

  // 月の形式を "2025-04" から "4" に変換
  const parseMonth = (monthStr: string): string => {
    const [_, month] = monthStr.split('-');
    return String(parseInt(month, 10));
  };

  // JsonAreaをGarbageSchedule形式に変換（新旧両対応）
  const convertToGarbageSchedule = (jsonArea: JsonArea): GarbageSchedule => {
    // 新形式: scheduleフィールドが直接存在する場合
    if (jsonArea.schedule) {
      return jsonArea.schedule as GarbageSchedule;
    }
    
    // 旧形式: monthlySchedulesから変換
    if (jsonArea.monthlySchedules) {
      const schedule: GarbageSchedule = {};
      for (const monthlySchedule of jsonArea.monthlySchedules) {
        const month = parseMonth(monthlySchedule.month);
        schedule[month] = monthlySchedule.schedule as MonthlySchedule;
      }
      return schedule;
    }
    
    return {};
  };

  const handleImport = async () => {
    if (!jsonData || !selectedMunicipalityId) {
      setError('JSONファイルと都道府県を選択してください');
      return;
    }

    setLoading(true);
    setStatus('インポート中...');
    setError('');

    try {
      if (isNewFormat(jsonData)) {
        await handleNewFormatImport(jsonData as NewJsonData);
      } else {
        await handleOldFormatImport(jsonData as OldJsonData);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('インポートに失敗しました: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 新形式のインポート処理
  const handleNewFormatImport = async (data: NewJsonData) => {
    // 選択された都道府県を確認
    const municipalityDoc = await getDoc(doc(db, 'municipalities', selectedMunicipalityId));
    if (!municipalityDoc.exists()) {
      throw new Error('都道府県が見つかりません');
    }
    const selectedMunicipality = municipalityDoc.data();

    let totalCities = 0;
    let totalAreas = 0;
    let totalItems = 0;

    // 選択された都道府県に対してのみインポート
    // （JSONに複数の都道府県が含まれていても、選択された1つにのみインポート）
    setStatus(`都道府県 ${selectedMunicipality.prefecture} にインポート中...`);

    // すべての市区町村と地域を選択された都道府県にインポート
    for (const municipality of data.municipalities) {
      for (const city of municipality.cities) {
        totalCities++;
        setStatus(`市区町村 ${city.name} を処理中... (${totalCities}件目)`);

        const cityData: any = {
          name: city.name
        };
        if (city.name_en) cityData.name_en = city.name_en;
        if (city.type) cityData.type = city.type;

        // 市区町村をFirestoreに追加
        const cityRef = await addDoc(
          collection(db, 'municipalities', selectedMunicipalityId, 'cities'),
          cityData
        );

        // 地域をインポート
        const areaIds: string[] = [];
        for (const area of city.areas) {
          totalAreas++;
          const schedule = convertToGarbageSchedule(area);
          
          const areaData: any = {
            name: area.name,
            schedule: schedule
          };
          
          if (area.name_en) {
            areaData.name_en = area.name_en;
          }
          
          const areaRef = await addDoc(
            collection(db, 'municipalities', selectedMunicipalityId, 'cities', cityRef.id, 'areas'),
            areaData
          );
          areaIds.push(areaRef.id);
          
          setStatus(`地域 ${area.name} を登録... (${totalAreas}件目)`);
        }

        // ごみ分別品目をインポート
        if (data.garbageItems && data.garbageItems.length > 0) {
          for (const areaId of areaIds) {
            for (const item of data.garbageItems) {
              const itemData = createGarbageItemData(item);
              await addDoc(
                collection(db, 'municipalities', selectedMunicipalityId, 'cities', cityRef.id, 'areas', areaId, 'garbageItems'),
                itemData
              );
              totalItems++;
            }
            setStatus(`品目をインポート中... (${totalItems}件)`);
          }
        }
      }
    }

    setStatus(`✓ インポート完了: ${selectedMunicipality.prefecture} - 市区町村${totalCities}件、地域${totalAreas}件、品目${totalItems}件を登録しました`);
    resetForm();
  };

  // 旧形式のインポート処理（後方互換性）
  const handleOldFormatImport = async (data: OldJsonData) => {
    const municipalityDoc = await getDoc(doc(db, 'municipalities', selectedMunicipalityId));
    if (!municipalityDoc.exists()) {
      throw new Error('都道府県が見つかりません');
    }
    const municipality = municipalityDoc.data();

    let areaCount = 0;
    let itemCount = 0;
    const areaIds: string[] = [];

    // 地域データをインポート（旧形式: 直接areasコレクションに追加）
    setStatus('地域データをインポート中（旧形式）...');
    for (const jsonArea of data.areas) {
      const schedule = convertToGarbageSchedule(jsonArea as any);
      
      const areaData: any = {
        name: jsonArea.name,
        schedule: schedule
      };
      
      if (jsonArea.name_en) {
        areaData.name_en = jsonArea.name_en;
      }
      
      const areaRef = await addDoc(collection(db, 'municipalities', selectedMunicipalityId, 'areas'), areaData);
      areaIds.push(areaRef.id);
      
      areaCount++;
      setStatus(`地域データをインポート中... (${areaCount}/${data.areas.length})`);
    }

    // ごみ分別品目を各エリアのサブコレクションとしてインポート
    if (data.garbageItems && data.garbageItems.length > 0) {
      setStatus('ごみ分別品目をインポート中...');
      for (const areaId of areaIds) {
        for (const item of data.garbageItems) {
          const itemData = createGarbageItemData(item);
          await addDoc(
            collection(db, 'municipalities', selectedMunicipalityId, 'areas', areaId, 'garbageItems'),
            itemData
          );
          itemCount++;
        }
        setStatus(`ごみ分別品目をインポート中... (${itemCount}/${data.garbageItems.length * areaIds.length})`);
      }
    }

    setStatus(`✓ インポート完了: ${municipality.prefecture} - 地域${areaCount}件、品目${itemCount}件を登録しました`);
    resetForm();
  };

  // ごみ分別品目データを作成
  const createGarbageItemData = (item: JsonGarbageItem): any => {
    const itemData: any = {
      category: item.category as GarbageCategory,
    };
    
    // 名前フィールドの処理
    if (item.name_ja) {
      itemData.name_ja = item.name_ja;
    } else if (item.name) {
      itemData.name_ja = item.name;
    }
    
    if (item.name_en) {
      itemData.name_en = item.name_en;
    }
    
    // 説明フィールドの処理
    if (item.description_ja) {
      itemData.description_ja = item.description_ja;
    } else if (item.description) {
      itemData.description_ja = item.description;
    }
    
    if (item.description_en) {
      itemData.description_en = item.description_en;
    }
    
    // 例フィールドの処理
    if (item.examples_ja) {
      itemData.examples_ja = item.examples_ja;
    } else if (item.examples) {
      itemData.examples_ja = item.examples;
    }
    
    if (item.examples_en) {
      itemData.examples_en = item.examples_en;
    }
    
    return itemData;
  };

  // フォームをリセット
  const resetForm = () => {
    setJsonData(null);
    setJsonFile(null);
    setJsonText('');
    setCsvFile(null);
    setCsvText('');
  };

  // 既存のスケジュールデータを正規化（"2025-04" → "4" 形式に変換）
  const normalizeScheduleData = (schedule: any): GarbageSchedule => {
    const normalized: GarbageSchedule = {};
    
    for (const key in schedule) {
      let month: string;
      
      // "2025-04" 形式の場合、月部分を抽出
      if (key.includes('-')) {
        const [_, monthPart] = key.split('-');
        month = String(parseInt(monthPart, 10)); // "04" -> "4"
      } else {
        // すでに月番号形式の場合
        month = String(parseInt(key, 10)); // "01" -> "1", "1" -> "1"
      }
      
      normalized[month] = schedule[key];
    }
    
    return normalized;
  };

  // すべての地域のスケジュールデータを正規化
  const handleNormalizeAllData = async () => {
    if (!selectedMunicipalityId) {
      setError('都道府県を選択してください');
      return;
    }

    const confirmed = confirm(
      '選択した都道府県のすべての地域データを正規化します。\n' +
      '（"2025-04"形式を"4"形式に変換します）\n\n' +
      'この操作を実行しますか？'
    );
    
    if (!confirmed) return;

    setNormalizeLoading(true);
    setNormalizeStatus('正規化処理中...');
    setError('');

    try {
      // 都道府県情報を取得
      const municipalityDoc = await getDoc(doc(db, 'municipalities', selectedMunicipalityId));
      if (!municipalityDoc.exists()) {
        throw new Error('都道府県が見つかりません');
      }
      const municipality = municipalityDoc.data();

      // すべての地域を取得
      const areasSnapshot = await getDocs(
        collection(db, 'municipalities', selectedMunicipalityId, 'areas')
      );

      let normalizedCount = 0;
      let skippedCount = 0;

      for (const areaDoc of areasSnapshot.docs) {
        const areaData = areaDoc.data();
        const schedule = areaData.schedule;

        if (!schedule || typeof schedule !== 'object') {
          skippedCount++;
          continue;
        }

        // スケジュールデータに "年-月" 形式のキーが含まれているかチェック
        const needsNormalization = Object.keys(schedule).some(key => key.includes('-'));

        if (needsNormalization) {
          // 正規化を実行
          const normalizedSchedule = normalizeScheduleData(schedule);
          
          await updateDoc(doc(db, 'municipalities', selectedMunicipalityId, 'areas', areaDoc.id), {
            schedule: normalizedSchedule
          });
          
          normalizedCount++;
          setNormalizeStatus(
            `正規化中: ${areaData.name} (${normalizedCount + skippedCount}/${areasSnapshot.docs.length})`
          );
        } else {
          skippedCount++;
        }
      }

      setNormalizeStatus(
        `✓ 正規化完了: ${municipality.prefecture} - ` +
        `${normalizedCount}件を正規化、${skippedCount}件はスキップしました`
      );
    } catch (err) {
      console.error('Normalization error:', err);
      setError('正規化に失敗しました: ' + (err as Error).message);
    } finally {
      setNormalizeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">データ一括インポート</h1>
          <p className="text-gray-600 mt-2">
            JSONファイルまたはJSONテキストからごみ収集データを一括インポートします
          </p>
        </div>

        {municipalities.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              先に都道府県を登録してください。
            </p>
          </div>
        ) : (
          <>
            {/* データ正規化セクション */}
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-2xl font-semibold mb-4">既存データの正規化</h2>
              <p className="text-gray-600 mb-4">
                Firestoreに保存されている既存のスケジュールデータを正しい形式に変換します。<br />
                （"2025-04" 形式を "4" 形式に変換）
              </p>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">対象の都道府県</label>
                <select
                  value={selectedMunicipalityId}
                  onChange={(e) => setSelectedMunicipalityId(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={normalizeLoading || loading}
                >
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.prefecture}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNormalizeAllData}
                disabled={normalizeLoading || loading}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {normalizeLoading ? (
                  <>処理中...</>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    データを正規化
                  </>
                )}
              </button>

              {normalizeStatus && (
                <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex items-start">
                  <CheckCircle className="w-5 h-5 text-purple-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-purple-800">{normalizeStatus}</p>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-2xl font-semibold mb-4">ステップ1: データを入力</h2>
              
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">インポート先の都道府県</label>
                <select
                  value={selectedMunicipalityId}
                  onChange={(e) => setSelectedMunicipalityId(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.prefecture}
                    </option>
                  ))}
                </select>
              </div>

              {/* CSV入力（推奨） */}
              <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <FileSpreadsheet className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-gray-900">CSVからインポート (推奨)</h3>
                </div>
                <p className="text-gray-600 text-sm mb-3">
                  収集スケジュールまたはごみ分別品目のCSVをインポートできます（カンマ/タブ区切り対応）
                </p>
                
                <div className="mb-3">
                  <label className="block text-gray-700 mb-2 text-sm font-medium">CSVファイルを選択</label>
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt"
                    onChange={handleCsvFileChange}
                    value={csvFile ? undefined : ''}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-green-50 file:text-green-700
                      hover:file:bg-green-100"
                    disabled={loading}
                  />
                </div>

                <div className="mb-2">
                  <div className="flex items-center justify-center mb-2">
                    <div className="flex-grow border-t border-gray-300"></div>
                    <span className="px-4 text-gray-500 text-xs">または</span>
                    <div className="flex-grow border-t border-gray-300"></div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 mb-2 text-sm font-medium">CSVテキストを貼り付け</label>
                  <textarea
                    value={csvText}
                    onChange={handleCsvTextChange}
                    placeholder='スケジュールCSV例:
name,name_en,month,burnable,resources
新宿区新宿6-7丁目,Shinjuku-ku Shinjuku 6-7 chome,2025-04,"1,4,8,11","2,9,16"

品目CSV例:
item_name_ja,item_name_en,category,description_ja,examples_ja
ペットボトル,PET bottles,pet_bottles,キャップとラベルを外して出す,飲料用|調味料用'
                    className="w-full h-40 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-xs"
                    disabled={loading}
                  />
                  <details className="mt-2">
                    <summary className="text-gray-600 text-xs cursor-pointer hover:text-gray-800">
                      📖 CSV形式の詳細
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded text-xs text-gray-700 space-y-2">
                      <div>
                        <strong>スケジュールCSV:</strong>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>必須: name, month</li>
                          <li>日付カラム: burnable, resources, metal_pottery_glass など</li>
                        </ul>
                      </div>
                      <div>
                        <strong>品目CSV:</strong>
                        <ul className="list-disc list-inside ml-2 mt-1">
                          <li>必須: item_name_ja, category</li>
                          <li>オプション: item_name_en, description_ja, description_en, examples_ja, examples_en</li>
                          <li>examples は | で区切る（例: "飲料用|調味料用"）</li>
                          <li>カテゴリー: burnable, nonBurnable, recyclable, bottles, cans, plastics, pet_bottles, paper_and_cloth, hazardous_and_dangerous, cooking_oil</li>
                        </ul>
                      </div>
                    </div>
                  </details>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-center mb-2">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="px-4 text-gray-500 text-sm">またはJSON形式で入力</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">JSONファイルを選択</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  value={jsonFile ? undefined : ''}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                  disabled={loading}
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-center mb-2">
                  <div className="flex-grow border-t border-gray-300"></div>
                  <span className="px-4 text-gray-500 text-sm">または</span>
                  <div className="flex-grow border-t border-gray-300"></div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">JSONテキストを貼り付け</label>
                <textarea
                  value={jsonText}
                  onChange={handleTextChange}
                  placeholder='{"areas": [...], "garbageItems": [...]}'
                  className="w-full h-64 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  disabled={loading}
                />
                <p className="text-gray-500 text-sm mt-1">
                  JSON形式のテキストを直接貼り付けることができます
                </p>
              </div>

              {status && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start">
                  <CheckCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-blue-800">{status}</p>
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5 flex-shrink-0" />
                  <p className="text-red-800">{error}</p>
                </div>
              )}
            </div>

            {jsonData && (
              <div className="bg-white p-6 rounded-lg shadow mb-6">
                <h2 className="text-2xl font-semibold mb-4">ステップ2: データを確認</h2>
                
                <div className="space-y-4">
                  {isNewFormat(jsonData) ? (
                    // 新形式の表示
                    <>
                      {(jsonData as NewJsonData).municipalities.map((municipality, mIdx) => (
                        <div key={mIdx} className="border-l-4 border-blue-500 pl-4">
                          <h3 className="font-semibold text-xl mb-3">
                            {municipality.prefecture}
                            {municipality.prefecture_en && <span className="text-gray-500 ml-2 text-base">({municipality.prefecture_en})</span>}
                          </h3>
                          {municipality.cities.map((city, cIdx) => (
                            <div key={cIdx} className="ml-4 mb-3">
                              <h4 className="font-semibold text-lg mb-2">
                                {city.name}
                                {city.name_en && <span className="text-gray-500 ml-2 text-sm">({city.name_en})</span>}
                                {city.type && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{city.type}</span>}
                              </h4>
                              <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                                {city.areas.map((area, aIdx) => (
                                  <li key={aIdx}>
                                    {area.name}
                                    {area.name_en && <span className="text-gray-500 ml-2">({area.name_en})</span>}
                                    {area.schedule && <span className="text-sm text-gray-600"> - {Object.keys(area.schedule).length}ヶ月分</span>}
                                    {area.monthlySchedules && <span className="text-sm text-gray-600"> - {area.monthlySchedules.length}ヶ月分</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      ))}
                      {(jsonData as NewJsonData).garbageItems && (jsonData as NewJsonData).garbageItems!.length > 0 && (
                        <div>
                          <h3 className="font-semibold text-lg mb-2">ごみ分別品目 ({(jsonData as NewJsonData).garbageItems!.length}件)</h3>
                          <ul className="list-disc list-inside text-gray-700 space-y-1">
                            {(jsonData as NewJsonData).garbageItems!.map((item, idx) => (
                              <li key={idx}>
                                {item.name_ja || item.name}
                                {item.name_en && <span className="text-gray-500 ml-2">({item.name_en})</span>}
                                {' '}
                                <span className="text-blue-600">({item.category})</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    // 旧形式の表示
                    <>
                      <div>
                        <h3 className="font-semibold text-lg mb-2">地域データ ({(jsonData as OldJsonData).areas.length}件)</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {(jsonData as OldJsonData).areas.map((area, idx) => (
                            <li key={idx}>
                              {area.name}
                              {area.name_en && <span className="text-gray-500 ml-2">({area.name_en})</span>}
                              {' '}({area.monthlySchedules.length}ヶ月分のスケジュール)
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="font-semibold text-lg mb-2">ごみ分別品目 ({(jsonData as OldJsonData).garbageItems.length}件)</h3>
                        <ul className="list-disc list-inside text-gray-700 space-y-1">
                          {(jsonData as OldJsonData).garbageItems.map((item, idx) => (
                            <li key={idx}>
                              {item.name_ja || item.name}
                              {item.name_en && <span className="text-gray-500 ml-2">({item.name_en})</span>}
                              {' '}
                              <span className="text-blue-600">({item.category})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleImport}
                  disabled={loading}
                  className="mt-6 bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium flex items-center"
                >
                  {loading ? (
                    <>処理中...</>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mr-2" />
                      Firestoreにインポート
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
