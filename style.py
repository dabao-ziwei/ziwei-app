import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* === 1. 全局設定 === */
        :root { --primary-color: #4B0082; --bg-color: #fff; --text-color: #000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        
        /* 滿版設定 */
        .block-container {
            padding: 0.5rem !important;
            max-width: 100% !important;
        }
        /* 稍微放寬垂直間距，避免元件互相吞噬 */
        [data-testid="stVerticalBlock"] { gap: 1rem !important; }
        
        /* 側邊欄 */
        [data-testid="stSidebar"] {
            background-color: #f8f9fa;
            border-right: 1px solid #ddd;
            min-width: 280px !important;
        }

        /* === 2. 命盤容器 (解決破版核心) === */
        .chart-wrapper {
            position: relative;
            width: 100%;
            border: 2px solid #000;
            background-color: #333;
            /* 關鍵修正：強制底部留白，把下面的按鈕推開 */
            margin-bottom: 20px !important; 
            padding-bottom: 1px; /* 確保邊框完整 */
            display: block; /* 確保佔據空間 */
        }

        .svg-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 20;
        }

        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            /* 改為 auto，讓內容決定高度，避免高度塌陷 */
            grid-auto-rows: minmax(130px, auto); 
            gap: 1px;
            background-color: #999;
            width: 100%;
        }

        .zwds-cell {
            background-color: #ffffff;
            position: relative;
            padding: 2px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            min-height: 130px; /* 確保最小高度 */
        }

        /* === 3. 星曜區 (維持零間隙) === */
        .stars-box {
            display: flex; flex-direction: row; flex-wrap: wrap;
            align-content: flex-start; align-items: flex-start;
            gap: 0px !important; width: 100%;
        }
        .star-item {
            display: inline-flex; flex-direction: column; align-items: center;
            margin: 0 1px 1px 0 !important; height: fit-content; vertical-align: top;
        }
        .txt-major {
            font-size: 18px; font-weight: 900; color: #B71C1C;
            writing-mode: vertical-rl; text-orientation: upright;
            line-height: 1; letter-spacing: -2px; 
        }
        .txt-med { font-size: 14px; font-weight: 700; color: #000; writing-mode: vertical-rl; line-height: 1.1; }
        .txt-sml { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; line-height: 1.1; }
        
        .hua-badge {
            font-size: 10px; color: #fff; padding: 0;
            border-radius: 2px; text-align: center; width: 14px; display: block;
            line-height: 1.1;
        }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }

        /* === 4. 角落資訊 === */
        .footer-left {
            position: absolute; bottom: 1px; left: 2px;
            display: flex; align-items: flex-end; gap: 4px; pointer-events: none;
        }
        .gods-col { display: flex; flex-direction: column; line-height: 1; }
        .god-text { font-size: 10px; color: #333; writing-mode: horizontal-tb; margin-bottom: 1px; }
        .god-sui { color: #008080; } .god-jiang { color: #4682B4; } .god-boshi { color: #9370DB; }
        .limit-text { font-size: 14px; font-weight: normal; color: #000; line-height: 1; margin-bottom: 0px; }

        .footer-right {
            position: absolute; bottom: 1px; right: 1px;
            display: flex; align-items: flex-end; gap: 2px; pointer-events: none;
        }
        .info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .badge-shen { background-color: #007bff; color: #fff; font-size: 9px; padding: 0 2px; border-radius: 2px; margin-bottom: 1px; }
        .life-stage { font-size: 11px; color: #800080; font-weight: bold; margin-bottom: 1px; }
        .palace-name { font-size: 13px; font-weight: 900; color: #d32f2f; margin-bottom: 0px; }
        .p-liu { color: #0056b3; font-size: 13px; font-weight: 900; }
        .p-da { color: #666; font-size: 13px; font-weight: 900; }
        .ganzhi-col { 
            font-size: 16px; font-weight: 900; color: #000; 
            writing-mode: vertical-rl; text-orientation: upright; line-height: 1; margin-left: 1px;
        }

        /* === 5. 時間軸按鈕 (修正樣式) === */
        /* 移除 margin-top: 0 的強制設定，避免上浮 */
        .timeline-container {
            width: 100%;
            margin-top: 10px; /* 與上方命盤保持距離 */
        }
        
        div.stButton > button {
            width: 100% !important; border: 1px solid #ddd !important;
            border-radius: 4px !important; background-color: #f9f9f9 !important; color: #333 !important;
            font-size: 12px !important; padding: 4px 0 !important; min-height: 40px !important;
            line-height: 1.2 !important; margin: 0 !important; box-shadow: none !important;
        }
        div.stButton > button:hover { background-color: #e0e0e0 !important; border-color: #999 !important; }
        div.stButton > button[kind="primary"] { 
            background-color: #4B0082 !important; color: white !important; border-color: #4B0082 !important;
        }

        /* 高亮 */
        .highlight-focus { background-color: #E6F7FF !important; }
        .highlight-sanfang { background-color: #FFF7E6 !important; }
        .highlight-duigong { background-color: #F6FFED !important; }
        .active-daxian { box-shadow: inset 0 0 0 2px #666; }
        .active-liunian { box-shadow: inset 0 0 0 2px #007bff; }

        .center-box {
            grid-column: 2 / 4; grid-row: 2 / 4; background-color: #fff;
            display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 5px;
        }
    </style>
    """, unsafe_allow_html=True)
