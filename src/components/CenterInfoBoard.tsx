// FILE: src/components/CenterInfoBoard.tsx

import React, { useState, useMemo } from 'react';
import {
  Users,
  Repeat,
  Clock,
  ArrowLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  X,
  Calendar,
  Sun,
  Lock,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Client, Relationship } from '../db';
import type { ChartData } from '../logic/types';
import type { PermissionState } from '../logic/permissions';
import { LunarYear, Solar, Lunar } from 'lunar-typescript';
import { GAN } from '../logic/constants';

// ✅ 硬關閉開關：先全部不顯示（不做 email 判斷、不做 auth 判斷）
const DEV_YEARLY_ANALYSIS_ENABLED = false;

interface GraphNode {
  id: string;
  x: number;
  y: number;
  data: Client;
  generation: number;
}

interface GraphLine {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const PARENT_RELATIONS = new Set(['父親', '母親', '爸爸', '媽媽', '父', '母', '長輩']);
const CHILD_RELATIONS = new Set(['子女', '兒子', '女兒', '長男', '長女', '次男', '次女', '晚輩']);
const PARTNER_RELATIONS = new Set(['配偶', '伴侶', '情侶', '丈夫', '妻子', '先生', '太太']);

const getGenerationDelta = (relationType: string) => {
  if (PARENT_RELATIONS.has(relationType)) return -1;
  if (CHILD_RELATIONS.has(relationType)) return 1;
  return 0;
};

interface PeerEdge {
  fromId: string;
  toId: string;
  weight: number;
}

const orderPeerComponent = (ids: string[], edges: PeerEdge[], preferredId?: string) => {
  if (ids.length <= 2) return ids;

  const scoreOrder = (order: string[]) => {
    const indexById = new Map(order.map((id, index) => [id, index]));
    let score = 0;
    edges.forEach((edge) => {
      const fromIndex = indexById.get(edge.fromId);
      const toIndex = indexById.get(edge.toId);
      if (fromIndex === undefined || toIndex === undefined) return;
      const extraDistance = Math.max(0, Math.abs(fromIndex - toIndex) - 1);
      score += edge.weight * extraDistance * extraDistance;
    });
    if (preferredId && indexById.has(preferredId)) {
      score += Math.abs(indexById.get(preferredId)! - (order.length - 1) / 2) * 0.01;
    }
    return score;
  };

  // 家庭群組通常很小；小群組直接找出最不會把伴侶拆開、連線最短的排列。
  if (ids.length <= 8) {
    let bestOrder = [...ids];
    let bestScore = Number.POSITIVE_INFINITY;
    const candidate = [...ids];
    const visit = (index: number) => {
      if (index === candidate.length) {
        const score = scoreOrder(candidate);
        if (score < bestScore) {
          bestScore = score;
          bestOrder = [...candidate];
        }
        return;
      }
      for (let i = index; i < candidate.length; i += 1) {
        [candidate[index], candidate[i]] = [candidate[i], candidate[index]];
        visit(index + 1);
        [candidate[index], candidate[i]] = [candidate[i], candidate[index]];
      }
    };
    visit(0);
    return bestOrder;
  }

  // 大群組使用穩定的局部交換，避免排列計算隨人數階乘成長。
  let order = [...ids];
  let improved = true;
  while (improved) {
    improved = false;
    let currentScore = scoreOrder(order);
    for (let i = 0; i < order.length - 1; i += 1) {
      const candidateOrder = [...order];
      [candidateOrder[i], candidateOrder[i + 1]] = [candidateOrder[i + 1], candidateOrder[i]];
      const candidateScore = scoreOrder(candidateOrder);
      if (candidateScore < currentScore) {
        order = candidateOrder;
        currentScore = candidateScore;
        improved = true;
      }
    }
  }
  return order;
};

interface CenterInfoBoardProps {
  client: Client;
  chartData: ChartData | null;
  relationships: Relationship[];
  historyStack: Client[];

  onHistoryBack: () => void;
  onNavigate: (targetClient: Client) => void;
  onCompatibility: (targetClient: Client) => void;

  benMingMajorStarsStr: string;
  onChangeHour: (delta: number) => void;
  onResetTime: () => void;
  currentHourZhi: string;
  isTimeModified: boolean;

  isDivinationMode?: boolean;
  divNum?: string[];
  isDivinationReady?: boolean;

  onToggleTwin: () => void;
  onToggleInverted: () => void;
  onToggleSmallLimit: () => void;
  showTwin: boolean;
  showInverted: boolean;
  showSmallLimit: boolean;
  isDaXian: boolean;
  isLiuNian: boolean;

  permissionFlags?: {
    twin: PermissionState;
    inverted: PermissionState;
    xiao: PermissionState;
    liu_month: PermissionState;
    liu_day: PermissionState;
    dual_chart?: PermissionState;
  };

  liuMonth?: number | null;
  isLiuMonthLeap?: boolean;
  liuDay?: number | null;
  onSetLiuYear?: (y: number | null) => void;
  onSetLiuMonth?: (m: number | null, isLeap: boolean) => void;
  onSetLiuDay?: (d: number | null) => void;
  liuNianYear?: number | null;
  liuMonthGan?: number;
  liuDayGan?: number;

  currentRealTime?: {
    year: number;
    daSeq: number;
  };
}

const NUM_CN = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];

export const CenterInfoBoard: React.FC<CenterInfoBoardProps> = ({
  client,
  chartData,
  relationships,
  historyStack,
  onHistoryBack,
  onNavigate,
  onCompatibility,
  onChangeHour,
  onResetTime,
  currentHourZhi,
  isTimeModified,
  isDivinationMode,
  divNum,
  isDivinationReady,
  onToggleTwin,
  onToggleInverted,
  onToggleSmallLimit,
  showTwin,
  showInverted,
  showSmallLimit,
  isDaXian,
  isLiuNian,
  permissionFlags,
  liuMonth,
  isLiuMonthLeap,
  liuDay,
  onSetLiuYear,
  onSetLiuMonth,
  onSetLiuDay,
  liuNianYear,
  liuMonthGan,
  liuDayGan,
  currentRealTime,
}) => {
  const navigate = useNavigate();
  const hasRelations = relationships.length > 0;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);

  const { realLunarMonth, realLunarDay, realIsLeap, isCurrentYear } = useMemo(() => {
    if (!liuNianYear) return { realLunarMonth: 0, realLunarDay: 0, realIsLeap: false, isCurrentYear: false };

    const now = new Date();
    const solar = Solar.fromYmd(now.getFullYear(), now.getMonth() + 1, now.getDate());
    const lunar = solar.getLunar();

    const isYearMatch = lunar.getYear() === liuNianYear;
    const rawMonth = lunar.getMonth();
    const realLunarMonth = Math.abs(rawMonth);
    const realIsLeap = rawMonth < 0;
    const realLunarDay = lunar.getDay();

    return { realLunarMonth, realLunarDay, realIsLeap, isCurrentYear: isYearMatch };
  }, [liuNianYear]);

  const leapMonthOfLiuNian = useMemo(() => {
    if (!liuNianYear) return 0;
    return LunarYear.fromYear(liuNianYear).getLeapMonth();
  }, [liuNianYear]);

  // 利用套件原生函式取得當月最大天數
  const maxDaysInLiuMonth = useMemo(() => {
    if (!liuNianYear || liuMonth === null || liuMonth === undefined) return 30;
    const m = isLiuMonthLeap ? -Math.abs(liuMonth) : Math.abs(liuMonth);
    try {
      return Lunar.fromYmd(liuNianYear, m, 1).getDaysInMonth();
    } catch (e) {
      return 29;
    }
  }, [liuNianYear, liuMonth, isLiuMonthLeap]);

  // --- 強大的原生跨年/跨月/閏月處理邏輯 ---

  const changeMonth = (delta: 1 | -1) => {
    if (!liuNianYear || liuMonth === null || liuMonth === undefined) {
      if (onSetLiuMonth) onSetLiuMonth(1, false);
      return;
    }

    const getMonthsArr = (y: number) => {
      const leap = LunarYear.fromYear(y).getLeapMonth();
      const arr: { y: number; m: number; leap: boolean }[] = [];
      for (let i = 1; i <= 12; i++) {
        arr.push({ y, m: i, leap: false });
        if (leap === i) arr.push({ y, m: i, leap: true });
      }
      return arr;
    };

    const currYearArr = getMonthsArr(liuNianYear);
    const currIdx = currYearArr.findIndex((x) => x.m === liuMonth && x.leap === (isLiuMonthLeap || false));

    if (delta === 1) {
      if (currIdx >= 0 && currIdx < currYearArr.length - 1) {
        const next = currYearArr[currIdx + 1];
        if (onSetLiuMonth) onSetLiuMonth(next.m, next.leap);
      } else {
        const nextYearArr = getMonthsArr(liuNianYear + 1);
        const next = nextYearArr[0];
        if (onSetLiuYear) onSetLiuYear(next.y);
        if (onSetLiuMonth) onSetLiuMonth(next.m, next.leap);
      }
    } else {
      if (currIdx > 0) {
        const prev = currYearArr[currIdx - 1];
        if (onSetLiuMonth) onSetLiuMonth(prev.m, prev.leap);
      } else {
        const prevYearArr = getMonthsArr(liuNianYear - 1);
        const prev = prevYearArr[prevYearArr.length - 1];
        if (onSetLiuYear) onSetLiuYear(prev.y);
        if (onSetLiuMonth) onSetLiuMonth(prev.m, prev.leap);
      }
    }
    if (onSetLiuDay) onSetLiuDay(null);
  };

  const changeDay = (delta: 1 | -1) => {
    if (!liuNianYear || liuMonth === null || liuMonth === undefined || liuDay === null || liuDay === undefined) {
      if (onSetLiuDay) onSetLiuDay(1);
      return;
    }

    const effectiveMonth = isLiuMonthLeap ? -Math.abs(liuMonth) : Math.abs(liuMonth);
    try {
      // 安全邊界
      let safeDay = Math.min(liuDay, maxDaysInLiuMonth);
      let l = Lunar.fromYmd(liuNianYear, effectiveMonth, safeDay);
      l = l.next(delta);
      const newY = l.getYear();
      const newM = l.getMonth(); // 負數代表閏月
      const newD = l.getDay();

      if (newY !== liuNianYear && onSetLiuYear) {
        onSetLiuYear(newY);
      }
      if (onSetLiuMonth) {
        onSetLiuMonth(Math.abs(newM), newM < 0);
      }
      if (onSetLiuDay) {
        onSetLiuDay(newD);
      }
    } catch (e) {
      if (onSetLiuDay) onSetLiuDay(1);
    }
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissionFlags?.liu_month === 'disabled') return;
    changeMonth(-1);
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissionFlags?.liu_month === 'disabled') return;
    changeMonth(1);
  };

  const handlePrevDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissionFlags?.liu_day === 'disabled') return;
    changeDay(-1);
  };

  const handleNextDay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (permissionFlags?.liu_day === 'disabled') return;
    changeDay(1);
  };

  const { nodes, lines } = useMemo(() => {
    if (!hasRelations) return { nodes: [], lines: [] };

    const clients = new Map<string, Client>([[client.id, client]]);
    const adjacency = new Map<string, Array<{ nextId: string; generationDelta: number }>>();

    relationships.forEach((relationship) => {
      if (!relationship.from_client || !relationship.to_client) return;
      clients.set(relationship.from_client.id, relationship.from_client);
      clients.set(relationship.to_client.id, relationship.to_client);
      const generationDelta = getGenerationDelta(relationship.relation_type);
      adjacency.set(relationship.from_client_id, [
        ...(adjacency.get(relationship.from_client_id) || []),
        { nextId: relationship.to_client_id, generationDelta },
      ]);
      adjacency.set(relationship.to_client_id, [
        ...(adjacency.get(relationship.to_client_id) || []),
        { nextId: relationship.from_client_id, generationDelta: -generationDelta },
      ]);
    });

    const generationById = new Map<string, number>([[client.id, 0]]);
    const queue = [client.id];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentGeneration = generationById.get(currentId) || 0;
      for (const { nextId, generationDelta } of adjacency.get(currentId) || []) {
        if (generationById.has(nextId)) continue;
        generationById.set(nextId, currentGeneration + generationDelta);
        queue.push(nextId);
      }
    }

    const idsByGeneration = new Map<number, string[]>();
    generationById.forEach((generation, id) => {
      idsByGeneration.set(generation, [...(idsByGeneration.get(generation) || []), id]);
    });

    const peerEdges: PeerEdge[] = relationships.flatMap((relationship) => {
      const fromGeneration = generationById.get(relationship.from_client_id);
      const toGeneration = generationById.get(relationship.to_client_id);
      if (fromGeneration === undefined || fromGeneration !== toGeneration) return [];
      return [{
        fromId: relationship.from_client_id,
        toId: relationship.to_client_id,
        weight: PARTNER_RELATIONS.has(relationship.relation_type) ? 100 : 10,
      }];
    });

    interface GenerationComponent {
      generation: number;
      ids: string[];
      orderedIds: string[];
      desiredCenter: number;
    }

    const componentsByGeneration = new Map<number, GenerationComponent[]>();
    idsByGeneration.forEach((ids, generation) => {
      const idSet = new Set(ids);
      const peerAdjacency = new Map<string, string[]>();
      ids.forEach((id) => peerAdjacency.set(id, []));
      peerEdges.forEach((edge) => {
        if (!idSet.has(edge.fromId) || !idSet.has(edge.toId)) return;
        peerAdjacency.get(edge.fromId)!.push(edge.toId);
        peerAdjacency.get(edge.toId)!.push(edge.fromId);
      });

      const remaining = new Set(ids);
      const components: GenerationComponent[] = [];
      while (remaining.size > 0) {
        const firstId = remaining.values().next().value as string;
        const componentIds: string[] = [];
        const componentQueue = [firstId];
        remaining.delete(firstId);
        while (componentQueue.length > 0) {
          const id = componentQueue.shift()!;
          componentIds.push(id);
          for (const nextId of peerAdjacency.get(id) || []) {
            if (!remaining.has(nextId)) continue;
            remaining.delete(nextId);
            componentQueue.push(nextId);
          }
        }
        const componentIdSet = new Set(componentIds);
        const componentEdges = peerEdges.filter((edge) => componentIdSet.has(edge.fromId) && componentIdSet.has(edge.toId));
        components.push({
          generation,
          ids: componentIds,
          orderedIds: orderPeerComponent(componentIds, componentEdges, componentIdSet.has(client.id) ? client.id : undefined),
          desiredCenter: 0,
        });
      }
      componentsByGeneration.set(generation, components);
    });

    const horizontalGap = 112;
    const componentGap = 64;
    const verticalGap = 105;
    const xById = new Map<string, number>();

    const generations = Array.from(componentsByGeneration.keys()).sort((a, b) => {
      const distanceDiff = Math.abs(a) - Math.abs(b);
      return distanceDiff !== 0 ? distanceDiff : a - b;
    });

    generations.forEach((generation) => {
      const components = componentsByGeneration.get(generation) || [];
      components.forEach((component, index) => {
        const connectedXs: number[] = [];
        relationships.forEach((relationship) => {
          const fromInComponent = component.ids.includes(relationship.from_client_id);
          const toInComponent = component.ids.includes(relationship.to_client_id);
          const otherId = fromInComponent
            ? relationship.to_client_id
            : toInComponent
              ? relationship.from_client_id
              : null;
          if (otherId && xById.has(otherId)) connectedXs.push(xById.get(otherId)!);
        });
        component.desiredCenter = connectedXs.length > 0
          ? connectedXs.reduce((sum, x) => sum + x, 0) / connectedXs.length
          : index * (horizontalGap + componentGap);
      });

      const rootComponent = generation === 0
        ? components.find((component) => component.ids.includes(client.id))
        : undefined;
      if (rootComponent) rootComponent.desiredCenter = 0;

      const orderedComponents = [...components].sort((a, b) => a.desiredCenter - b.desiredCenter);
      const centers: number[] = [];
      orderedComponents.forEach((component, index) => {
        const halfWidth = ((component.orderedIds.length - 1) * horizontalGap) / 2;
        if (index === 0) {
          centers.push(component.desiredCenter);
          return;
        }
        const previous = orderedComponents[index - 1];
        const previousHalfWidth = ((previous.orderedIds.length - 1) * horizontalGap) / 2;
        centers.push(Math.max(
          component.desiredCenter,
          centers[index - 1] + previousHalfWidth + componentGap + halfWidth,
        ));
      });

      if (centers.length > 0) {
        const shift = orderedComponents.reduce(
          (sum, component, index) => sum + component.desiredCenter - centers[index],
          0,
        ) / orderedComponents.length;
        centers.forEach((center, componentIndex) => {
          const component = orderedComponents[componentIndex];
          const shiftedCenter = center + shift;
          component.orderedIds.forEach((id, index) => {
            xById.set(id, shiftedCenter + (index - (component.orderedIds.length - 1) / 2) * horizontalGap);
          });
        });
      }
    });

    const calculatedNodes: GraphNode[] = Array.from(generationById.entries()).flatMap(([id, generation]) => {
      const person = clients.get(id);
      if (!person) return [];
      return [{
        id,
        x: xById.get(id) || 0,
        y: generation * verticalGap,
        data: person,
        generation,
      }];
    });

    const nodeById = new Map(calculatedNodes.map((node) => [node.id, node]));
    const calculatedLines: GraphLine[] = relationships.flatMap((relationship) => {
      const source = nodeById.get(relationship.from_client_id);
      const target = nodeById.get(relationship.to_client_id);
      if (!source || !target) return [];
      return [{
        id: [relationship.from_client_id, relationship.to_client_id].sort().join(':'),
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
      }];
    });

    return { nodes: calculatedNodes, lines: calculatedLines };
  }, [client, relationships, hasRelations]);

  if (isDivinationMode) {
    return (
      <div className="col-span-2 row-span-2 flex flex-col items-center justify-center p-4 bg-white z-10 relative h-full w-full">
        <div className="flex flex-col items-center gap-4">
          <div className="text-4xl font-bold text-purple-800 tracking-widest text-center">紫微占卜</div>
          {divNum && (
            <div className="flex gap-3">
              {divNum.map((n, i) => (
                <span
                  key={i}
                  className="text-2xl font-bold text-white bg-purple-600 w-10 h-10 flex items-center justify-center rounded-lg shadow-md border border-purple-400"
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const closePickers = () => {
    setIsMonthPickerOpen(false);
    setIsDayPickerOpen(false);
  };

  const lunarYearGan = chartData?.bazi.trim().charAt(0) ?? '';
  const lunarYearGanIndex = GAN.indexOf(lunarYearGan);
  const isYangYear = lunarYearGanIndex >= 0
    ? lunarYearGanIndex % 2 === 0
    : (chartData?.direction === 1) === (client.gender === '男');
  const yinYangStr = isYangYear ? '陽' : '陰';
  const genderStr = client.gender;

  return (
    <div className="col-span-2 row-span-2 flex z-10 relative overflow-visible p-0.5 h-full w-full" onClick={closePickers}>
      <div className={`flex w-full h-full bg-white`}>
        <div
          className={`h-full flex flex-col p-1 border-r border-gray-100 bg-white z-[300] relative transition-all duration-300 ${
            hasRelations ? 'w-full md:basis-[35%] md:shrink-0' : 'w-full'
          }`}
        >
          {historyStack.length > 0 && (
            <div className="absolute top-0 left-0 w-full px-2 py-1 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 flex items-center gap-1 overflow-hidden">
              <button onClick={onHistoryBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors shrink-0">
                <ArrowLeft size={14} />
              </button>
              <div className="flex items-center text-[10px] text-gray-400 overflow-hidden whitespace-nowrap">
                {historyStack.length > 1 && <span className="shrink-0">...</span>}
                {historyStack.length > 0 && (
                  <>
                    <span className="font-bold text-gray-500 truncate max-w-[60px]">{historyStack[historyStack.length - 1].name}</span>
                  </>
                )}
                <ChevronRight size={10} className="text-blue-400" />
                <span className="font-bold text-blue-600 truncate max-w-[60px]">{client.name}</span>
              </div>
            </div>
          )}

          <div className={`${historyStack.length > 0 ? 'mt-6' : 'mt-1'}`}></div>

          <div className="flex justify-between items-center px-1 mt-1 shrink-0 relative z-[200]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChangeHour(-1);
              }}
              className="text-gray-400 hover:text-gray-800 font-bold text-base select-none p-1 cursor-pointer bg-transparent"
            >
              &lt;
            </button>

            <div
              onClick={(e) => {
                e.stopPropagation();
                if (isTimeModified) onResetTime();
              }}
              className={`text-sm font-bold select-none cursor-pointer ${isTimeModified ? 'text-blue-600 underline' : 'text-gray-700'}`}
            >
              {currentHourZhi}時
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onChangeHour(1);
              }}
              className="text-gray-400 hover:text-gray-800 font-bold text-base select-none p-1 cursor-pointer bg-transparent"
            >
              &gt;
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-start pt-2 text-center gap-0.5 min-h-0 overflow-hidden">
            <div className="text-2xl font-bold text-gray-900 tracking-widest leading-tight truncate w-full px-2">{client.name}</div>

            {chartData && (
              <div className="text-[10px] text-gray-500 font-medium mt-1 space-y-0.5">
                <div>
                  {yinYangStr}{genderStr} | {chartData.bureau}
                </div>
                <div className="font-mono">
                  命主：{chartData.mingZhu} 身主：{chartData.shenZhu}
                </div>
              </div>
            )}
            <div className="mt-2 flex items-center justify-center gap-1 text-[12px] font-mono text-gray-700 bg-gray-50/50 px-2 py-1 rounded">
              <span className="font-bold">{client.birthYear}</span>
              <span className="text-gray-300">-</span>
              <span>{client.birthMonth.toString().padStart(2, '0')}</span>
              <span className="text-gray-300">-</span>
              <span>{client.birthDay.toString().padStart(2, '0')}</span>
              <span className="text-gray-300 mx-2">|</span>
              <span>{client.birthHour.toString().padStart(2, '0')}</span>
              <span className="text-gray-300">:</span>
              <span>{client.birthMinute.toString().padStart(2, '0')}</span>
            </div>
            {chartData && (
              <div className="grid grid-cols-1 gap-0 text-[10px] text-gray-400 mt-1 font-mono leading-tight">
                <div>農曆 {chartData.lunarDate}</div>
                <div>{chartData.bazi}</div>
              </div>
            )}
          </div>

          <div className="mt-auto flex justify-center shrink-0 mb-1 w-full px-1">
            <div className="flex flex-col gap-1 w-full bg-slate-100/80 rounded-lg p-1 border border-slate-200">
              <div className="flex justify-center gap-1 w-full">
                {!isDaXian && !isLiuNian && (
                  <>
                    {permissionFlags?.twin !== 'hidden' && (
                      <button
                        onClick={onToggleTwin}
                        disabled={permissionFlags?.twin === 'disabled'}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-1 ${
                          showTwin ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'
                        } ${permissionFlags?.twin === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={permissionFlags?.twin === 'disabled' ? '權限已到期' : ''}
                      >
                        <Users size={12} /> <span className="hidden sm:inline">雙胞胎</span>
                      </button>
                    )}
                    {permissionFlags?.twin !== 'hidden' && permissionFlags?.inverted !== 'hidden' && <div className="w-px bg-gray-300 my-0.5"></div>}
                  </>
                )}

                {permissionFlags?.inverted !== 'hidden' && !showSmallLimit && (
                  <button
                    onClick={onToggleInverted}
                    disabled={permissionFlags?.inverted === 'disabled'}
                    className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-1 ${
                      showInverted ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'
                    } ${permissionFlags?.inverted === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={permissionFlags?.inverted === 'disabled' ? '權限已到期' : ''}
                  >
                    <Repeat size={12} /> <span className="hidden sm:inline">顛倒盤</span>
                  </button>
                )}

                {isLiuNian && (
                  <>
                    <div className="w-px bg-gray-300 my-0.5"></div>
                    {permissionFlags?.xiao !== 'hidden' && (
                      <button
                        onClick={onToggleSmallLimit}
                        disabled={permissionFlags?.xiao === 'disabled'}
                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-1 ${
                          showSmallLimit ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'
                        } ${permissionFlags?.xiao === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={permissionFlags?.xiao === 'disabled' ? '權限已到期' : ''}
                      >
                        {permissionFlags?.xiao === 'disabled' ? <Lock size={12} /> : <Clock size={12} />} <span className="hidden sm:inline">小限</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {isLiuNian && (
                <div className="hidden md:flex justify-center gap-1 w-full border-t border-gray-200 pt-1">
                  {permissionFlags?.liu_month !== 'hidden' && (
                    <div className="relative flex-1">
                      <div
                        className={`flex items-center rounded overflow-hidden shadow-sm transition-colors
                          ${liuMonth !== null ? 'bg-amber-500' : 'bg-white border border-gray-200'}
                          ${permissionFlags?.liu_month === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <button
                          onClick={handlePrevMonth}
                          disabled={permissionFlags?.liu_month === 'disabled'}
                          className={`px-1 py-1 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-colors cursor-pointer
                            ${liuMonth !== null ? 'text-white' : 'text-gray-400'}
                          `}
                        >
                          <ChevronLeftIcon size={12} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (permissionFlags?.liu_month !== 'disabled') {
                              closePickers();
                              setIsMonthPickerOpen(!isMonthPickerOpen);
                            }
                          }}
                          disabled={permissionFlags?.liu_month === 'disabled'}
                          className={`flex-1 py-1 text-[10px] font-bold flex items-center justify-center gap-1 h-full hover:bg-black/5 transition-colors
                            ${liuMonth !== null ? 'text-white' : 'text-gray-500'}
                          `}
                          title={permissionFlags?.liu_month === 'disabled' ? '權限已到期' : ''}
                        >
                          {permissionFlags?.liu_month === 'disabled' ? <Lock size={12} /> : <Calendar size={12} />}
                          {liuMonth !== null ? `${NUM_CN[liuMonth - 1]}月 ${isLiuMonthLeap ? '(閏)' : ''}` : '流月'}
                          {liuMonth !== null && liuMonthGan !== undefined && (
                            <span className="text-[9px] opacity-90 scale-90 ml-0.5 font-mono">({GAN[liuMonthGan]})</span>
                          )}
                        </button>

                        <button
                          onClick={handleNextMonth}
                          disabled={permissionFlags?.liu_month === 'disabled'}
                          className={`px-1 py-1 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-colors cursor-pointer
                            ${liuMonth !== null ? 'text-white' : 'text-gray-400'}
                          `}
                        >
                          <ChevronRightIcon size={12} />
                        </button>
                      </div>

                      {isMonthPickerOpen && onSetLiuMonth && (
                        <div
                          className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-amber-200 rounded-lg shadow-xl p-2 z-[400] grid grid-cols-3 gap-1 animate-in slide-in-from-bottom-2 fade-in duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                            const isReal = isCurrentYear && !realIsLeap && realLunarMonth === m;
                            return (
                              <React.Fragment key={m}>
                                <button
                                  onClick={() => {
                                    onSetLiuMonth(m, false);
                                    closePickers();
                                  }}
                                  className={`text-xs py-1.5 rounded hover:bg-amber-50 text-gray-700 
                                    ${liuMonth === m && !isLiuMonthLeap ? 'bg-amber-100 font-bold text-amber-700' : ''}
                                    ${isReal ? 'border-2 border-red-400' : ''}
                                  `}
                                >
                                  {NUM_CN[m - 1]}月
                                </button>
                                {leapMonthOfLiuNian === m && (
                                  <button
                                    onClick={() => {
                                      onSetLiuMonth(m, true);
                                      closePickers();
                                    }}
                                    className={`text-[10px] py-1.5 rounded hover:bg-amber-50 text-amber-600 border border-amber-100 col-span-1 
                                      ${liuMonth === m && isLiuMonthLeap ? 'bg-amber-100 font-bold' : ''}
                                      ${isCurrentYear && realIsLeap && realLunarMonth === m ? 'border-2 border-red-400' : ''}
                                    `}
                                  >
                                    閏{NUM_CN[m - 1]}
                                  </button>
                                )}
                              </React.Fragment>
                            );
                          })}
                          <button
                            onClick={() => {
                              onSetLiuMonth(null, false);
                              closePickers();
                            }}
                            className="col-span-3 mt-1 text-[10px] text-gray-400 hover:text-gray-600 border-t border-gray-100 pt-1"
                          >
                            清除流月
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {liuMonth !== null && permissionFlags?.liu_day !== 'hidden' && (
                    <div className="relative flex-1">
                      <div
                        className={`flex items-center rounded overflow-hidden shadow-sm transition-colors
                          ${liuDay !== null ? 'bg-green-600' : 'bg-white border border-gray-200'}
                          ${permissionFlags?.liu_day === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                      >
                        <button
                          onClick={handlePrevDay}
                          disabled={permissionFlags?.liu_day === 'disabled'}
                          className={`px-1 py-1 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-colors cursor-pointer
                            ${liuDay !== null ? 'text-white' : 'text-gray-400'}
                          `}
                        >
                          <ChevronLeftIcon size={12} />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (permissionFlags?.liu_day !== 'disabled') {
                              closePickers();
                              setIsDayPickerOpen(!isDayPickerOpen);
                            }
                          }}
                          disabled={permissionFlags?.liu_day === 'disabled'}
                          className={`flex-1 py-1 text-[10px] font-bold flex items-center justify-center gap-1 h-full hover:bg-black/5 transition-colors
                            ${liuDay !== null ? 'text-white' : 'text-gray-500'}
                          `}
                          title={permissionFlags?.liu_day === 'disabled' ? '權限已到期' : ''}
                        >
                          {permissionFlags?.liu_day === 'disabled' ? <Lock size={12} /> : <Sun size={12} />}
                          {liuDay !== null ? `${Math.min(liuDay, maxDaysInLiuMonth)}日` : '流日'}
                          {liuDay !== null && liuDayGan !== undefined && (
                            <span className="text-[9px] opacity-90 scale-90 ml-0.5 font-mono">({GAN[liuDayGan]})</span>
                          )}
                        </button>

                        <button
                          onClick={handleNextDay}
                          disabled={permissionFlags?.liu_day === 'disabled'}
                          className={`px-1 py-1 h-full flex items-center justify-center hover:bg-black/10 active:bg-black/20 transition-colors cursor-pointer
                            ${liuDay !== null ? 'text-white' : 'text-gray-400'}
                          `}
                        >
                          <ChevronRightIcon size={12} />
                        </button>
                      </div>

                      {isDayPickerOpen && onSetLiuDay && (
                        <div
                          className="absolute bottom-full left-[-50px] mb-2 w-64 bg-white border border-green-200 rounded-lg shadow-xl p-2 z-[400] grid grid-cols-5 gap-1 animate-in slide-in-from-bottom-2 fade-in duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {Array.from({ length: maxDaysInLiuMonth }, (_, i) => i + 1).map((d) => {
                            const isRealDay =
                              isCurrentYear &&
                              realLunarMonth === liuMonth &&
                              realIsLeap === !!isLiuMonthLeap &&
                              realLunarDay === d;

                            const isSelectedDay = liuDay !== null && Math.min(liuDay, maxDaysInLiuMonth) === d;

                            return (
                              <button
                                key={d}
                                onClick={() => {
                                  onSetLiuDay(d);
                                  closePickers();
                                }}
                                className={`text-[10px] py-1.5 rounded hover:bg-green-50 text-gray-700 
                                  ${isSelectedDay ? 'bg-green-100 font-bold text-green-700' : ''}
                                  ${isRealDay ? 'border-2 border-red-400 font-bold text-red-600' : ''}
                                `}
                              >
                                {d}
                              </button>
                            );
                          })}
                          <button
                            onClick={() => {
                              onSetLiuDay(null);
                              closePickers();
                            }}
                            className="col-span-5 mt-1 text-[10px] text-gray-400 hover:text-gray-600 border-t border-gray-100 pt-1"
                          >
                            清除流日
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {DEV_YEARLY_ANALYSIS_ENABLED && null}
            </div>
          </div>
        </div>

        {hasRelations && (
          <div
            className="hidden md:block flex-1 h-full relative bg-white border-l border-gray-100 overflow-hidden cursor-grab active:cursor-grabbing z-0"
            onClick={() => setSelectedNodeId(null)}
          >
            <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 pointer-events-none select-none z-0">可拖曳移動畫布</div>
            <motion.div drag className="relative w-full h-full flex items-center justify-center">
              <motion.div className="relative" style={{ x: 0, y: 0 }}>
                <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
                  {lines.map((line) => (
                    <g key={line.id}>
                      <line x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#cbd5e1" strokeWidth="2" />
                    </g>
                  ))}
                </svg>

                {nodes.map((node) => {
                  const isCenter = node.id === client.id;
                  const isSelected = selectedNodeId === node.id;
                  return (
                    <div
                      key={node.id}
                      className="absolute flex flex-col items-center justify-center"
                      style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 50 : 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCenter) setSelectedNodeId(isSelected ? null : node.id);
                      }}
                    >
                      <div
                        className={`relative px-3 py-1.5 rounded-md shadow-sm border transition-all duration-200 flex items-center justify-center
                          ${
                            isCenter
                              ? client.gender === '男'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600'
                                : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white border-pink-600'
                              : isSelected
                              ? 'bg-white border-blue-400 ring-2 ring-blue-200 scale-105'
                              : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                          }`}
                        style={{ minWidth: 80, cursor: isCenter ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                      >
                        <span className={`text-xs font-bold ${isCenter ? 'text-white' : 'text-gray-700'}`}>{node.data.name}</span>
                        {!isCenter && (
                          <span
                            className={`ml-1 text-[10px] px-1 rounded ${
                              node.data.gender === '男' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'
                            }`}
                          >
                            {node.data.gender}
                          </span>
                        )}
                      </div>

                      <AnimatePresence>
                        {isSelected && !isCenter && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="absolute top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-1 w-32 z-50 overflow-hidden"
                          >
                            <div className="flex justify-between items-center px-2 py-1 border-b border-gray-50 mb-1">
                              <span className="text-[10px] text-gray-400 font-medium">功能選單</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedNodeId(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate(node.data);
                              }}
                              className="flex items-center gap-2 px-2 py-2 text-xs text-gray-700 hover:bg-blue-50 rounded-lg text-left transition-colors"
                            >
                              <Eye size={14} className="text-blue-500" /> 看他命盤
                            </button>

                            {permissionFlags?.dual_chart !== 'hidden' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (permissionFlags?.dual_chart !== 'disabled') {
                                    navigate('/dual-chart', { state: { clientA: client, clientB: node.data } });
                                  }
                                }}
                                disabled={permissionFlags?.dual_chart === 'disabled'}
                                className={`flex items-center gap-2 px-2 py-2 text-xs rounded-lg text-left font-bold transition-colors
                                  ${permissionFlags?.dual_chart === 'disabled' ? 'text-gray-400 bg-gray-50 cursor-not-allowed' : 'text-purple-700 hover:bg-purple-50'}
                                `}
                              >
                                <RefreshCw size={14} /> 和他合盤
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};
