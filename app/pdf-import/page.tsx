'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { extractGarbageDataFromPDF, type ExtractedData, type Area, type GarbageItem } from '@/lib/gemini';
import Link from 'next/link';
import { Upload, Loader2 } from 'lucide-react';

interface Municipality {
  id: string;
  name: string;
  prefecture: string;
}

const CATEGORY_LABELS: { [key: string]: string } = {
  burnable: '燃やすごみ',
  nonBurnable: '燃やさないごみ',
  recyclable: '資源ごみ',
  bottles: 'びん',
  cans: 'かん',
  plastics: '容器包装プラスチック',
  pet_bottles: 'ペットボトル',
  paper_and_cloth: '古布・紙類',
  hazardous_and_dangerous: '危険・有害ごみ',
  cooking_oil: '家庭廃食用油'
};

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function PdfImportPage() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);

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
      alert('市町村データの取得に失敗しました');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPdfFile(e.target.files[0]);
      setExtractedData(null);
    }
  };

  const handleExtract = async () => {
    if (!pdfFile || !selectedMunicipalityId) {
      alert('PDFファイルと市町村を選択してください');
      return;
    }

    setLoading(true);
    try {
      // PDFをテキストに変換
      const text = await pdfFile.text();
      
      // Gemini APIで解析
      const municipality = municipalities.find(m => m.id === selectedMunicipalityId);
      const data = await extractGarbageDataFromPDF(text, municipality?.name || '');
      
      setExtractedData(data);
      alert('データの抽出が完了しました。内容を確認してください。');
    } catch (error) {
      console.error('Error extracting data:', error);
      alert('データの抽出に失敗しました: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!extractedData || !selectedMunicipalityId) return;

    setLoading(true);
    try {
      // 地域データを保存
      for (const area of extractedData.areas) {
        await addDoc(collection(db, 'municipalities', selectedMunicipalityId, 'areas'), {
          name: area.name,
          schedule: area.schedule
        });
      }

      // ごみ分別データを保存
      for (const item of extractedData.garbageItems) {
        await addDoc(collection(db, 'garbageItems'), {
          municipalityId: selectedMunicipalityId,
          name: item.name,
          category: item.category,
          description: item.description,
          examples: item.examples
        });
      }

      alert('データをFirestoreに保存しました！');
      setExtractedData(null);
      setPdfFile(null);
    } catch (error) {
      console.error('Error saving data:', error);
      alert('データの保存に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const updateAreaName = (index: number, name: string) => {
    if (!extractedData) return;
    const newData = { ...extractedData };
    newData.areas[index].name = name;
    setExtractedData(newData);
  };

  const updateGarbageItem = (index: number, field: keyof GarbageItem, value: any) => {
    if (!extractedData) return;
    const newData = { ...extractedData };
    (newData.garbageItems[index] as any)[field] = value;
    setExtractedData(newData);
  };

  const removeArea = (index: number) => {
    if (!extractedData) return;
    const newData = { ...extractedData };
    newData.areas.splice(index, 1);
    setExtractedData(newData);
  };

  const removeGarbageItem = (index: number) => {
    if (!extractedData) return;
    const newData = { ...extractedData };
    newData.garbageItems.splice(index, 1);
    setExtractedData(newData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← ダッシュボードに戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">PDF一括インポート</h1>
          <p className="text-gray-600 mt-2">
            PDFファイルをアップロードして、AI（Gemini）でごみ収集データを自動抽出します
          </p>
        </div>

        {municipalities.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">
              先に市町村を登録してください。
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white p-6 rounded-lg shadow mb-6">
              <h2 className="text-2xl font-semibold mb-4">ステップ1: PDFをアップロード</h2>
              
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">市町村を選択</label>
                <select
                  value={selectedMunicipalityId}
                  onChange={(e) => setSelectedMunicipalityId(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.prefecture} {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">PDFファイル</label>
                <input
                  type="file"
                  accept=".pdf"
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

              <button
                onClick={handleExtract}
                disabled={!pdfFile || loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mr-2" />
                    AIで解析
                  </>
                )}
              </button>
            </div>

            {extractedData && (
              <>
                <div className="bg-white p-6 rounded-lg shadow mb-6">
                  <h2 className="text-2xl font-semibold mb-4">ステップ2: データを確認・編集</h2>
                  
                  <div className="mb-8">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">地域と収集スケジュール</h3>
                    {extractedData.areas.length === 0 ? (
                      <p className="text-gray-500">地域データが抽出されませんでした</p>
                    ) : (
                      <div className="space-y-4">
                        {extractedData.areas.map((area, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <input
                                type="text"
                                value={area.name}
                                onChange={(e) => updateAreaName(index, e.target.value)}
                                className="text-lg font-medium px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => removeArea(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                削除
                              </button>
                            </div>
                            <div className="mt-3 space-y-3 max-h-96 overflow-y-auto">
                              {Object.keys(area.schedule).length === 0 ? (
                                <p className="text-sm text-gray-500">スケジュールが抽出されませんでした</p>
                              ) : (
                                Object.keys(area.schedule).sort((a, b) => parseInt(a) - parseInt(b)).map(month => (
                                  <div key={month} className="border-l-4 border-blue-300 pl-3">
                                    <p className="font-semibold text-sm text-blue-700 mb-1">{month}月</p>
                                    <div className="grid grid-cols-2 gap-2">
                                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
                                        const days = area.schedule[month]?.[key as keyof typeof area.schedule[typeof month]];
                                        if (!days || days.length === 0) return null;
                                        return (
                                          <div key={key} className="text-xs">
                                            <span className="text-gray-600">{label}: </span>
                                            <span className="text-gray-900">{days.join('日, ')}日</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">ごみ分別品目</h3>
                    {extractedData.garbageItems.length === 0 ? (
                      <p className="text-gray-500">品目データが抽出されませんでした</p>
                    ) : (
                      <div className="space-y-4">
                        {extractedData.garbageItems.map((item, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateGarbageItem(index, 'name', e.target.value)}
                                className="text-lg font-medium px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => removeGarbageItem(index)}
                                className="text-red-600 hover:text-red-900"
                              >
                                削除
                              </button>
                            </div>
                            <div className="mt-2">
                              <select
                                value={item.category}
                                onChange={(e) => updateGarbageItem(index, 'category', e.target.value)}
                                className="px-3 py-1 border rounded text-sm mb-2"
                              >
                                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                  <option key={key} value={key}>{label}</option>
                                ))}
                              </select>
                            </div>
                            <textarea
                              value={item.description}
                              onChange={(e) => updateGarbageItem(index, 'description', e.target.value)}
                              className="w-full px-2 py-1 border rounded text-sm mt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              rows={2}
                            />
                            <p className="text-sm text-gray-600 mt-2">
                              例: {item.examples.join('、')}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-2xl font-semibold mb-4">ステップ3: Firestoreに保存</h2>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-lg font-medium"
                  >
                    {loading ? '保存中...' : 'データを保存'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

