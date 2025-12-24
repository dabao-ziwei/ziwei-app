def get_css():
    return """
    <style>
        /* === 1. 基礎重置與頂部空間壓縮 === */
        :root { --primary: #4B0082; --border: #333; --grid-line: #999; }
        body { margin: 0; padding: 0; font-family: sans-serif; }

        /* 關鍵：壓縮 Streamlit 頂部預設的巨大留白 */
        .block-container {
            padding-top: 1rem !important; 
            padding-bottom: 1rem !important;
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
            max-width: 100% !important;
        }
        /* 移除元素間距 */
        [data-testid="stVerticalBlock"] { gap: 0 !important; }
        
        /* 隱藏預設 Header (如果還有的話) */
        header { visibility: hidden; height: 0; }

        /* === 2. 主容器 === */
        .master-container {
            display: flex;
            flex-direction: column;
            width: 100%;
            border: 2px solid var(--border);
            box-sizing: border-box;
            position: relative;
            background-color: #fff;
            margin-top: 0px;
        }

        /* === 3. SVG 連線層 === */
        .svg-container {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 560px; /* 140px * 4 */
            pointer-events: none;
            z-index: 0;
        }
        svg { width: 100%; height: 100%; }
        polygon { fill: none !important; }

        /* === 4. 命盤 Grid === */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 140px);
            gap: 1px;
            background-color: var(--grid-line);
            position: relative;
            z-index: 1;
        }

        .zwds-cell {
            background-color: rgba(255,255,255,0.92);
            position: relative;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            
            /* 關鍵互動設定：容器本身可以被點擊 */
            cursor: pointer;
            pointer-events: auto; 
        }
        
        /* 關鍵修正：讓宮位內的所有內容 (文字、星曜) 都不攔截滑鼠點擊 */
        .zwds-cell > * {
            pointer-events: none !important;
        }

        /* === 內容層 === */
        .cell-content {
            flex: 1;
            padding: 2px;
            display: flex;
            flex-direction: column;
            background-color: rgba(255, 255, 255, 0.85);
            z-index: 2; 
            transition: background-color 0.2s;
        }
        
        .zwds-cell:hover .cell-content { background-color: rgba(240, 248, 255, 0.9); }

        /* 高亮效果 */
        .focus-bg { background-color: rgba(230, 247, 255, 0.9) !important; }
        .sanfang-bg { background-color: rgba(255, 247, 230, 0.9) !important; }
        .duigong-bg { background-color: rgba(246, 255, 237, 0.9) !important; }
        
        .border-active { box-shadow: inset 0 0 0 2px #666; }
        .border-liu { box-shadow: inset 0 0 0 2px #007bff; }

        /* === 星曜排版 === */
        .stars-box { display: flex; flex-wrap: wrap; gap: 0; }
        .star-item { 
            display: inline-flex; flex-direction: column; align-items: center; 
            margin: 0 1px 1px 0; 
        }
        
        .txt-major { 
            font-size: 18px; font-weight: 900; color: #B71C1C; 
            writing-mode: vertical-rl; text-orientation: upright; 
            letter-spacing: -2px; margin-bottom: 3px;
        }
        .txt-med { font-size: 13px; font-weight: 700; color: #000; writing-mode: vertical-rl; line-height: 1.1; }
        .txt-sml { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; line-height: 1.1; }
        
        .hua-badge {
            font-size: 10px; color: #fff; border-radius: 2px; text-align: center; width: 14px;
            display: block; margin-top: 0;
        }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }

        /* === 角落資訊 === */
        .footer-left { position: absolute; bottom: 2px; left: 2px; }
        .god-box { display: flex; flex-direction: column; }
        .god-txt { font-size: 10px; writing-mode: horizontal-tb; line-height: 1; margin-bottom: 1px; color: #555; }
        .limit-txt { font-size: 12px; font-weight: bold; color: #000; }

        .footer-right { position: absolute; bottom: 2px; right: 2px; text-align: right; }
        .info-box { display: flex; flex-direction: column; align-items: flex-end; }
        .palace-txt { font-size: 12px; font-weight: 900; color: #d32f2f; }
        .ganzhi-txt { font-size: 15px; font-weight: 900; color: #000; writing-mode: vertical-rl; text-orientation: upright; margin-left: 2px; }
        .shen-tag { background-color: #007bff; color: #fff; font-size: 9px; padding: 0 2px; border-radius: 2px; }

        /* === 按鈕列 === */
        .timeline-container {
            display: grid; grid-template-columns: repeat(12, 1fr);
            border-top: 1px solid #999;
            background-color: #f4f4f4;
        }
        .time-btn {
            border-right: 1px solid #ccc;
            padding: 5px 0;
            text-align: center;
            font-size: 11px;
            cursor: pointer;
            color: #333;
            transition: background 0.2s;
            /* 確保按鈕本身可點，但內部文字不擋點擊 */
            pointer-events: auto; 
        }
        .time-btn > * { pointer-events: none !important; }
        
        .time-btn:hover { background-color: #ddd; }
        .btn-on { background-color: #4B0082 !important; color: #fff !important; }

        /* 中宮 */
        .center-cell {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            border: 1px solid #ccc;
            z-index: 5;
            cursor: default; /* 中宮不給點 */
        }
    </style>
    """
