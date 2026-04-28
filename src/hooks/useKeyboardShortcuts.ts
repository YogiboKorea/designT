/**
 * useKeyboardShortcuts — 빌더 전역 단축키 관리
 * ──────────────────────────────────────────────────────────────────
 * 안전 규칙:
 *   · input/textarea/contentEditable 에 포커스가 있을 때는 단축키 무시
 *     (사용자가 텍스트 편집 중일 때 Delete 키로 요소가 삭제되는 것을 방지)
 *   · 모달이나 confirm 다이얼로그가 떠 있어도 동작은 가능 (구별 어려움)
 *
 * 지원 단축키 (이번 Phase 1):
 *   · Ctrl/Cmd + Z              → undo
 *   · Ctrl/Cmd + Shift + Z      → redo
 *   · Ctrl/Cmd + Y              → redo (Windows 표준)
 *   · Delete / Backspace        → 선택된 요소 삭제
 *   · Ctrl/Cmd + C              → 선택된 요소 복사 (텍스트/스티커/섹션)
 *   · Ctrl/Cmd + V              → 클립보드 요소 붙여넣기
 *
 * 사용:
 *   useKeyboardShortcuts({
 *     onUndo, onRedo, onDelete, onCopy, onPaste
 *   });
 * ──────────────────────────────────────────────────────────────────
 */
import { useEffect } from 'react';

interface ShortcutHandlers {
  onUndo?: () => void;
  onRedo?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onPaste?: () => void;
  /** Escape 또는 single-line input 에서 Enter 누르면 선택 해제 */
  onEscape?: () => void;
}

/** 사용자가 텍스트 입력 중인지 검사 — 단축키를 무시해야 할 상황 */
function isUserTyping(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if (el.isContentEditable) return true;
  return false;
}

/** 현재 포커스가 textarea(여러 줄 입력) 인지 — Enter 키를 통과시켜야 함 */
function isMultilineInput(target: EventTarget | null): boolean {
  if (!target) return false;
  const el = target as HTMLElement;
  const tag = el.tagName?.toLowerCase();
  if (tag === 'textarea') return true;
  if (el.isContentEditable) return true; // contenteditable 도 멀티라인 가능
  return false;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const typing = isUserTyping(e.target);
      const key = e.key.toLowerCase();

      // ─── Escape — 항상 작동 (입력 중에도) ────────────────
      // 입력 중이면 input/element blur 후 선택 해제
      if (key === 'escape') {
        if (handlers.onEscape) {
          if (typing) {
            (e.target as HTMLElement).blur();
          }
          e.preventDefault();
          handlers.onEscape();
        }
        return;
      }

      // ─── Enter — single-line input 안에서만 선택 해제 처리 ─
      // textarea/contenteditable 에서는 줄바꿈으로 동작하도록 통과
      if (key === 'enter' && typing && !isMultilineInput(e.target)) {
        if (handlers.onEscape) {
          (e.target as HTMLElement).blur();
          e.preventDefault();
          handlers.onEscape();
        }
        return;
      }

      // 입력 중이면 아래 단축키들은 모두 무시
      if (typing) return;

      const isCtrl = e.ctrlKey || e.metaKey; // Mac 지원

      // ─── Undo ────────────────────────────────────────────
      if (isCtrl && !e.shiftKey && key === 'z') {
        if (handlers.onUndo) {
          e.preventDefault();
          handlers.onUndo();
        }
        return;
      }

      // ─── Redo (Ctrl+Shift+Z / Ctrl+Y) ────────────────────
      if (isCtrl && ((e.shiftKey && key === 'z') || key === 'y')) {
        if (handlers.onRedo) {
          e.preventDefault();
          handlers.onRedo();
        }
        return;
      }

      // ─── Delete ──────────────────────────────────────────
      if (key === 'delete' || key === 'backspace') {
        if (handlers.onDelete) {
          // Backspace 는 폼 밖에서도 뒤로가기 동작 안 하도록 방어
          e.preventDefault();
          handlers.onDelete();
        }
        return;
      }

      // ─── Copy ────────────────────────────────────────────
      if (isCtrl && key === 'c') {
        if (handlers.onCopy) {
          e.preventDefault();
          handlers.onCopy();
        }
        return;
      }

      // ─── Paste ───────────────────────────────────────────
      if (isCtrl && key === 'v') {
        if (handlers.onPaste) {
          e.preventDefault();
          handlers.onPaste();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
