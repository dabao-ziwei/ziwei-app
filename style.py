import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 全局與重置
           ================================================================= */
        :root { --primary-color: #4B0082; --background-color: #ffffff; --text-color: #000000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        
        /* 輸入框高度縮小 */
        div[data-baseweb="input"] { background-color: #ffffff !important; border: 1px solid #ccc !important; height: 32px; }
        div[data-baseweb="input"] input { color: #000000 !important; font-size: 14px; padding: 0 4px; }
        
        /* 頁面頂部間距縮到最小 */
        .block-container {
            padding-top: 1rem !important; 
            padding-bottom: 1rem !important;
            max-width: 1200px !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }

        /* =================================================================
           2. 命盤網格與 SVG 容器
           ================================================================= */
        /* 這是包住 Grid 和 SVG 的外框 */
        .chart-container {
            position: relative;
            width: 100%;
            margin-bottom: 0px; /* 緊貼下方按鈕 */
        }

        /* SVG 連線層 (絕對定位，覆蓋在 Grid 上) */
        .svg-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none; /* 讓滑鼠點擊穿透，不影響下方操作 */
            z-index: 10;
        }

        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 115px); /* 高度 115px */
            gap: 0;
            background-color: #000; 
            border: 2px solid #000;
        }
        
        @media (max-width: 800px) { .zwds-grid { grid-template-columns: repeat(2, 1fr); grid-template-rows: auto; } }

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

        /* 三方四正高亮背景 */
        .highlight-focus { background-color: #E3F2FD !important; border: 2px solid #2196F3 !important; } /* 焦點藍 */
        .highlight-sanfang { background-color: #FFF3E0 !important; border: 2px solid #FF9800 !important; } /* 三方橘 */
        .highlight-duigong { background-color: #E8F5E9 !important; border: 2px solid #4CAF50 !important; } /* 對宮綠 */

        .active-daxian { background-color: #f9f9f9 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #007bff !important; z-index: 5; }

        /* =================================================================
           3. 星曜區 (零間隙修正)
           ================================================================= */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex-wrap: wrap;
            align-content: flex-start;
            align-items: flex-start;
            width: 100%;
            padding: 1px;
            gap: 0px; /* 關鍵：星星之間無縫 */
        }

        /* 主星容器 */
        .star-major-container { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            margin: 0 !important; 
            padding: 0 !important;
            width: min-content; 
            margin-right: 1px !important; /* 僅留 1px 區隔雙星 */
        }
        .star-name { 
            font-size: 18px; font-weight: 900; color: #B71C1C; 
            letter-spacing: -1px; line-height: 1; margin-bottom: 1px; 
            writing-mode: vertical-rl; text-orientation: upright; 
        }
        .hua-badge { font-size: 10px; padding: 0; color: #fff; text-align: center; margin-top: 0px; width: 14px; line-height: 1; display: block; }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }
        
        /* 副星 */
        .star-medium { 
            font-size: 14px; font-weight: bold; color: #000; 
            writing-mode: vertical-rl; line-height: 1; margin-right: 1px; 
        }
        .star-small { 
            font-size: 11px; color: #4169E1; 
            writing-mode: vertical-rl; line-height: 1; font-weight: normal; 
            margin-top: 0; margin-right: 1px; 
        }

        /* =================================================================
           4. 底部資訊 (絕對定位佈局)
           ================================================================= */
        .footer-left { position: absolute; bottom: 1px; left: 1px; display: flex; flex-direction: row; align-items: flex-end; gap: 3px; }
        .gods-col { display: flex; flex-direction: column; line-height: 1; }
        .god-star { font-size: 10px; writing-mode: horizontal-tb; margin-bottom: 1px; }
        .god-sui { color: #008080; } .god-jiang { color: #4682B4; } .god-boshi { color: #9370DB; }
        .limit-info { font-size: 13px; color: #333; line-height: 1; margin-bottom: 0px; font-weight: bold; }

        .footer-right { position: absolute; bottom: 1px; right: 1px; display: flex; flex-direction: row; align-items: flex-end; gap: 1px; }
        .palace-info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; }
        .ganzhi-col { writing-mode: vertical-rl; text-orientation: upright; font-size: 15px; font-weight: 900; line-height: 1; color: #000; margin-left: 1px; }
        
        .shen-badge { background-color: #1E90FF; color: #fff; font-size: 9px; padding: 0px 2px; border-radius: 2px; margin-bottom: 1px; }
        .life-stage { font-size: 11px; color: #800080; font-weight: bold; margin-bottom: 1px; }
        .p-name-liu { color: #0056b3; font-size: 13px; font-weight: 900; margin-bottom: 0px; }
        .p-name-da { color: #666; font-size: 13px; font-weight: 900; margin-bottom: 0px; }
        .p-name-ben { color: #d32f2f; font-size: 13px; font-weight: 900; }

        /* =================================================================
           5. 按鈕與列表優化
           ================================================================= */
        
        /* 按鈕容器緊貼上方 */
        .button-container { margin-top: 0px !important; padding-top: 0px !important; }
        
        /* 針對 Streamlit 按鈕的暴力覆蓋：變矮、變小、字變小 */
        div.stButton > button {
            font-size: 12px !important; 
            padding: 0px 4px !important;
            min-height: 28px !important; 
            height: 28px !important;
            line-height: 1 !important; 
            margin: 0 0 2px 0 !important;
            border-radius: 4px;
        }
        
        /* 中宮 */
        .center-info-box {
            grid-column: 2 / 4; grid-row: 2 / 4; background-color: #fff;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            border: 1px solid #ccc; color: #000; padding: 5px;
        }
        .center-info-box h3 { font-size: 20px !important; margin: 0 0 5px 0 !important; }
    </style>
    """, unsafe_allow_html=True)
