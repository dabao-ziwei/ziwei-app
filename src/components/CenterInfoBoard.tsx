import React, { useState, useMemo } from 'react';
import { Users, Repeat, Clock, ArrowLeft, ChevronRight, Eye, RefreshCw, X, Calendar, Sun, Lock, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import type { Client, Relationship } from '../db';
import type { ChartData } from '../logic/types';
import type { PermissionState } from '../logic/permissions';
import { LunarYear, Solar, Lunar } from 'lunar-typescript';
import { GAN } from '../logic/constants';

const ArrowHead = ({ x, y, rotation }: { x: number, y: number, rotation: number }) => (
  <polygon
    points="0,0 -6,-4 -6,4"
    fill="#cbd5e1"
    transform={`translate(${x}, ${y}) rotate(${rotation})`}
  />
);

const GRAPH_CONFIG = {
  Y_GAP: 80,
  X_GAP: 130,
  SIBLING_GAP: 90,
};

interface GraphNode {
  id: string;
  x: number;
  y: number;
  data: Client;
  relType: string;
}

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
  };

  liuMonth?: number | null;
  isLiuMonthLeap?: boolean;
  liuDay?: number | null;
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
    liuMonth, isLiuMonthLeap, liuDay, onSetLiuMonth, onSetLiuDay, liuNianYear, liuMonthGan, liuDayGan,
    currentRealTime
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

    // 計算當前流月的最大天數 (大小月)
    const maxDaysInLiuMonth = useMemo(() => {
        if (!liuNianYear || liuMonth === null || liuMonth === undefined) return 30;
        try {
            const m = isLiuMonthLeap ? -Math.abs(liuMonth) : Math.abs(liuMonth);
            const l = Lunar.fromYmd(liuNianYear, m, 1);
            return l.getDaysInMonth();
        } catch (e) {
            return 30;
        }
    }, [liuNianYear, liuMonth, isLiuMonthLeap]);

    const handlePrevMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSetLiuMonth || permissionFlags?.liu_month === 'disabled') return;
        
        if (liuMonth === null || liuMonth === undefined) {
            onSetLiuMonth(1, false);
            return;
        }

        let nextM = liuMonth;
        let nextLeap = isLiuMonthLeap || false;

        if (nextLeap) {
            nextLeap = false;
        } else {
            let prevNum = nextM - 1;
            if (prevNum <= 0) prevNum = 12;

            if (leapMonthOfLiuNian === prevNum) {
                nextM = prevNum;
                nextLeap = true;
            } else {
                nextM = prevNum;
                nextLeap = false;
            }
        }
        onSetLiuMonth(nextM, nextLeap);
    };

    const handleNextMonth = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSetLiuMonth || permissionFlags?.liu_month === 'disabled') return;

        if (liuMonth === null || liuMonth === undefined) {
            onSetLiuMonth(1, false);
            return;
        }

        let nextM = liuMonth;
        let nextLeap = isLiuMonthLeap || false;

        if (!nextLeap && leapMonthOfLiuNian === nextM) {
            nextLeap = true;
        } else {
            nextM = nextM + 1;
            nextLeap = false;
            if (nextM > 12) nextM = 1;
        }
        onSetLiuMonth(nextM, nextLeap);
    };

    // 流日切換 Handler
    const handlePrevDay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSetLiuDay || permissionFlags?.liu_day === 'disabled') return;

        if (liuDay === null || liuDay === undefined) {
            onSetLiuDay(1);
            return;
        }

        let nextD = liuDay - 1;
        if (nextD < 1) nextD = maxDaysInLiuMonth; 
        onSetLiuDay(nextD);
    };

    const handleNextDay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!onSetLiuDay || permissionFlags?.liu_day === 'disabled') return;

        if (liuDay === null || liuDay === undefined) {
            onSetLiuDay(1);
            return;
        }

        let nextD = liuDay + 1;
        if (nextD > maxDaysInLiuMonth) nextD = 1; 
        onSetLiuDay(nextD);
    };

    const { nodes, lines } = useMemo(() => {
        if (!hasRelations) return { nodes: [], lines: [] };

        const calculatedNodes: GraphNode[] = [];
        
        calculatedNodes.push({
            id: 'center',
            x: 0,
            y: 0,
            data: client,
            relType: 'self',
        });

        const parents = relationships.filter(r => ['父親', '母親', '爸爸', '媽媽', '父', '母'].includes(r.relation_type));
        const children = relationships.filter(r => ['子女', '兒子', '女兒', '長男', '長女', '次男', '次女'].includes(r.relation_type));
        const partners = relationships.filter(r => ['配偶', '老公', '老婆', '丈夫', '妻子', '情侶'].includes(r.relation_type));
        const others = relationships.filter(r => !parents.includes(r) && !children.includes(r) && !partners.includes(r));

        const layoutGroup = (group: Relationship[], direction: 'top' | 'bottom' | 'left' | 'right') => {
            const count = group.length;
            if (count === 0) return;

            group.forEach((rel, index) => {
                if (!rel.related_client) return;
                const centerOffset = (count - 1) * GRAPH_CONFIG.SIBLING_GAP / 2;
                const offset = index * GRAPH_CONFIG.SIBLING_GAP - centerOffset;
                
                let x = 0, y = 0;
                switch (direction) {
                    case 'top':    y = -GRAPH_CONFIG.Y_GAP; x = offset; break;
                    case 'bottom': y = GRAPH_CONFIG.Y_GAP;  x = offset; break;
                    case 'left':   x = -GRAPH_CONFIG.X_GAP; y = offset; break;
                    case 'right':  x = GRAPH_CONFIG.X_GAP;  y = offset; break;
                }
                calculatedNodes.push({ id: rel.related_client.id, x, y, data: rel.related_client, relType: rel.relation_type });
            });
        };

        layoutGroup(parents, 'top');
        layoutGroup(children, 'bottom');
        layoutGroup(others, 'left');
        layoutGroup(partners, 'right');

        const calculatedLines = calculatedNodes
            .filter(n => n.id !== 'center')
            .map(node => {
                let d = '';
                let arrowRotation = 0;
                let arrowX = node.x;
                let arrowY = node.y;
                
                const halfW = 42; 
                const halfH = 16;

                if (Math.abs(node.y) > Math.abs(node.x)) {
                    const cY = node.y / 2;
                    d = `M 0 0 C 0 ${cY}, ${node.x} ${cY}, ${node.x} ${node.y}`;
                    if (node.y > 0) { arrowRotation = 90; arrowY = node.y - halfH; }
                    else { arrowRotation = -90; arrowY = node.y + halfH; }
                } else {
                    const cX = node.x / 2;
                    d = `M 0 0 C ${cX} 0, ${cX} ${node.y}, ${node.x} ${node.y}`;
                    if (node.x > 0) { arrowRotation = 0; arrowX = node.x - halfW; }
                    else { arrowRotation = 180; arrowX = node.x + halfW; }
                }
                return { targetId: node.id, d, arrowX, arrowY, rotation: arrowRotation };
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
                                <span key={i} className="text-2xl font-bold text-white bg-purple-600 w-10 h-10 flex items-center justify-center rounded-lg shadow-md border border-purple-400">
                                    {n}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const closePickers = () => { setIsMonthPickerOpen(false); setIsDayPickerOpen(false); };

    return (
        <div className="col-span-2 row-span-2 flex z-10 relative overflow-visible p-0.5 h-full w-full" onClick={closePickers}>
            {/* [修正] 將 overflow-hidden 改為 overflow-visible，允許選單彈出容器外 */}
            <div className={`flex w-full h-full bg-white`}>
                
                {/* [修正] 左側面板：z-index 提高到 300，確保在所有線條和格子之上 */}
                <div className={`h-full flex flex-col p-1 border-r border-gray-100 bg-white z-[300] relative transition-all duration-300 ${hasRelations ? 'basis-[35%] shrink-0' : 'w-full'}`}>
                    {historyStack.length > 0 && (
                          <div className="absolute top-0 left-0 w-full px-2 py-1 z-50 bg-white/90 backdrop-blur-sm border-b border-gray-100 flex items-center gap-1 overflow-hidden">
                            <button onClick={onHistoryBack} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors shrink-0"><ArrowLeft size={14} /></button>
                            <div className="flex items-center text-[10px] text-gray-400 overflow-hidden whitespace-nowrap">
                                {historyStack.length > 1 && <span className="shrink-0">...</span>}
                                {historyStack.length > 0 && (<><span className="font-bold text-gray-500 truncate max-w-[60px]">{historyStack[historyStack.length - 1].name}</span></>)}
                                <ChevronRight size={10} className="text-blue-400"/>
                                <span className="font-bold text-blue-600 truncate max-w-[60px]">{client.name}</span>
                            </div>
                          </div>
                    )}
                    
                    <div className={`${historyStack.length > 0 ? 'mt-6' : 'mt-1'}`}></div>

                    <div className="flex justify-between items-center px-1 mt-1 shrink-0 relative z-[200]">
                        <button onClick={(e) => { e.stopPropagation(); onChangeHour(-1); }} className="text-gray-400 hover:text-gray-800 font-bold text-base select-none p-1 cursor-pointer bg-transparent">&lt;</button>
                        
                        <div onClick={(e) => { e.stopPropagation(); if(isTimeModified) onResetTime(); }} className={`text-sm font-bold select-none cursor-pointer ${isTimeModified ? 'text-blue-600 underline' : 'text-gray-700'}`}>{currentHourZhi}時</div>
                        
                        <button onClick={(e) => { e.stopPropagation(); onChangeHour(1); }} className="text-gray-400 hover:text-gray-800 font-bold text-base select-none p-1 cursor-pointer bg-transparent">&gt;</button>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-start pt-2 text-center gap-0.5 min-h-0 overflow-hidden">
                        <div className="text-2xl font-bold text-gray-900 tracking-widest leading-tight truncate w-full px-2">{client.name}</div>
                        
                        {chartData && (
                            <div className="text-[10px] text-gray-500 font-medium mt-1 space-y-0.5">
                                <div>{client.gender} | {chartData.bureau}</div>
                                <div className="font-mono">命主：{chartData.mingZhu}　身主：{chartData.shenZhu}</div>
                            </div>
                        )}
                        <div className="mt-2 flex items-center justify-center gap-1 text-[12px] font-mono text-gray-700 bg-gray-50/50 px-2 py-1 rounded">
                            <span className="font-bold">{client.birthYear}</span><span className="text-gray-300">-</span><span>{client.birthMonth.toString().padStart(2, '0')}</span><span className="text-gray-300">-</span><span>{client.birthDay.toString().padStart(2, '0')}</span><span className="text-gray-300 mx-2">|</span><span>{client.birthHour.toString().padStart(2, '0')}</span><span className="text-gray-300">:</span><span>{client.birthMinute.toString().padStart(2, '0')}</span>
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
                                                className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-1 ${showTwin ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'} ${permissionFlags?.twin === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                        className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-1 ${showInverted ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'} ${permissionFlags?.inverted === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                                className={`flex-1 py-1 text-[10px] font-bold rounded transition-colors flex items-center justify-center gap-1 ${showSmallLimit ? 'bg-green-600 text-white shadow-sm' : 'text-gray-500 hover:bg-white'} ${permissionFlags?.xiao === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title={permissionFlags?.xiao === 'disabled' ? '權限已到期' : ''}
                                            >
                                                {permissionFlags?.xiao === 'disabled' ? <Lock size={12}/> : <Clock size={12} />} <span className="hidden sm:inline">小限</span>
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>

                            {isLiuNian && (
                                <div className="hidden md:flex justify-center gap-1 w-full border-t border-gray-200 pt-1">
                                    
                                    {permissionFlags?.liu_month !== 'hidden' && (
                                        <div className="relative flex-1">
                                            <div className={`flex items-center rounded overflow-hidden shadow-sm transition-colors
                                                ${liuMonth !== null ? 'bg-amber-500' : 'bg-white border border-gray-200'}
                                                ${permissionFlags?.liu_month === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}>
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
                                                    {liuMonth !== null ? `${NUM_CN[liuMonth-1]}月 ${isLiuMonthLeap ? '(閏)' : ''}` : '流月'}
                                                    {liuMonth !== null && liuMonthGan !== undefined && <span className="text-[9px] opacity-90 scale-90 ml-0.5 font-mono">({GAN[liuMonthGan]})</span>}
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
                                                // [修正] 提高 z-index 至 z-[400] 確保蓋過其他元素
                                                <div className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-amber-200 rounded-lg shadow-xl p-2 z-[400] grid grid-cols-3 gap-1 animate-in slide-in-from-bottom-2 fade-in duration-200" onClick={e => e.stopPropagation()}>
                                                    {Array.from({length: 12}, (_, i) => i + 1).map(m => {
                                                        const isReal = isCurrentYear && !realIsLeap && realLunarMonth === m;
                                                        return (
                                                            <React.Fragment key={m}>
                                                                <button 
                                                                    onClick={() => { onSetLiuMonth(m, false); closePickers(); }}
                                                                    className={`text-xs py-1.5 rounded hover:bg-amber-50 text-gray-700 
                                                                        ${liuMonth === m && !isLiuMonthLeap ? 'bg-amber-100 font-bold text-amber-700' : ''}
                                                                        ${isReal ? 'border-2 border-red-400' : ''}
                                                                    `}
                                                                >
                                                                    {NUM_CN[m-1]}月
                                                                </button>
                                                                {leapMonthOfLiuNian === m && (
                                                                    <button 
                                                                        onClick={() => { onSetLiuMonth(m, true); closePickers(); }}
                                                                        className={`text-[10px] py-1.5 rounded hover:bg-amber-50 text-amber-600 border border-amber-100 col-span-1 
                                                                            ${liuMonth === m && isLiuMonthLeap ? 'bg-amber-100 font-bold' : ''}
                                                                            ${isCurrentYear && realIsLeap && realLunarMonth === m ? 'border-2 border-red-400' : ''}
                                                                        `}
                                                                    >
                                                                        閏{NUM_CN[m-1]}
                                                                    </button>
                                                                )}
                                                            </React.Fragment>
                                                        );
                                                    })}
                                                    <button onClick={() => { onSetLiuMonth(null, false); closePickers(); }} className="col-span-3 mt-1 text-[10px] text-gray-400 hover:text-gray-600 border-t border-gray-100 pt-1">清除流月</button>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {liuMonth !== null && permissionFlags?.liu_day !== 'hidden' && (
                                        <div className="relative flex-1">
                                            <div className={`flex items-center rounded overflow-hidden shadow-sm transition-colors
                                                ${liuDay !== null ? 'bg-green-600' : 'bg-white border border-gray-200'}
                                                ${permissionFlags?.liu_day === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                                            `}>
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
                                                    {liuDay !== null ? `${liuDay}日` : '流日'}
                                                    {liuDay !== null && liuDayGan !== undefined && <span className="text-[9px] opacity-90 scale-90 ml-0.5 font-mono">({GAN[liuDayGan]})</span>}
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
                                                // [修正] 提高 z-index 至 z-[400] 確保蓋過其他元素
                                                <div className="absolute bottom-full left-[-50px] mb-2 w-64 bg-white border border-green-200 rounded-lg shadow-xl p-2 z-[400] grid grid-cols-5 gap-1 animate-in slide-in-from-bottom-2 fade-in duration-200" onClick={e => e.stopPropagation()}>
                                                    {Array.from({length: maxDaysInLiuMonth}, (_, i) => i + 1).map(d => {
                                                        const isRealDay = isCurrentYear && 
                                                                          realLunarMonth === liuMonth && 
                                                                          realIsLeap === !!isLiuMonthLeap && 
                                                                          realLunarDay === d;
                                                        
                                                        return (
                                                            <button 
                                                                key={d}
                                                                onClick={() => { onSetLiuDay(d); closePickers(); }}
                                                                className={`text-[10px] py-1.5 rounded hover:bg-green-50 text-gray-700 
                                                                    ${liuDay === d ? 'bg-green-100 font-bold text-green-700' : ''}
                                                                    ${isRealDay ? 'border-2 border-red-400 font-bold text-red-600' : ''}
                                                                `}
                                                            >
                                                                {d}
                                                            </button>
                                                        );
                                                    })}
                                                    <button onClick={() => { onSetLiuDay(null); closePickers(); }} className="col-span-5 mt-1 text-[10px] text-gray-400 hover:text-gray-600 border-t border-gray-100 pt-1">清除流日</button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div> 

                {hasRelations && (
                    <div className="hidden md:block flex-1 h-full relative bg-white border-l border-gray-100 overflow-hidden cursor-grab active:cursor-grabbing z-0" onClick={() => setSelectedNodeId(null)}>
                          <div className="absolute bottom-2 right-2 text-[10px] text-gray-400 pointer-events-none select-none z-0">可拖曳移動畫布</div>
                          <motion.div drag className="relative w-full h-full flex items-center justify-center">
                            <motion.div className="relative" style={{ x: 0, y: 0 }}>
                                <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
                                    {lines.map(line => (
                                        <g key={line.targetId}>
                                            <path d={line.d} fill="none" stroke="#cbd5e1" strokeWidth="2" />
                                            <ArrowHead x={line.arrowX} y={line.arrowY} rotation={line.rotation} />
                                        </g>
                                    ))}
                                </svg>

                                {nodes.map(node => {
                                    const isCenter = node.id === 'center';
                                    const isSelected = selectedNodeId === node.id;
                                    return (
                                        <div key={node.id}
                                            className="absolute flex flex-col items-center justify-center"
                                            style={{ left: node.x, top: node.y, transform: 'translate(-50%, -50%)', zIndex: isSelected ? 50 : 10 }}
                                            onClick={(e) => { e.stopPropagation(); if (!isCenter) setSelectedNodeId(isSelected ? null : node.id); }}
                                        >
                                            <div className={`relative px-3 py-1.5 rounded-md shadow-sm border transition-all duration-200 flex items-center justify-center
                                                ${isCenter ? (client.gender === '男' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600' : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white border-pink-600') 
                                                           : (isSelected ? 'bg-white border-blue-400 ring-2 ring-blue-200 scale-105' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md')}`}
                                                style={{ minWidth: isCenter ? '80px' : 'auto', cursor: isCenter ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                                <span className={`text-xs font-bold ${isCenter ? 'text-white' : 'text-gray-700'}`}>{node.data.name}</span>
                                                {!isCenter && (<span className={`ml-1 text-[10px] px-1 rounded ${node.data.gender === '男' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>{node.data.gender}</span>)}
                                            </div>

                                            <AnimatePresence>
                                                {isSelected && !isCenter && (
                                                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-1 w-32 z-50 overflow-hidden">
                                                        <div className="flex justify-between items-center px-2 py-1 border-b border-gray-50 mb-1"><span className="text-[10px] text-gray-400 font-medium">功能選單</span><button onClick={(e) => { e.stopPropagation(); setSelectedNodeId(null); }} className="text-gray-400 hover:text-gray-600"><X size={12} /></button></div>
                                                        <button onClick={(e) => { e.stopPropagation(); onNavigate(node.data); }} className="flex items-center gap-2 px-2 py-2 text-xs text-gray-700 hover:bg-blue-50 rounded-lg text-left transition-colors"><Eye size={14} className="text-blue-500"/> 看他命盤</button>
                                                        
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