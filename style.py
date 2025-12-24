import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* === 1. 全局重置與滿版修正 === */
        :root { --primary-color: #4B0082; --bg-color: #fff; --text-color: #000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        
        /* 關鍵修正：強制滿版，消除右側空白 */
        .block-container {
            padding-top: 1rem !important; 
            padding-bottom: 1rem !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
            max-width: 100% !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }
        
        /* 側邊欄樣式微調 */
        [data-testid="stSidebar"] {
            background-color: #f8f9fa;
            border-right: 1px solid #ddd;
        }

        /* === 2. 命盤容器 === */
        .chart-wrapper {
            position: relative;
            width: 100%;
            border: 2px solid #333;
            background-color: #333; /* 格線顏色 */
            margin-bottom: 0px;
        }

        /* SVG 疊加層 (虛線連線) */
        .svg-overlay {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
            z-index: 20;
        }

        /* 網格系統 */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 120px); /* 固定高度確保整齊 */
            gap: 1px;
            background-color: #999; 
        }

        .zwds-cell {
            background-color: #ffffff;
            position: relative;
            padding: 2px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* 高亮背景 */
        .highlight-focus { background-color: #F0F8FF !important; }
        .highlight-sanfang { background-color: #FFF8F0 !important; }
        .highlight-duigong { background-color: #F0FFF0 !important; }

        /* === 3. 星曜排版 (零間隙) === */
        .stars-box {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 0px; /* 無間隙 */
            margin-bottom: auto;
        }

        /* 主星 */
        .star-major {
            display: flex; flex-direction: column; align-items: center;
            width: fit-content; margin-right: 2px;
        }
        .star-name {
            font-size: 18px; font-weight: 900; color: #B71C1C;
            writing-mode: vertical-rl; text-orientation: upright;
            line-height: 1; letter-spacing: -2px; margin-bottom: 2px;
        }
        .hua-badge {
            font-size: 10px; color: #fff; padding: 0 1px;
            border-radius: 2px; text-align: center; width: 14px; display: block;
        }
        .bg-ben { background-color: #d32f2f; } 
        .bg-da { background-color: #808080; } 
        .bg-liu { background-color: #0056b3; }

        /* 副星 */
        .star-med { font-size: 14px; font-weight: 700; color: #000; writing-mode: vertical-rl; line-height: 1.1; margin-right: 1px; }
        .star-sml { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; line-height: 1.1; margin-right: 1px; }

        /* === 4. 底部資訊 (仿照圖片) === */
        .footer-left {
            position: absolute; bottom: 1px; left: 1px;
            display: flex; align-items: flex-end; gap: 4px;
        }
        .gods-col { display: flex; flex-direction: column; line-height: 1; }
        .god-text { font-size: 10px; color: #555; writing-mode: horizontal-tb; }
        .limit-text { font-size: 14px; font-weight: normal; color: #000; line-height: 1; }

        .footer-right {
            position: absolute; bottom: 1px; right: 1px;
            display: flex; align-items: flex-end; gap: 2px;
        }
        .info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .badge-shen { background-color: #007bff; color: #fff; font-size: 9px; padding: 0 2px; border-radius: 2px; }
        .life-stage { font-size: 11px; color: #800080; }
        .palace-name { font-size: 13px; font-weight: 900; color: #d32f2f; }
        .ganzhi-label { 
            font-size: 16px; font-weight: 900; color: #000; 
            writing-mode: vertical-rl; text-orientation: upright; line-height: 1;
        }

        /* === 5. 大限時間軸 (按鈕樣式) === */
        .timeline-container {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            background-color: #f0f0f0;
            border: 1px solid #ccc;
            border-top: none;
            width: 100%;
        }
        /* 覆蓋 Streamlit 按鈕樣式，使其像時間軸格子 */
        div.stButton > button {
            width: 100%;
            border: none;
            border-right: 1px solid #ccc;
            border-radius: 0;
            background-color: transparent;
            color: #333;
            font-size: 12px;
            padding: 4px 0;
            height: auto;
            min-height: 40px;
        }
        div.stButton > button:hover {
            background-color: #ddd;
            color: #000;
        }
        div.stButton > button:focus {
            outline: none;
            box-shadow: none;
        }
        /* 選中狀態 (需要透過 app.py 動態 class 比較難，這裡用 primary 顏色覆蓋) */
        div.stButton > button[kind="primary"] {
            background-color: #4B0082 !important;
            color: white !important;
        }

        /* 中宮 */
        .center-box {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            padding: 10px;
        }
    </style>
    """, unsafe_allow_html=True)
