'use client';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  App as AntdApp, Card, Input, Button, Select, Space, Upload, Form, Modal, InputNumber, Checkbox, Alert, Grid, Divider,
} from 'antd';
import {
  UploadOutlined, DeleteOutlined, LinkOutlined, TagOutlined, VideoCameraAddOutlined, EditOutlined,
  FontSizeOutlined, BlockOutlined, ShoppingCartOutlined, YoutubeOutlined, SaveOutlined,
} from '@ant-design/icons';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useRouter } from 'next/navigation';
import sha256 from 'crypto-js/sha256';
import encHex from 'crypto-js/enc-hex';
import cafe24Api from '@/lib/cafe24-api';
import { useMallId } from '@/lib/use-mall-id';
import { persistImageToFtp } from '@/lib/image-upload';
import AppShell from '@/components/AppShell';
import ProductBlockModal from '@/components/events/ProductBlockModal';
import {
  YouTubeEmbed, renderGrid, getYouTubeId,
  type EventBlock, type RegionItem, type CategoryItem, type CouponOption,
} from '@/components/events/event-blocks-shared';

const { Option } = Select;
const { useBreakpoint } = Grid;

export default function EventCreatePage() {
  const router = useRouter();
  const mallId = useMallId();
  // <App> 컨텍스트의 message / modal 인스턴스 사용 (테마 컨텍스트 인식, deprecated 경고 회피).
  const { message: msgApi, modal } = AntdApp.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.sm;

  const draggingRef = useRef(false);
  const getItemStyle = (isDragging: boolean, draggableStyle: React.CSSProperties | undefined): React.CSSProperties => ({
    userSelect: 'none',
    transition: isDragging ? undefined : 'transform 200ms cubic-bezier(0.2,0,0,1), opacity 200ms',
    boxShadow: isDragging ? '0 6px 12px rgba(0,0,0,0.15)' : 'none',
    zIndex: isDragging ? 2 : 1,
    ...draggableStyle,
  });

  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState<EventBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewActiveTabs, setPreviewActiveTabs] = useState<Record<string, number>>({});

  const [allCats, setAllCats] = useState<CategoryItem[]>([]);
  const [couponOptions, setCouponOptions] = useState<CouponOption[]>([]);
  // 카테고리 모드 블록의 미리보기용 상품 목록 — categoryNo → ProductLite[].
  // ychat /api/{mallId}/categories/{cate}/products 응답을 그대로 보관.
  const [categoryProductsMap, setCategoryProductsMap] = useState<Record<string, import('@/components/events/event-blocks-shared').ProductLite[]>>({});
  // 이벤트 전체에 적용할 쿠폰 — widget.js 의 data-coupon-nos 로 전달되어
  // 상품 가격을 쿠폰 할인가(benefit_price) 로 표시함.
  const [eventCouponNos, setEventCouponNos] = useState<string[]>([]);

  // 미리보기에 적용할 최대 쿠폰 할인율(%) — 다중 선택 시 최대치 사용.
  const previewDiscountPercent = useMemo(() => {
    if (!eventCouponNos.length) return 0;
    return Math.max(
      0,
      ...eventCouponNos.map((no) => couponOptions.find((o) => o.value === no)?.discountPercent || 0)
    );
  }, [eventCouponNos, couponOptions]);

  useEffect(() => {
    if (!mallId) return;
    cafe24Api.get(`/api/${mallId}/categories/all`).then((res) => setAllCats(res.data || [])).catch(() => msgApi.error('카테고리 불러오기 실패'));
    cafe24Api
      .get(`/api/${mallId}/coupons`)
      .then((res) =>
        setCouponOptions(
          (res.data || []).map((c: { coupon_no: string; coupon_name: string; benefit_percentage: number }) => ({
            value: c.coupon_no,
            label: `${c.coupon_name} (${c.benefit_percentage}%)`,
            discountPercent: Number(c.benefit_percentage) || 0,
          }))
        )
      )
      .catch(() => msgApi.error('쿠폰 불러오기 실패'));
  }, [msgApi, mallId]);

  // 카테고리 모드 블록에서 사용하는 categoryNo 를 수집해 미리보기용 상품 목록을 prefetch.
  // 동일 categoryNo 가 여러 블록/탭에 쓰여도 한 번만 호출.
  useEffect(() => {
    if (!mallId) return;
    const needed = new Set<string>();
    blocks.forEach((b) => {
      if (b.type !== 'product_group' || b.registerMode !== 'category') return;
      if (b.layoutType === 'single') {
        const no = b.sub || b.root;
        if (no) needed.add(String(no));
      } else if (b.layoutType === 'tabs') {
        (b.tabs || []).forEach((t) => {
          const no = t.sub || t.root;
          if (no) needed.add(String(no));
        });
      }
    });
    needed.forEach((no) => {
      if (categoryProductsMap[no]) return;
      cafe24Api
        .get(`/api/${mallId}/categories/${no}/products`, { params: { limit: 300 } })
        .then((res) => {
          const arr = Array.isArray(res.data) ? res.data : (res.data?.products || []);
          setCategoryProductsMap((prev) => ({ ...prev, [no]: arr }));
        })
        .catch(() => {
          setCategoryProductsMap((prev) => ({ ...prev, [no]: [] }));
        });
    });
  }, [mallId, blocks, categoryProductsMap]);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const uploadProps = {
    accept: 'image/*',
    multiple: true,
    showUploadList: false,
    beforeUpload: (file: File) => {
      const maxSizeMB = 10;
      if (file.size / 1024 / 1024 > maxSizeMB) {
        msgApi.error(`이미지 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
        return Upload.LIST_IGNORE;
      }
      return true;
    },
    customRequest: ({ file, onSuccess }: { file: File | Blob | string; onSuccess?: (body: string) => void }) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const src = e.target?.result as string;
        const hash = sha256(src).toString(encHex);
        if (blocks.some((b) => b.hash && b.hash === hash)) {
          msgApi.warning('같은 이미지는 한 번만 업로드할 수 있습니다.');
          return;
        }
        const id = Date.now().toString() + Math.random();
        setBlocks((prev) => {
          const next: EventBlock[] = [...prev, { id, type: 'image', src, file: file as File, hash, regions: [] }];
          setSelectedId(id);
          return next;
        });
        onSuccess?.('ok');
      };
      reader.readAsDataURL(file as Blob);
    },
  };

  const onDragEnd = (result: { destination?: { index: number } | null; source: { index: number } }) => {
    if (!result.destination) return;
    const a = Array.from(blocks);
    const [m] = a.splice(result.source.index, 1);
    a.splice(result.destination.index, 0, m);
    setBlocks(a);
    requestAnimationFrame(() => { draggingRef.current = false; });
  };

  const deleteBlock = (idToDelete: string) => {
    setBlocks((prev) => {
      const newBlocks = prev.filter((b) => b.id !== idToDelete);
      if (selectedId === idToDelete) setSelectedId(newBlocks[0]?.id || null);
      return newBlocks;
    });
    msgApi.success('블록 삭제 완료');
  };

  // 영역 추가/편집
  const [addingMode, setAddingMode] = useState(false);
  const [addType, setAddType] = useState<'link' | 'coupon' | 'tab' | null>(null);

  // 탭 이동 region 의 대상 옵션 목록. 현재 이벤트의 모든 product_group(tabs 모드) 블록의 각 탭을 평탄화.
  // value = `${blockId}::${tabIndex}` 형식의 문자열 (Select 호환).
  const tabTargetOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    blocks.forEach((b, bi) => {
      if (b.type !== 'product_group' || b.layoutType !== 'tabs') return;
      const blockLabel = `상품 블록 ${bi + 1}`;
      (b.tabs || []).forEach((t, i) => {
        opts.push({
          value: `${b.id}::${i}`,
          label: `${blockLabel} → 탭${i + 1}${t.title ? ` (${t.title})` : ''}`,
        });
      });
    });
    return opts;
  }, [blocks]);
  const [pendingRegion, setPendingRegion] = useState<RegionItem | null>(null);
  const [dragStartPos, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [mapModalVisible, setMapModalVisible] = useState(false);
  const [mapForm] = Form.useForm();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm] = Form.useForm();
  const [editingRegion, setEditingRegion] = useState<RegionItem | null>(null);

  const selectedBlock = blocks.find((b) => b.id === selectedId);

  const onMouseDown = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const { left, top } = imgRef.current.getBoundingClientRect();
    setDragStart({ x: e.clientX - left, y: e.clientY - top });
    setDragCurrent({ x: e.clientX - left, y: e.clientY - top });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragStartPos || !imgRef.current) return;
    const { left, top } = imgRef.current.getBoundingClientRect();
    setDragCurrent({ x: e.clientX - left, y: e.clientY - top });
  };
  const onMouseUp = () => {
    if (!dragStartPos || !dragCurrent || !imgRef.current) {
      setDragStart(null);
      return;
    }
    const { clientWidth: W, clientHeight: H } = imgRef.current;
    const x = Math.min(dragStartPos.x, dragCurrent.x);
    const y = Math.min(dragStartPos.y, dragCurrent.y);
    const w = Math.abs(dragCurrent.x - dragStartPos.x);
    const h = Math.abs(dragCurrent.y - dragStartPos.y);
    if (w < 5 || h < 5) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    const region: RegionItem = {
      id: Date.now().toString(),
      xRatio: x / W,
      yRatio: y / H,
      wRatio: w / W,
      hRatio: h / H,
    };
    setPendingRegion(region);
    setMapModalVisible(true);
    setDragStart(null);
    setDragCurrent(null);
  };

  const saveRegion = () => {
    if (!pendingRegion) return;
    const vals = mapForm.getFieldsValue();
    const updated: RegionItem = { ...pendingRegion };
    if (addType === 'link') {
      let href = (vals.href || '').trim();
      if (!href) {
        msgApi.error('URL을 입력하세요.');
        return;
      }
      if (!/^https?:\/\//.test(href)) href = 'https://' + href;
      updated.href = href;
      delete updated.coupon;
      delete updated.tabTarget;
    } else if (addType === 'tab') {
      const tabKey = (vals.tabTarget || '').trim();
      if (!tabKey) {
        msgApi.error('이동할 탭을 선택하세요.');
        return;
      }
      const [blockId, idxStr] = tabKey.split('::');
      const tabIndex = parseInt(idxStr, 10);
      if (!blockId || !isFinite(tabIndex)) {
        msgApi.error('탭 정보가 올바르지 않습니다.');
        return;
      }
      updated.tabTarget = { blockId, tabIndex };
      delete updated.href;
      delete updated.coupon;
    } else {
      const coupon = (vals.coupon || []).join(',');
      if (!coupon) {
        msgApi.error('쿠폰을 선택하거나 입력하세요.');
        return;
      }
      updated.coupon = coupon;
      delete updated.href;
      delete updated.tabTarget;
    }
    setBlocks((prev) =>
      prev.map((b) => (b.id === selectedId && b.type === 'image' ? { ...b, regions: [...(b.regions || []), updated] } : b))
    );
    setMapModalVisible(false);
    setPendingRegion(null);
    setAddingMode(false);
    setAddType(null);
    mapForm.resetFields();
  };

  const openEditRegion = (r: RegionItem) => {
    setEditingRegion(r);
    setEditModalVisible(true);
    if (r.coupon) editForm.setFieldsValue({ coupon: r.coupon.split(',') });
    else if (r.tabTarget) editForm.setFieldsValue({ tabTarget: `${r.tabTarget.blockId}::${r.tabTarget.tabIndex}` });
    else editForm.setFieldsValue({ href: r.href });
  };

  const applyEditRegion = () => {
    const vals = editForm.getFieldsValue();
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== selectedId || b.type !== 'image') return b;
        const regions = (b.regions || []).map((r) => {
          if (r.id !== editingRegion?.id) return r;
          if (r.coupon != null) {
            const coupon = (vals.coupon || []).join(',');
            return { ...r, coupon, href: undefined, tabTarget: undefined };
          } else if (r.tabTarget) {
            const tabKey = (vals.tabTarget || '').trim();
            const [blockId, idxStr] = tabKey.split('::');
            const tabIndex = parseInt(idxStr, 10);
            if (!blockId || !isFinite(tabIndex)) return r;
            return { ...r, tabTarget: { blockId, tabIndex }, href: undefined, coupon: undefined };
          } else {
            let href = (vals.href || '').trim();
            if (!/^https?:\/\//.test(href)) href = 'https://' + href;
            return { ...r, href, coupon: undefined, tabTarget: undefined };
          }
        });
        return { ...b, regions };
      })
    );
    setEditModalVisible(false);
    setEditingRegion(null);
  };

  const deleteRegion = () => {
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== selectedId || b.type !== 'image') return b;
        const regions = (b.regions || []).filter((r) => r.id !== editingRegion?.id);
        return { ...b, regions };
      })
    );
    setEditModalVisible(false);
    setEditingRegion(null);
  };

  // 상품 블록
  const [productBlockModalVisible, setProductBlockModalVisible] = useState(false);
  const [editingProductBlock, setEditingProductBlock] = useState<EventBlock | null>(null);

  const openProductBlockModal = (blockToEdit: EventBlock | null = null) => {
    setEditingProductBlock(blockToEdit);
    setProductBlockModalVisible(true);
  };

  const addProductBlock = (newBlockData: EventBlock) => {
    if (editingProductBlock) {
      setBlocks((prev) => prev.map((b) => (b.id === editingProductBlock.id ? newBlockData : b)));
      setEditingProductBlock(null);
    } else {
      setBlocks((prev) => [...prev, newBlockData]);
      setSelectedId(newBlockData.id);
    }
    setProductBlockModalVisible(false);
  };

  // 영상 블록
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [videoForm] = Form.useForm();
  const openVideoModal = (blockToEdit: EventBlock | null = null) => {
    setSelectedId(blockToEdit?.id || null);
    if (blockToEdit) {
      videoForm.setFieldsValue({
        urlOrId: blockToEdit.youtubeId,
        w: blockToEdit.ratio?.w,
        h: blockToEdit.ratio?.h,
        autoplay: blockToEdit.autoplay,
      });
    } else {
      videoForm.resetFields();
    }
    setVideoModalVisible(true);
  };
  const submitVideo = () => {
    const { urlOrId, w = 16, h = 9, autoplay = false } = videoForm.getFieldsValue();
    const vid = getYouTubeId(urlOrId);
    if (!vid) {
      msgApi.error('유효한 YouTube 링크/ID가 아닙니다.');
      return;
    }
    const sel = blocks.find((b) => b.id === selectedId);
    if (sel?.type === 'video') {
      setBlocks((prev) =>
        prev.map((b) => (b.id === sel.id ? { ...b, youtubeId: vid, ratio: { w, h }, autoplay, loop: autoplay } : b))
      );
    } else {
      const id = Date.now().toString() + Math.random();
      setBlocks((prev) => [...prev, { id, type: 'video', youtubeId: vid, ratio: { w, h }, autoplay, loop: autoplay }]);
      setSelectedId(id);
    }
    setVideoModalVisible(false);
  };

  // 텍스트 블록
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [textForm] = Form.useForm();
  const openTextModal = (blockToEdit: EventBlock | null = null) => {
    setSelectedId(blockToEdit?.id || null);
    if (blockToEdit) {
      textForm.setFieldsValue({ text: blockToEdit.text, ...blockToEdit.style });
    } else {
      textForm.resetFields();
    }
    setTextModalVisible(true);
  };
  const submitText = () => {
    const { text, ...style } = textForm.getFieldsValue();
    if (!text?.trim()) {
      msgApi.warning('문구를 입력하세요.');
      return;
    }
    const sel = blocks.find((b) => b.id === selectedId);
    if (sel?.type === 'text') {
      setBlocks((prev) => prev.map((b) => (b.id === sel.id ? { ...b, text, style } : b)));
    } else {
      const id = Date.now().toString() + Math.random();
      setBlocks((prev) => [...prev, { id, type: 'text', text, style }]);
      setSelectedId(id);
    }
    setTextModalVisible(false);
  };

  // 이벤트 유의사항 블록 — 토글 버튼 + 이미지 + 텍스트 (라이브에서 슬라이드 다운).
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);
  const [noticeForm] = Form.useForm();
  const [noticeImagePreview, setNoticeImagePreview] = useState<string>('');
  const [noticeImageFile, setNoticeImageFile] = useState<File | undefined>(undefined);
  const openNoticeModal = (blockToEdit: EventBlock | null = null) => {
    setSelectedId(blockToEdit?.id || null);
    if (blockToEdit && blockToEdit.type === 'event_notice') {
      const ns = blockToEdit.noticeStyle || {};
      noticeForm.setFieldsValue({
        noticeTitle: blockToEdit.noticeTitle || '이벤트 유의사항',
        noticeText: blockToEdit.noticeText || '',
        background: ns.background || '',
        color: ns.color || '#444444',
        fontSize: ns.fontSize ?? 14,
        lineHeight: ns.lineHeight ?? 1.7,
        letterSpacing: ns.letterSpacing ?? 0,
        padding: ns.padding ?? 16,
      });
      setNoticeImagePreview(blockToEdit.noticeImage || '');
      setNoticeImageFile(blockToEdit.noticeImageFile);
    } else {
      noticeForm.setFieldsValue({
        noticeTitle: '이벤트 유의사항',
        noticeText: '',
        background: '',
        color: '#444444',
        fontSize: 14,
        lineHeight: 1.7,
        letterSpacing: 0,
        padding: 16,
      });
      setNoticeImagePreview('');
      setNoticeImageFile(undefined);
    }
    setNoticeModalVisible(true);
  };
  const submitNotice = () => {
    const vals = noticeForm.getFieldsValue();
    const { noticeTitle, noticeText, background, color, fontSize, lineHeight, letterSpacing, padding } = vals;
    if (!noticeImagePreview && !noticeText?.trim()) {
      msgApi.warning('이미지나 본문 텍스트 중 하나는 입력하세요.');
      return;
    }
    const sel = blocks.find((b) => b.id === selectedId);
    const patch: Partial<EventBlock> = {
      noticeTitle: (noticeTitle || '이벤트 유의사항').trim(),
      noticeText: (noticeText || '').trim(),
      noticeImage: noticeImagePreview || undefined,
      noticeImageFile: noticeImageFile,
      noticeStyle: {
        background: background || undefined,
        color: color || undefined,
        fontSize: typeof fontSize === 'number' ? fontSize : undefined,
        lineHeight: typeof lineHeight === 'number' ? lineHeight : undefined,
        letterSpacing: typeof letterSpacing === 'number' ? letterSpacing : undefined,
        padding: typeof padding === 'number' ? padding : undefined,
      },
    };
    if (sel?.type === 'event_notice') {
      setBlocks((prev) => prev.map((b) => (b.id === sel.id ? { ...b, ...patch } : b)));
    } else {
      const id = Date.now().toString() + Math.random();
      setBlocks((prev) => [...prev, { id, type: 'event_notice', ...patch }]);
      setSelectedId(id);
    }
    setNoticeModalVisible(false);
  };

  // 저장
  const [submitting, setSubmitting] = useState(false);

  // 이미지 블록 / 유의사항 블록의 dataURL/blob 을 cafe24 FTP 영구 URL 로 교체.
  // persistImageToFtp 가 4MB 이상은 JPEG 압축 + 점진 축소로 한도 안에 들어오게 만들고
  // multipart/form-data 로 전송 → 대부분 Vercel Blob 의존성 없이 통과.
  const uploadBlockImage = async (b: EventBlock): Promise<EventBlock> => {
    // 유의사항 블록 — noticeImage 가 data:/blob: 이면 영구화
    if (b.type === 'event_notice') {
      if (!b.noticeImage || /^https?:\/\//.test(b.noticeImage)) return b;
      let fileBlob: Blob;
      if (b.noticeImageFile) {
        fileBlob = b.noticeImageFile;
      } else {
        const res = await fetch(b.noticeImage);
        fileBlob = await res.blob();
      }
      const mimeExt = fileBlob.type.split('/')[1];
      const ext = (b.noticeImageFile?.name?.split('.').pop() || mimeExt || 'png').toLowerCase();
      const filename = `notice_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const finalUrl = await persistImageToFtp(fileBlob, filename);
      return { ...b, noticeImage: finalUrl, noticeImageFile: undefined };
    }

    if (b.type !== 'image' || !b.src) return b;
    if (/^https?:\/\//.test(b.src) && !b.file) return b;

    let fileBlob: Blob;
    if (b.file) {
      fileBlob = b.file;
    } else {
      const res = await fetch(b.src);
      fileBlob = await res.blob();
    }

    const mimeExt = fileBlob.type.split('/')[1];
    const ext = (b.file?.name?.split('.').pop() || mimeExt || 'png').toLowerCase();
    const filename = `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const finalUrl = await persistImageToFtp(fileBlob, filename);
    return { ...b, src: finalUrl, file: undefined, hash: undefined };
  };

  const handleSubmit = () => {
    modal.confirm({
      title: '이벤트 등록',
      content: '이벤트 페이지를 제작 완료 하시겠습니까?',
      okText: '확인',
      cancelText: '취소',
      onOk: async () => {
        if (submitting) return;
        setSubmitting(true);
        if (!title.trim()) {
          msgApi.error('이벤트 제목을 입력하세요.');
          setSubmitting(false);
          return;
        }
        if (blocks.length === 0) {
          msgApi.error('하나 이상의 콘텐츠 블록을 추가하세요.');
          setSubmitting(false);
          return;
        }
        try {
          msgApi.loading({ content: '이미지 업로드 중…', key: 'eventSave' });
          const uploadedBlocks = await Promise.all(blocks.map(uploadBlockImage));

          // file/hash 같은 임시 필드는 저장 직전 제거
          const sectionsPayload = uploadedBlocks.map((b) => {
            const rest: Partial<EventBlock> = { ...b };
            delete rest.file;
            delete rest.hash;
            return rest;
          });

          // 첫 번째 image 블록의 src 를 thumbnail 로 사용
          const firstImg = uploadedBlocks.find((b) => b.type === 'image' && b.src);

          const payload = {
            title,
            sections: sectionsPayload,
            imageUrl: firstImg?.src,
            eventType: 'event',
            couponNos: eventCouponNos,
          };

          msgApi.loading({ content: '이벤트 저장 중…', key: 'eventSave' });
          const saveRes = await fetch('/api/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const json = await saveRes.json();
          if (!json.success) throw new Error(json.message || '이벤트 저장 실패');
          const eventId = json.data?._id;
          if (eventId) {
            msgApi.success({ content: '이벤트 생성 완료', key: 'eventSave' });
            router.push(`/events/detail/${eventId}`);
          } else {
            msgApi.error({ content: '이벤트 ID를 찾을 수 없습니다.', key: 'eventSave' });
          }
        } catch (e) {
          console.error(e);
          const err = e as { message?: string };
          msgApi.error({ content: err.message || '이벤트 생성 중 오류가 발생했습니다.', key: 'eventSave' });
        } finally {
          setSubmitting(false);
        }
      },
    });
  };

  return (
    <AppShell>
      <div style={{ padding: 16 }}>
        <Card
          title="이벤트 페이지 제작"
          extra={
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} loading={submitting}>
              이벤트 등록
            </Button>
          }
          style={{ minHeight: '80vh' }}
        >
          <div style={{ display: 'flex', gap: 24, flexDirection: isMobile ? 'column' : 'row', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3>제목</h3>
              <Input placeholder="이벤트 제목 추가하기" value={title} onChange={(e) => setTitle(e.target.value)} />

              <h3 style={{ marginTop: 20, marginBottom: 4 }}>💸 이벤트 적용 쿠폰</h3>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#888' }}>
                선택한 쿠폰이 적용된 가격(혜택가)으로 상품이 표시됩니다. 쿠폰이 적용되지 않는 상품은 정가로 표시.
              </p>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: '#d32f2f', fontWeight: 600, lineHeight: 1.5 }}>
                ⚠ 라이브 페이지에 쿠폰을 노출하려면 여기 목록에 반드시 추가해야 합니다. 추가하지 않은 쿠폰은
                cafe24 에 자동 적용 가능 여부와 상관없이 위젯에 표시되지 않습니다.<br />
                쿠폰을 추가/삭제한 뒤 저장만 하면 라이브 페이지에 자동 반영됩니다 (HTML 재배포 불필요).
              </p>
              <Select
                mode="multiple"
                placeholder="이 이벤트에 적용할 쿠폰을 선택하세요"
                options={couponOptions}
                value={eventCouponNos}
                onChange={(v) => setEventCouponNos(v as string[])}
                style={{ width: '100%' }}
                allowClear
              />

              <Divider />

              <h3>콘텐츠 구성</h3>
              {blocks.length > 0 && (
                <DragDropContext
                  onDragStart={() => { draggingRef.current = true; }}
                  onDragEnd={onDragEnd}
                >
                  <Droppable droppableId="blocks" direction="horizontal">
                    {(prov) => (
                      <div ref={prov.innerRef} {...prov.droppableProps} style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0' }}>
                        {blocks.map((b, idx) => (
                          <Draggable key={b.id} draggableId={String(b.id)} index={idx}>
                            {(p, snapshot) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                {...p.dragHandleProps}
                                style={{
                                  ...getItemStyle(snapshot.isDragging, p.draggableProps.style),
                                  width: 100,
                                  height: 100,
                                  borderRadius: 6,
                                  border: b.id === selectedId ? '2px solid #fe6326' : '1px solid #d9d9d9',
                                  background: '#fff',
                                  position: 'relative',
                                  flexShrink: 0,
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                }}
                                onPointerUp={() => { if (draggingRef.current) return; setSelectedId(b.id); }}
                              >
                                {b.type === 'image' && (
                                  <img src={b.src} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                )}
                                {b.type === 'video' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: 11, gap: 4 }}>
                                    <YoutubeOutlined style={{ fontSize: 24 }} />
                                    <span>영상 블록</span>
                                  </div>
                                )}
                                {b.type === 'text' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: 11, gap: 4 }}>
                                    <FontSizeOutlined style={{ fontSize: 24 }} />
                                    <span>텍스트 블록</span>
                                  </div>
                                )}
                                {b.type === 'product_group' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: 11, gap: 4 }}>
                                    <ShoppingCartOutlined style={{ fontSize: 24 }} />
                                    <span>상품 블록</span>
                                  </div>
                                )}
                                {b.type === 'event_notice' && (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666', fontSize: 11, gap: 4 }}>
                                    <TagOutlined style={{ fontSize: 24 }} />
                                    <span>유의사항</span>
                                  </div>
                                )}
                                <DeleteOutlined
                                  onClick={(e) => { e.stopPropagation(); deleteBlock(b.id); }}
                                  style={{ position: 'absolute', top: 4, right: 4, color: '#ff4d4f', background: '#fff', borderRadius: 4, padding: 2, fontSize: 12 }}
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {prov.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}

              <Space style={{ margin: '12px 0', flexWrap: 'wrap' }}>
                <Button icon={<LinkOutlined />} onClick={() => {
                  if (!selectedBlock || selectedBlock.type !== 'image') {
                    msgApi.info('영역을 추가할 이미지 블록을 선택하세요.');
                    return;
                  }
                  setAddType('link');
                  setAddingMode(true);
                }}>URL 추가</Button>
                <Button icon={<TagOutlined />} onClick={() => {
                  if (!selectedBlock || selectedBlock.type !== 'image') {
                    msgApi.info('영역을 추가할 이미지 블록을 선택하세요.');
                    return;
                  }
                  setAddType('coupon');
                  setAddingMode(true);
                }}>쿠폰 추가</Button>
                <Button icon={<BlockOutlined />} onClick={() => {
                  if (!selectedBlock || selectedBlock.type !== 'image') {
                    msgApi.info('영역을 추가할 이미지 블록을 선택하세요.');
                    return;
                  }
                  if (tabTargetOptions.length === 0) {
                    msgApi.warning('탭 모드 상품 블록을 먼저 추가해야 탭 이동 영역을 만들 수 있습니다.');
                    return;
                  }
                  setAddType('tab');
                  setAddingMode(true);
                }}>탭 이동 추가</Button>
                <Button icon={<BlockOutlined />} onClick={() => openProductBlockModal()}>상품 추가</Button>
                <Button icon={<VideoCameraAddOutlined />} onClick={() => openVideoModal()}>YouTube 추가</Button>
                <Button icon={<FontSizeOutlined />} onClick={() => openTextModal()}>텍스트 추가</Button>
                <Button icon={<TagOutlined />} onClick={() => openNoticeModal()}>이벤트 유의사항 추가</Button>
              </Space>

              <Upload.Dragger {...uploadProps} style={{ marginTop: 16 }}>
                <p className="ant-upload-drag-icon" style={{ margin: 0 }}><UploadOutlined /></p>
                <p className="ant-upload-text" style={{ margin: '4px 0 0' }}>이미지를 드래그 또는 클릭하여 업로드</p>
              </Upload.Dragger>
            </div>

            <div style={{ flex: 1, minWidth: 0, border: '1px solid #f0f0f0', borderRadius: 8, padding: 16, background: '#fafafa' }}>
              <h3 style={{ marginTop: 0 }}>미리보기</h3>
              <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
                {blocks.map((b) => {
                  const isSelected = selectedId === b.id;
                  if (b.type === 'image') {
                    return (
                      <div
                        key={b.id}
                        onMouseDown={addingMode && isSelected ? onMouseDown : undefined}
                        onMouseMove={addingMode && isSelected ? onMouseMove : undefined}
                        onMouseUp={addingMode && isSelected ? onMouseUp : undefined}
                        style={{
                          cursor: addingMode && isSelected ? 'crosshair' : 'default',
                          position: 'relative',
                          width: '100%',
                          marginBottom: 8,
                        }}
                      >
                        <img ref={isSelected ? imgRef : null} src={b.src} alt="preview" style={{ width: '100%', display: 'block' }} />
                        {(b.regions || []).map((r) => {
                          const isCoupon = !!r.coupon;
                          const style: React.CSSProperties = {
                            position: 'absolute',
                            left: `${r.xRatio * 100}%`,
                            top: `${r.yRatio * 100}%`,
                            width: `${r.wRatio * 100}%`,
                            height: `${r.hRatio * 100}%`,
                            border: `2px dashed ${isCoupon ? '#ff6347' : '#1890ff'}`,
                            cursor: 'pointer',
                            background: isCoupon ? 'rgba(255, 99, 71, 0.2)' : 'rgba(24, 144, 255, 0.2)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'flex-start',
                          };
                          return (
                            <div key={r.id} onClick={() => openEditRegion(r)} style={style}>
                              <span
                                style={{
                                  background: isCoupon ? '#ff6347' : '#1890ff',
                                  color: 'white',
                                  fontSize: 10,
                                  padding: '1px 4px',
                                  borderRadius: 2,
                                  lineHeight: 1,
                                  fontWeight: 'bold',
                                  margin: 1,
                                }}
                              >
                                {isCoupon ? '쿠폰' : 'URL'}
                              </span>
                            </div>
                          );
                        })}
                        {isSelected && dragStartPos && dragCurrent && (
                          <div
                            style={{
                              position: 'absolute',
                              left: Math.min(dragStartPos.x, dragCurrent.x),
                              top: Math.min(dragStartPos.y, dragCurrent.y),
                              width: Math.abs(dragCurrent.x - dragStartPos.x),
                              height: Math.abs(dragCurrent.y - dragStartPos.y),
                              border: '1px dashed #999',
                              background: 'rgba(200,200,200,0.2)',
                            }}
                          />
                        )}
                      </div>
                    );
                  }
                  if (b.type === 'video') {
                    return (
                      <div key={b.id} style={{ marginBottom: 8 }}>
                        <YouTubeEmbed
                          id={b.youtubeId || ''}
                          ratioW={b.ratio?.w}
                          ratioH={b.ratio?.h}
                          autoplay={b.autoplay}
                          loop={b.loop}
                        />
                        <Button size="small" type="link" onClick={() => openVideoModal(b)}>
                          편집
                        </Button>
                      </div>
                    );
                  }
                  if (b.type === 'text') {
                    return (
                      <div
                        key={b.id}
                        style={{
                          position: 'relative',
                          border: '1px dashed #d9d9d9',
                          padding: '20px 10px 10px',
                          margin: `${b.style?.mt || 16}px 0 ${b.style?.mb || 16}px`,
                        }}
                      >
                        <div
                          style={{
                            textAlign: (b.style?.align as React.CSSProperties['textAlign']) || 'center',
                            fontSize: b.style?.fontSize || 18,
                            fontWeight: b.style?.fontWeight || 'normal',
                            color: b.style?.color || '#333',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {b.text}
                        </div>
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          style={{ position: 'absolute', top: 5, right: 5, zIndex: 1 }}
                          onClick={() => openTextModal(b)}
                        />
                      </div>
                    );
                  }
                  if (b.type === 'event_notice') {
                    const ns = b.noticeStyle || {};
                    return (
                      <div key={b.id} style={{ position: 'relative', border: '1px dashed #d9d9d9', borderRadius: 8, padding: 16, margin: '8px 0', background: '#fafafa' }}>
                        <Alert
                          message={
                            <div>
                              <strong>📋 이벤트 유의사항 토글</strong>
                              <Button size="small" type="link" onClick={() => openNoticeModal(b)} style={{ float: 'right' }}>편집</Button>
                            </div>
                          }
                          type="warning"
                          showIcon
                        />
                        {b.noticeImage && (
                          <img src={b.noticeImage} alt="유의사항" style={{ maxWidth: '100%', display: 'block', marginTop: 12 }} />
                        )}
                        {b.noticeText && (
                          <div
                            style={{
                              padding: typeof ns.padding === 'number' ? ns.padding : 16,
                              background: ns.background || 'transparent',
                              fontSize: ns.fontSize ?? 14,
                              color: ns.color || '#444',
                              lineHeight: ns.lineHeight ?? 1.7,
                              letterSpacing: typeof ns.letterSpacing === 'number' ? `${ns.letterSpacing}px` : undefined,
                              whiteSpace: 'pre-wrap',
                              marginTop: b.noticeImage ? 0 : 12,
                            }}
                          >
                            {b.noticeText}
                          </div>
                        )}
                      </div>
                    );
                  }
                  if (b.type === 'product_group') {
                    const activeTabIndex = previewActiveTabs[b.id] || 0;
                    let productsToDisplay: import('@/components/events/event-blocks-shared').ProductLite[] = [];
                    if (b.registerMode === 'direct') {
                      if (b.layoutType === 'single') {
                        productsToDisplay = b.directProducts || [];
                      } else if (b.layoutType === 'tabs') {
                        const tabKeys = Object.keys(b.tabDirectProducts || {});
                        const tabKey = tabKeys[activeTabIndex];
                        productsToDisplay = (b.tabDirectProducts || {})[Number(tabKey)] || [];
                      }
                    } else if (b.registerMode === 'category') {
                      let catNo: string | undefined;
                      if (b.layoutType === 'single') {
                        catNo = b.sub || b.root;
                      } else if (b.layoutType === 'tabs') {
                        const tab = (b.tabs || [])[activeTabIndex];
                        catNo = tab?.sub || tab?.root || undefined;
                      }
                      productsToDisplay = catNo ? (categoryProductsMap[String(catNo)] || []) : [];
                    }
                    return (
                      <div key={b.id} style={{ padding: '16px 0', fontFamily: "'Noto Sans KR', sans-serif" }}>
                        <Alert
                          message={
                            <div>
                              <strong>상품 블록</strong>
                              <Button size="small" type="link" onClick={() => openProductBlockModal(b)} style={{ float: 'right' }}>
                                편집
                              </Button>
                            </div>
                          }
                          type="info"
                          showIcon
                        />
                        {b.layoutType === 'tabs' && (
                          <div
                            style={
                              b.tabsPerRow && b.tabsPerRow >= 2
                                ? { display: 'grid', gridTemplateColumns: `repeat(${b.tabsPerRow}, 1fr)`, gap: 8, marginTop: 16 }
                                : { display: 'flex', gap: 8, marginTop: 16, justifyContent: 'center' }
                            }
                          >
                            {(b.tabs || []).map((t, i) => (
                              <Button
                                key={i}
                                style={{
                                  flex: 1,
                                  background: i === activeTabIndex ? b.activeColor || '#1890ff' : undefined,
                                  color: i === activeTabIndex ? '#fff' : undefined,
                                  borderColor: i === activeTabIndex ? b.activeColor || '#1890ff' : undefined,
                                }}
                                onClick={() => setPreviewActiveTabs((prev) => ({ ...prev, [b.id]: i }))}
                              >
                                {t.title || `탭 ${i + 1}`}
                              </Button>
                            ))}
                          </div>
                        )}
                        {(b.registerMode === 'direct' || b.registerMode === 'category') && renderGrid(
                          b.layoutType === 'tabs'
                            ? (b.tabGridSizes?.[activeTabIndex] ?? b.gridSize ?? 2)
                            : (b.gridSize || 2),
                          productsToDisplay,
                          { discountPercent: previewDiscountPercent }
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <ProductBlockModal
        visible={productBlockModalVisible}
        onCancel={() => { setProductBlockModalVisible(false); setEditingProductBlock(null); }}
        onOk={addProductBlock}
        msgApi={msgApi}
        isMobile={isMobile}
        allCats={allCats}
        initialData={editingProductBlock}
      />

      <Modal
        open={mapModalVisible}
        title={addType === 'link' ? 'URL 영역 설정' : addType === 'tab' ? '탭 이동 영역 설정' : '쿠폰 영역 설정'}
        onCancel={() => { setMapModalVisible(false); setPendingRegion(null); setAddingMode(false); setAddType(null); mapForm.resetFields(); }}
        onOk={saveRegion}
        okText="적용"
      >
        <Form form={mapForm} layout="vertical">
          {addType === 'link' && (
            <Form.Item name="href" label="URL" rules={[{ required: true, message: 'URL을 입력해주세요.' }]}>
              <Input placeholder="https://example.com" />
            </Form.Item>
          )}
          {addType === 'tab' && (
            <Form.Item name="tabTarget" label="이동할 탭" rules={[{ required: true, message: '이동할 탭을 선택하세요.' }]}>
              <Select
                placeholder="탭 모드 상품 블록의 탭 선택"
                options={tabTargetOptions}
              />
            </Form.Item>
          )}
          {addType === 'coupon' && (
            <Form.Item name="coupon" label="쿠폰 선택 혹은 번호 입력" rules={[{ required: true, message: '쿠폰을 하나 이상 선택/입력하세요.' }]}>
              <Select mode="tags" options={couponOptions} tokenSeparators={[',']} />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        open={editModalVisible}
        title="영역 편집"
        onCancel={() => setEditModalVisible(false)}
        footer={[
          <Button key="del" danger onClick={deleteRegion}>삭제</Button>,
          <Button key="cancel" onClick={() => setEditModalVisible(false)}>취소</Button>,
          <Button key="ok" type="primary" onClick={applyEditRegion}>적용</Button>,
        ]}
      >
        <Form form={editForm} layout="vertical">
          {editingRegion?.coupon ? (
            <Form.Item name="coupon" label="쿠폰 선택 혹은 번호 입력" rules={[{ required: true, message: '쿠폰을 하나 이상 선택/입력하세요.' }]}>
              <Select mode="tags" options={couponOptions} tokenSeparators={[',']} />
            </Form.Item>
          ) : editingRegion?.tabTarget ? (
            <Form.Item name="tabTarget" label="이동할 탭" rules={[{ required: true, message: '이동할 탭을 선택하세요.' }]}>
              <Select options={tabTargetOptions} />
            </Form.Item>
          ) : (
            <Form.Item name="href" label="URL" rules={[{ required: true, message: 'URL을 입력하세요.' }]}>
              <Input placeholder="https://example.com" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        open={videoModalVisible}
        title={selectedId && blocks.find((b) => b.id === selectedId)?.type === 'video' ? '영상 편집' : '영상 추가'}
        onCancel={() => setVideoModalVisible(false)}
        onOk={submitVideo}
      >
        <Form form={videoForm} layout="vertical" initialValues={{ w: 16, h: 9 }}>
          <Form.Item name="urlOrId" label="YouTube 링크 또는 영상 ID" rules={[{ required: true, message: 'YouTube 링크/ID를 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Space>
            <Form.Item name="w" label="비율 W" style={{ marginBottom: 0 }}>
              <InputNumber min={1} step={1} style={{ width: 100 }} />
            </Form.Item>
            <div style={{ alignSelf: 'end', padding: '0 6px 8px' }}>/</div>
            <Form.Item name="h" label="비율 H" style={{ marginBottom: 0 }}>
              <InputNumber min={1} step={1} style={{ width: 100 }} />
            </Form.Item>
          </Space>
          <Form.Item name="autoplay" valuePropName="checked" style={{ marginTop: 8 }}>
            <Checkbox>자동재생 (자동재생 시 반복이 자동 적용됩니다)</Checkbox>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={textModalVisible}
        title={selectedId && blocks.find((b) => b.id === selectedId)?.type === 'text' ? '텍스트 편집' : '텍스트 추가'}
        onCancel={() => setTextModalVisible(false)}
        onOk={submitText}
      >
        <Form form={textForm} layout="vertical" initialValues={{ align: 'center', fontSize: 18, fontWeight: 'normal', color: '#333333', mt: 16, mb: 16 }}>
          <Form.Item name="text" label="문구" rules={[{ required: true, message: '문구를 입력해주세요.' }]}>
            <Input.TextArea rows={4} placeholder="문구를 입력하세요. 엔터는 줄바꿈(<br/>)으로 표시됩니다." />
          </Form.Item>
          <Space wrap>
            <Form.Item name="align" label="정렬" style={{ marginBottom: 0 }}>
              <Select style={{ width: 110 }}>
                <Option value="left">왼쪽</Option>
                <Option value="center">가운데</Option>
                <Option value="right">오른쪽</Option>
              </Select>
            </Form.Item>
            <Form.Item name="fontSize" label="폰트크기" style={{ marginBottom: 0 }}>
              <InputNumber min={10} max={80} step={1} style={{ width: 110 }} />
            </Form.Item>
            <Form.Item name="fontWeight" label="굵기" style={{ marginBottom: 0 }}>
              <Select style={{ width: 110 }}>
                <Option value="normal">보통</Option>
                <Option value="bold">굵게</Option>
              </Select>
            </Form.Item>
            <Form.Item name="color" label="색상" style={{ marginBottom: 0 }}>
              <Input type="color" style={{ width: 60, padding: 0, border: 'none', background: 'transparent' }} />
            </Form.Item>
            <Form.Item name="mt" label="위 간격(px)" style={{ marginBottom: 0 }}>
              <InputNumber min={0} step={1} style={{ width: 120 }} />
            </Form.Item>
            <Form.Item name="mb" label="아래 간격(px)" style={{ marginBottom: 0 }}>
              <InputNumber min={0} step={1} style={{ width: 120 }} />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        open={noticeModalVisible}
        title={selectedId && blocks.find((b) => b.id === selectedId)?.type === 'event_notice' ? '이벤트 유의사항 편집' : '이벤트 유의사항 추가'}
        onCancel={() => setNoticeModalVisible(false)}
        onOk={submitNotice}
        width={600}
      >
        <Form form={noticeForm} layout="vertical" initialValues={{ noticeTitle: '이벤트 유의사항' }}>
          <Form.Item name="noticeTitle" label="토글 버튼 제목" rules={[{ required: true, message: '버튼 제목을 입력하세요.' }]}>
            <Input placeholder="예: 이벤트 유의사항" />
          </Form.Item>
          <Form.Item label="유의사항 이미지 (선택)">
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={(file) => {
                if (file.size / 1024 / 1024 > 10) {
                  msgApi.error('이미지는 10MB 이하여야 합니다.');
                  return Upload.LIST_IGNORE;
                }
                const reader = new FileReader();
                reader.onload = (e) => {
                  setNoticeImagePreview((e.target?.result as string) || '');
                  setNoticeImageFile(file);
                };
                reader.readAsDataURL(file);
                return false;
              }}
            >
              <Button icon={<UploadOutlined />}>{noticeImagePreview ? '이미지 변경' : '이미지 업로드'}</Button>
            </Upload>
            {noticeImagePreview && (
              <div style={{ marginTop: 10, position: 'relative', display: 'inline-block' }}>
                <img src={noticeImagePreview} alt="유의사항 미리보기" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4, border: '1px solid #f0f0f0' }} />
                <Button
                  size="small"
                  danger
                  onClick={() => { setNoticeImagePreview(''); setNoticeImageFile(undefined); }}
                  style={{ position: 'absolute', top: 4, right: 4 }}
                >제거</Button>
              </div>
            )}
          </Form.Item>
          <Form.Item name="noticeText" label="본문 텍스트 (선택)">
            <Input.TextArea rows={8} placeholder="유의사항 본문을 입력하세요. 엔터로 줄바꿈." />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }}>본문 스타일</Divider>
          <Space wrap>
            <Form.Item name="background" label="배경색" style={{ marginBottom: 8 }}>
              <Input type="color" style={{ width: 60, padding: 0, border: 'none', background: 'transparent' }} />
            </Form.Item>
            <Form.Item name="color" label="글자색" style={{ marginBottom: 8 }}>
              <Input type="color" style={{ width: 60, padding: 0, border: 'none', background: 'transparent' }} />
            </Form.Item>
            <Form.Item name="fontSize" label="폰트 크기(px)" style={{ marginBottom: 8 }}>
              <InputNumber min={10} max={32} step={1} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="lineHeight" label="줄 간격" style={{ marginBottom: 8 }}>
              <InputNumber min={1} max={3} step={0.1} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="letterSpacing" label="자간(px)" style={{ marginBottom: 8 }}>
              <InputNumber min={-2} max={5} step={0.1} style={{ width: 100 }} />
            </Form.Item>
            <Form.Item name="padding" label="패딩(px)" style={{ marginBottom: 8 }}>
              <InputNumber min={0} max={64} step={2} style={{ width: 100 }} />
            </Form.Item>
          </Space>

          <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
            라이브 페이지에서 토글 버튼 클릭 시 슬라이드 다운으로 이미지 + 본문이 펼쳐집니다.
            이미지나 본문 중 하나만 입력해도 됩니다.
          </div>
        </Form>
      </Modal>
    </AppShell>
  );
}
