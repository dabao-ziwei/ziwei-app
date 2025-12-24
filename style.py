import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        :root { --primary-color: #4B0082; --bg-color: #fff; }
        .stApp { background-color: #ffffff !important; color: #000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        .block-container { padding: 0.5rem !important; max-width: 100% !important; }
        [data-testid="stVerticalBlock"] { gap: 0 !important; }
        [data-testid="stSidebar"] { background-color: #f8f9fa; border-right: 1px solid #ddd; }

        /* === 總容器 === */
        .master-container {
            width: 100%;
            border: 2px solid #000;
            background-color: #fff;
            position: relative;
            box-sizing: border-box;
            display: flex;
            flex-direction: column; /* 垂直排列：命盤 -> 大限 -> 流年 */
        }

        /* === SVG 連線層 === */
        .svg-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 560px; /* 140px * 4 rows */
            pointer-events: none; z-index: 1;
        }
        /* 強制 SVG 不填色 */
        .svg-overlay polygon { fill: none !important; }

        /* === 命盤 Grid === */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 140px);
            gap: 1px;
            background-color: #999;
            width: 100%;
            position: relative;
            z-index: 2;
        }

        .zwds-cell {
            background-color: rgba(255,255,255,0.92); 
            position: relative;
            padding: 2px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: 100%;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .zwds-cell:hover { background-color: #f0f8ff; }

        /* === 高亮 === */
        .cell-focus { background-color: #E6F7FF !important; }
        .cell-sanfang { background-color: #FFF7E6 !important; }
        .cell-duigong { background-color: #F6FFED !important; }
        .border-daxian { box-shadow: inset 0 0 0 3px #666 !important; }
        .border-liunian { box-shadow: inset 0 0 0 3px #007bff !important; }

        /* === 星曜與文字 === */
        .stars-box { display: flex; flex-wrap: wrap; gap: 0; width: 100%; pointer-events: none; }
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

        .footer-left { position: absolute; bottom: 2px; left: 2px; display: flex; align-items: flex-end; gap: 4px; pointer-events: none; }
        .god-text { font-size: 10px; color: #555; writing-mode: horizontal-tb; }
        .limit-text { font-size: 14px; font-weight: normal; color: #000; }

        .footer-right { position: absolute; bottom: 2px; right: 1px; display: flex; align-items: flex-end; gap: 2px; pointer-events: none; }
        .info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .palace-name { font-size: 13px; font-weight: 900; color: #d32f2f; }
        .ganzhi-col { font-size: 16px; font-weight: 900; color: #000; writing-mode: vertical-rl; text-orientation: upright; margin-left: 1px; }

        /* === 按鈕列 (HTML Grid) === */
        .timeline-row {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            border-top: 1px solid #999;
            background-color: #f8f8f8;
            /* 讓它自然排在 Grid 下方，不需要任何 margin hack */
        }
        .btn-limit {
            border-right: 1px solid #ccc;
            padding: 6px 2px;
            text-align: center;
            font-size: 12px;
            cursor: pointer;
            line-height: 1.3;
            color: #333; /* 強制黑色文字 */
        }
        .btn-limit:hover { background-color: #ddd; }
        .btn-active { background-color: #4B0082 !important; color: #fff !important; }
        
        .center-box {
            grid-column: 2 / 4; grid-row: 2 / 4; background-color: #fff;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            z-index: 10; border: 1px solid #ccc;
        }
    </style>
    """, unsafe_allow_html=True)
