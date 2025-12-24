import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* === 1. 全局重置與強制滿版 === */
        :root { --primary-color: #4B0082; --bg-color: #fff; --text-color: #000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        
        /* 關鍵：移除 max-width 限制，讓畫面填滿左右 */
        .block-container {
            padding-top: 1rem !important; 
            padding-bottom: 1rem !important;
            padding-left: 0.5rem !important;
            padding-right: 0.5rem !important;
            max-width: 100% !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }
        
        /* 側邊欄優化 */
        [data-testid="stSidebar"] {
            background-color: #f4f4f4;
            border-right: 1px solid #ddd;
            min-width: 250px !important;
        }

        /* === 2. 命盤容器 (Chart Wrapper) === */
        .chart-wrapper {
            position: relative;
            width: 100%;
            border: 2px solid #333; /* 外框 */
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
            grid-template-rows: repeat(4, 125px); /* 拉高一點點增加閱讀性 */
            gap: 1px; /* 1px 格線 */
            background-color: #999; 
        }

        /* 單一宮位格子 */
        .zwds-cell {
            background-color: #ffffff;
            position: relative;
            padding: 2px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* 高亮背景 (三方四正) */
        .highlight-focus { background-color: #F0F8FF !important; } /* 淺藍 */
        .highlight-sanfang { background-color: #FFF8F0 !important; } /* 淺橘 */
        .highlight-duigong { background-color: #F0FFF0 !important; } /* 淺綠 */
        
        /* 大限流年高亮邊框 */
        .active-daxian { box-shadow: inset 0 0 0 2px #666; } 
        .active-liunian { box-shadow: inset 0 0 0 2px #007bff; }

        /* === 3. 星曜區 (絕對零間隙) === */
        .stars-box {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 0px !important; /* 絕對無間隙 */
            margin-bottom: auto;
        }

        /* 主星容器 - 寬度自適應 */
        .star-major {
            display: flex; flex-direction: column; align-items: center;
            width: fit-content !important; 
            margin-right: 1px !important; /* 極小間距區隔 */
            margin-bottom: 1px !important;
        }
        .star-name {
            font-size: 18px; font-weight: 900; color: #B71C1C;
            writing-mode: vertical-rl; text-orientation: upright;
            line-height: 1; letter-spacing: -2px; margin-bottom: 1px;
        }
        .hua-badge {
            font-size: 10px; color: #fff; padding: 0;
            border-radius: 2px; text-align: center; width: 14px; display: block;
            margin-top: 0px;
        }
        .bg-ben { background-color: #d32f2f; } 
        .bg-da { background-color: #808080; } 
        .bg-liu { background-color: #0056b3; }

        /* 副星 - 緊貼主星 */
        .star-med { 
            font-size: 14px; font-weight: 700; color: #000; 
            writing-mode: vertical-rl; line-height: 1.1; 
            margin-right: 1px !important; margin-bottom: 1px !important;
        }
        .star-sml { 
            font-size: 11px; color: #4169E1; 
            writing-mode: vertical-rl; line-height: 1.1; 
            margin-right: 1px !important; margin-bottom: 1px !important;
        }

        /* === 4. 底部資訊 (絕對定位角落) === */
        /* 左下：神煞堆疊 + 歲數 */
        .footer-left {
            position: absolute; bottom: 1px; left: 2px;
            display: flex; align-items: flex-end; gap: 4px;
        }
        .gods-col { display: flex; flex-direction: column; line-height: 1; }
        .god-text { font-size: 10px; color: #555; writing-mode: horizontal-tb; margin-bottom: 1px; }
        .limit-text { font-size: 14px; font-weight: normal; color: #000; line-height: 1; }

        /* 右下：宮位資訊 + 干支 */
        .footer-right {
            position: absolute; bottom: 1px; right: 1px;
            display: flex; align-items: flex-end; gap: 2px;
        }
        .info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .badge-shen { background-color: #007bff; color: #fff; font-size: 9px; padding: 0 2px; border-radius: 2px; margin-bottom: 1px; }
        .life-stage { font-size: 11px; color: #800080; font-weight: bold; margin-bottom: 1px; }
        .palace-name { font-size: 13px; font-weight: 900; color: #d32f2f; margin-bottom: 0px; }
        .ganzhi-label { 
            font-size: 16px; font-weight: 900; color: #000; 
            writing-mode: vertical-rl; text-orientation: upright; line-height: 1;
            margin-left: 1px;
        }

        /* === 5. 大限時間軸 (完全重寫按鈕樣式) === */
        .timeline-container {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            background-color: #f8f8f8;
            border: 1px solid #ccc;
            border-top: none;
            width: 100%;
            margin-top: 0px;
        }
        
        /* 暴力覆蓋 Streamlit 按鈕，做成格子狀 */
        div.stButton > button {
            width: 100% !important;
            border: none !important;
            border-right: 1px solid #ddd !important;
            border-radius: 0 !important;
            background-color: transparent !important;
            color: #333 !important;
            font-size: 12px !important;
            padding: 4px 0 !important;
            height: auto !important;
            min-height: 40px !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            box-shadow: none !important;
        }
        div.stButton > button:hover {
            background-color: #e0e0e0 !important;
            color: #000 !important;
        }
        div.stButton > button:active, div.stButton > button:focus {
            background-color: #ccc !important;
            outline: none !important;
        }
        /* 選中狀態 (Primary) */
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
