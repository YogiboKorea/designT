'use client';
import React from 'react';
import Link from 'next/link';
import { SectionData } from '../app/builder/types';

interface BuilderSidebarProps {
  sections: SectionData[];
  activeSegmentId: string | null;
  onAddSection: (type: 'main' | 'coupon' | 'product') => void;
  onSelect: (id: string) => void;
  onMoveUp: (id: string, e?: React.MouseEvent) => void;
  onMoveDown: (id: string, e?: React.MouseEvent) => void;
  onDelete: (id: string, e?: React.MouseEvent) => void;
}

export default function BuilderSidebar({ sections, activeSegmentId, onAddSection, onSelect, onMoveUp, onMoveDown, onDelete }: BuilderSidebarProps) {
  
  const getIconData = (type: string) => {
    if (type === 'coupon') return { char: '쿠', class: 'coupon' };
    if (type === 'product') return { char: '상', class: 'product' };
    return { char: '자', class: 'custom' };
  };

  const getTitleData = (sec: SectionData) => {
    if (sec.type === 'coupon') return '쿠폰 영역';
    if (sec.type === 'product') {
      const firstText = sec.texts?.[0]?.text;
      return firstText ? firstText.split('\n')[0] : '상품 영역';
    }
    return '메인 비주얼';
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <Link href="/" title="홈으로">
            <img src="https://yogibo.kr/web/img/icon/logo3_on.png" alt="Yogibo 홈" style={{ height: '28px', width: 'auto', display: 'block' }} />
          </Link>
          <h1 style={{ margin: 0 }}>이벤트 페이지 템플릿 영역</h1>
        </div>
        <p>요소를 추가하고 템플릿으로 구성하세요</p>
      </div>

      <div className="section">
        <div className="section-title">새 영역 추가</div>
        <div className="add-zone-grid">
          <button className="add-zone-btn" onClick={() => onAddSection('main')}>
            <p className="title">🎨 메인 비주얼</p>
            <p className="desc">이미지 + 텍스트 자유 배치 구성</p>
          </button>
          <button className="add-zone-btn" onClick={() => onAddSection('coupon')}>
            <p className="title">🎟️ 쿠폰 영역</p>
            <p className="desc">타이틀 설정 및 자동 디자인 쿠폰</p>
          </button>
          <button className="add-zone-btn" onClick={() => onAddSection('product')}>
            <p className="title">🛍️ 상품 영역</p>
            <p className="desc">가로 2열 또는 1열 상품 배치 구성</p>
          </button>
        </div>
      </div>

      <div className="section" style={{ flex: 1 }}>
        <div className="section-title">영역 요소 목록</div>
        {sections.length === 0 ? (
          <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>추가된 영역이 없습니다.</p>
        ) : (
          <ul className="zone-list">
            {sections.map((sec, idx) => {
              const icon = getIconData(sec.type);
              const isActive = activeSegmentId === sec.id;
              
              return (
                <li key={sec.id} className={`zone-list-item ${isActive ? 'active' : ''}`} onClick={() => onSelect(sec.id)}>
                  <span className={`zicon ${icon.class}`}>{icon.char}</span>
                  <span className="zname">{getTitleData(sec)}</span>
                  
                  <button className="icon-btn" disabled={idx === 0} onClick={(e) => onMoveUp(sec.id, e)} title="위로">
                    ↑
                  </button>
                  <button className="icon-btn" disabled={idx === sections.length - 1} onClick={(e) => onMoveDown(sec.id, e)} title="아래로">
                    ↓
                  </button>
                  <button className="icon-btn danger" onClick={(e) => onDelete(sec.id, e)} title="삭제">
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
