import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getStroke } from 'perfect-freehand';
import { attachWhiteboardInput } from '../../logic/whiteboardInput';
import {
  Check,
  Download,
  MousePointer2,
  Pencil,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  loadWhiteboardDraft,
  pruneWhiteboardDrafts,
  removeWhiteboardDraftScope,
  saveWhiteboardDraft,
} from '../../logic/whiteboardStorage';
import type {
  WhiteboardPoint,
  WhiteboardStroke,
  WhiteboardTool,
} from '../../types/whiteboard';

const COLORS = ['#dc2626', '#2563eb', '#16a34a', '#111827'] as const;
const SIZES = [3, 6, 10] as const;

interface WhiteboardOverlayProps {
  active: boolean;
  storageKey: string;
  interactionRootRef: React.RefObject<HTMLElement | null>;
  chartLayout?: 'single' | 'dual';
  onDone: () => void;
  onExport: () => Promise<void>;
}

interface CanvasSize {
  width: number;
  height: number;
}

type InputNotice = 'pen' | 'touch' | 'mouse' | null;

const createStrokeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `stroke-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getSvgPathFromStroke = (points: number[][]): string => {
  if (points.length === 0) return '';

  const average = (a: number[], b: number[]) => [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
  ];

  const first = points[0];
  if (!first) return '';

  let path = `M ${first[0].toFixed(2)} ${first[1].toFixed(2)} Q`;
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    if (!current) continue;
    const next = points[index + 1];
    const midpoint = next ? average(current, next) : current;
    path += ` ${current[0].toFixed(2)} ${current[1].toFixed(2)} ${midpoint[0].toFixed(2)} ${midpoint[1].toFixed(2)}`;
  }

  return `${path} Z`;
};

const toFreehandPath = (stroke: WhiteboardStroke): string => {
  const outline = getStroke(stroke.points, {
    size: stroke.size,
    thinning: stroke.tool === 'highlighter' ? 0 : 0.55,
    smoothing: 0.65,
    streamline: 0.45,
    simulatePressure: false,
    last: true,
  });
  return getSvgPathFromStroke(outline);
};

const DrawingStroke = React.memo(({ stroke, canvasSize }: { stroke: WhiteboardStroke; canvasSize: CanvasSize }) => {
  const scaleX = canvasSize.width / stroke.canvasWidth;
  const scaleY = canvasSize.height / stroke.canvasHeight;
  const transform = `scale(${scaleX} ${scaleY})`;

  if (stroke.tool === 'line') {
    const start = stroke.points[0];
    const end = stroke.points[stroke.points.length - 1];
    if (!start || !end) return null;
    return (
      <line
        transform={transform}
        x1={start[0]}
        y1={start[1]}
        x2={end[0]}
        y2={end[1]}
        stroke={stroke.color}
        strokeWidth={stroke.size}
        strokeLinecap="round"
        opacity={stroke.opacity}
      />
    );
  }

  return (
    <path
      transform={transform}
      d={toFreehandPath(stroke)}
      fill={stroke.color}
      opacity={stroke.opacity}
    />
  );
});

DrawingStroke.displayName = 'DrawingStroke';

export const WhiteboardOverlay: React.FC<WhiteboardOverlayProps> = ({
  active,
  storageKey,
  interactionRootRef,
  chartLayout = 'single',
  onDone,
  onExport,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const strokesRef = useRef<WhiteboardStroke[]>([]);
  const activeStrokeRef = useRef<WhiteboardStroke | null>(null);
  const historyRef = useRef<WhiteboardStroke[][]>([[]]);
  const historyIndexRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const firstCanvasSizeRef = useRef<CanvasSize | null>(null);
  const loadedStorageKeyRef = useRef<string | null>(null);
  const draftLoadVersionRef = useRef(0);
  const inputNoticeTimerRef = useRef<number | null>(null);

  const [strokes, setStrokes] = useState<WhiteboardStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<WhiteboardStroke | null>(null);
  const [tool, setTool] = useState<WhiteboardTool>('pen');
  const [color, setColor] = useState<string>(COLORS[0]);
  const [size, setSize] = useState<number>(SIZES[0]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 1, height: 1 });
  const [sizeWarning, setSizeWarning] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [inputNotice, setInputNotice] = useState<InputNotice>(null);

  useEffect(() => {
    if (active) setTool('pen');
  }, [active]);

  const updateStrokes = useCallback((next: WhiteboardStroke[]) => {
    strokesRef.current = next;
    setStrokes(next);
  }, []);

  const resetHistory = useCallback((next: WhiteboardStroke[]) => {
    historyRef.current = [next];
    historyIndexRef.current = 0;
    setHistoryIndex(0);
    setHistoryLength(1);
    updateStrokes(next);
  }, [updateStrokes]);

  const commitSnapshot = useCallback((next: WhiteboardStroke[]) => {
    const nextHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    nextHistory.push(next);
    historyRef.current = nextHistory;
    historyIndexRef.current = nextHistory.length - 1;
    setHistoryIndex(historyIndexRef.current);
    setHistoryLength(nextHistory.length);
    updateStrokes(next);
  }, [updateStrokes]);

  useEffect(() => {
    void pruneWhiteboardDrafts().catch((error) => {
      console.warn('白板舊草稿清理失敗。', error);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadVersion = draftLoadVersionRef.current + 1;
    draftLoadVersionRef.current = loadVersion;
    const previousKey = loadedStorageKeyRef.current;
    if (previousKey && previousKey !== storageKey) {
      void saveWhiteboardDraft(previousKey, strokesRef.current).catch((error) => {
        console.warn('前一份白板草稿儲存失敗。', error);
      });
    }
    loadedStorageKeyRef.current = null;
    setLoadedKey(null);
    resetHistory([]);
    setSizeWarning(false);
    firstCanvasSizeRef.current = null;

    void loadWhiteboardDraft(storageKey).then((savedStrokes) => {
      if (cancelled || draftLoadVersionRef.current !== loadVersion) return;
      const rect = svgRef.current?.getBoundingClientRect();
      const referenceStroke = savedStrokes[0];
      firstCanvasSizeRef.current = referenceStroke
        ? { width: referenceStroke.canvasWidth, height: referenceStroke.canvasHeight }
        : rect && rect.width > 0 && rect.height > 0
          ? { width: rect.width, height: rect.height }
          : null;
      resetHistory(savedStrokes);
      loadedStorageKeyRef.current = storageKey;
      setLoadedKey(storageKey);
    }).catch((error) => {
      console.warn('白板草稿讀取失敗。', error);
      if (!cancelled && draftLoadVersionRef.current === loadVersion) {
        loadedStorageKeyRef.current = storageKey;
        setLoadedKey(storageKey);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [resetHistory, storageKey]);

  useEffect(() => () => {
    const key = loadedStorageKeyRef.current;
    if (key) {
      void saveWhiteboardDraft(key, strokesRef.current).catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    const timer = window.setTimeout(() => {
      void saveWhiteboardDraft(storageKey, strokes).catch((error) => {
        console.warn('白板草稿儲存失敗。', error);
      });
    }, 350);
    return () => window.clearTimeout(timer);
  }, [loadedKey, storageKey, strokes]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const updateSize = () => {
      const rect = svg.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const nextSize = { width: rect.width, height: rect.height };
      const firstSize = firstCanvasSizeRef.current;
      if (!firstSize) {
        firstCanvasSizeRef.current = nextSize;
      } else if (strokesRef.current.length > 0) {
        const widthChange = Math.abs(nextSize.width / firstSize.width - 1);
        const heightChange = Math.abs(nextSize.height / firstSize.height - 1);
        setSizeWarning(widthChange > 0.05 || heightChange > 0.05);
      }
      setCanvasSize(nextSize);
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    if (inputNoticeTimerRef.current !== null) window.clearTimeout(inputNoticeTimerRef.current);
  }, []);

  const scheduleActiveStrokeRender = useCallback(() => {
    if (animationFrameRef.current !== null) return;
    animationFrameRef.current = requestAnimationFrame(() => {
      setActiveStroke(activeStrokeRef.current);
      animationFrameRef.current = null;
    });
  }, []);

  const getCanvasPoint = useCallback((event: PointerEvent): WhiteboardPoint | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const pressure = event.pressure > 0 ? event.pressure : 0.5;
    return [event.clientX - rect.left, event.clientY - rect.top, pressure];
  }, []);

  const showInputNotice = useCallback((pointerType: string) => {
    const notice: InputNotice = pointerType === 'pen'
      ? 'pen'
      : pointerType === 'touch'
        ? 'touch'
        : 'mouse';
    setInputNotice(notice);
    if (inputNoticeTimerRef.current !== null) window.clearTimeout(inputNoticeTimerRef.current);
    inputNoticeTimerRef.current = window.setTimeout(() => setInputNotice(null), 1400);
  }, []);

  const startDrawing = useCallback((event: PointerEvent) => {
    const point = getCanvasPoint(event);
    if (!point) return;
    const nextStroke: WhiteboardStroke = {
      id: createStrokeId(),
      tool: 'pen',
      color,
      size,
      opacity: 1,
      points: [point],
      canvasWidth: canvasSize.width,
      canvasHeight: canvasSize.height,
    };
    activeStrokeRef.current = nextStroke;
    setActiveStroke(nextStroke);
  }, [canvasSize.height, canvasSize.width, color, getCanvasPoint, size]);

  const continueDrawing = useCallback((event: PointerEvent) => {
    const current = activeStrokeRef.current;
    if (!current) return;
    const coalescedEvents = event.getCoalescedEvents?.() ?? [];
    const events = coalescedEvents.length > 0 ? coalescedEvents : [event];
    const points = events.map(getCanvasPoint).filter((point): point is WhiteboardPoint => point !== null);
    if (points.length === 0) return;
    activeStrokeRef.current = { ...current, points: [...current.points, ...points] };
    scheduleActiveStrokeRender();
  }, [getCanvasPoint, scheduleActiveStrokeRender]);

  const finishDrawing = useCallback(() => {
    const completedStroke = activeStrokeRef.current;
    activeStrokeRef.current = null;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setActiveStroke(null);
    if (completedStroke) commitSnapshot([...strokesRef.current, completedStroke]);
  }, [commitSnapshot]);

  useEffect(() => {
    const root = interactionRootRef.current;
    if (!active || tool !== 'pen' || !root) return;
    return attachWhiteboardInput(root, {
      onStart: startDrawing,
      onMove: continueDrawing,
      onEnd: finishDrawing,
      onInput: showInputNotice,
    });
  }, [active, continueDrawing, finishDrawing, interactionRootRef, showInputNotice, startDrawing, storageKey, tool]);

  const undo = () => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    const snapshot = historyRef.current[historyIndexRef.current] ?? [];
    setHistoryIndex(historyIndexRef.current);
    updateStrokes(snapshot);
  };

  const redo = () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const snapshot = historyRef.current[historyIndexRef.current] ?? [];
    setHistoryIndex(historyIndexRef.current);
    updateStrokes(snapshot);
  };

  const clearAll = () => {
    draftLoadVersionRef.current += 1;
    loadedStorageKeyRef.current = storageKey;
    setLoadedKey(storageKey);
    activeStrokeRef.current = null;
    setActiveStroke(null);
    resetHistory([]);
    setSizeWarning(false);
    void removeWhiteboardDraftScope(storageKey).catch((error) => {
      console.warn('白板筆跡清除失敗。', error);
    });
  };

  const handleExport = async () => {
    if (isExporting || strokes.length === 0) return;
    setIsExporting(true);
    try {
      await onExport();
    } catch (error) {
      console.error('白板匯出失敗。', error);
      window.alert('白板圖片匯出失敗，請稍後再試。');
    } finally {
      setIsExporting(false);
    }
  };

  const renderedStrokes = useMemo(
    () => strokes.map((stroke) => <DrawingStroke key={stroke.id} stroke={stroke} canvasSize={canvasSize} />),
    [canvasSize, strokes]
  );

  return (
    <div className="whiteboard-layer absolute inset-0 z-[300] pointer-events-none">
      {active && tool === 'pen' && (
        chartLayout === 'dual' ? (
          <>
            <div className="absolute left-[12.5%] top-1/4 h-1/2 w-1/4 border border-slate-200 bg-white" aria-hidden="true" />
            <div className="absolute left-[62.5%] top-1/4 h-1/2 w-1/4 border border-slate-200 bg-white" aria-hidden="true" />
          </>
        ) : (
          <div className="absolute left-1/4 top-1/4 h-1/2 w-1/2 border border-slate-200 bg-white" aria-hidden="true" />
        )
      )}
      <svg
        ref={svgRef}
        className={`${active && tool === 'pen' ? 'pointer-events-auto touch-none' : 'pointer-events-none'} absolute inset-0 h-full w-full select-none`}
        aria-label="命盤白板畫布"
      >
        {renderedStrokes}
        {activeStroke && <DrawingStroke stroke={activeStroke} canvasSize={canvasSize} />}
      </svg>

      {active && (
        <>
        <div
          className="no-screenshot pointer-events-auto fixed inset-x-0 top-0 z-[301] h-[56px] border-b border-slate-200 bg-white shadow-sm"
          data-whiteboard-toolbar
          aria-hidden="true"
        />
        <div data-whiteboard-toolbar className="no-screenshot pointer-events-auto fixed inset-x-2 top-[5px] z-[302] flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-1.5 py-1 shadow-lg">
          <div className="min-w-0 flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex w-max items-center gap-1">
              <button
                onClick={() => setTool('select')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 ${tool === 'select' ? 'bg-sky-100 text-sky-700' : 'text-slate-600 hover:bg-slate-100'}`}
                title="操作命盤上的宮干、三方四正與時間選項"
              >
                <MousePointer2 size={18} />
                <span className="text-xs font-bold">操作模式</span>
              </button>

              <div className="h-7 w-px shrink-0 bg-slate-200" />

              <button
                onClick={() => setTool('pen')}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 ${tool === 'pen' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                title="在命盤上書寫；此模式不會觸發命盤操作"
              >
                <Pencil size={18} />
                <span className="text-xs font-bold">書寫模式</span>
              </button>

              <div className="h-7 w-px shrink-0 bg-slate-200" />

              {COLORS.map((option) => (
                <button
                  key={option}
                  onClick={() => { setColor(option); setTool('pen'); }}
                  className={`h-7 w-7 shrink-0 rounded-full border-2 ${color === option && tool !== 'highlighter' ? 'border-slate-900 ring-2 ring-slate-300' : 'border-white'}`}
                  style={{ backgroundColor: option }}
                  title="選擇畫筆顏色"
                />
              ))}

              <div className="h-7 w-px shrink-0 bg-slate-200" />

              {SIZES.map((option) => (
                <button
                  key={option}
                  onClick={() => setSize(option)}
                  className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${size === option ? 'bg-slate-200' : 'hover:bg-slate-100'}`}
                  title={`筆畫粗細 ${option}`}
                >
                  <span className="rounded-full bg-slate-800" style={{ width: option + 3, height: option + 3 }} />
                </button>
              ))}

              <div className="h-7 w-px shrink-0 bg-slate-200" />

              <button onClick={undo} disabled={historyIndex <= 0} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="復原"><Undo2 size={18} /></button>
              <button onClick={redo} disabled={historyIndex >= historyLength - 1} className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30" title="重做"><Redo2 size={18} /></button>
              <button
                onClick={clearAll}
                className="flex shrink-0 items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                title="清空白板"
              >
                <Trash2 size={18} /> 清空白板
              </button>

              <button onClick={handleExport} disabled={strokes.length === 0 || isExporting} className="ml-1 flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40" title="匯出或分享白板圖">
                <Download size={16} /> {isExporting ? '匯出中' : '匯出／分享'}
              </button>
            </div>
          </div>
          <button onClick={onDone} className="flex shrink-0 items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white hover:bg-slate-900" title="完成書寫並回到命盤操作">
            <Check size={16} /> 完成
          </button>
        </div>
        {sizeWarning && (
          <div className="no-screenshot pointer-events-none fixed bottom-3 left-1/2 z-[302] -translate-x-1/2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-center text-[11px] font-bold text-amber-700 shadow-lg">
            畫面尺寸已改變，筆跡可能稍有位移；建議先匯出確認。
          </div>
        )}
        {inputNotice && (
          <div className="no-screenshot pointer-events-none fixed bottom-3 left-1/2 z-[303] -translate-x-1/2 rounded-full bg-slate-900/90 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
            {inputNotice === 'pen' && 'Apple Pencil 書寫中'}
            {inputNotice === 'touch' && '手指書寫中'}
            {inputNotice === 'mouse' && '滑鼠書寫中'}
          </div>
        )}
        </>
      )}
    </div>
  );
};
