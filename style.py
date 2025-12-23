import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 強制覆蓋 Streamlit 深色模式 (Theme Override)
           這段代碼會把所有原本黑黑的輸入框、容器、選單強制改成白底黑字
           ================================================================= */
        
        /* 全局字體與背景 */
        .stApp {
            background-color: #ffffff !important;
            color: #000000 !important;
        }
        
        /* 修正：頂部容器、Expander、Form 的黑色背景 */
        [data-testid="stContainer"], [data-testid="stExpander"], [data-testid="stForm"] {
            background-color: #ffffff !important;
            color: #000000 !important;
            border-color: #e0e0e0 !important; /* 淺灰邊框 */
        }
        
        /* 修正：Expander 的標題列 (原本是黑的) */
        .streamlit-expanderHeader {
            background-color: #f8f9fa !important;
            color: #000000 !important;
            border: 1px solid #e0e0e0 !important;
            border-radius: 4px;
        }
        
        /* 修正：輸入框 (Text Input) - 強制白底黑字 */
        .stTextInput input {
            background-color: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #ccc !important;
        }
        /* 修正：輸入框被選取時的邊框顏色 */
        .stTextInput input:focus {
            border-color: #4B0082 !important;
            box-shadow: 0 0 0 1px #4B0082 !important;
        }
        
        /* 修正：下拉選單 (Selectbox) - 強制白底黑字 */
        div[data-baseweb="select"] > div {
            background-color: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #ccc !important;
        }
        /* 下拉選單內的文字 */
        div[data-baseweb="select"] span {
            color: #000000 !important;
        }
        /* 下拉選單彈出的列表 */
        ul[data-baseweb="menu"] {
            background-color: #ffffff !important;
        }
        ul[data-baseweb="menu"] li {
            color: #000000 !important;
        }
        
        /* 修正：所有 Label (標籤文字) 變回黑色 */
        .stMarkdown p, .stMarkdown label, .stTextInput label, .stSelectbox label, .stRadio label {
            color: #333333 !important;
        }
        
        /* 修正：Radio Button (單選按鈕) */
        div[role="radiogroup"] label {
            color: #000000 !important;
        }

        /* 修正：按鈕樣式 (白底黑字風格) */
        div.stButton > button {
            background-color: #f0f0f0 !important;
            color: #000000 !important;
            border: 1px solid #ccc !important;
        }
        div.stButton > button:hover {
            border-color: #999 !important;
            background-color: #e0e0e0 !important;
        }
        /* 主要按鈕 (紫色) */
        div.stButton > button[kind="primary"] {
            background-color: #4B0082 !important;
            color: #ffffff !important;
            border: none !important;
        }

        /* =================================================================
           2. 排版間距調整
           ================================================================= */
        .block-container {
            padding-top: 1rem !important;
            padding-bottom: 2rem !important;
            max-width: 1200px !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0.5rem !important; }

        /* =================================================================
           3. 命盤樣式 (維持不變，確保命盤顯示正確)
           ================================================================= */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 160px); 
            gap: 0;
            background-color: #000; /* 格線顏色 */
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
