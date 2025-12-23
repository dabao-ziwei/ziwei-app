import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 基礎設定 & 淺色模式強制
           ================================================================= */
        :root {
            --primary-color: #4B0082;
            --background-color: #ffffff;
            --secondary-background-color: #ffffff;
            --text-color: #000000;
            --font: sans-serif;
        }
        
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { background-color: #ffffff !important; border-bottom: 1px solid #eee !important; }

        /* 輸入框與元件強制白底黑字 (維持之前的修正) */
        div[data-baseweb="input"] { background-color: #ffffff !important; border: 1px solid #ccc !important; }
        div[data-baseweb="input"] input { color: #000000 !important; caret-color: #000000 !important; }
        div[data-testid="stExpander"] details > summary { background-color: #f8f9fa !important; color: #000000 !important; border: 1px solid #ccc !important; }
        button[kind="secondary"] { background-color: #ffffff !important; color: #000000 !important; border: 1px solid #ccc !important; }
        div[data-baseweb="select"] > div { background-color: #ffffff !important; color: #000000 !important; border-color: #ccc !important; }
        div[data-baseweb="select"] span { color: #000000 !important; }
        ul[data-baseweb="menu"] { background-color: #ffffff !important; }
        label, .stMarkdown p { color: #333 !important; }

        /* =================================================================
           2. 命盤網格與間距
           ================================================================= */
        .block-container {
            padding-top: 6rem !important; /* 避免標題被遮擋 */
            padding-bottom: 3rem !important;
            max-width: 1200px !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }

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
        
        @media (max-width: 800px) {
            .zwds-grid { grid-template-columns: repeat(2, 1fr); grid-template-rows: auto; }
        }

        .zwds-cell {
            background-color: #ffffff;
            border: 1px solid #ccc;
            padding: 4px;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
            overflow: hidden;
        }

        .active-daxian { background-color: #f5f5f5 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #007bff !important; z-index: 5; }

        /* =================================================================
           3. 星曜與標籤排版 (針對問題點的修正)
           ================================================================= */
        
        /* 星曜區塊容器：水平排列多顆主星 */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex: 1;
            min-height: 0;
            align-items: flex-start;
        }

        /* 單顆主星欄位：垂直堆疊 (名字在上，四化在下) */
        .star-major-container {
            display: flex;
            flex-direction: column; /* 關鍵：垂直排列 */
            align-items: center;    /* 水平置中 */
            margin-left: 4px;
            margin-right: 4px;
            /* 這裡不要設 writing-mode，只讓內部的名字直書 */
        }

        /* 主星名字：直書 */
        .star-name {
            font-size: 18px; 
            font-weight: 900;
            color: #000;
            letter-spacing: 2px;
            margin-bottom: 4px;
            writing-mode: vertical-rl; /* 文字直排 */
            text-orientation: upright; /* 字體轉正 */
        }

        /* 四化標籤：橫書，堆疊在下方 */
        .hua-badge {
            font-size: 11px; /* 稍微加大 */
            border-radius: 3px;
            padding: 1px 3px;
            color: #fff;
            text-align: center;
            font-weight: bold;
            margin-top: 2px; /* 標籤間距 */
            width: 18px;     /* 固定寬度，整齊 */
            line-height: 1.2;
            display: block;  /* 確保換行 */
        }
        
        .bg-ben { background-color: #d32f2f; } /* 紅 */
        .bg-da  { background-color: #808080; } /* 灰 */
        .bg-liu { background-color: #0056b3; } /* 藍 */

        /* 副星欄：直書，從右排到左 */
        .sub-stars-col {
            display: flex;
            flex-direction: row-reverse;
            flex-wrap: wrap-reverse;
            align-content: flex-start;
            gap: 4px;
            margin-left: auto; /* 靠右對齊 */
        }

        .star-medium, .star-small {
            writing-mode: vertical-rl;
            line-height: 1;
        }
        .star-medium { font-size: 14px; font-weight: bold; color: #333; }
        .star-small { font-size: 10px; color: #666; margin-top: 2px; }
        .color-bad { color: #d32f2f !important; } 
        .color-good { color: #2e7d32 !important; } 

        /* =================================================================
           4. 底部資訊 (修正天干太小的問題)
           ================================================================= */
        .cell-footer {
            margin-top: 2px;
            border-top: 1px solid #eee;
            padding-top: 2px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .footer-left { 
            display: flex; 
            flex-direction: column; 
            line-height: 1; 
            align-items: center; /* 讓干支置中對齊 */
        }
        
        /* 修正：天干 (Gan) 加大加黑 */
        .ganzhi-label { 
            color: #000000 !important; /* 改成全黑 */
            font-size: 16px !important; /* 加大到 16px (與地支一樣) */
            font-weight: 900 !important; 
            margin-bottom: -2px; /* 稍微拉近與地支的距離 */
        }
        
        /* 地支 (Zhi) */
        .zhi-label { 
            color: #000000; 
            font-size: 16px; 
            font-weight: 900; 
        }

        .footer-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .palace-name { font-size: 14px; font-weight: 900; color: #000; }
        .limit-info { font-size: 12px; color: #444; font-weight: bold; }
        .status-tags { display: flex; gap: 2px; margin-top: 2px; }
        .tag-flow { font-size: 10px; padding: 1px 3px; border-radius: 2px; color: white; font-weight: bold; }
        .tag-liu { background-color: #0056b3; } 
        .tag-da { background-color: #666; } 

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
