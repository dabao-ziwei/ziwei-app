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
        /* 保持緊湊，但不要過度導致重疊 */
        [data-testid="stVerticalBlock"] { gap: 0px !important; }
        
        [data-testid="stSidebar"] {
            background-color: #f8f9fa;
            border-right: 1px solid #ddd;
            min-width: 280px !important;
        }

        /* === 2. 命盤容器 === */
        .chart-wrapper {
            position: relative;
            width: 100%;
            border: 2px solid #000;
            background-color: #333;
            /* 修正：不留底部邊距，讓按鈕緊貼，但邊框保留 */
            margin-bottom: 0px !important; 
            box-sizing: border-box;
            z-index: 1; /* 確保在底層 */
        }

        .svg-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 20;
        }

        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            /* 關鍵修正：拉高格子高度，確保底部文字有足夠安全距離 */
            grid-template-rows: repeat(4, 140px); 
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
            height: 100%;
        }

        /* 高亮 */
        .highlight-focus { background-color: #E6F7FF !important; }
        .highlight-sanfang { background-color: #FFF7E6 !important; }
        .highlight-duigong { background-color: #F6FFED !important; }
        .active-daxian { box-shadow: inset 0 0 0 2px #666; }
        .active-liunian { box-shadow: inset 0 0 0 2px #007bff; }

        /* === 3. 星曜區 === */
        .stars-box {
            display: flex; flex-direction: row; flex-wrap: wrap;
            align-content: flex-start; align-items: flex-start;
            gap: 0px !important; width: 100%;
        }

        .star-item {
            display: inline-flex; flex-direction: column; align-items: center;
            margin: 0 1px 1px 0 !important; 
            height: fit-content;
            vertical-align: top;
        }

        .txt-major {
            font-size: 18px; font-weight: 900; color: #B71C1C;
            writing-mode: vertical-rl; text-orientation: upright;
            line-height: 1; letter-spacing: -2px; margin-bottom: 2px;
        }
        .txt-med { font-size: 14px; font-weight: 700; color: #000; writing-mode: vertical-rl; line-height: 1.1; }
        .txt-sml { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; line-height: 1.1; }
        
        .hua-badge {
            font-size: 10px; color: #fff; padding: 0;
            border-radius: 2px; text-align: center; width: 14px; display: block;
            line-height: 1.1; margin-top: 0;
        }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }

        /* === 4. 角落資訊 === */
        .footer-left {
            position: absolute; bottom: 2px; left: 2px;
            display: flex; align-items: flex-end; gap: 4px; pointer-events: none;
        }
        .gods-col { display: flex; flex-direction: column; line-height: 1; }
        .god-text { font-size: 10px; color: #555; writing-mode: horizontal-tb; margin-bottom: 1px; }
        .god-sui { color: #008080; } .god-jiang { color: #4682B4; } .god-boshi { color: #9370DB; }
        .limit-text { font-size: 14px; font-weight: normal; color: #000; line-height: 1; margin-bottom: 0px; }

        .footer-right {
            position: absolute; bottom: 2px; right: 1px;
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

        /* === 5. 按鈕 (時間軸) === */
        /* 直接針對 Streamlit 按鈕樣式進行改造，不依賴外部 div */
        
        div.stButton > button {
            width: 100% !important;
            border: 1px solid #ccc !important;
            /* 關鍵修正：移除上邊框，因為上面是命盤的下邊框 */
            border-top: none !important; 
            border-radius: 0 !important;
            background-color: #f8f8f8 !important;
            color: #333 !important;
            font-size: 12px !important;
            padding: 2px 0 !important;
            min-height: 40px !important;
            line-height: 1.2 !important;
            /* 關鍵修正：讓按鈕稍微往上吸 1px 以接合邊框，但不覆蓋內容 */
            margin: 0 !important; 
            box-shadow: none !important;
            z-index: 2;
        }
        
        div.stButton > button:hover {
            background-color: #e0e0e0 !important;
            z-index: 3; /* hover 時浮起 */
        }
        
        div.stButton > button[kind="primary"] {
            background-color: #4B0082 !important;
            color: white !important;
            border: 1px solid #4B0082 !important;
            border-top: none !important;
        }

        /* 修正按鈕容器的間距 */
        div[data-testid="column"] {
            padding: 0 !important; /* 移除欄位間距 */
        }

        .center-box {
            grid-column: 2 / 4; grid-row: 2 / 4; background-color: #fff;
            display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 5px;
        }
    </style>
    """, unsafe_allow_html=True)
