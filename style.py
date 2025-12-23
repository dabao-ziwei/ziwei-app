import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 版面間距修正 (針對標題被切掉的終極修正)
           ================================================================= */
        
        /* 關鍵修正：
           原本是 4rem，現在加大到 6rem (約 96px)，
           強制把內容往下推，確保標題不會被 Streamlit 的頂部選單列遮住。
        */
        .block-container {
            padding-top: 6rem !important; 
            padding-bottom: 3rem !important;
            max-width: 1200px !important;
        }
        
        /* 隱藏 Streamlit 右上角選單與 Footer (選填，讓畫面更乾淨) */
        #MainMenu {visibility: hidden;}
        footer {visibility: hidden;}
        
        /* 讓頂部 Header 背景透明化，減少視覺干擾 */
        header[data-testid="stHeader"] {
            background-color: rgba(255, 255, 255, 0.0) !important;
        }

        /* =================================================================
           2. 命盤網格系統 (維持您滿意的排版)
           ================================================================= */
        
        /* 消除元件間的預設空隙 */
        [data-testid="stVerticalBlock"] { gap: 0px !important; }

        /* 網格設定 */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 160px); 
            gap: 0;
            background-color: #000; /* 格線顏色：黑 */
            border: 2px solid #000;
            margin-bottom: 20px;
            font-family: "Microsoft JhengHei", "Heiti TC", sans-serif;
            max-width: 1200px;
            margin-left: auto;
            margin-right: auto;
        }
        
        /* 手機版適配 */
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
            padding: 4px;
            position: relative;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 100%;
            overflow: hidden;
        }

        /* 狀態高亮 (流年/大限) */
        .active-daxian { background-color: #f5f5f5 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #007bff !important; z-index: 5; }

        /* === 星曜排版 === */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex: 1;
            min-height: 0;
            align-items: flex-start;
        }

        /* 左側：主星欄 */
        .main-stars-col {
            display: flex;
            flex-direction: row; /* 讓雙星並排 */
            padding-right: 4px;
            margin-right: 4px;
            border-right: 1px dashed #ccc;
            height: 100%;
        }

        /* 主星容器 (包含名字和四化) */
        .star-major-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-left: 2px;
            margin-right: 2px;
            writing-mode: vertical-rl; /* 直書 */
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
            padding: 2px 2px;
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

        /* 右側：副星欄 (直書) */
        .sub-stars-col {
            display: flex;
            flex-direction: row-reverse; /* 從右排到左 */
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
        
        /* 底部資訊區 */
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

        /* 中宮 */
        .center-info-box {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center; text-align: center;
            border: 1px solid #ccc;
            color: #000;
            height: 100%;
        }
        
        /* === 3. 按鈕微調 (確保按鈕看起來是乾淨的白底風格) === */
        div.stButton > button {
            background-color: #f9f9f9;
            border: 1px solid #ccc;
            color: #333;
        }
        div.stButton > button:hover {
            border-color: #999;
            color: #000;
        }
        /* 選中的按鈕 (紫色) */
        div.stButton > button[kind="primary"] {
            background-color: #4B0082 !important;
            color: #fff !important;
            border: none;
        }
    </style>
    """, unsafe_allow_html=True)
