def get_css():
    return """
    <style>
        /* === Reset === */
        :root { --primary: #4B0082; --border: #333; --grid-line: #999; }
        body { margin: 0; padding: 0; font-family: sans-serif; }

        /* === 主容器 === */
        .master-container {
            display: flex;
            flex-direction: column;
            width: 100%;
            border: 2px solid var(--border);
            box-sizing: border-box;
            position: relative;
            background-color: #fff;
        }

        /* === SVG 連線層 (最底層) === */
        .svg-container {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 560px; /* 140px * 4 */
            pointer-events: none;
            z-index: 0; /* 在最底層 */
        }
        svg { width: 100%; height: 100%; }
        /* 關鍵：強制不填色，避免變成色塊 */
        polygon { fill: none !important; }

        /* === 命盤 Grid (中間層) === */
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
            background-color: transparent; /* 透明，讓下面的 SVG 顯示 */
            position: relative;
            overflow: hidden;
            cursor: pointer;
            display: flex;
            flex-direction: column;
        }

        /* === 內容層 (最上層文字) === */
        .cell-content {
            flex: 1;
            padding: 2px;
            display: flex;
            flex-direction: column;
            /* 關鍵：半透明白底，讓文字清楚，但線條穿過時會被這層半透明遮住，不會干擾閱讀 */
            background-color: rgba(255, 255, 255, 0.85);
            z-index: 2; 
            transition: background-color 0.2s;
        }
        
        .cell-content:hover { background-color: rgba(240, 248, 255, 0.9); }

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
        .footer-left { position: absolute; bottom: 2px; left: 2px; pointer-events: none; }
        .god-box { display: flex; flex-direction: column; }
        .god-txt { font-size: 10px; writing-mode: horizontal-tb; line-height: 1; margin-bottom: 1px; color: #555; }
        .limit-txt { font-size: 12px; font-weight: bold; color: #000; }

        .footer-right { position: absolute; bottom: 2px; right: 2px; text-align: right; pointer-events: none; }
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
        }
        .time-btn:hover { background-color: #ddd; }
        .btn-on { background-color: #4B0082 !important; color: #fff !important; }

        /* 中宮 */
        .center-cell {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            border: 1px solid #ccc;
            z-index: 5;
        }
    </style>
    """
