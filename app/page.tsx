import Link from 'next/link';
import { FileText, MapPin, Trash2, Upload } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          ごみカレ 管理画面
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/municipalities" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <MapPin className="w-8 h-8 text-blue-500 mr-3" />
                <h2 className="text-2xl font-semibold">市町村管理</h2>
              </div>
              <p className="text-gray-600">
                市町村と地域のごみ収集スケジュールを管理します
              </p>
            </div>
          </Link>

          <Link href="/garbage-items" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <Trash2 className="w-8 h-8 text-green-500 mr-3" />
                <h2 className="text-2xl font-semibold">ごみ分別管理</h2>
              </div>
              <p className="text-gray-600">
                ごみの分別方法と品目を管理します
              </p>
            </div>
          </Link>

          <Link href="/pdf-import" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <Upload className="w-8 h-8 text-purple-500 mr-3" />
                <h2 className="text-2xl font-semibold">PDF一括インポート</h2>
              </div>
              <p className="text-gray-600">
                PDFからAIでデータを自動抽出・登録します
              </p>
            </div>
          </Link>

          <Link href="/data-migration" className="block">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <FileText className="w-8 h-8 text-orange-500 mr-3" />
                <h2 className="text-2xl font-semibold">データ移行</h2>
              </div>
              <p className="text-gray-600">
                サンプルデータをFirestoreに移行します
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
