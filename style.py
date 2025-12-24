import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* === 1. 全局設定 === */
        :root { --primary-color: #4B0082; --bg-color: #fff; --text-color: #000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        
        .block-container {
            padding: 0.5rem !important;
            max-width: 100% !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }
        
        [data-testid="stSidebar"] {
            background-color: #f8f9fa;
            border-right: 1px solid #ddd;
            min-width: 280px !important;
        }

        /* === 2. 命盤容器 (最底層) === */
        .chart-wrapper {
            position: relative;
            width: 100%;
            border: 2px solid #333;
            background-color: #ffffff; /* 最底層白色背景 */
            margin-bottom: 0px !important;
            box-sizing: border-box;
            z-index: 0;
        }

        /* SVG 連線層 (中間層) */
        .svg-overlay {
            position: absolute; 
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; 
            z-index: 1; /* 位於背景之上，文字之下 */
        }

        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 140px);
            gap: 1px;
            background-color: #999;
            width: 100%;
            position: relative;
            background-color: transparent; /* 透明，讓 SVG 顯示 */
        }

        .zwds-cell {
            background-color: transparent; /* 透明，讓 SVG 顯示 */
            position: relative;
            padding: 0; /* 內邊距交給 cell-content */
            display: flex;
            flex-direction: column;
            overflow: hidden;
            height: 100%;
            /* 格線用 box-shadow 模擬 */
            box-shadow: 0 0 0 0.5px #999;
        }
        
        /* === NEW: 宮位內容容器 (最上層文字) === */
        .cell-content {
            position: relative;
            width: 100%;
            height: 100%;
            padding: 2px;
            display: flex;
            flex-direction: column;
            /* 關鍵：半透明白底，確保文字可讀，同時不完全遮死線條 */
            background-color: rgba(255, 255, 255, 0.85); 
            z-index: 2; /* 位於 SVG 之上 */
        }

        /* 高亮樣式 (應用在 cell-content 上) */
        .highlight-focus .cell-content { background-color: rgba(230, 247, 255, 0.9) !important; }
        .highlight-sanfang .cell-content { background-color: rgba(255, 247, 230, 0.9) !important; }
        .highlight-duigong .cell-content { background-color: rgba(246, 255, 237, 0.9) !important; }
        
        /* 邊框高亮 (應用在 zwds-cell 上) */
        .active-daxian { box-shadow: inset 0 0 0 2px #666 !important; }
        .active-liunian { box-shadow: inset 0 0 0 2px #007bff !important; }

        /* === 3. 星曜與文字 === */
        .stars-box {
            display: flex; flex-direction: row; flex-wrap: wrap;
            align-content: flex-start; gap: 0px !important; width: 100%;
        }
        .star-item {
            display: inline-flex; flex-direction: column; align-items: center;
            margin: 0 1px 1px 0 !important; height: fit-content;
        }
        .txt-major {
            font-size: 18px; font-weight: 900; color: #B71C1C;
            writing-mode: vertical-rl; text-orientation: upright;
            line-height: 1; letter-spacing: -2px; margin-bottom: 4px !important;
        }
        .txt-med { font-size: 14px; font-weight: 700; color: #000; writing-mode: vertical-rl; line-height: 1.1; }
        .txt-sml { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; line-height: 1.1; }
        
        .hua-badge {
            font-size: 10px; color: #fff; padding: 0;
            border-radius: 2px; text-align: center; width: 14px; display: block;
            margin-top: 0;
        }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }

        /* 角落資訊 */
        .footer-left { position: absolute; bottom: 2px; left: 2px; display: flex; align-items: flex-end; gap: 4px; pointer-events: none; }
        .god-text { font-size: 10px; color: #555; writing-mode: horizontal-tb; margin-bottom: 1px; }
        .limit-text { font-size: 14px; font-weight: normal; color: #000; line-height: 1; margin-bottom: 0px; }

        .footer-right { position: absolute; bottom: 2px; right: 1px; display: flex; align-items: flex-end; gap: 2px; pointer-events: none; }
        .info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .palace-name { font-size: 13px; font-weight: 900; color: #d32f2f; margin-bottom: 0px; }
        .ganzhi-col { font-size: 16px; font-weight: 900; color: #000; writing-mode: vertical-rl; text-orientation: upright; line-height: 1; margin-left: 1px; }

        /* === 4. 按鈕與佈局 === */
        .spacer-block { height: 20px; width: 100%; display: block; }

        .timeline-container {
            display: grid; grid-template-columns: repeat(12, 1fr);
            background-color: #f8f8f8; 
            width: 100%; 
            margin-top: 0px !important;
            border: 1px solid #ccc;
        }
        
        div.stButton > button {
            width: 100% !important;
            border: 1px solid #ccc !important;
            border-radius: 0 !important;
            background-color: #f8f8f8 !important;
            color: #333 !important;
            font-size: 12px !important;
            padding: 4px 0 !important;
            min-height: 40px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            box-shadow: none !important;
        }
        div.stButton > button:hover { background-color: #e0e0e0 !important; }
        div.stButton > button[kind="primary"] { background-color: #4B0082 !important; color: white !important; }

        .center-box {
            grid-column: 2 / 4; grid-row: 2 / 4; background-color: #fff;
            display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 5px;
            z-index: 10; border: 1px solid #ccc;
        }
    </style>
    """, unsafe_allow_html=True)
