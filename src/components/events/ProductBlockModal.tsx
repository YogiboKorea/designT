'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button, Segmented, Space, Input, Select, ColorPicker } from 'antd';
import { DeleteOutlined, PlusOutlined, MenuOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { MessageInstance } from 'antd/es/message/interface';
import MorePrd, { ProductItem } from './MorePrd';
import type { CategoryItem, EventBlock, ProductLite } from './event-blocks-shared';

const { Option } = Select;

// 카테고리 Select 검색: 카테고리명 + 카테고리 번호 둘 다로 매칭.
const catFilter = (input: string, option?: { children?: React.ReactNode; value?: string | number }) => {
  const kw = (input || '').trim().toLowerCase();
  if (!kw) return true;
  const label = String(option?.children ?? '').toLowerCase();
  const val = String(option?.value ?? '');
  return label.includes(kw) || val.includes(input.trim());
};

interface ProductBlockModalProps {
  visible: boolean;
  onCancel: () => void;
  onOk: (block: EventBlock) => void;
  msgApi: MessageInstance;
  isMobile: boolean;
  allCats: CategoryItem[];
  initialData?: EventBlock | null;
}

export default function ProductBlockModal({
  visible,
  onCancel,
  onOk,
  msgApi,
  isMobile,
  allCats,
  initialData,
}: ProductBlockModalProps) {
  const [form] = Form.useForm();
  const [registerMode, setRegisterMode] = useState<'direct' | 'category'>('direct');
  const [gridSize, setGridSize] = useState(2);
  const [layoutType, setLayoutType] = useState<'single' | 'tabs'>('single');
  const [singleRoot, setSingleRoot] = useState<string | null>(null);
  const [singleSub, setSingleSub] = useState<string | null>(null);
  // 드롭다운에 없는(번호만 아는) 카테고리를 직접 입력하기 위한 값.
  const [singleManualCat, setSingleManualCat] = useState<string>('');
  const roots = allCats.filter((c) => c.category_depth === 1);
  const subs = allCats.filter((c) => c.category_depth === 2 && String(c.parent_category_no) === singleRoot);
  const subExists = useCallback((no: string | number | null | undefined) =>
    !!no && allCats.some((c) => String(c.category_no) === String(no) && c.category_depth === 2), [allCats]);
  const catExists = useCallback((no: string | number | null | undefined) =>
    !!no && allCats.some((c) => String(c.category_no) === String(no)), [allCats]);
  const [tabs, setTabs] = useState<Array<{ title: string; root: string | null; sub: string | null; manual?: string }>>([
    { title: '', root: null, sub: null },
    { title: '', root: null, sub: null },
  ]);
  const [activeColor, setActiveColor] = useState('#fe6326');
  // 탭 헤더 한 줄당 몇 개 — 0/null 이면 자동(전체 한 줄). 2/3/4 면 줄바꿈.
  const [tabsPerRow, setTabsPerRow] = useState<number | null>(null);
  // 탭 콘텐츠 영역 너비 — 'default'(가운데 800px) | 'wide'(95% 가운데) | 'full'(100% 꽉 채움)
  const [tabWidthMode, setTabWidthMode] = useState<'default' | 'wide' | 'full'>('default');
  const [directProducts, setDirectProducts] = useState<ProductLite[]>([]);
  const [tabDirectProducts, setTabDirectProducts] = useState<Record<number, ProductLite[]>>({});
  // 탭별 그리드 사이즈 — 없으면 상단 gridSize 를 fallback 으로 사용.
  const [tabGridSizes, setTabGridSizes] = useState<Record<number, number>>({});
  const [morePrdVisible, setMorePrdVisible] = useState(false);
  const [morePrdTarget, setMorePrdTarget] = useState<'direct' | 'tab'>('direct');
  const [morePrdTabIndex, setMorePrdTabIndex] = useState(0);
  const [initialSelected, setInitialSelected] = useState<ProductItem[]>([]);

  useEffect(() => {
    if (visible && initialData) {
      setRegisterMode((initialData.registerMode as 'direct' | 'category') || 'direct');
      setGridSize(initialData.gridSize || 2);
      setTabGridSizes(initialData.tabGridSizes || {});
      setLayoutType((initialData.layoutType as 'single' | 'tabs') || 'single');
      setTabsPerRow(initialData.tabsPerRow ?? null);
      setTabWidthMode(initialData.tabWidthMode || 'default');
      if (initialData.registerMode === 'category') {
        if (initialData.layoutType === 'single') {
          const rootVal = initialData.root ? String(initialData.root) : null;
          const subVal = initialData.sub ? String(initialData.sub) : null;
          // 저장된 sub 가 카테고리 목록에 없으면 = 번호 직접 입력한 값 → 수동 입력칸으로 복원.
          if (subVal && !subExists(subVal)) {
            setSingleManualCat(subVal);
            setSingleRoot(rootVal && catExists(rootVal) ? rootVal : null);
            setSingleSub(null);
          } else {
            setSingleRoot(rootVal);
            setSingleSub(subVal);
            setSingleManualCat('');
          }
        } else if (initialData.layoutType === 'tabs') {
          const loaded = (initialData.tabs || [
            { title: '', root: null, sub: null },
            { title: '', root: null, sub: null },
          ]).map((t) => {
            const subVal = t.sub ? String(t.sub) : null;
            if (subVal && !subExists(subVal)) {
              return { ...t, manual: subVal, sub: null };
            }
            return { ...t, manual: '' };
          });
          setTabs(loaded);
          setActiveColor(initialData.activeColor || '#fe6326');
        }
      } else if (initialData.registerMode === 'direct') {
        if (initialData.layoutType === 'single') {
          setDirectProducts(initialData.directProducts || []);
        } else if (initialData.layoutType === 'tabs') {
          setTabDirectProducts(initialData.tabDirectProducts || {});
          setTabs(initialData.tabs || [
            { title: '', root: null, sub: null },
            { title: '', root: null, sub: null },
          ]);
          setActiveColor(initialData.activeColor || '#fe6326');
        }
      }
    } else if (visible) {
      form.resetFields();
      setRegisterMode('direct');
      setGridSize(2);
      setTabGridSizes({});
      setLayoutType('single');
      setSingleRoot(null);
      setSingleSub(null);
      setSingleManualCat('');
      setTabs([
        { title: '', root: null, sub: null },
        { title: '', root: null, sub: null },
      ]);
      setActiveColor('#fe6326');
      setDirectProducts([]);
      setTabDirectProducts({});
      setTabsPerRow(null);
      setTabWidthMode('default');
    }
  }, [visible, initialData, form, subExists, catExists]);

  const handleRegisterModeChange = useCallback((val: 'direct' | 'category') => {
    setRegisterMode(val);
    setLayoutType('single');
    setSingleRoot(null);
    setSingleSub(null);
    setSingleManualCat('');
    setTabs([
      { title: '', root: null, sub: null },
      { title: '', root: null, sub: null },
    ]);
    setActiveColor('#fe6326');
    setDirectProducts([]);
    setTabDirectProducts({});
  }, []);

  const handleLayoutTypeChange = useCallback((val: 'single' | 'tabs') => {
    setLayoutType(val);
    setSingleRoot(null);
    setSingleSub(null);
    setSingleManualCat('');
    setTabs([
      { title: '', root: null, sub: null },
      { title: '', root: null, sub: null },
    ]);
    setActiveColor('#fe6326');
    setDirectProducts([]);
    setTabDirectProducts({});
    setTabGridSizes({});
  }, []);

  // 탭 추가 시점에는 별도 검증 없이 그냥 추가. 최종 저장(handleOk) 단계에서
  // 모든 탭에 상품/카테고리가 채워져 있는지 한 번에 확인하고 경고함.
  const addTab = useCallback(() => {
    if (tabs.length >= 11) return;
    setTabs((ts) => [...ts, { title: '', root: null, sub: null }]);
  }, [tabs]);

  const updateTab = useCallback((i: number, key: 'title' | 'root' | 'sub' | 'manual', val: string | null) => {
    setTabs((ts) => {
      const a = [...ts];
      a[i] = { ...a[i], [key]: val, ...(key === 'root' ? { sub: null } : {}) };
      return a;
    });
  }, []);

  const removeTab = useCallback((index: number) => {
    setTabs((prev) => {
      if (prev.length <= 2) return prev;
      return prev.filter((_, i) => i !== index);
    });
    const shiftIndexMap = <T,>(prev: Record<number, T>): Record<number, T> => {
      const next: Record<number, T> = {};
      Object.keys(prev)
        .map(Number)
        .filter((k) => !isNaN(k))
        .sort((a, b) => a - b)
        .forEach((k) => {
          if (k < index) next[k] = prev[k];
          else if (k > index) next[k - 1] = prev[k];
        });
      return next;
    };
    setTabDirectProducts(shiftIndexMap);
    setTabGridSizes(shiftIndexMap);
  }, []);

  // 탭 순서 변경 — tabs 배열 + tabDirectProducts/tabGridSizes 의 index 도 함께 이동
  const reorderIndexMap = <T,>(
    prev: Record<number, T>,
    from: number,
    to: number,
  ): Record<number, T> => {
    if (from === to) return prev;
    const next: Record<number, T> = {};
    const keys = Object.keys(prev).map(Number).filter((k) => !isNaN(k));
    keys.forEach((k) => {
      let newK = k;
      if (k === from) newK = to;
      else if (from < to && k > from && k <= to) newK = k - 1;
      else if (from > to && k >= to && k < from) newK = k + 1;
      next[newK] = prev[k];
    });
    return next;
  };

  const moveTab = useCallback((from: number, to: number) => {
    if (from === to) return;
    setTabs((ts) => {
      const arr = [...ts];
      const [moved] = arr.splice(from, 1);
      arr.splice(to, 0, moved);
      return arr;
    });
    setTabDirectProducts((prev) => reorderIndexMap(prev, from, to));
    setTabGridSizes((prev) => reorderIndexMap(prev, from, to));
  }, []);

  const openMorePrd = useCallback(
    (target: 'direct' | 'tab', tabIndex = 0) => {
      setMorePrdTarget(target);
      setInitialSelected(target === 'direct' ? (directProducts as ProductItem[]) : ((tabDirectProducts[tabIndex] || []) as ProductItem[]));
      setMorePrdTabIndex(tabIndex);
      setMorePrdVisible(true);
    },
    [directProducts, tabDirectProducts]
  );

  const handleMorePrdOk = useCallback(
    (selected: ProductItem[]) => {
      if (morePrdTarget === 'direct') setDirectProducts(selected);
      else setTabDirectProducts((prev) => ({ ...prev, [morePrdTabIndex]: selected }));
      setMorePrdVisible(false);
    },
    [morePrdTarget, morePrdTabIndex]
  );

  const handleOk = useCallback(() => {
    if (!registerMode) {
      msgApi.warning('상품 등록 방식을 선택하세요.');
      return;
    }
    if (!gridSize || !layoutType) {
      msgApi.warning('그리드와 노출 방식을 선택하세요.');
      return;
    }
    if (registerMode === 'direct') {
      if (layoutType === 'single' && directProducts.length === 0) {
        msgApi.warning('상품을 1개 이상 추가해주세요.');
        return;
      }
      if (layoutType === 'tabs') {
        const hasProductsInAllTabs = tabs.every((_, i) => (tabDirectProducts[i] || []).length > 0);
        if (!hasProductsInAllTabs) {
          msgApi.warning('모든 탭에 상품을 1개 이상 추가해주세요.');
          return;
        }
      }
    }
    if (registerMode === 'category') {
      if (layoutType === 'single' && !singleRoot && !singleManualCat.trim()) {
        msgApi.warning('카테고리를 선택하거나 번호를 직접 입력해주세요.');
        return;
      }
      if (layoutType === 'tabs') {
        const hasCategoryInEveryTab = tabs.every((t) => t.root || (t.manual || '').trim());
        if (!hasCategoryInEveryTab) {
          msgApi.warning('모든 탭에 카테고리를 설정하거나 번호를 직접 입력해주세요.');
          return;
        }
      }
    }

    const blockData: EventBlock = {
      id: initialData?.id || Date.now().toString() + Math.random(),
      type: 'product_group',
      registerMode,
      gridSize,
      layoutType,
    };
    if (registerMode === 'category') {
      if (layoutType === 'single') {
        // 수동 입력 번호가 있으면 그게 우선(fetch 는 sub || root 순). 없으면 드롭다운 값.
        const manual = singleManualCat.trim();
        blockData.root = (singleRoot || manual) || undefined;
        blockData.sub = (manual || singleSub) || undefined;
      } else {
        // 탭별 수동 입력 번호를 sub 로 접어서 저장 → 위젯(sub||root)이 그대로 사용.
        blockData.tabs = tabs.map((t) => {
          const manual = (t.manual || '').trim();
          return {
            title: t.title,
            root: (t.root || manual) || null,
            sub: (manual || t.sub) || null,
          };
        });
        blockData.activeColor = activeColor;
      }
    } else if (registerMode === 'direct') {
      if (layoutType === 'single') {
        blockData.directProducts = directProducts;
      } else {
        blockData.tabDirectProducts = tabDirectProducts;
        blockData.tabs = tabs;
        blockData.activeColor = activeColor;
      }
    }
    // 탭 모드면 탭별 그리드 사이즈 저장 (값이 한 개라도 있으면 포함)
    if (layoutType === 'tabs' && Object.keys(tabGridSizes).length > 0) {
      blockData.tabGridSizes = tabGridSizes;
    }
    // 탭 줄당 개수 (선택사항)
    if (layoutType === 'tabs' && tabsPerRow && tabsPerRow >= 2) {
      blockData.tabsPerRow = tabsPerRow;
    }
    // 탭 콘텐츠 너비 (기본값 아닐 때만 저장)
    if (layoutType === 'tabs' && tabWidthMode !== 'default') {
      blockData.tabWidthMode = tabWidthMode;
    }
    onOk(blockData);
    onCancel();
  }, [registerMode, gridSize, layoutType, singleRoot, singleSub, singleManualCat, tabs, activeColor, directProducts, tabDirectProducts, tabGridSizes, tabsPerRow, tabWidthMode, onOk, onCancel, msgApi, initialData]);

  return (
    <Modal
      open={visible}
      title={initialData ? '상품 블록 편집' : '상품 블록 추가'}
      onCancel={onCancel}
      onOk={handleOk}
      okText={initialData ? '수정' : '추가'}
      width={isMobile ? '90%' : 700}
      destroyOnHidden
    >
      <Form form={form} layout="vertical">
        <h4 style={{ marginTop: 0 }}>상품 등록 방식</h4>
        <Segmented
          options={[
            { label: '직접 등록', value: 'direct' },
            { label: '카테고리', value: 'category' },
          ]}
          value={registerMode}
          onChange={(v) => handleRegisterModeChange(v as 'direct' | 'category')}
          block
          style={{ marginBottom: 24 }}
        />

        <h4>그리드 사이즈{layoutType === 'tabs' ? ' (기본값 — 탭별로 별도 지정 가능)' : ''}</h4>
        <Space style={{ marginBottom: 16 }}>
          {[1, 2, 3, 4].map((n) => (
            <Button key={n} type={gridSize === n ? 'primary' : 'default'} onClick={() => setGridSize(n)}>
              {n}×{n}
            </Button>
          ))}
        </Space>

        <h4>노출 방식</h4>
        <Segmented
          options={[
            { label: '단품', value: 'single' },
            { label: '탭', value: 'tabs' },
          ]}
          value={layoutType}
          onChange={(v) => handleLayoutTypeChange(v as 'single' | 'tabs')}
          block
        />

        {registerMode === 'category' && layoutType === 'single' && (
          <div style={{ marginTop: 24 }}>
            <Space wrap>
              <Select showSearch filterOption={catFilter} placeholder="대분류 (이름/번호 검색)" style={{ width: 220 }} value={singleRoot} onChange={(v) => setSingleRoot(v)} disabled={!!singleManualCat.trim()}>
                {roots.map((r) => (
                  <Option key={r.category_no} value={String(r.category_no)}>
                    {r.category_name} ({r.category_no})
                  </Option>
                ))}
              </Select>
              <Select showSearch filterOption={catFilter} placeholder="소분류 (이름/번호 검색)" style={{ width: 220 }} value={singleSub} onChange={(v) => setSingleSub(v)} disabled={!!singleManualCat.trim()}>
                {subs.map((s) => (
                  <Option key={s.category_no} value={String(s.category_no)}>
                    {s.category_name} ({s.category_no})
                  </Option>
                ))}
              </Select>
            </Space>
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#888', whiteSpace: 'nowrap' }}>또는 번호 직접 입력</span>
              <Input
                placeholder="카테고리 번호 (예: 1167)"
                style={{ width: 220 }}
                value={singleManualCat}
                onChange={(e) => setSingleManualCat(e.target.value.replace(/[^0-9]/g, ''))}
                allowClear
              />
            </div>
            {singleManualCat.trim() && (
              <div style={{ marginTop: 6, fontSize: 12, color: '#fa8c16' }}>
                번호 직접 입력 사용 중 — 위 드롭다운 선택은 무시됩니다. (지우면 다시 드롭다운 사용)
              </div>
            )}
          </div>
        )}

        {registerMode === 'category' && layoutType === 'tabs' && (
          <>
            <div style={{ marginTop: 16, marginBottom: 4, fontSize: 13, color: '#555' }}>
              ☰ 탭 좌측 핸들을 드래그해서 순서 변경 가능
            </div>
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return;
                moveTab(result.source.index, result.destination.index);
              }}
            >
              <Droppable droppableId="cat-tabs">
                {(prov) => (
                  <div ref={prov.innerRef} {...prov.droppableProps}>
                    {tabs.map((t, i) => (
                      <Draggable key={`cat-tab-${i}`} draggableId={`cat-tab-${i}`} index={i}>
                        {(dProv) => (
                          <div
                            ref={dProv.innerRef}
                            {...dProv.draggableProps}
                            style={{ ...dProv.draggableProps.style, padding: '4px 0' }}
                          >
                            <Space size="middle" style={{ alignItems: 'center', width: '100%' }}>
                              <span {...dProv.dragHandleProps} style={{ cursor: 'grab', color: '#888', padding: '4px' }}>
                                <MenuOutlined />
                              </span>
                              <Input placeholder={`탭 ${i + 1} 제목`} style={{ width: 110 }} value={t.title} onChange={(e) => updateTab(i, 'title', e.target.value)} />
                              <Select showSearch filterOption={catFilter} placeholder="대분류" style={{ width: 120 }} value={t.root} onChange={(v) => updateTab(i, 'root', v)} disabled={!!(t.manual || '').trim()}>
                                {roots.map((r) => (
                                  <Option key={r.category_no} value={String(r.category_no)}>
                                    {r.category_name} ({r.category_no})
                                  </Option>
                                ))}
                              </Select>
                              <Select showSearch filterOption={catFilter} placeholder="소분류" style={{ width: 120 }} value={t.sub} onChange={(v) => updateTab(i, 'sub', v)} disabled={!!(t.manual || '').trim()}>
                                {allCats
                                  .filter((c) => c.category_depth === 2 && String(c.parent_category_no) === t.root)
                                  .map((s) => (
                                    <Option key={s.category_no} value={String(s.category_no)}>
                                      {s.category_name} ({s.category_no})
                                    </Option>
                                  ))}
                              </Select>
                              <Input placeholder="번호 직접" style={{ width: 96 }} value={t.manual || ''} onChange={(e) => updateTab(i, 'manual', e.target.value.replace(/[^0-9]/g, ''))} allowClear />

                              <Select
                                value={tabGridSizes[i] ?? gridSize}
                                onChange={(v) => setTabGridSizes((prev) => ({ ...prev, [i]: v }))}
                                style={{ width: 88 }}
                                options={[
                                  { label: '1×1', value: 1 },
                                  { label: '2×2', value: 2 },
                                  { label: '3×3', value: 3 },
                                  { label: '4×4', value: 4 },
                                ]}
                              />
                              {tabs.length > 2 && (
                                <DeleteOutlined onClick={() => removeTab(i)} style={{ cursor: 'pointer', color: '#ff4d4f' }} />
                              )}
                            </Space>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {prov.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <Button type="dashed" block style={{ marginTop: 16 }} onClick={addTab} disabled={tabs.length >= 11}>
              <PlusOutlined /> 탭 추가
            </Button>
            <Space style={{ marginTop: 16, alignItems: 'center' }} wrap>
              <span>활성 탭 색:</span>
              <ColorPicker value={activeColor} onChangeComplete={(color) => setActiveColor(color.toHexString())} />
              <span style={{ marginLeft: 12 }}>탭 줄당 개수:</span>
              <Segmented
                options={[
                  { label: '자동(1줄)', value: 0 },
                  { label: '2개씩', value: 2 },
                  { label: '3개씩', value: 3 },
                  { label: '4개씩', value: 4 },
                ]}
                value={tabsPerRow ?? 0}
                onChange={(v) => setTabsPerRow(Number(v) || null)}
              />
              <span style={{ marginLeft: 12 }}>콘텐츠 너비:</span>
              <Segmented
                options={[
                  { label: '기본(800px 가운데)', value: 'default' },
                  { label: '넓게(95% 가운데)', value: 'wide' },
                  { label: '꽉 채움(100%)', value: 'full' },
                ]}
                value={tabWidthMode}
                onChange={(v) => setTabWidthMode(v as 'default' | 'wide' | 'full')}
              />
            </Space>
          </>
        )}

        {registerMode === 'direct' && layoutType === 'single' && (
          <Button type={directProducts.length > 0 ? 'primary' : 'dashed'} onClick={() => openMorePrd('direct')} style={{ marginTop: 16 }}>
            {directProducts.length ? `상품 ${directProducts.length}개 등록됨` : '상품 직접 등록'}
          </Button>
        )}

        {registerMode === 'direct' && layoutType === 'tabs' && (
          <>
            <div style={{ marginTop: 16, marginBottom: 4, fontSize: 13, color: '#555' }}>
              ☰ 탭 좌측 핸들을 드래그해서 순서 변경 가능
            </div>
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return;
                moveTab(result.source.index, result.destination.index);
              }}
            >
              <Droppable droppableId="dir-tabs">
                {(prov) => (
                  <div ref={prov.innerRef} {...prov.droppableProps}>
                    {tabs.map((t, i) => (
                      <Draggable key={`dir-tab-${i}`} draggableId={`dir-tab-${i}`} index={i}>
                        {(dProv) => (
                          <div
                            ref={dProv.innerRef}
                            {...dProv.draggableProps}
                            style={{ ...dProv.draggableProps.style, padding: '4px 0' }}
                          >
                            <Space size="middle" style={{ alignItems: 'center', width: '100%' }}>
                              <span {...dProv.dragHandleProps} style={{ cursor: 'grab', color: '#888', padding: '4px' }}>
                                <MenuOutlined />
                              </span>
                              <Input placeholder={`탭 ${i + 1} 제목`} style={{ width: 120 }} value={t.title} onChange={(e) => updateTab(i, 'title', e.target.value)} />
                              <Select
                                value={tabGridSizes[i] ?? gridSize}
                                onChange={(v) => setTabGridSizes((prev) => ({ ...prev, [i]: v }))}
                                style={{ width: 88 }}
                                options={[
                                  { label: '1×1', value: 1 },
                                  { label: '2×2', value: 2 },
                                  { label: '3×3', value: 3 },
                                  { label: '4×4', value: 4 },
                                ]}
                              />
                              <Button type={(tabDirectProducts[i] || []).length > 0 ? 'primary' : 'default'} onClick={() => openMorePrd('tab', i)}>
                                {(tabDirectProducts[i] || []).length ? `상품 ${(tabDirectProducts[i] || []).length}개 등록됨` : '상품 직접 등록'}
                              </Button>
                              {tabs.length > 2 && (
                                <DeleteOutlined onClick={() => removeTab(i)} style={{ cursor: 'pointer', color: '#ff4d4f' }} />
                              )}
                            </Space>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {prov.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
            <Button type="dashed" block style={{ marginTop: 16 }} onClick={addTab} disabled={tabs.length >= 11}>
              <PlusOutlined /> 탭 추가
            </Button>
            <Space style={{ marginTop: 16, alignItems: 'center' }} wrap>
              <span>활성 탭 색:</span>
              <ColorPicker value={activeColor} onChangeComplete={(color) => setActiveColor(color.toHexString())} />
              <span style={{ marginLeft: 12 }}>탭 줄당 개수:</span>
              <Segmented
                options={[
                  { label: '자동(1줄)', value: 0 },
                  { label: '2개씩', value: 2 },
                  { label: '3개씩', value: 3 },
                  { label: '4개씩', value: 4 },
                ]}
                value={tabsPerRow ?? 0}
                onChange={(v) => setTabsPerRow(Number(v) || null)}
              />
              <span style={{ marginLeft: 12 }}>콘텐츠 너비:</span>
              <Segmented
                options={[
                  { label: '기본(800px 가운데)', value: 'default' },
                  { label: '넓게(95% 가운데)', value: 'wide' },
                  { label: '꽉 채움(100%)', value: 'full' },
                ]}
                value={tabWidthMode}
                onChange={(v) => setTabWidthMode(v as 'default' | 'wide' | 'full')}
              />
            </Space>
          </>
        )}
      </Form>
      {morePrdVisible && (
        <MorePrd
          key={`more-prd-${morePrdTarget}-${morePrdTabIndex}`}
          visible={morePrdVisible}
          target={morePrdTarget}
          tabIndex={morePrdTabIndex}
          initialSelected={initialSelected}
          onOk={handleMorePrdOk}
          onCancel={() => setMorePrdVisible(false)}
        />
      )}
    </Modal>
  );
}
