import React, { useMemo, useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Eye, RefreshCw, X } from 'lucide-react';
import type { Client, Relationship } from '../db';

interface RelationshipGraphProps {
  client: Client;
  relationships: Relationship[];
  onNavigate: (target: Client) => void;
  onCompatibility: (target: Client) => void;
}

// 佈局設定
const CONFIG = {
  // 節點大小
  NODE_WIDTH: 100,
  NODE_HEIGHT: 40,
  // 間距
  Y_GAP: 180, // 上下層垂直距離
  X_GAP: 240, // 左右層水平距離
  SIBLING_GAP: 120, // 同層級節點間距
};

interface GraphNode {
  id: string;
  x: number;
  y: number;
  data: Client;
  relType: string; // 僅用於分類邏輯，顯示時不使用
}

export const RelationshipGraph: React.FC<RelationshipGraphProps> = ({
  client,
  relationships,
  onNavigate,
  onCompatibility,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // 1. 自動佈局演算法
  const { nodes, lines } = useMemo(() => {
    const calculatedNodes: GraphNode[] = [];
    
    // 中心：命主 (0, 0)
    calculatedNodes.push({
      id: 'center',
      x: 0,
      y: 0,
      data: client,
      relType: 'self',
    });

    // 分類
    const parents = relationships.filter(r => ['父親', '母親', '爸爸', '媽媽', '父', '母'].includes(r.relation_type));
    const children = relationships.filter(r => ['子女', '兒子', '女兒'].includes(r.relation_type));
    const partners = relationships.filter(r => ['配偶', '老公', '老婆', '丈夫', '妻子', '情侶'].includes(r.relation_type));
    const others = relationships.filter(r => !parents.includes(r) && !children.includes(r) && !partners.includes(r));

    // 輔助排版函數
    const layoutGroup = (group: Relationship[], direction: 'top' | 'bottom' | 'left' | 'right') => {
      const count = group.length;
      if (count === 0) return;

      group.forEach((rel, index) => {
        if (!rel.related_client) return;

        let x = 0;
        let y = 0;

        // 計算偏移量 (讓節點置中對稱)
        // index: 0, 1, 2 -> shift: -1, 0, 1 (if gap=1)
        const centerOffset = (count - 1) * CONFIG.SIBLING_GAP / 2;
        const offset = index * CONFIG.SIBLING_GAP - centerOffset;

        switch (direction) {
          case 'top': // 父母
            y = -CONFIG.Y_GAP;
            x = offset;
            break;
          case 'bottom': // 子女
            y = CONFIG.Y_GAP;
            x = offset;
            break;
          case 'left': // 朋友/手足
            x = -CONFIG.X_GAP;
            y = offset; // 垂直排列
            break;
          case 'right': // 配偶
            x = CONFIG.X_GAP;
            y = offset; // 垂直排列
            break;
        }

        calculatedNodes.push({
          id: rel.related_client.id,
          x,
          y,
          data: rel.related_client,
          relType: rel.relation_type,
        });
      });
    };

    layoutGroup(parents, 'top');
    layoutGroup(children, 'bottom');
    layoutGroup(others, 'left');
    layoutGroup(partners, 'right');

    // 生成連線路徑 (從 0,0 到 node.x, node.y)
    const calculatedLines = calculatedNodes
      .filter(n => n.id !== 'center')
      .map(node => {
        // 貝茲曲線控制點
        let d = '';
        if (Math.abs(node.y) > Math.abs(node.x)) {
          // 垂直連線 (上下) - 控制點在 Y 軸中段
          const cY = node.y / 2;
          d = `M 0 0 C 0 ${cY}, ${node.x} ${cY}, ${node.x} ${node.y}`;
        } else {
          // 水平連線 (左右) - 控制點在 X 軸中段
          const cX = node.x / 2;
          d = `M 0 0 C ${cX} 0, ${cX} ${node.y}, ${node.x} ${node.y}`;
        }
        return { targetId: node.id, d };
      });

    return { nodes: calculatedNodes, lines: calculatedLines };
  }, [client, relationships]);

  // 點擊空白處關閉選單
  const handleBgClick = () => {
    setSelectedNodeId(null);
  };

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full bg-slate-50 relative overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onClick={handleBgClick}
    >
      {/* 無限畫布區域 (可拖曳) */}
      <motion.div
        drag
        dragMomentum={false} // 關閉慣性，避免滑太遠
        className="absolute left-1/2 top-1/2 flex items-center justify-center w-0 h-0"
      >
        {/* 1. 連線層 (SVG) */}
        <svg className="absolute overflow-visible pointer-events-none" style={{ left: 0, top: 0 }}>
          <defs>
            <marker id="arrow-head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto" fill="#cbd5e1">
              <path d="M0,0 L0,6 L6,3 z" />
            </marker>
          </defs>
          {lines.map(line => (
            <path
              key={line.targetId}
              d={line.d}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="2"
              markerEnd="url(#arrow-head)"
            />
          ))}
        </svg>

        {/* 2. 節點層 (Nodes) */}
        {nodes.map(node => {
          const isCenter = node.id === 'center';
          const isSelected = selectedNodeId === node.id;
          
          return (
            <div
              key={node.id}
              className="absolute flex flex-col items-center justify-center"
              style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)', // 讓座標點位於元素的正中心
                zIndex: isSelected ? 50 : 10,
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!isCenter) setSelectedNodeId(isSelected ? null : node.id);
              }}
            >
              {/* 節點本體 */}
              <div 
                className={`
                  relative px-4 py-2 rounded-lg shadow-sm border transition-all duration-200 flex items-center justify-center
                  ${isCenter 
                    ? (client.gender === '男' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-blue-600' : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white border-pink-600') 
                    : (isSelected ? 'bg-white border-blue-400 ring-2 ring-blue-200 scale-105' : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md')
                  }
                `}
                style={{ 
                  minWidth: isCenter ? '100px' : 'auto',
                  cursor: isCenter ? 'default' : 'pointer' 
                }}
              >
                <span className={`text-sm font-bold whitespace-nowrap ${isCenter ? 'text-white' : 'text-gray-700'}`}>
                  {node.data.name}
                </span>
                
                {/* 簡單的性別標記 (如果是中心點則不需要) */}
                {!isCenter && (
                   <span className={`ml-2 text-[10px] px-1 rounded ${node.data.gender === '男' ? 'bg-blue-50 text-blue-500' : 'bg-pink-50 text-pink-500'}`}>
                     {node.data.gender}
                   </span>
                )}
              </div>

              {/* 3. 互動選單 (Popover) - 僅在選中時顯示 */}
              {isSelected && !isCenter && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute top-full mt-2 bg-white rounded-xl shadow-xl border border-gray-100 p-1.5 flex flex-col gap-1 w-32 z-50 overflow-hidden"
                >
                  <div className="flex justify-between items-center px-2 py-1 border-b border-gray-50 mb-1">
                    <span className="text-[10px] text-gray-400 font-medium">功能選單</span>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedNodeId(null); }} className="text-gray-400 hover:text-gray-600">
                      <X size={12} />
                    </button>
                  </div>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); onNavigate(node.data); }} 
                    className="flex items-center gap-2 px-2 py-2 text-xs text-gray-700 hover:bg-blue-50 rounded-lg text-left transition-colors"
                  >
                    <Eye size={14} className="text-blue-500"/> 看他命盤
                  </button>
                  
                  <button 
                    onClick={(e) => { e.stopPropagation(); onCompatibility(node.data); }} 
                    className="flex items-center gap-2 px-2 py-2 text-xs text-purple-700 hover:bg-purple-50 rounded-lg text-left font-bold transition-colors"
                  >
                    <RefreshCw size={14} /> 和他合盤
                  </button>
                </motion.div>
              )}
            </div>
          );
        })}
      </motion.div>
      
      {/* 提示文字 */}
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-300 pointer-events-none select-none">
        可拖曳移動畫布
      </div>
    </div>
  );
};