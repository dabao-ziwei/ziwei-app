import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 全局強制亮色與字體
           ================================================================= */
        :root {
            --primary-color: #4B0082;
            --background-color: #ffffff;
            --secondary-background-color: #ffffff;
            --text-color: #000000;
            --font: sans-serif;
        }
        
        .stApp {
            background-color: #ffffff !important;
            color: #000000 !important;
        }
        
        header[data-testid="stHeader"] {
            background-color: #ffffff !important;
            border-bottom: 1px solid #eee !important;
        }

        /* =================================================================
           2. 針對截圖問題的【暴力修正區】
           ================================================================= */

        /* (A) 修正全黑的輸入框 (Text Input) */
        /* 這會強制把輸入框的底色變成白色，邊框變成灰色 */
        div[data-testid="stTextInput"] > div > div {
            background-color: #ffffff !important;
            color: #000000 !important;
            border-color: #cccccc !important; 
        }
        /* 輸入框裡的文字 */
        div[data-testid="stTextInput"] input {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            caret-color: #000000 !important;
        }
        /* 輸入框標籤 (如：姓名、出生年月日...) */
        div[data-testid="stTextInput"] label {
            color: #333333 !important;
        }

        /* (B) 修正全黑的摺疊區塊標題 (Expander Summary) - 即「資料輸入 / 修改」那條 */
        details[data-testid="stExpander"] > summary {
            background-color: #f8f9fa !important; /* 淺灰底 */
            color: #000000 !important; /* 黑字 */
            border: 1px solid #cccccc !important;
            border-radius: 4px !important;
        }
        details[data-testid="stExpander"] > summary:hover {
            color: #4B0082 !important; /* 滑鼠移過去變紫色 */
        }
        /* 展開後的內容背景 */
        details[data-testid="stExpander"] {
            background-color: #ffffff !important;
            color: #000000 !important;
        }

        /* (C) 修正全黑的「僅試算」按鈕 (Secondary Button) */
        button[kind="secondary"] {
            background-color: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #cccccc !important;
        }
        button[kind="secondary"]:hover {
            background-color: #f0f0f0 !important;
            border-color: #999999 !important;
            color: #000000 !important;
        }
        /* 確保紅色按鈕 (Primary) 正常 */
        button[kind="primary"] {
            background-color: #ff4b4b !important;
            color: #ffffff !important;
            border: none !important;
        }

        /* (D) 下拉選單修正 (Selectbox) - 確保它是白的 */
        div[data-testid="stSelectbox"] > div > div {
            background-color: #ffffff !important;
            color: #000000 !important;
            border-color: #cccccc !important;
        }
        div[data-testid="stSelectbox"] label {
            color: #333333 !important;
        }

        /* (E) 單選按鈕 (Radio) 文字顏色 */
        div[role="radiogroup"] label p {
            color: #000000 !important;
        }

        /* =================================================================
           3. 命盤網格樣式 (保持您滿意的狀態)
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
