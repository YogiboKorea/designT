import React from 'react';
import DraggableText from './DraggableText';
import { SectionData } from '../app/builder/types';

interface MainVisualBuilderProps {
  data: Extract<SectionData, { type: 'main' }>;
  onChange: (updatedData: SectionData) => void;
  isPreview?: boolean;
  activeTextId?: string | null;
  onSelectText?: (id: string) => void;
}

export default function MainVisualBuilder({ data, onChange, isPreview = false, activeTextId, onSelectText }: MainVisualBuilderProps) {
  const { bgImage, texts } = data;

  const handleUpdateText = (id: string, newText: string, pos: {x:number, y:number}, styleObj: any) => {
    const updatedTexts = texts.map((t) =>
      t.id === id ? { ...t, text: newText, position: pos, style: { ...styleObj } } : t
    );
    onChange({ ...data, texts: updatedTexts });
  };

  const handleDeleteText = (id: string) => {
    onChange({ ...data, texts: texts.filter((t) => t.id !== id) });
  };

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden', minHeight: bgImage ? 'auto' : '200px' }}>
      {bgImage && <img src={bgImage} style={{ width: '100%', display: 'block', position: 'relative', zIndex: 0 }} alt="Background" />}
      {!bgImage && !isPreview && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', pointerEvents: 'none' }}>
           메인 이미지 설정 (우측 패널)
        </div>
      )}
      {texts.map((t) => (
        <DraggableText
          key={t.id}
          item={t}
          isActive={activeTextId === t.id}
          onSelect={onSelectText ? () => onSelectText(t.id) : undefined}
          onUpdate={handleUpdateText}
          onDelete={handleDeleteText}
          isPreview={isPreview}
        />
      ))}
    </div>
  );
}
