'use client';
import React, { useState, useRef } from 'react';

interface DragDropUploaderProps {
  onImageUpload: (fileUrl: string) => void;
  label?: string;
  defaultImage?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export default function DragDropUploader({ onImageUpload, label = "이미지를 이곳으로 드래그 앤 드롭 하거나, 클릭해서 선택하세요", defaultImage, className = "", style, children }: DragDropUploaderProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(defaultImage || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onImageUpload(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`drop-zone ${isDragActive ? 'active' : ''} ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      style={{
        backgroundImage: previewUrl ? `url(${previewUrl})` : 'none',
        backgroundSize: '100% auto',
        backgroundPosition: 'top center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        zIndex: 0,
        minHeight: previewUrl ? 'auto' : '200px',
        padding: previewUrl ? '0' : '2rem',
        border: previewUrl ? 'none' : '2px dashed var(--border-color)',
        ...style
      }}
    >
      {previewUrl && (
        <img src={previewUrl} alt="미리보기" style={{ width: '100%', display: 'block', opacity: 0 }} onLoad={(e) => {
        }}/>
      )}
      <input 
        type="file" 
        accept="image/*" 
        ref={inputRef} 
        onChange={handleChange} 
        style={{ display: 'none' }} 
      />
      {!previewUrl && (
        <div style={{ pointerEvents: 'none' }}>
           <p style={{ margin: 0, fontWeight: 600, color: 'var(--primary-color)' }}>{label}</p>
        </div>
      )}
      {previewUrl && (
        <div 
          style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, background: 'rgba(255,255,255,0.9)', padding: '5px 12px', borderRadius: '20px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }} 
          onClick={(e) => {
            e.stopPropagation();
            setPreviewUrl(null);
            onImageUpload('');
          }}
        >
          이미지 변경하기
        </div>
      )}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 5 }}>
         {children}
      </div>
    </div>
  );
}
