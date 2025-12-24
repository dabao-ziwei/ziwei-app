import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* === 1. 基礎重置 === */
        :root { --primary-color: #4B0082; --bg-color: #fff; }
        .stApp { background-color: #ffffff !important; color: #000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        .block-container { padding: 0.5rem !important; max-width: 100% !important; }
        [data-testid="stVerticalBlock"] { gap: 0 !important; }
        [data-testid="stSidebar"] { background-color: #f8f9fa; border-right: 1px solid #ddd; }

        /* === 2. 總容器 (包住命盤+按鈕) === */
        .master-container {
            width: 100%;
            border: 2px solid #000;
            background-color: #fff;
            position: relative;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
        }

        /* === 3. SVG 連線層 (關鍵修正：不填色，不擋字) === */
        .svg-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%; /* 高度只覆蓋命盤區，不含按鈕 */
            pointer-events: none; 
            z-index: 1; /* 層級：底層背景 < SVG < 文字內容 */
        }
        /* 嚴格禁止填充顏色，只留線條 */
        .svg-overlay polygon { fill: none !important; } 

        /* === 4. 命盤網格 === */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 140px); /* 固定高度 */
            gap: 1px;
            background-color: #999; /* 格線顏色 */
            width: 100%;
            position: relative;
            z-index: 2;
        }

        .zwds-cell {
            background-color: rgba(255,255,255,0.92); /* 微透明白底，讓線條在下方若隱若現 */
            position: relative;
            padding: 2px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: 100%;
            cursor: pointer; /* 讓使用者知道可以點 */
            transition: background 0.2s;
        }
        .zwds-cell:hover { background-color: #f0f8ff; }

        /* 高亮狀態 */
        .cell-focus { background-color: #E6F7FF !important; }
        .cell-sanfang { background-color: #FFF7E6 !important; }
        .cell-duigong { background-color: #F6FFED !important; }
        .border-daxian { box-shadow: inset 0 0 0 3px #666 !important; }
        .border-liunian { box-shadow: inset 0 0 0 3px #007bff !important; }

        /* === 5. 星曜與文字 (層級最高) === */
        .cell-content {
            z-index: 10; /* 文字在最上層，絕對不會被線蓋住 */
            position: relative;
            width: 100%; height: 100%;
        }

        .stars-box { display: flex; flex-wrap: wrap; gap: 0; width: 100%; }
        .star-item { display: inline-flex; flex-direction: column; align-items: center; margin: 0 1px 1px 0; }
        
        .txt-major { 
            font-size: 18px; font-weight: 900; color: #B71C1C; 
            writing-mode: vertical-rl; text-orientation: upright; 
            letter-spacing: -2px; margin-bottom: 4px;
        }
        .txt-med { font-size: 14px; font-weight: 700; color: #000; writing-mode: vertical-rl; }
        .txt-sml { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; }
        
        .hua-badge {
            font-size: 10px; color: #fff; border-radius: 2px; text-align: center; width: 14px;
        }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }

        /* 角落資訊 */
        .footer-left { position: absolute; bottom: 2px; left: 2px; display: flex; align-items: flex-end; gap: 4px; }
        .god-text { font-size: 10px; color: #555; writing-mode: horizontal-tb; }
        .limit-text { font-size: 14px; font-weight: normal; color: #000; }

        .footer-right { position: absolute; bottom: 2px; right: 1px; display: flex; align-items: flex-end; gap: 2px; }
        .info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .palace-name { font-size: 13px; font-weight: 900; color: #d32f2f; }
        .ganzhi-col { font-size: 16px; font-weight: 900; color: #000; writing-mode: vertical-rl; text-orientation: upright; margin-left: 1px; }

        /* === 6. 時間軸按鈕列 (HTML 表格樣式) === */
        .timeline-row {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            border-top: 1px solid #999; /* 與上方命盤區隔 */
            background-color: #f8f8f8;
            width: 100%;
        }
        .btn-limit {
            border-right: 1px solid #ccc;
            padding: 6px 2px;
            text-align: center;
            font-size: 12px;
            cursor: pointer;
            line-height: 1.3;
            color: #333;
            transition: background 0.2s;
        }
        .btn-limit:hover { background-color: #e0e0e0; }
        .btn-active { background-color: #4B0082 !important; color: #fff !important; }
        
        /* 中宮 */
        .center-box {
            grid-column: 2 / 4; grid-row: 2 / 4; background-color: #fff;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            z-index: 5; border: 1px solid #999;
        }
    </style>
    """, unsafe_allow_html=True)
