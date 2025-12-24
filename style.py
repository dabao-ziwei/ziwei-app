import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 基礎設定 & 重置
           ================================================================= */
        :root { --primary-color: #4B0082; --background-color: #ffffff; --text-color: #000000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        
        div[data-baseweb="input"] { background-color: #ffffff !important; border: 1px solid #ccc !important; height: 32px; }
        div[data-baseweb="input"] input { color: #000000 !important; font-size: 14px; padding: 0 4px; }
        
        .block-container {
            padding-top: 1rem !important; 
            padding-bottom: 1rem !important;
            max-width: 1200px !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }

        /* =================================================================
           2. 命盤網格 (包含 SVG 層)
           ================================================================= */
        .chart-container {
            position: relative;
            width: 100%;
            margin-bottom: 0px; 
        }

        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 115px);
            gap: 0;
            background-color: #000; 
            border: 2px solid #000;
        }
        
        .svg-overlay {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; z-index: 10;
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

        /* 高亮效果 */
        .highlight-focus { background-color: #E3F2FD !important; border: 2px solid #2196F3 !important; }
        .highlight-sanfang { background-color: #FFF3E0 !important; border: 2px solid #FF9800 !important; }
        .highlight-duigong { background-color: #E8F5E9 !important; border: 2px solid #4CAF50 !important; }
        .active-daxian { background-color: #f9f9f9 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #007bff !important; z-index: 5; }

        /* =================================================================
           3. 星曜區 (消除間隙核心修正)
           ================================================================= */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex-wrap: wrap;
            align-content: flex-start;
            align-items: flex-start;
            width: 100%;
            padding: 1px;
            gap: 0px; 
        }

        /* 主星容器：關鍵修正 width: min-content 讓它縮到最小，不佔空間 */
        .star-major-container { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            margin: 0 !important; 
            padding: 0 !important;
            width: min-content; /* 關鍵：只佔用文字寬度 */
            margin-right: 1px !important; /* 極小間距區隔雙星 */
        }
        
        .star-name { 
            font-size: 18px; font-weight: 900; color: #B71C1C; 
            letter-spacing: -1px; /* 字距更緊 */
            line-height: 1; margin-bottom: 1px; 
            writing-mode: vertical-rl; text-orientation: upright; 
        }
        
        .hua-badge { 
            font-size: 10px; padding: 0; color: #fff; text-align: center; 
            margin-top: 0px; width: 14px; line-height: 1; display: block; 
        }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }
        
        /* 副星：緊貼 */
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
           4. 底部資訊 (左右分區)
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

        /* === 按鈕優化 === */
        .button-container { margin-top: 0px !important; padding-top: 0px !important; }
        div.stButton > button {
            font-size: 12px !important; padding: 0px 4px !important;
            min-height: 28px !important; height: 28px !important;
            line-height: 1 !important; margin: 0 0 2px 0 !important;
            border-radius: 4px;
        }
        
        /* 列表樣式 */
        .client-card { padding: 8px; border-bottom: 1px solid #eee; cursor: pointer; }
        .center-info-box {
            grid-column: 2 / 4; grid-row: 2 / 4; background-color: #fff;
            display: flex; flex-direction: column; justify-content: center; align-items: center;
            border: 1px solid #ccc; color: #000; padding: 5px;
        }
    </style>
    """, unsafe_allow_html=True)
