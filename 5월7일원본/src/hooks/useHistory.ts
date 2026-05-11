/**
 * useHistory — 빌더의 sections 배열에 대한 Undo/Redo 시스템
 * ──────────────────────────────────────────────────────────────────
 *  · setState 와 동일한 인터페이스로 사용 가능 — 기존 코드 거의 안 건드림
 *  · 변경 시마다 past 스택에 푸시, undo 시 future 로 이동
 *  · MAX_HISTORY 개수 초과하면 가장 오래된 것 제거 (메모리 보호)
 *
 *  사용:
 *    const [sections, setSections, { undo, redo, canUndo, canRedo }] =
 *      useHistory<SectionData[]>([]);
 *
 *  기존 setSections([...]) 호출은 그대로. 하지만 매번 history 가 쌓이므로
 *  스로틀링이 필요한 경우 (드래그 같은 연속 변경) 는 commit() 으로 묶는다.
 * ──────────────────────────────────────────────────────────────────
 */
import { useState, useCallback, useRef } from 'react';

const MAX_HISTORY = 50;

interface HistoryActions {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** 현재 상태를 history 에 푸시하지 않고 덮어씀 (드래그 중 미리보기 등에 사용) */
  setQuiet: (next: any) => void;
  /** setQuiet 으로 누적된 변경을 한 번에 history 에 commit */
  commit: () => void;
  /** history 전체 초기화 (load/save 직후 등에 사용) */
  reset: (next: any) => void;
}

export function useHistory<T>(
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, HistoryActions] {
  const [present, setPresent] = useState<T>(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  const lastCommittedRef = useRef<T>(initial); // commit 시 비교 기준
  const [tick, setTick] = useState(0); // canUndo/canRedo 갱신 트리거

  const set = useCallback((next: T | ((prev: T) => T)) => {
    setPresent((prev) => {
      const value = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      // 이전과 동일하면 history 안 쌓음
      if (value === prev) return prev;
      // past 에 직전 값 푸시
      pastRef.current.push(prev);
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      // 새 변경이 들어오면 future (redo 스택) 폐기
      futureRef.current = [];
      lastCommittedRef.current = value;
      setTick((t) => t + 1);
      return value;
    });
  }, []);

  /** history 에 안 쌓고 present 만 갱신 — 드래그 중 미리보기용 */
  const setQuiet = useCallback((next: T | ((prev: T) => T)) => {
    setPresent((prev) =>
      typeof next === 'function' ? (next as (p: T) => T)(prev) : next,
    );
  }, []);

  /** 마지막 commit 이후의 setQuiet 누적분을 history 에 한 번에 푸시 */
  const commit = useCallback(() => {
    setPresent((prev) => {
      if (prev === lastCommittedRef.current) return prev;
      pastRef.current.push(lastCommittedRef.current);
      if (pastRef.current.length > MAX_HISTORY) pastRef.current.shift();
      futureRef.current = [];
      lastCommittedRef.current = prev;
      setTick((t) => t + 1);
      return prev;
    });
  }, []);

  const undo = useCallback(() => {
    setPresent((prev) => {
      const past = pastRef.current;
      if (past.length === 0) return prev;
      const previous = past.pop()!;
      futureRef.current.push(prev);
      lastCommittedRef.current = previous;
      setTick((t) => t + 1);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setPresent((prev) => {
      const future = futureRef.current;
      if (future.length === 0) return prev;
      const next = future.pop()!;
      pastRef.current.push(prev);
      lastCommittedRef.current = next;
      setTick((t) => t + 1);
      return next;
    });
  }, []);

  /** load/save 후처리 등 — history 전체 초기화 */
  const reset = useCallback((next: T) => {
    pastRef.current = [];
    futureRef.current = [];
    lastCommittedRef.current = next;
    setPresent(next);
    setTick((t) => t + 1);
  }, []);

  // tick 은 canUndo/canRedo 가 변경될 때 리렌더 트리거하기 위한 더미
  void tick;
  const canUndo = pastRef.current.length > 0;
  const canRedo = futureRef.current.length > 0;

  return [present, set, { undo, redo, canUndo, canRedo, setQuiet, commit, reset }];
}
