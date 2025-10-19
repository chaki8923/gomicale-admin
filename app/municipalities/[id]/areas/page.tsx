'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Plus, Trash2, Edit } from 'lucide-react';
import { useParams } from 'next/navigation';

interface Area {
  id: string;
  name: string;
  schedule: {
    burnable?: number[];
    nonBurnable?: number[];
    recyclable?: number[];
    bottles?: number[];
  };
}

interface Municipality {
  id: string;
  prefecture: string;
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const CATEGORY_LABELS: { [key: string]: string } = {
  burnable: '燃やすごみ',
  nonBurnable: '燃やさないごみ',
  recyclable: '資源ごみ',
  bottles: 'びん・缶'
};

export default function AreasPage() {
  const params = useParams();
  const municipalityId = params.id as string;
  
  const [municipality, setMunicipality] = useState<Municipality | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    burnable: [] as number[],
    nonBurnable: [] as number[],
    recyclable: [] as number[],
    bottles: [] as number[]
  });

  useEffect(() => {
    fetchData();
  }, [municipalityId]);

  const fetchData = async () => {
    try {
      // 市町村情報を取得
      const municipalityDoc = await getDoc(doc(db, 'municipalities', municipalityId));
      if (municipalityDoc.exists()) {
        setMunicipality({
          id: municipalityDoc.id,
          ...municipalityDoc.data()
        } as Municipality);
      }

      // 地域情報を取得
      const areasSnapshot = await getDocs(
        collection(db, 'municipalities', municipalityId, 'areas')
      );
      const areasData = areasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Area));
      setAreas(areasData);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const scheduleData = {
        burnable: formData.burnable,
        nonBurnable: formData.nonBurnable,
        recyclable: formData.recyclable,
        bottles: formData.bottles
      };

      if (editingArea) {
        await updateDoc(
          doc(db, 'municipalities', municipalityId, 'areas', editingArea.id),
          {
            name: formData.name,
            schedule: scheduleData
          }
        );
        alert('エリアを更新しました');
      } else {
        await addDoc(collection(db, 'municipalities', municipalityId, 'areas'), {
          name: formData.name,
          schedule: scheduleData
        });
        alert('エリアを追加しました');
      }

      setFormData({
        name: '',
        burnable: [],
        nonBurnable: [],
        recyclable: [],
        bottles: []
      });
      setShowForm(false);
      setEditingArea(null);
      fetchData();
    } catch (error) {
      console.error('Error saving area:', error);
      alert('エリアの保存に失敗しました');
    }
  };

  const handleEdit = (area: Area) => {
    setEditingArea(area);
    setFormData({
      name: area.name,
      burnable: area.schedule.burnable || [],
      nonBurnable: area.schedule.nonBurnable || [],
      recyclable: area.schedule.recyclable || [],
      bottles: area.schedule.bottles || []
    });
    setShowForm(true);
  };

  const handleDelete = async (areaId: string, name: string) => {
    if (!confirm(`${name}を削除しますか？`)) return;
    try {
      await deleteDoc(doc(db, 'municipalities', municipalityId, 'areas', areaId));
      fetchData();
      alert('エリアを削除しました');
    } catch (error) {
      console.error('Error deleting area:', error);
      alert('エリアの削除に失敗しました');
    }
  };

  const toggleWeekday = (category: 'burnable' | 'nonBurnable' | 'recyclable' | 'bottles', day: number) => {
    const current = formData[category];
    if (current.includes(day)) {
      setFormData({
        ...formData,
        [category]: current.filter(d => d !== day)
      });
    } else {
      setFormData({
        ...formData,
        [category]: [...current, day].sort()
      });
    }
  };

  const getScheduleDisplay = (schedule: Area['schedule']) => {
    const items: string[] = [];
    Object.entries(schedule).forEach(([category, days]) => {
      if (days && days.length > 0) {
        const weekdayStr = days.map(d => WEEKDAYS[d]).join('・');
        items.push(`${CATEGORY_LABELS[category]}: ${weekdayStr}`);
      }
    });
    return items.join(' / ') || '未設定';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-xl">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link href="/municipalities" className="text-blue-600 hover:underline mb-4 inline-block">
            ← 都道府県一覧に戻る
          </Link>
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">エリア管理</h1>
              {municipality && (
                <p className="text-xl text-gray-600 mt-2">
                  {municipality.prefecture}
                </p>
              )}
            </div>
            <button
              onClick={() => {
                setEditingArea(null);
                setFormData({
                  name: '',
                  burnable: [],
                  nonBurnable: [],
                  recyclable: [],
                  bottles: []
                });
                setShowForm(!showForm);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
            >
              <Plus className="w-5 h-5 mr-2" />
              新規追加
            </button>
          </div>
        </div>

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-2xl font-semibold mb-4">
              {editingArea ? 'エリアを編集' : 'エリアを追加'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-gray-700 mb-2 font-medium">エリア名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: 渋谷区"
                  required
                />
              </div>

              <div className="space-y-6">
                {(['burnable', 'nonBurnable', 'recyclable', 'bottles'] as const).map(category => (
                  <div key={category} className="border-t pt-4">
                    <label className="block text-gray-700 mb-3 font-medium">
                      {CATEGORY_LABELS[category]}
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {WEEKDAYS.map((day, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => toggleWeekday(category, index)}
                          className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                            formData[category].includes(index)
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {day}曜日
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingArea ? '更新' : '追加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingArea(null);
                  }}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          {areas.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              エリアが登録されていません
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {areas.map((area) => (
                <div key={area.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {area.name}
                      </h3>
                      <p className="text-gray-600">{getScheduleDisplay(area.schedule)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/municipalities/${municipalityId}/areas/${area.id}/garbage-items`}
                        className="text-green-600 hover:text-green-900 inline-flex items-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        分別品目
                      </Link>
                      <button
                        onClick={() => handleEdit(area)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(area.id, area.name)}
                        className="text-red-600 hover:text-red-900 inline-flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

