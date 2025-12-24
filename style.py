import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 基礎設定
           ================================================================= */
        :root { --primary-color: #4B0082; --background-color: #ffffff; --text-color: #000000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { background-color: #ffffff !important; border-bottom: 1px solid #f0f0f0 !important; }
        div[data-baseweb="input"] { background-color: #ffffff !important; border: 1px solid #ccc !important; }
        div[data-baseweb="input"] input { color: #000000 !important; caret-color: #000000 !important; }
        button[kind="secondary"] { background-color: #ffffff !important; color: #000000 !important; border: 1px solid #ccc !important; }
        div[data-baseweb="select"] > div { background-color: #ffffff !important; color: #000000 !important; }
        label, .stMarkdown p { color: #333 !important; }

        .block-container { padding-top: 6rem !important; padding-bottom: 2rem !important; max-width: 1200px !important; }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }

        /* =================================================================
           2. 命盤網格
           ================================================================= */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 160px); 
            gap: 0;
            background-color: #000; 
            border: 2px solid #000;
            margin-bottom: 20px;
            font-family: "Microsoft JhengHei", "Heiti TC", sans-serif;
            max-width: 1200px;
            margin-left: auto;
            margin-right: auto;
        }
        @media (max-width: 800px) { .zwds-grid { grid-template-columns: repeat(2, 1fr); grid-template-rows: auto; } }

        .zwds-cell {
            background-color: #ffffff;
            border: 1px solid #ccc;
            padding: 2px;
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
        }

        .active-daxian { background-color: #f9f9f9 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #007bff !important; z-index: 5; }

        /* =================================================================
           3. 星曜區 (上半部)
           ================================================================= */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex-wrap: wrap;
            align-content: flex-start;
            width: 100%;
            padding-top: 2px;
            padding-left: 2px;
        }
        .star-major-container { display: flex; flex-direction: column; align-items: center; margin-right: 4px; }
        .star-name { font-size: 18px; font-weight: 900; color: #B71C1C; letter-spacing: 2px; margin-bottom: 2px; writing-mode: vertical-rl; text-orientation: upright; }
        .hua-badge { font-size: 11px; border-radius: 3px; padding: 1px 0px; color: #fff; text-align: center; font-weight: bold; margin-top: 1px; width: 16px; line-height: 1.2; display: block; }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }
        
        .sub-stars-col { display: flex; flex-direction: row; flex-wrap: wrap; gap: 2px; align-items: flex-start; padding-top: 2px; }
        .star-medium { font-size: 14px; font-weight: bold; color: #000; writing-mode: vertical-rl; line-height: 1; }
        .star-small { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; line-height: 1; font-weight: normal; }

        /* =================================================================
           4. 底部資訊 (絕對定位 & 修正版面)
           ================================================================= */
        
        /* 左下角：神煞區 */
        .gods-box {
            position: absolute;
            bottom: 2px;
            left: 2px;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            line-height: 1.1;
        }
        .god-star { font-size: 11px; writing-mode: horizontal-tb; }
        .god-sui { color: #008080; }
        .god-jiang { color: #4682B4; }
        .god-boshi { color: #9370DB; }

        /* 右下角容器：改為 Row (水平排列) */
        /* 左邊是直書的干支，右邊是堆疊的宮名資訊 */
        .footer-right {
            position: absolute;
            bottom: 2px;
            right: 2px;
            display: flex;
            flex-direction: row; /* 關鍵：水平排列 */
            align-items: flex-end; /* 底部對齊 */
            gap: 4px; /* 兩欄之間的間距 */
        }

        /* 1. 干支：直書顯示 */
        .ganzhi-text { 
            color: #000; 
            font-size: 16px; /* 字體加大 */
            font-weight: 900; 
            writing-mode: vertical-rl; /* 直書 */
            text-orientation: upright;
            line-height: 1;
            margin-bottom: 2px; /* 微調底部對齊 */
        }

        /* 2. 宮名資訊欄：垂直堆疊 (靠右對齊) */
        .footer-info-col {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            line-height: 1.1;
        }

        .shen-badge { background-color: #1E90FF; color: #fff; font-size: 10px; padding: 1px 3px; border-radius: 2px; margin-bottom: 2px; font-weight: bold; }
        .life-stage { font-size: 12px; color: #800080; font-weight: bold; margin-bottom: 2px; }
        
        .p-name-liu { color: #0056b3; font-size: 14px; font-weight: 900; }
        .p-name-da { color: #666; font-size: 14px; font-weight: 900; }
        .p-name-ben { color: #d32f2f; font-size: 14px; font-weight: 900; }
        .limit-info { font-size: 12px; color: #333; font-weight: normal; margin-top: 1px; }

        .center-info-box {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center; text-align: center;
            border: 1px solid #ccc;
            color: #000;
            height: 100%;
        }
    </style>
    """, unsafe_allow_html=True)
