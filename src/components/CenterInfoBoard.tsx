import React, { useMemo, useState } from 'react';
import { User, Network, ArrowRight, Eye, RefreshCw } from 'lucide-react';
import type { Client, Relationship } from '../db';
import type { ChartData } from '../logic/types';

interface CenterInfoBoardProps {
  client: Client;
  chartData: ChartData;
  relationships: Relationship[];
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
}

// 關係座標設定 (輻射狀佈局)
// Center (50, 50)
const POSITIONS = {
    top: { x: 50, y: 15 },    // 長輩
    bottom: { x: 50, y: 85 }, // 晚輩
    left: { x: 15, y: 50 },   // 手足/平輩
    right: { x: 85, y: 50 },  // 伴侶
    topLeft: { x: 25, y: 25 },
    topRight: { x: 75, y: 25 },
    bottomLeft: { x: 25, y: 75 },
    bottomRight: { x: 75, y: 75 },
};

export const CenterInfoBoard: React.FC<CenterInfoBoardProps> = ({
    client,
    chartData,
    relationships,
    onNavigate,
    onCompatibility,
    benMingMajorStarsStr,
    onChangeHour,
    onResetTime,
    currentHourZhi,
    isTimeModified,
    isDivinationMode,
    divNum,
    isDivinationReady
}) => {
    const [selectedRelId, setSelectedRelId] = useState<string | null>(null);

    // 1. 整理關係節點位置
    const graphNodes = useMemo(() => {
        const nodes: any[] = [];
        
        // 分類
        const parents = relationships.filter(r => ['父親', '母親', '爸爸', '媽媽', '父', '母'].includes(r.relation_type));
        const children = relationships.filter(r => ['子女', '兒子', '女兒'].includes(r.relation_type));
        const partners = relationships.filter(r => ['配偶', '老公', '老婆', '丈夫', '妻子', '情侶'].includes(r.relation_type));
        const siblings = relationships.filter(r => ['兄弟', '姊妹', '哥哥', '姐姐', '弟弟', '妹妹'].includes(r.relation_type));
        const others = relationships.filter(r => !parents.includes(r) && !children.includes(r) && !partners.includes(r) && !siblings.includes(r));

        // 分配位置 (簡單算法：每個區塊最多放幾個，超過就重疊或微調)
        // 為保持畫面乾淨，每個方位只顯示前 1-2 個，或是做成扇形散開 (這裡先做簡易固定點)
        
        const addNode = (rel: Relationship, posKey: keyof typeof POSITIONS, offsetIdx = 0) => {
            const base = POSITIONS[posKey];
            // 微調座標避免重疊
            const x = base.x + (offsetIdx % 2 === 0 ? offsetIdx * 5 : -offsetIdx * 5); 
            const y = base.y + (offsetIdx > 1 ? 5 : 0);
            nodes.push({ ...rel, x, y });
        };

        parents.forEach((r, i) => addNode(r, 'top', i));
        children.forEach((r, i) => addNode(r, 'bottom', i));
        partners.forEach((r, i) => addNode(r, 'right', i));
        siblings.forEach((r, i) => addNode(r, 'left', i));
        
        // 其他人放角落
        others.forEach((r, i) => {
            const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'] as const;
            addNode(r, corners[i % 4], Math.floor(i / 4));
        });

        return nodes;
    }, [relationships]);

    if (isDivinationMode) {
        return (
            <div className="col-span-2 row-span-2 flex flex-col items-center justify-center p-4 border border-gray-300 bg-white z-10 relative">
                {/* 紫占專用顯示 (維持原樣) */}
                <div className="flex flex-col items-center gap-2 mb-4">
                    <div className="text-3xl sm:text-4xl font-bold text-purple-800 tracking-widest text-center">
                        {client.name}
                    </div>
                    <div className="text-sm font-bold text-gray-500 tracking-wide">
                        {benMingMajorStarsStr}
                    </div>
                </div>
                {isDivinationReady && divNum && (
                    <div className="flex gap-2">
                        {divNum.map((n, i) => (
                            <span key={i} className="text-xl font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-lg border border-purple-200 shadow-sm">{n}</span>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="col-span-2 row-span-2 flex border border-gray-300 bg-white z-10 relative overflow-hidden">
            
            {/* 左側：個人資料 (35% - Mobile 100%) */}
            <div className="w-full md:w-[35%] h-full flex flex-col p-3 border-r border-gray-100 bg-white z-20 shadow-sm">
                
                {/* 時辰切換 */}
                <div className="flex justify-between items-center mb-3 px-1">
                    <button onClick={() => onChangeHour(-1)} className="text-gray-400 hover:text-gray-800 font-bold text-lg select-none">&lt;</button>
                    <div 
                        onClick={isTimeModified ? onResetTime : undefined} 
                        className={`text-base font-bold select-none cursor-pointer ${isTimeModified ? 'text-blue-600 underline' : 'text-gray-700'}`} 
                        title="點擊還原出生時辰"
                    >
                        {currentHourZhi}時
                    </div>
                    <button onClick={() => onChangeHour(1)} className="text-gray-400 hover:text-gray-800 font-bold text-lg select-none">&gt;</button>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
                    {/* 姓名 */}
                    <div className="text-2xl md:text-3xl font-bold text-gray-900 tracking-widest leading-tight">
                        {client.name}
                    </div>
                    {/* 主星 */}
                    <div className="text-xs font-bold text-gray-500 tracking-wide bg-gray-50 px-2 py-0.5 rounded-full">
                        {benMingMajorStarsStr}
                    </div>

                    {/* 格局 */}
                    <div className="flex flex-col gap-0.5 mt-2 text-sm text-gray-600 font-medium">
                        <span>{client.gender} | {chartData.bureau}</span>
                        <span>{chartData.mingZhu} | {chartData.shenZhu}</span>
                    </div>

                    {/* 緊湊生辰 */}
                    <div className="grid grid-cols-3 gap-x-2 gap-y-0 text-xs text-gray-500 mt-2 border-t border-gray-100 pt-2 w-full max-w-[180px]">
                        <div className="text-right">西元</div>
                        <div className="col-span-2 text-left font-mono">{chartData.solarDate}</div>
                        <div className="text-right">農曆</div>
                        <div className="col-span-2 text-left font-mono">{chartData.lunarDate}</div>
                    </div>
                </div>
            </div>

            {/* 右側：關係星系圖 (65% - Mobile Hidden) */}
            <div className="hidden md:block w-[65%] h-full relative bg-slate-50 overflow-auto">
                {relationships.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2 select-none">
                        <Network size={48} className="opacity-20"/>
                        <span className="text-xs">尚無關聯</span>
                    </div>
                ) : (
                    <div className="w-full h-full min-w-[300px] min-h-[300px] relative">
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                            <defs>
                                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="28" refY="3.5" orient="auto">
                                    <polygon points="0 0, 10 3.5, 0 7" fill="#cbd5e1" />
                                </marker>
                            </defs>
                            {graphNodes.map((node, i) => (
                                <line 
                                    key={i}
                                    x1="50%" y1="50%" 
                                    x2={`${node.x}%`} y2={`${node.y}%`} 
                                    stroke="#e2e8f0" 
                                    strokeWidth="1.5"
                                    // markerEnd="url(#arrowhead)" // 不需要箭頭，太亂
                                />
                            ))}
                        </svg>

                        {/* 中心點 (我) */}
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-md border-2 border-white">
                                我
                            </div>
                        </div>

                        {/* 衛星點 */}
                        {graphNodes.map((node, i) => (
                            <div 
                                key={node.id}
                                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                                style={{ left: `${node.x}%`, top: `${node.y}%` }}
                                onClick={() => setSelectedRelId(selectedRelId === node.id ? null : node.id)}
                            >
                                <div className={`flex flex-col items-center transition-all duration-300 ${selectedRelId === node.id ? 'scale-110 z-50' : 'hover:scale-105 z-20'}`}>
                                    <div className={`
                                        w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold shadow-sm border border-white
                                        ${['配偶', '老公', '老婆'].includes(node.relation_type) ? 'bg-pink-100 text-pink-700' : 
                                          ['父親', '母親'].includes(node.relation_type) ? 'bg-amber-100 text-amber-700' :
                                          ['子女'].includes(node.relation_type) ? 'bg-green-100 text-green-700' :
                                          'bg-white text-gray-600'
                                        }
                                    `}>
                                        {node.related_client?.name.slice(0, 2)}
                                    </div>
                                    <span className="text-[10px] text-gray-500 bg-white/80 px-1 rounded mt-0.5 whitespace-nowrap backdrop-blur-sm">
                                        {node.relation_type}
                                    </span>
                                </div>

                                {/* Popover Menu */}
                                {selectedRelId === node.id && (
                                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 p-1 flex flex-col gap-1 w-28 z-50 animate-in fade-in zoom-in duration-200">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onNavigate(node.related_client); }}
                                            className="flex items-center gap-2 px-2 py-1.5 text-xs text-gray-700 hover:bg-blue-50 rounded text-left"
                                        >
                                            <Eye size={12} /> 查看命盤
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onCompatibility(node.related_client); }}
                                            className="flex items-center gap-2 px-2 py-1.5 text-xs text-purple-700 hover:bg-purple-50 rounded text-left font-bold"
                                        >
                                            <RefreshCw size={12} /> 進行合盤
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};