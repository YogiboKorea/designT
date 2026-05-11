'use client';

import { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';

type TabType = 'campaign' | 'coupon' | 'main-visual' | 'product-section' | 'sticker';

export default function AdminTemplatesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('campaign');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [jsonText, setJsonText] = useState('');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/templates/${activeTab}?all=true`);
      const json = await res.json();
      if (json.success) setItems(json.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    setEditingItem(null);
  }, [activeTab]);

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setJsonText(JSON.stringify(item, null, 2));
  };

  const handleCreate = () => {
    const newItem = {
      name: '새 템플릿',
      description: '설명을 입력하세요',
      active: true,
    };
    setEditingItem(newItem);
    setJsonText(JSON.stringify(newItem, null, 2));
  };

  const handleSave = async () => {
    try {
      const parsed = JSON.parse(jsonText);
      const isNew = !parsed._id;
      
      const idField = activeTab === 'sticker' ? 'libraryId' : 'templateId';
      const endpoint = isNew 
        ? `/api/templates/${activeTab}` 
        : `/api/templates/${activeTab}/${parsed[idField]}`;

      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: jsonText,
      });

      const json = await res.json();
      if (json.success) {
        alert('저장되었습니다.');
        setEditingItem(null);
        fetchItems();
      } else {
        alert('저장 실패: ' + json.error);
      }
    } catch (e) {
      alert('유효하지 않은 JSON 형식입니다.');
    }
  };

  const handleDelete = async (item: any) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const idField = activeTab === 'sticker' ? 'libraryId' : 'templateId';
      const res = await fetch(`/api/templates/${activeTab}/${item[idField]}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        alert('삭제되었습니다.');
        fetchItems();
      } else {
        alert('삭제 실패: ' + json.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">템플릿 데이터 관리</h1>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex space-x-2 border-b border-gray-200 mb-8">
          {[
            { id: 'campaign', label: '캠페인 프롬프트' },
            { id: 'main-visual', label: '메인 비주얼' },
            { id: 'coupon', label: '쿠폰 템플릿' },
            { id: 'product-section', label: '상품 섹션' },
            { id: 'sticker', label: '스티커 라이브러리' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-6 py-3 font-semibold text-sm transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 목록 영역 */}
          <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-gray-800">등록된 항목 ({items.length})</h2>
              <button
                onClick={handleCreate}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm"
              >
                + 신규 추가
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {loading ? (
                <div className="p-4 text-center text-gray-500 text-sm">불러오는 중...</div>
              ) : items.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">데이터가 없습니다.</div>
              ) : (
                items.map((item) => {
                  const idField = activeTab === 'sticker' ? 'libraryId' : 'templateId';
                  const title = item.name || item.label || item[idField];
                  const isSelected = editingItem && editingItem._id === item._id;
                  
                  return (
                    <div
                      key={item._id}
                      onClick={() => handleEdit(item)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                          : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-sm text-gray-900 flex items-center gap-2">
                            {!item.active && <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 text-[10px] rounded">비활성</span>}
                            {item.emoji} {title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 truncate">
                            ID: {item[idField]}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item);
                          }}
                          className="text-red-400 hover:text-red-600 p-1"
                          title="삭제"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 에디터 영역 */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[700px]">
            {editingItem ? (
              <>
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                  <h2 className="font-bold text-gray-800">
                    {editingItem._id ? '템플릿 수정' : '새 템플릿 작성'} (JSON)
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingItem(null)}
                      className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded shadow-sm"
                    >
                      취소
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded shadow-sm"
                    >
                      저장하기
                    </button>
                  </div>
                </div>
                <div className="flex-1 p-0 relative">
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    className="w-full h-full p-4 font-mono text-sm bg-gray-900 text-green-400 focus:outline-none resize-none"
                    spellCheck={false}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <div className="text-4xl mb-2">👈</div>
                  <p>왼쪽 목록에서 수정할 항목을 선택하거나<br/>새로 추가해주세요.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
