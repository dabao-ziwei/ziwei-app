import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 強力樣式重置 (針對 image_1e3462.png 的問題)
           ================================================================= */
        
        /* (1) 消除頂部巨大的黑色 Header */
        header[data-testid="stHeader"] {
            background-color: #ffffff !important;
            border-bottom: 1px solid #f0f0f0 !important;
        }
        
        /* 主背景強制白 */
        .stApp {
            background-color: #ffffff !important;
            color: #000000 !important;
        }

        /* (2) 修正黑色的輸入框 (Text Input) */
        /* 針對輸入框的外層容器 */
        div[data-testid="stTextInput"] div[data-baseweb="input"] {
            background-color: #ffffff !important;
            border: 1px solid #cccccc !important;
            color: #000000 !important;
        }
        /* 針對輸入框內部的文字輸入區 */
        div[data-testid="stTextInput"] input {
            color: #000000 !important;
            background-color: transparent !important;
            caret-color: #000000 !important;
        }
        
        /* (3) 修正黑色的下拉選單 (Selectbox) */
        div[data-testid="stSelectbox"] div[data-baseweb="select"] > div {
            background-color: #ffffff !important;
            border: 1px solid #cccccc !important;
            color: #000000 !important;
        }
        /* 選單文字 */
        div[data-testid="stSelectbox"] div[data-baseweb="select"] span {
            color: #000000 !important;
        }
        /* 下拉後的選單列表背景 */
        ul[data-baseweb="menu"] {
            background-color: #ffffff !important;
            border: 1px solid #eee !important;
        }
        /* 選項文字 */
        li[data-baseweb="option"] {
            color: #000000 !important;
        }

        /* (4) 修正按鈕 (Button) - 尤其是那個黑色的「僅試算」 */
        button[kind="secondary"] {
            background-color: #f0f0f0 !important;
            color: #000000 !important;
            border: 1px solid #cccccc !important;
        }
        button[kind="secondary"]:hover {
            border-color: #999 !important;
            background-color: #e0e0e0 !important;
            color: #000000 !important;
        }
        
        /* 確保主要按鈕 (紅色/紫色) 維持亮眼 */
        button[kind="primary"] {
            background-color: #ff4b4b !important; /* 配合你原本的紅色風格 */
            color: #ffffff !important;
            border: none !important;
        }

        /* (5) 修正 Label (欄位名稱) 顏色 */
        label, .stMarkdown p {
            color: #333333 !important;
        }

        /* =================================================================
           2. 命盤網格樣式 (保持不變)
           ================================================================= */
        .block-container {
            padding-top: 1rem !important;
            padding-bottom: 3rem !important;
            max-width: 1200px !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0.5rem !important; }

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
            .zwds-grid {
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: auto;
            }
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

        .stars-box {
            display: flex;
            flex-direction: row; 
            flex: 1;
            min-height: 0;
            align-items: flex-start;
        }

        .main-stars-col {
            display: flex;
            flex-direction: row; 
            padding-right: 4px;
            margin-right: 4px;
            border-right: 1px dashed #ccc;
            height: 100%;
        }

        .star-major-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-left: 2px;
            margin-right: 2px;
            writing-mode: vertical-rl;
        }

        .star-name {
            font-size: 18px; 
            font-weight: 900;
            color: #000;
            letter-spacing: 2px;
            margin-bottom: 4px;
        }

        .hua-badge {
            font-size: 10px;
            border-radius: 2px;
            padding: 2px 2px;
            color: #fff;
            text-align: center;
            font-weight: normal;
            margin-top: 1px;
            writing-mode: horizontal-tb;
            width: 14px;
            height: 14px;
            line-height: 10px;
            display: block;
        }
        
        .bg-ben { background-color: #d32f2f; }
        .bg-da  { background-color: #808080; }
        .bg-liu { background-color: #0056b3; }

        .sub-stars-col {
            display: flex;
            flex-direction: row-reverse;
            flex-wrap: wrap-reverse;
            align-content: flex-start;
            gap: 4px;
        }

        .star-medium {
            font-size: 14px;
            font-weight: bold;
            writing-mode: vertical-rl;
            color: #333;
            line-height: 1;
        }
        
        .star-small {
            font-size: 10px;
            color: #666;
            writing-mode: vertical-rl;
            line-height: 1;
            margin-top: 2px;
        }
        
        .color-bad { color: #d32f2f !important; } 
        .color-good { color: #2e7d32 !important; } 
        
        .cell-footer {
            margin-top: 2px;
            border-top: 1px solid #eee;
            padding-top: 2px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .footer-left { display: flex; flex-direction: column; line-height: 1; }
        .ganzhi-label { color: #666; font-size: 12px; font-weight: bold; }
        .zhi-label { color: #000; font-size: 16px; font-weight: 900; }

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
