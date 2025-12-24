import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* === 全局變數與重置 === */
        :root { --primary-color: #4B0082; --background-color: #ffffff; --text-color: #000000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        
        /* 輸入元件優化 */
        div[data-baseweb="input"] { background-color: #ffffff !important; border: 1px solid #ccc !important; height: 32px; }
        div[data-baseweb="input"] input { color: #000000 !important; font-size: 14px; padding: 0 4px; }
        
        /* 縮減頂部間距 (讓畫面塞入一頁) */
        .block-container {
            padding-top: 1rem !important; 
            padding-bottom: 1rem !important;
            max-width: 1200px !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }

        /* === 命盤網格系統 (支援 SVG 覆蓋) === */
        .chart-container {
            position: relative; /* 讓絕對定位的 SVG 相對於此 */
            width: 100%;
            margin-bottom: 4px; /* 與下方按鈕的距離極小化 */
        }

        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 115px); /* 高度縮減為 115px */
            gap: 0;
            background-color: #000; 
            border: 2px solid #000;
            margin-bottom: 0; /* 移除底部邊距 */
        }
        
        /* SVG 連線層 */
        .svg-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none; /* 讓點擊穿透，不影響底下操作 */
            z-index: 10;
        }

        .zwds-cell {
            background-color: #ffffff;
            border: 1px solid #ccc;
            padding: 1px;
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
        }

        /* 高亮狀態 (三方四正) */
        .highlight-focus { background-color: #E3F2FD !important; border: 2px solid #2196F3 !important; } /* 藍底 */
        .highlight-sanfang { background-color: #FFF3E0 !important; border: 2px solid #FF9800 !important; } /* 橘底 */
        .highlight-duigong { background-color: #E8F5E9 !important; border: 2px solid #4CAF50 !important; } /* 綠底 */

        .active-daxian { background-color: #f9f9f9 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #007bff !important; z-index: 5; }

        /* === 星曜區 (極致緊湊，消除缺角) === */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex-wrap: wrap;
            align-content: flex-start;
            align-items: flex-start;
            width: 100%;
            padding-top: 1px;
            padding-left: 1px;
            gap: 0px; /* 零間距 */
        }

        /* 主星容器 - 強制緊縮 */
        .star-major-container { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            margin: 0 !important; 
            padding: 0 !important;
            width: auto;
        }
        .star-name { 
            font-size: 18px; 
            font-weight: 900; 
            color: #B71C1C; 
            letter-spacing: 0px; /* 移除字距 */
            line-height: 1;
            margin-bottom: 1px; 
            writing-mode: vertical-rl; 
            text-orientation: upright; 
        }
        .hua-badge { font-size: 10px; padding: 0; color: #fff; text-align: center; margin-top: 1px; width: 14px; line-height: 1; display: block; }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }
        
        /* 副星 */
        .star-medium { font-size: 14px; font-weight: bold; color: #000; writing-mode: vertical-rl; line-height: 1; margin-right: 1px; }
        .star-small { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; line-height: 1; font-weight: normal; margin-top: 0; margin-right: 1px; }

        /* === 底部資訊 (絕對定位) === */
        .footer-left { position: absolute; bottom: 1px; left: 1px; display: flex; flex-direction: row; align-items: flex-end; gap: 2px; }
        .gods-col { display: flex; flex-direction: column; line-height: 1; }
        .god-star { font-size: 10px; writing-mode: horizontal-tb; margin-bottom: 1px; }
        .god-sui { color: #008080; } .god-jiang { color: #4682B4; } .god-boshi { color: #9370DB; }
        .limit-info { font-size: 12px; color: #333; line-height: 1; margin-bottom: 0px; }

        .footer-right { position: absolute; bottom: 1px; right: 1px; display: flex; flex-direction: row; align-items: flex-end; gap: 1px; }
        .palace-info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; }
        .ganzhi-col { writing-mode: vertical-rl; text-orientation: upright; font-size: 15px; font-weight: 900; line-height: 1; color: #000; margin-left: 1px; }
        
        .shen-badge { background-color: #1E90FF; color: #fff; font-size: 9px; padding: 0px 2px; border-radius: 2px; margin-bottom: 1px; }
        .life-stage { font-size: 11px; color: #800080; font-weight: bold; margin-bottom: 1px; }
        .p-name-liu { color: #0056b3; font-size: 13px; font-weight: 900; margin-bottom: 0px; }
        .p-name-da { color: #666; font-size: 13px; font-weight: 900; margin-bottom: 0px; }
        .p-name-ben { color: #d32f2f; font-size: 13px; font-weight: 900; }

        /* === 按鈕區微調 (讓它變小並緊貼命盤) === */
        .button-container {
            margin-top: 0px !important;
            padding-top: 0px !important;
        }
        
        /* 針對 Streamlit 按鈕的強力覆蓋 */
        div.stButton > button {
            font-size: 12px !important;
            padding: 0px 4px !important;
            min-height: 28px !important;
            height: 28px !important;
            line-height: 1 !important;
            margin-top: 0px !important;
            margin-bottom: 2px !important;
            border-radius: 4px;
        }
        
        /* === 客戶列表樣式 === */
        .client-card {
            padding: 10px;
            border-bottom: 1px solid #eee;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .client-card:hover { background-color: #f9f9f9; }
        .client-name { font-weight: bold; font-size: 16px; color: #333; }
        .client-meta { color: #666; font-size: 13px; }
        
        .center-info-box {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center; text-align: center;
            border: 1px solid #ccc;
            color: #000;
            padding: 5px;
        }
    </style>
    """, unsafe_allow_html=True)
