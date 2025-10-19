'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, getDocs, addDoc, deleteDoc, updateDoc, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Trash2, Plus, Edit } from 'lucide-react';

type GarbageCategory = 
  | 'burnable'
  | 'nonBurnable'
  | 'recyclable'
  | 'bottles'
  | 'cans'
  | 'plastics'
  | 'pet_bottles'
  | 'paper_and_cloth'
  | 'hazardous_and_dangerous'
  | 'cooking_oil'
  | 'bottles_and_cans'
  | 'resources'
  | 'metal_pottery_glass';

interface GarbageItem {
  id: string;
  name_ja: string;
  name_en?: string;
  category: GarbageCategory;
  description_ja: string;
  description_en?: string;
  examples_ja: string[];
  examples_en?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface Area {
  id: string;
  name: string;
  name_en?: string;
}

interface Municipality {
  id: string;
  prefecture: string;
}

const categoryNames: Record<GarbageCategory, { ja: string; en: string }> = {
  burnable: { ja: '燃やすごみ', en: 'Burnable Waste' },
  nonBurnable: { ja: '燃やさないごみ', en: 'Non-Burnable Waste' },
  recyclable: { ja: '資源ごみ', en: 'Recyclables' },
  bottles: { ja: 'びん', en: 'Bottles' },
  cans: { ja: 'かん', en: 'Cans' },
  plastics: { ja: '容器包装プラスチック', en: 'Plastic Containers' },
  pet_bottles: { ja: 'ペットボトル', en: 'PET Bottles' },
  paper_and_cloth: { ja: '古布・紙類', en: 'Paper & Cloth' },
  hazardous_and_dangerous: { ja: '危険・有害ごみ', en: 'Hazardous Waste' },
  cooking_oil: { ja: '家庭廃食用油', en: 'Cooking Oil' },
  bottles_and_cans: { ja: 'びん・缶・小型電化製品', en: 'Bottles, Cans & Small Appliances' },
  resources: { ja: '資源物', en: 'Resources' },
  metal_pottery_glass: { ja: '金属・陶器・ガラス', en: 'Metal, Pottery & Glass' },
};

export default function GarbageItemsPage() {
  const params = useParams();
  const router = useRouter();
  const municipalityId = params.id as string;
  const areaId = params.areaId as string;

  const [municipality, setMunicipality] = useState<Municipality | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [garbageItems, setGarbageItems] = useState<GarbageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<GarbageItem | null>(null);
  const [formData, setFormData] = useState({
    name_ja: '',
    name_en: '',
    category: 'burnable' as GarbageCategory,
    description_ja: '',
    description_en: '',
    examples_ja: '',
    examples_en: '',
  });

  useEffect(() => {
    fetchData();
  }, [municipalityId, areaId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // 都道府県情報を取得
      const municipalityDoc = await getDoc(doc(db, 'municipalities', municipalityId));
      if (municipalityDoc.exists()) {
        setMunicipality({ id: municipalityDoc.id, ...municipalityDoc.data() } as Municipality);
      }

      // エリア情報を取得
      const areaDoc = await getDoc(doc(db, 'municipalities', municipalityId, 'areas', areaId));
      if (areaDoc.exists()) {
        setArea({ id: areaDoc.id, ...areaDoc.data() } as Area);
      }

      // ごみ分別品目を取得
      const itemsSnapshot = await getDocs(
        collection(db, 'municipalities', municipalityId, 'areas', areaId, 'garbageItems')
      );
      const items = itemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GarbageItem));
      setGarbageItems(items);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name_ja || !formData.category || !formData.description_ja || !formData.examples_ja) {
      alert('必須項目を入力してください');
      return;
    }

    try {
      const examples_ja = formData.examples_ja.split('\n').filter(e => e.trim());
      const examples_en = formData.examples_en ? formData.examples_en.split('\n').filter(e => e.trim()) : [];

      if (editingItem) {
        // 更新処理
        await updateDoc(
          doc(db, 'municipalities', municipalityId, 'areas', areaId, 'garbageItems', editingItem.id),
          {
            name_ja: formData.name_ja,
            name_en: formData.name_en || '',
            category: formData.category,
            description_ja: formData.description_ja,
            description_en: formData.description_en || '',
            examples_ja,
            examples_en,
            updatedAt: Timestamp.now(),
          }
        );
        alert('ごみ分別品目を更新しました');
      } else {
        // 新規追加処理
        await addDoc(
          collection(db, 'municipalities', municipalityId, 'areas', areaId, 'garbageItems'),
          {
            name_ja: formData.name_ja,
            name_en: formData.name_en || '',
            category: formData.category,
            description_ja: formData.description_ja,
            description_en: formData.description_en || '',
            examples_ja,
            examples_en,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }
        );
        alert('ごみ分別品目を追加しました');
      }

      setFormData({
        name_ja: '',
        name_en: '',
        category: 'burnable',
        description_ja: '',
        description_en: '',
        examples_ja: '',
        examples_en: '',
      });
      setEditingItem(null);

      fetchData();
    } catch (error) {
      console.error('Error saving garbage item:', error);
      alert(editingItem ? '更新に失敗しました' : '追加に失敗しました');
    }
  };

  const handleEdit = (item: GarbageItem) => {
    setEditingItem(item);
    setFormData({
      name_ja: item.name_ja,
      name_en: item.name_en || '',
      category: item.category,
      description_ja: item.description_ja,
      description_en: item.description_en || '',
      examples_ja: item.examples_ja.join('\n'),
      examples_en: item.examples_en ? item.examples_en.join('\n') : '',
    });
    // フォームまでスクロール
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setFormData({
      name_ja: '',
      name_en: '',
      category: 'burnable',
      description_ja: '',
      description_en: '',
      examples_ja: '',
      examples_en: '',
    });
  };

  const handleDelete = async (itemId: string, itemName: string) => {
    if (!confirm(`「${itemName}」を削除してもよろしいですか？`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'municipalities', municipalityId, 'areas', areaId, 'garbageItems', itemId));
      fetchData();
      alert('削除しました');
    } catch (error) {
      console.error('Error deleting garbage item:', error);
      alert('削除に失敗しました');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Link 
            href={`/municipalities/${municipalityId}/areas`} 
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← エリア一覧に戻る
          </Link>
          <h1 className="text-4xl font-bold text-gray-900">ごみ分別品目管理</h1>
          {municipality && area && (
            <p className="text-xl text-gray-600 mt-2">
              {municipality.prefecture} - {area.name}
            </p>
          )}
        </div>

        {/* 新規追加・編集フォーム */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">
              {editingItem ? '品目を編集' : '新規追加'}
            </h2>
            {editingItem && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-gray-600 hover:text-gray-800"
              >
                ✕ 編集をキャンセル
              </button>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  品目名（日本語）<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name_ja}
                  onChange={(e) => setFormData({ ...formData, name_ja: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: ペットボトル"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-medium">品目名（英語）</label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: PET Bottles"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 mb-2 font-medium">
                カテゴリー<span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as GarbageCategory })}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {Object.entries(categoryNames).map(([key, names]) => (
                  <option key={key} value={key}>
                    {names.ja} ({names.en})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  出し方・説明（日本語）<span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.description_ja}
                  onChange={(e) => setFormData({ ...formData, description_ja: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="例: キャップとラベルを外して、中をすすいでから出してください"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-medium">出し方・説明（英語）</label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="例: Remove cap and label, rinse inside before disposal"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 mb-2 font-medium">
                  具体例（日本語、1行に1つ）<span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.examples_ja}
                  onChange={(e) => setFormData({ ...formData, examples_ja: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="飲料用ペットボトル&#10;調味料のペットボトル"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2 font-medium">具体例（英語、1行に1つ）</label>
                <textarea
                  value={formData.examples_en}
                  onChange={(e) => setFormData({ ...formData, examples_en: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  placeholder="Beverage bottles&#10;Seasoning bottles"
                />
              </div>
            </div>

            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center"
            >
              {editingItem ? (
                <>
                  <Edit className="w-5 h-5 mr-2" />
                  更新
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5 mr-2" />
                  追加
                </>
              )}
            </button>
          </form>
        </div>

        {/* 品目一覧 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-semibold">登録済み品目 ({garbageItems.length}件)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    品目名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    カテゴリー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    出し方
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    具体例
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {garbageItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      登録されている品目がありません
                    </td>
                  </tr>
                ) : (
                  garbageItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{item.name_ja}</div>
                          {item.name_en && <div className="text-sm text-gray-500">{item.name_en}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded inline-block">
                          {categoryNames[item.category]?.ja || item.category}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs">
                        <div className="truncate">{item.description_ja}</div>
                        {item.description_en && <div className="truncate text-gray-500">{item.description_en}</div>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700">
                        <div className="space-y-1">
                          {item.examples_ja.slice(0, 2).map((example, idx) => (
                            <div key={idx} className="truncate">• {example}</div>
                          ))}
                          {item.examples_ja.length > 2 && (
                            <div className="text-gray-500">...他{item.examples_ja.length - 2}件</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(item.id, item.name_ja)}
                            className="text-red-600 hover:text-red-800 inline-flex items-center"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

