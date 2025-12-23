# style.py
import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* === 1. 全局強制白底黑字 (覆蓋 Streamlit 深色模式) === */
        .stApp {
            background-color: #ffffff !important;
            color: #000000 !important;
        }
        
        /* === 2. 修正輸入框 (Input) 與選單 (Selectbox) 的黑條問題 === */
        /* 強制輸入框背景為白，文字為黑，邊框為灰 */
        div[data-baseweb="input"] {
            background-color: #ffffff !important;
            border: 1px solid #ccc !important; 
            color: #000000 !important;
        }
        div[data-baseweb="input"] input {
            color: #000000 !important;
        }
        
        /* 下拉選單修正 */
        div[data-baseweb="select"] > div {
            background-color: #ffffff !important;
            color: #000000 !important;
            border: 1px solid #ccc !important;
        }
        
        /* 選單內的選項文字顏色 */
        ul[data-baseweb="menu"] li {
            background-color: #ffffff !important;
            color: #000000 !important;
        }
        
        /* 標籤文字 (Label) 顏色 */
        .stTextInput label, .stSelectbox label, .stRadio label {
            color: #333333 !important;
            font-size: 14px !important;
        }

        /* === 3. 調整版面間距 (避免巨大化) === */
        .block-container {
            padding-top: 1rem !important;
            padding-bottom: 2rem !important;
            max-width: 1200px !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0.5rem !important; }
        
        /* === 4. 命盤網格系統 (保持你的架構) === */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 160px); 
            gap: 0;
            background-color: #000; /* 格線黑 */
            border: 2px solid #000;
            margin-bottom: 20px;
            font-family: "Microsoft JhengHei", "Heiti TC", sans-serif;
        }
        
        /* 手機適配 */
        @media (max-width: 800px) {
            .zwds-grid {
                grid-template-columns: repeat(2, 1fr);
                grid-template-rows: auto;
            }
        }

        /* 宮位卡片 */
        .zwds-cell {
            background-color: #ffffff;
            border: 1px solid #ccc;
            padding: 2px 4px;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
            overflow: hidden;
        }

        /* 狀態高亮 */
        .active-daxian { background-color: #f0f0f0 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #0056b3 !important; z-index: 5; }

        /* === 星曜排版 === */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex: 1;
            align-items: flex-start;
        }

        /* 主星欄 */
        .main-stars-col {
            display: flex;
            flex-direction: row; 
            padding-right: 4px;
            margin-right: 4px;
            border-right: 1px dashed #ddd;
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

        /* 四化標籤 */
        .hua-badge {
            font-size: 10px;
            border-radius: 2px;
            padding: 2px;
            color: #fff;
            text-align: center;
            font-weight: normal;
            margin-top: 1px;
            writing-mode: horizontal-tb; /* 轉正 */
            width: 14px;
            height: 14px;
            line-height: 10px;
            display: block;
        }
        
        .bg-ben { background-color: #d32f2f; }
        .bg-da  { background-color: #808080; }
        .bg-liu { background-color: #0056b3; }

        /* 副星欄 (直書) */
        .sub-stars-col {
            display: flex;
            flex-direction: row-reverse;
            flex-wrap: wrap-reverse;
            align-content: flex-start;
            gap: 3px;
        }

        .star-medium {
            font-size: 14px;
            font-weight: bold;
            writing-mode: vertical-rl;
            color: #333;
            line-height: 1;
        }
        
        .star-small {
            font-size: 11px;
            color: #666;
            writing-mode: vertical-rl;
            line-height: 1;
        }
        
        .color-bad { color: #d32f2f !important; } 
        .color-good { color: #2e7d32 !important; } 
        
        /* 底部資訊 */
        .cell-footer {
            margin-top: 2px;
            border-top: 1px solid #eee;
            padding-top: 2px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .ganzhi-label { color: #666; font-size: 12px; font-weight: bold; }
        .zhi-label { color: #000; font-size: 16px; font-weight: 900; }
        .palace-name { font-size: 14px; font-weight: 900; color: #000; }
        .limit-info { font-size: 12px; color: #444; font-weight: bold; }
        
        .status-tags { display: flex; gap: 2px; margin-top: 2px; }
        .tag-flow { font-size: 10px; padding: 1px 3px; border-radius: 2px; color: white; font-weight: bold; }
        .tag-liu { background-color: #0056b3; } 
        .tag-da { background-color: #666; } 

        /* 中宮 */
        .center-info-box {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #ffffff;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center; text-align: center;
            border: 1px solid #ccc;
            color: #000;
        }

        /* 按鈕優化 */
        div.stButton > button {
            background-color: #f0f0f0;
            color: #000;
            border: 1px solid #ccc;
        }
        div.stButton > button:hover {
            background-color: #e0e0e0;
            border-color: #999;
        }
        div.stButton > button[kind="primary"] {
            background-color: #4B0082 !important;
            color: #fff !important;
        }
    </style>
    """, unsafe_allow_html=True)
