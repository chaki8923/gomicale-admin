'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Upload, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
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
  name: string;
  monthlySchedules: JsonMonthlySchedule[];
}

interface JsonGarbageItem {
  name: string;
  category: string;
  description: string;
  examples: string[];
}

interface JsonData {
  areas: JsonArea[];
  garbageItems: JsonGarbageItem[];
}

export default function DataMigrationPage() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>('');
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState<JsonData | null>(null);
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
    setError('');
    setJsonData(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text) as JsonData;
      setJsonData(data);
      setStatus(`✓ JSONファイルを読み込みました: 地域${data.areas.length}件、品目${data.garbageItems.length}件`);
    } catch (err) {
      setError('JSONファイルの読み込みに失敗しました: ' + (err as Error).message);
    }
  };

  // 月の形式を "2025-04" から "4" に変換
  const parseMonth = (monthStr: string): string => {
    const [_, month] = monthStr.split('-');
    return String(parseInt(month, 10));
  };

  // JsonAreaをGarbageSchedule形式に変換
  const convertToGarbageSchedule = (jsonArea: JsonArea): GarbageSchedule => {
    const schedule: GarbageSchedule = {};

    for (const monthlySchedule of jsonArea.monthlySchedules) {
      const month = parseMonth(monthlySchedule.month);
      schedule[month] = monthlySchedule.schedule as MonthlySchedule;
    }

    return schedule;
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
      // 都道府県情報を取得
      const municipalityDoc = await getDoc(doc(db, 'municipalities', selectedMunicipalityId));
      if (!municipalityDoc.exists()) {
        throw new Error('都道府県が見つかりません');
      }
      const municipality = municipalityDoc.data();

      let areaCount = 0;
      let itemCount = 0;

      // 地域データをインポート
      setStatus('地域データをインポート中...');
      for (const jsonArea of jsonData.areas) {
        const schedule = convertToGarbageSchedule(jsonArea);
        
        await addDoc(collection(db, 'municipalities', selectedMunicipalityId, 'areas'), {
          name: jsonArea.name,
          schedule: schedule
        });
        
        areaCount++;
        setStatus(`地域データをインポート中... (${areaCount}/${jsonData.areas.length})`);
      }

      // ごみ分別品目をインポート
      setStatus('ごみ分別品目をインポート中...');
      for (const item of jsonData.garbageItems) {
        await addDoc(collection(db, 'garbageItems'), {
          municipalityId: selectedMunicipalityId,
          name: item.name,
          category: item.category as GarbageCategory,
          description: item.description,
          examples: item.examples
        });
        
        itemCount++;
        setStatus(`ごみ分別品目をインポート中... (${itemCount}/${jsonData.garbageItems.length})`);
      }

      setStatus(`✓ インポート完了: ${municipality.prefecture} - 地域${areaCount}件、品目${itemCount}件を登録しました`);
      setJsonData(null);
      setJsonFile(null);
    } catch (err) {
      console.error('Import error:', err);
      setError('インポートに失敗しました: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
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
            JSONファイルからごみ収集データを一括インポートします
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
              <h2 className="text-2xl font-semibold mb-4">ステップ1: JSONファイルを選択</h2>
              
              <div className="mb-4">
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

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">JSONファイル</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                  disabled={loading}
                />
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
                  <div>
                    <h3 className="font-semibold text-lg mb-2">地域データ ({jsonData.areas.length}件)</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {jsonData.areas.map((area, idx) => (
                        <li key={idx}>
                          {area.name} ({area.monthlySchedules.length}ヶ月分のスケジュール)
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">ごみ分別品目 ({jsonData.garbageItems.length}件)</h3>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {jsonData.garbageItems.map((item, idx) => (
                        <li key={idx}>
                          {item.name} ({item.category})
                        </li>
                      ))}
                    </ul>
                  </div>
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
