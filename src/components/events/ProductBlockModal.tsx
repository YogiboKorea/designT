'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Button, Segmented, Space, Input, Select, ColorPicker } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import type { MessageInstance } from 'antd/es/message/interface';
import MorePrd, { ProductItem } from './MorePrd';
import type { CategoryItem, EventBlock, ProductLite } from './event-blocks-shared';

const { Option } = Select;

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
  const roots = allCats.filter((c) => c.category_depth === 1);
  const subs = allCats.filter((c) => c.category_depth === 2 && String(c.parent_category_no) === singleRoot);
  const [tabs, setTabs] = useState<Array<{ title: string; root: string | null; sub: string | null }>>([
    { title: '', root: null, sub: null },
    { title: '', root: null, sub: null },
  ]);
  const [activeColor, setActiveColor] = useState('#fe6326');
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
      if (initialData.registerMode === 'category') {
        if (initialData.layoutType === 'single') {
          setSingleRoot(initialData.root ? String(initialData.root) : null);
          setSingleSub(initialData.sub ? String(initialData.sub) : null);
        } else if (initialData.layoutType === 'tabs') {
          setTabs(initialData.tabs || [
            { title: '', root: null, sub: null },
            { title: '', root: null, sub: null },
          ]);
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
      setTabs([
        { title: '', root: null, sub: null },
        { title: '', root: null, sub: null },
      ]);
      setActiveColor('#fe6326');
      setDirectProducts([]);
      setTabDirectProducts({});
    }
  }, [visible, initialData, form]);

  const handleRegisterModeChange = useCallback((val: 'direct' | 'category') => {
    setRegisterMode(val);
    setLayoutType('single');
    setSingleRoot(null);
    setSingleSub(null);
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

  const updateTab = useCallback((i: number, key: 'title' | 'root' | 'sub', val: string | null) => {
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
      if (layoutType === 'single' && !singleRoot) {
        msgApi.warning('카테고리를 선택해주세요.');
        return;
      }
      if (layoutType === 'tabs') {
        const hasCategoryInEveryTab = tabs.every((t) => t.root);
        if (!hasCategoryInEveryTab) {
          msgApi.warning('모든 탭에 카테고리를 설정해주세요.');
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
        blockData.root = singleRoot || undefined;
        blockData.sub = singleSub || undefined;
      } else {
        blockData.tabs = tabs;
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
    onOk(blockData);
    onCancel();
  }, [registerMode, gridSize, layoutType, singleRoot, singleSub, tabs, activeColor, directProducts, tabDirectProducts, tabGridSizes, onOk, onCancel, msgApi, initialData]);

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
          <Space style={{ marginTop: 24 }}>
            <Select placeholder="대분류" style={{ width: 180 }} value={singleRoot} onChange={(v) => setSingleRoot(v)}>
              {roots.map((r) => (
                <Option key={r.category_no} value={String(r.category_no)}>
                  {r.category_name}
                </Option>
              ))}
            </Select>
            <Select placeholder="소분류" style={{ width: 180 }} value={singleSub} onChange={(v) => setSingleSub(v)}>
              {subs.map((s) => (
                <Option key={s.category_no} value={String(s.category_no)}>
                  {s.category_name}
                </Option>
              ))}
            </Select>
          </Space>
        )}

        {registerMode === 'category' && layoutType === 'tabs' && (
          <>
            {tabs.map((t, i) => (
              <div key={i}>
                <Space size="middle" style={{ marginTop: 16, alignItems: 'center' }}>
                  <Input placeholder={`탭 ${i + 1} 제목`} style={{ width: 120 }} value={t.title} onChange={(e) => updateTab(i, 'title', e.target.value)} />
                  <Select placeholder="대분류" style={{ width: 140 }} value={t.root} onChange={(v) => updateTab(i, 'root', v)}>
                    {roots.map((r) => (
                      <Option key={r.category_no} value={String(r.category_no)}>
                        {r.category_name}
                      </Option>
                    ))}
                  </Select>
                  <Select placeholder="소분류" style={{ width: 140 }} value={t.sub} onChange={(v) => updateTab(i, 'sub', v)}>
                    {allCats
                      .filter((c) => c.category_depth === 2 && String(c.parent_category_no) === t.root)
                      .map((s) => (
                        <Option key={s.category_no} value={String(s.category_no)}>
                          {s.category_name}
                        </Option>
                      ))}
                  </Select>
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
            ))}
            <Button type="dashed" block style={{ marginTop: 16 }} onClick={addTab} disabled={tabs.length >= 11}>
              <PlusOutlined /> 탭 추가
            </Button>
            <Space style={{ marginTop: 12, alignItems: 'center' }}>
              <span>활성 탭 색:</span>
              <ColorPicker value={activeColor} onChangeComplete={(color) => setActiveColor(color.toHexString())} />
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
            {tabs.map((t, i) => (
              <div key={i}>
                <Space size="middle" style={{ marginTop: 16, alignItems: 'center' }}>
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
            ))}
            <Button type="dashed" block style={{ marginTop: 16 }} onClick={addTab} disabled={tabs.length >= 11}>
              <PlusOutlined /> 탭 추가
            </Button>
            <Space style={{ marginTop: 12, alignItems: 'center' }}>
              <span>활성 탭 색:</span>
              <ColorPicker value={activeColor} onChangeComplete={(color) => setActiveColor(color.toHexString())} />
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
