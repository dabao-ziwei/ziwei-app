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
            padding: 1rem 0.5rem !important;
            max-width: 100% !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }
        
        /* 側邊欄 */
        [data-testid="stSidebar"] {
            background-color: #f4f4f4;
            border-right: 1px solid #ddd;
            min-width: 300px !important;
        }

        /* === 2. 命盤結構 === */
        .chart-wrapper {
            position: relative;
            width: 100%;
            border: 2px solid #000;
            background-color: #555; /* 格線顏色 */
            margin: 0;
        }

        .svg-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 20;
        }

        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 130px); /* 固定高度 */
            gap: 1px;
            background-color: #999;
        }

        .zwds-cell {
            background-color: #fff;
            position: relative;
            padding: 2px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* 高亮 */
        .highlight-focus { background-color: #E6F7FF !important; }
        .highlight-sanfang { background-color: #FFF7E6 !important; }
        .highlight-duigong { background-color: #F6FFED !important; }
        .active-daxian { box-shadow: inset 0 0 0 2px #666; }
        .active-liunian { box-shadow: inset 0 0 0 2px #007bff; }

        /* === 3. 星曜區 (完全扁平化) === */
        .stars-box {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap; /* 自動換行 */
            align-content: flex-start;
            align-items: flex-start;
            gap: 0px; /* 零間隙 */
            width: 100%;
        }

        /* 通用星星樣式 (讓主星副星平起平坐) */
        .star-item {
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            margin: 0 1px 1px 0 !important; /* 極小間距 */
            line-height: 1;
            height: fit-content;
        }

        /* 主星文字 */
        .txt-major {
            font-size: 18px; font-weight: 900; color: #B71C1C;
            writing-mode: vertical-rl; text-orientation: upright;
            letter-spacing: -2px; 
        }
        /* 四化標籤 */
        .hua-badge {
            font-size: 10px; color: #fff; padding: 0;
            border-radius: 2px; text-align: center; width: 14px; display: block;
            margin-top: 0px;
        }
        .bg-ben { background-color: #d32f2f; } 
        .bg-da { background-color: #808080; } 
        .bg-liu { background-color: #0056b3; }

        /* 副星文字 */
        .txt-med { font-size: 14px; font-weight: 700; color: #000; writing-mode: vertical-rl; }
        .txt-sml { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; }

        /* === 4. 角落資訊 (絕對定位) === */
        /* 左下：神煞 + 歲數 */
        .footer-left {
            position: absolute; bottom: 1px; left: 2px;
            display: flex; align-items: flex-end; gap: 4px;
            pointer-events: none;
        }
        .gods-col { display: flex; flex-direction: column; line-height: 1; }
        .god-text { font-size: 10px; color: #333; writing-mode: horizontal-tb; margin-bottom: 1px; }
        .god-sui { color: #008080; } .god-jiang { color: #4682B4; } .god-boshi { color: #9370DB; }
        
        .limit-text { font-size: 14px; font-weight: normal; color: #000; line-height: 1; margin-bottom: 0px; }

        /* 右下：宮位 + 干支 */
        .footer-right {
            position: absolute; bottom: 1px; right: 1px;
            display: flex; align-items: flex-end; gap: 2px;
            pointer-events: none;
        }
        .info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .badge-shen { background-color: #007bff; color: #fff; font-size: 9px; padding: 0 2px; border-radius: 2px; margin-bottom: 1px; }
        .life-stage { font-size: 11px; color: #800080; font-weight: bold; margin-bottom: 1px; }
        .palace-name { font-size: 13px; font-weight: 900; color: #d32f2f; margin-bottom: 0px; }
        
        /* 直書干支 */
        .ganzhi-col { 
            font-size: 16px; font-weight: 900; color: #000; 
            writing-mode: vertical-rl; text-orientation: upright; line-height: 1;
            margin-left: 1px;
        }

        /* === 5. 時間軸與按鈕 === */
        .timeline-bar {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            background-color: #f8f8f8;
            border: 1px solid #ccc;
            width: 100%;
            margin-top: 0px;
        }
        
        /* 覆蓋 Button 樣式 */
        div.stButton > button {
            width: 100% !important;
            border: none !important;
            border-right: 1px solid #ddd !important;
            border-radius: 0 !important;
            background-color: transparent !important;
            color: #333 !important;
            font-size: 12px !important;
            padding: 4px 0 !important;
            min-height: 36px !important;
            height: auto !important;
            line-height: 1.2 !important;
            margin: 0 !important;
            box-shadow: none !important;
        }
        div.stButton > button:hover { background-color: #e0e0e0 !important; }
        div.stButton > button[kind="primary"] { background-color: #4B0082 !important; color: white !important; }

        /* 中宮 */
        .center-box {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            padding: 5px;
        }
    </style>
    """, unsafe_allow_html=True)
