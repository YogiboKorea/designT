'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { App as AntdApp, Modal, Table, Input, Button } from 'antd';
import { FileImageOutlined } from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import cafe24Api from '@/lib/cafe24-api';
import { useMallId } from '@/lib/use-mall-id';

function Thumbnail({ src }: { src?: string }) {
  const [errored, setErrored] = useState(false);
  if (errored || !src) {
    return <FileImageOutlined style={{ fontSize: 50, color: '#ccc' }} />;
  }
  return (
    <img
      src={src}
      alt=""
      onError={() => setErrored(true)}
      style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, background: '#f0f0f0' }}
    />
  );
}

export interface ProductItem {
  product_no: number | string;
  product_name: string;
  list_image?: string;
  price?: string | number;
  /** cafe24 sold_out 필드 — 'T' 면 admin 미리보기에 SOLD OUT 오버레이 표시 */
  sold_out?: 'T' | 'F' | string;
  eng_product_name?: string;
  summary_description?: string;
  simple_description?: string;
}

interface MorePrdProps {
  visible: boolean;
  target?: 'direct' | 'tab';
  tabIndex?: number;
  initialSelected?: ProductItem[];
  onOk: (selected: ProductItem[]) => void;
  onCancel: () => void;
}

export default function MorePrd({
  visible,
  target = 'direct',
  tabIndex = 0,
  initialSelected = [],
  onOk,
  onCancel,
}: MorePrdProps) {
  const mallId = useMallId();
  const { message } = AntdApp.useApp();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [searchResults, setSearchResults] = useState<ProductItem[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<(number | string)[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<ProductItem[]>([]);

  const fetchPage = useCallback(async (page: number, pageSize: number) => {
    if (!mallId) {
      message.error('mallId가 없습니다.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await cafe24Api.get(`/api/${mallId}/products`, {
        params: { offset: (page - 1) * pageSize, limit: pageSize },
      });
      setProducts(data.products || []);
      setPagination({ current: page, pageSize, total: data.total || 0 });
    } catch (err) {
      console.error('[MorePrd] 상품 로드 실패', err);
      message.error('상품 로드에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [mallId]);

  const fetchAllAndFilter = useCallback(async (q: string) => {
    if (!mallId) {
      message.error('mallId가 없습니다.');
      return;
    }
    setLoading(true);
    try {
      let all: ProductItem[] = [];
      let offset = 0;
      const chunk = 100;
      // safety cap
      while (offset < 5000) {
        const res = await cafe24Api.get(`/api/${mallId}/products`, {
          params: { offset, limit: chunk },
        });
        const list: ProductItem[] = res.data.products || [];
        all = all.concat(list);
        if (list.length < chunk) break;
        offset += chunk;
      }
      const filtered = all.filter((p) => p.product_name?.toLowerCase().includes(q.toLowerCase()));
      setSearchResults(filtered);
      setProducts(filtered.slice(0, pagination.pageSize));
      setPagination({ current: 1, pageSize: pagination.pageSize, total: filtered.length });
    } catch (err) {
      console.error('[MorePrd] 검색 실패', err);
      message.error('검색에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [mallId, pagination.pageSize]);

  useEffect(() => {
    if (!visible) return;
    setSearchText('');
    fetchPage(1, pagination.pageSize);
    const initialKeys = initialSelected.map((p) => p.product_no);
    setSelectedRowKeys(initialKeys);
    setSelectedDetails(initialSelected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, initialSelected, mallId]);

  useEffect(() => {
    const missingKeys = selectedRowKeys.filter((k) => !selectedDetails.find((d) => d.product_no === k));
    if (!missingKeys.length) return;
    // ychat 의 list 엔드포인트는 summary_description 등 일부 필드가 누락된 slim 객체를 반환.
    // 선택된 상품은 항상 detail 엔드포인트에서 가져와 admin 미리보기/렌더에 필요한 필드를 확보한다.
    Promise.all(
      missingKeys.map((k) => {
        const fallback = products.find((p) => p.product_no === k) || searchResults.find((p) => p.product_no === k);
        return cafe24Api
          .get(`/api/${mallId}/products/${k}`)
          .then((res) => ({ data: { ...(fallback || {}), ...(res.data || {}) } }))
          .catch(() => (fallback ? { data: fallback } : null));
      })
    )
      .then((resps) =>
        setSelectedDetails((prev) => [
          ...prev,
          ...resps.filter((r): r is { data: ProductItem } => !!r && !!r.data).map((r) => r.data),
        ])
      )
      .catch((err) => {
        console.error('[MorePrd] 상세 추가 로드 실패', err);
        message.error('선택 상품 상세 추가 로드 실패');
      });
  }, [selectedRowKeys, products, searchResults, selectedDetails, mallId]);

  const onTableChange = (p: { current?: number; pageSize?: number }) => {
    const current = p.current || 1;
    const pageSize = p.pageSize || pagination.pageSize;
    if (searchText) {
      const start = (current - 1) * pageSize;
      setProducts(searchResults.slice(start, start + pageSize));
      setPagination({ current, pageSize, total: searchResults.length });
    } else {
      fetchPage(current, pageSize);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    preserveSelectedRowKeys: true,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as (number | string)[]),
  };

  const onDragEnd = useCallback(
    (result: { destination?: { index: number } | null; source: { index: number } }) => {
      if (!result.destination) return;
      const arr = Array.from(selectedRowKeys);
      const [m] = arr.splice(result.source.index, 1);
      arr.splice(result.destination.index, 0, m);
      setSelectedRowKeys(arr);
    },
    [selectedRowKeys]
  );

  const columns = [
    {
      title: '썸네일',
      dataIndex: 'list_image',
      width: 100,
      render: (src: string) => <Thumbnail src={src} />,
    },
    {
      title: '상품명',
      dataIndex: 'product_name',
      render: (text: string) => <span style={{ fontSize: 16, fontWeight: 500 }}>{text}</span>,
    },
    {
      title: '판매가',
      dataIndex: 'price',
      width: 150,
      render: (v: string | number) => (
        <span style={{ fontSize: 16, fontWeight: 500 }}>{`${Number(v).toLocaleString()}원`}</span>
      ),
    },
  ];

  return (
    <Modal
      title={target === 'direct' ? '상품 직접 등록' : `탭 ${tabIndex + 1} 등록`}
      open={visible}
      width={840}
      onCancel={onCancel}
      onOk={() => {
        const ordered = selectedRowKeys
          .map((key) => selectedDetails.find((d) => d.product_no === key))
          .filter(Boolean) as ProductItem[];
        onOk(ordered);
      }}
      okText="추가"
      cancelText="닫기"
    >
      <Input.Search
        placeholder="상품명 검색"
        allowClear
        enterButton
        onSearch={(q) => {
          setSearchText(q);
          if (q.trim()) fetchAllAndFilter(q);
          else fetchPage(1, pagination.pageSize);
        }}
        style={{ marginBottom: 16 }}
      />

      <Table
        rowKey="product_no"
        loading={loading}
        dataSource={products}
        columns={columns}
        pagination={pagination}
        onChange={onTableChange}
        rowSelection={rowSelection}
        scroll={{ y: 300 }}
      />

      {selectedRowKeys.length > 0 && (
        <>
          <h4 style={{ marginTop: 24 }}>선택된 상품 (드래그해서 순서 변경)</h4>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="sel-list">
              {(prov) => (
                <div
                  ref={prov.innerRef}
                  {...prov.droppableProps}
                  style={{ maxHeight: 250, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 4, padding: 8, marginTop: 8 }}
                >
                  {selectedRowKeys.map((key, idx) => {
                    const prod =
                      selectedDetails.find((d) => d.product_no === key) ||
                      ({ product_no: key, product_name: '로딩 중...' } as ProductItem);
                    return (
                      <Draggable key={key} draggableId={String(key)} index={idx}>
                        {(dProv) => (
                          <div
                            ref={dProv.innerRef}
                            {...dProv.draggableProps}
                            {...dProv.dragHandleProps}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: 8,
                              marginBottom: 4,
                              background: '#fff',
                              border: '1px solid #eee',
                              borderRadius: 4,
                              ...dProv.draggableProps.style,
                            }}
                          >
                            <Thumbnail src={prod.list_image} />
                            <div style={{ flex: 1, marginLeft: 16, display: 'flex', flexDirection: 'column' }}>
                              <div style={{ fontWeight: 'bold', fontSize: 16, color: '#333' }}>{prod.product_name}</div>
                              <div style={{ color: '#555', fontSize: 16, fontWeight: 'bold', marginTop: 4 }}>
                                {prod.price != null ? `${Number(prod.price).toLocaleString()}원` : '-'}
                              </div>
                            </div>
                            <Button
                              danger
                              size="small"
                              onClick={() => {
                                setSelectedRowKeys((prev) => prev.filter((x) => x !== key));
                                setSelectedDetails((prev) => prev.filter((d) => d.product_no !== key));
                              }}
                            >
                              취소
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {prov.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </>
      )}
    </Modal>
  );
}
