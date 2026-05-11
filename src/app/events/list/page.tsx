'use client';
import React, { useEffect, useState } from 'react';
import { App as AntdApp, Card, Table, Button, Space, Image, Popconfirm, Grid } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import AppShell from '@/components/AppShell';

const { useBreakpoint } = Grid;

// EventPage MongoDB 모델 응답 형태에 맞춘 타입.
// sections 배열에 reference 의 content.blocks 를 그대로 저장.
interface EventBlock {
  type: string;
  src?: string;
  regions?: unknown[];
}

interface EventItem {
  _id: string;
  id: string;
  title?: string;
  imageUrl?: string;
  sections?: EventBlock[];
  eventType?: string;
  createdAt?: string;
}

export default function EventListPage() {
  const router = useRouter();
  const { message } = AntdApp.useApp();
  const [data, setData] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const screens = useBreakpoint();
  const isMobile = screens.sm === false;

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const json = await res.json();
      if (!json.success) throw new Error(json.message || '목록 조회 실패');
      // 이벤트 페이지 타입('event') 만 필터 — 배너는 /banner 영역에서 관리
      const list: EventItem[] = (json.data || [])
        .filter((ev: EventItem) => ev.eventType === 'event' || !ev.eventType)
        .map((ev: EventItem) => ({
          ...ev,
          id: ev._id,
          createdAt: ev.createdAt ? dayjs(ev.createdAt).format('YYYY-MM-DD') : '',
        }));
      setData(list);
    } catch (err) {
      console.error(err);
      message.error('이벤트 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.message || '삭제 실패');
      message.success('이벤트가 삭제되었습니다.');
      fetchEvents();
    } catch (err) {
      console.error(err);
      message.error('이벤트 삭제에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '생성 일자',
      dataIndex: 'createdAt',
      width: 120,
      render: (text: string, record: EventItem) => (
        <span
          onClick={() => router.push(`/events/detail/${record.id}`)}
          style={{ fontSize: isMobile ? 12 : 14, whiteSpace: 'nowrap', cursor: 'pointer', color: '#000' }}
        >
          {text}
        </span>
      ),
    },
    {
      title: 'ID',
      dataIndex: 'id',
      width: 200,
      render: (id: string) => (
        <span
          onClick={() => router.push(`/events/detail/${id}`)}
          style={{
            fontSize: isMobile ? 12 : 14,
            lineHeight: 1.2,
            wordBreak: 'break-all',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: 'inline-block',
            maxWidth: isMobile ? 100 : 180,
            cursor: 'pointer',
            color: '#000',
          }}
        >
          {id}
        </span>
      ),
    },
    {
      title: '썸네일',
      key: 'thumbnail',
      width: 120,
      render: (_: unknown, record: EventItem) => {
        // imageUrl 우선, 없으면 sections 의 첫 image 블록 src
        let src = record.imageUrl;
        if (!src && Array.isArray(record.sections)) {
          const firstImg = record.sections.find((s) => s.type === 'image' && s.src);
          src = firstImg?.src;
        }
        if (!src) return <span>—</span>;
        return (
          <Image
            src={src}
            width={100}
            height={60}
            style={{ objectFit: 'cover', cursor: 'pointer' }}
            preview={false}
            alt="썸네일"
          />
        );
      },
    },
    {
      title: '이벤트 제목',
      dataIndex: 'title',
      width: 240,
      render: (text: string, record: EventItem) => (
        <span
          onClick={() => router.push(`/events/detail/${record.id}`)}
          style={{
            fontSize: isMobile ? 13 : 16,
            lineHeight: 1.3,
            display: 'inline-block',
            maxWidth: isMobile ? 120 : 200,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            cursor: 'pointer',
            color: '#000',
          }}
        >
          {text}
        </span>
      ),
    },
    {
      title: '블록 수',
      key: 'blockCount',
      width: 100,
      render: (_: unknown, record: EventItem) => {
        const count = Array.isArray(record.sections) ? record.sections.length : 0;
        return <span style={{ cursor: 'pointer', color: '#000' }}>{count}</span>;
      },
    },
    {
      title: '영역 수',
      key: 'regionCount',
      width: 100,
      render: (_: unknown, record: EventItem) => {
        const count = Array.isArray(record.sections)
          ? record.sections.reduce((sum, s) => sum + (Array.isArray(s.regions) ? s.regions.length : 0), 0)
          : 0;
        return <span style={{ cursor: 'pointer', color: '#000' }}>{count}</span>;
      },
    },
    {
      title: '액션',
      key: 'action',
      width: isMobile ? 140 : 180,
      render: (_: unknown, record: EventItem) => (
        <Space size="small">
          <Button
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/events/edit/${record.id}`);
            }}
          >
            수정
          </Button>
          <Popconfirm
            title="이벤트를 삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제"
            cancelText="취소"
          >
            <Button size="small" danger onClick={(e) => e.stopPropagation()}>
              삭제
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AppShell>
      <div style={{ padding: isMobile ? 12 : 24 }}>
        <Card
          title="나의 이벤트 목록"
          extra={
            <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/events/create')}>
              새 이벤트 생성
            </Button>
          }
          style={{ width: '100%', maxWidth: 1800, margin: '0 auto' }}
        >
          <Table
            columns={columns}
            dataSource={data}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: isMobile ? 4 : 6, size: isMobile ? 'small' : 'default' }}
            scroll={{ x: 1400 }}
            style={{ tableLayout: 'fixed' }}
          />
        </Card>
      </div>
    </AppShell>
  );
}
