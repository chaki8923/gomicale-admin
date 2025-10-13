'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Link from 'next/link';
import { Plus, Trash2, Edit } from 'lucide-react';

interface GarbageItem {
  id: string;
  municipalityId: string;
  name: string;
  category: 'burnable' | 'nonBurnable' | 'recyclable' | 'bottles';
  description: string;
  examples: string[];
}

interface Municipality {
  id: string;
  name: string;
}

const CATEGORY_OPTIONS = [
  { value: 'burnable', label: '燃やすごみ' },
  { value: 'nonBurnable', label: '燃やさないごみ' },
  { value: 'recyclable', label: '資源ごみ' },
  { value: 'bottles', label: 'びん・缶' }
];

export default function GarbageItemsPage() {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [items, setItems] = useState<GarbageItem[]>([]);
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<GarbageItem | null>(null);
  const [formData, setFormData] = useState({
    municipalityId: '',
    name: '',
    category: 'burnable' as GarbageItem['category'],
    description: '',
    examples: ['']
  });

  useEffect(() => {
    fetchMunicipalities();
  }, []);

  useEffect(() => {
    if (selectedMunicipalityId) {
      fetchItems();
    }
  }, [selectedMunicipalityId]);

  const fetchMunicipalities = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'municipalities'));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name
      } as Municipality));
      setMunicipalities(data);
      if (data.length > 0) {
        setSelectedMunicipalityId(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching municipalities:', error);
      alert('市町村データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      const q = query(
        collection(db, 'garbageItems'),
        where('municipalityId', '==', selectedMunicipalityId)
      );
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as GarbageItem));
      setItems(data);
    } catch (error) {
      console.error('Error fetching items:', error);
      alert('ごみ分別データの取得に失敗しました');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemData = {
        municipalityId: formData.municipalityId,
        name: formData.name,
        category: formData.category,
        description: formData.description,
        examples: formData.examples.filter(ex => ex.trim() !== '')
      };

      if (editingItem) {
        await updateDoc(doc(db, 'garbageItems', editingItem.id), itemData);
        alert('品目を更新しました');
      } else {
        await addDoc(collection(db, 'garbageItems'), itemData);
        alert('品目を追加しました');
      }

      setFormData({
        municipalityId: '',
        name: '',
        category: 'burnable',
        description: '',
        examples: ['']
      });
      setShowForm(false);
      setEditingItem(null);
      fetchItems();
    } catch (error) {
      console.error('Error saving item:', error);
      alert('品目の保存に失敗しました');
    }
  };

  const handleEdit = (item: GarbageItem) => {
    setEditingItem(item);
    setFormData({
      municipalityId: item.municipalityId,
      name: item.name,
      category: item.category,
      description: item.description,
      examples: item.examples.length > 0 ? item.examples : ['']
    });
    setShowForm(true);
  };

  const handleDelete = async (itemId: string, name: string) => {
    if (!confirm(`${name}を削除しますか？`)) return;
    try {
      await deleteDoc(doc(db, 'garbageItems', itemId));
      fetchItems();
      alert('品目を削除しました');
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('品目の削除に失敗しました');
    }
  };

  const addExampleField = () => {
    setFormData({
      ...formData,
      examples: [...formData.examples, '']
    });
  };

  const removeExampleField = (index: number) => {
    setFormData({
      ...formData,
      examples: formData.examples.filter((_, i) => i !== index)
    });
  };

  const updateExample = (index: number, value: string) => {
    const newExamples = [...formData.examples];
    newExamples[index] = value;
    setFormData({
      ...formData,
      examples: newExamples
    });
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORY_OPTIONS.find(opt => opt.value === category)?.label || category;
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
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← ダッシュボードに戻る
          </Link>
          <div className="flex justify-between items-center">
            <h1 className="text-4xl font-bold text-gray-900">ごみ分別管理</h1>
            <button
              onClick={() => {
                setEditingItem(null);
                setFormData({
                  municipalityId: selectedMunicipalityId,
                  name: '',
                  category: 'burnable',
                  description: '',
                  examples: ['']
                });
                setShowForm(!showForm);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700"
              disabled={!selectedMunicipalityId}
            >
              <Plus className="w-5 h-5 mr-2" />
              新規追加
            </button>
          </div>
        </div>

        {municipalities.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
            <p className="text-yellow-800">
              先に市町村を登録してください。
            </p>
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-gray-700 mb-2 font-medium">市町村を選択</label>
            <select
              value={selectedMunicipalityId}
              onChange={(e) => setSelectedMunicipalityId(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {municipalities.map(m => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {showForm && (
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-2xl font-semibold mb-4">
              {editingItem ? '品目を編集' : '品目を追加'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">市町村</label>
                <select
                  value={formData.municipalityId}
                  onChange={(e) => setFormData({ ...formData, municipalityId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">選択してください</option>
                  {municipalities.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">品目名</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: ペットボトル"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">分別カテゴリー</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value as GarbageItem['category'] })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">出し方の説明</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例: キャップとラベルを外して、中をすすいでから出してください"
                  rows={3}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 mb-2 font-medium">具体例</label>
                {formData.examples.map((example, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={example}
                      onChange={(e) => updateExample(index, e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例: 飲料用ペットボトル"
                    />
                    {formData.examples.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeExampleField(index)}
                        className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                      >
                        削除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addExampleField}
                  className="text-blue-600 hover:underline text-sm"
                >
                  + 例を追加
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  {editingItem ? '更新' : '追加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingItem(null);
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
          {!selectedMunicipalityId ? (
            <div className="p-8 text-center text-gray-500">
              市町村を選択してください
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              品目が登録されていません
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {items.map((item) => (
                <div key={item.id} className="p-6 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {item.name}
                        </h3>
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                          {getCategoryLabel(item.category)}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{item.description}</p>
                      {item.examples.length > 0 && (
                        <p className="text-sm text-gray-500">
                          例: {item.examples.join('、')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        編集
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
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

