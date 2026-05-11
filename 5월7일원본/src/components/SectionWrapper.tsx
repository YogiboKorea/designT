'use client';
import React from 'react';

interface SectionWrapperProps {
  children: React.ReactNode;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  isFirst: boolean;
  isLast: boolean;
  isPreview?: boolean;
}

export default function SectionWrapper({ children, onMoveUp, onMoveDown, onDelete, isFirst, isLast, isPreview }: SectionWrapperProps) {
  if (isPreview) {
    return (
      <div style={{ position: 'relative', margin: 0, padding: 0 }}>
        {children}
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', marginBottom: '1.5rem', transition: 'all 0.2s ease', borderRadius: '12px' }}
         onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-color)'}
         onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'none'}>
      
      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', background: '#333', padding: '5px 10px', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
        <button 
          onClick={onMoveUp} 
          disabled={isFirst} 
          style={{ padding: '0.4rem 0.6rem', border: 'none', color: '#fff', borderRadius: '4px', background: isFirst ? 'rgba(255,255,255,0.1)' : 'transparent', cursor: isFirst ? 'not-allowed' : 'pointer', opacity: isFirst ? 0.5 : 1 }}
          title="Move Up"
        >
          ↑
        </button>
        <button 
          onClick={onMoveDown} 
          disabled={isLast} 
          style={{ padding: '0.4rem 0.6rem', border: 'none', color: '#fff', borderRadius: '4px', background: isLast ? 'rgba(255,255,255,0.1)' : 'transparent', cursor: isLast ? 'not-allowed' : 'pointer', opacity: isLast ? 0.5 : 1 }}
          title="Move Down"
        >
          ↓
        </button>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.3)', margin: '0 5px' }}></div>
        <button 
          onClick={onDelete} 
          style={{ padding: '0.4rem 0.6rem', border: '1px solid #ff4d4f', color: '#fff', background: '#ff4d4f', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          title="Delete Section"
        >
          ✕ 삭제
        </button>
      </div>

      <div style={{ border: '1px solid #ccc', borderTop: 'none', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}
