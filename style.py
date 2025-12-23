# style.py
import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* === 全局設定：白底黑字 === */
        .stApp { background-color: #ffffff; color: #000000; }
        #MainMenu {visibility: hidden;}
        footer {visibility: hidden;}
        header {visibility: hidden;}
        
        .block-container { padding-top: 1rem; padding-bottom: 2rem; }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }
        
        /* === 命盤網格 === */
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

        /* 單一宮位卡片 */
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

        /* 狀態高亮 */
        .active-daxian { background-color: #f5f5f5 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #007bff !important; z-index: 5; }

        /* === 星曜區塊 === */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex: 1;
            min-height: 0;
            align-items: flex-start; /* 靠上對齊 */
        }

        /* 左側：主星欄 */
        .main-stars-col {
            display: flex;
            flex-direction: row; /* 雙星並排 */
            padding-right: 4px;
            margin-right: 4px;
            border-right: 1px dashed #ccc;
            height: 100%;
        }

        /* 主星容器 (包含名字和四化) */
        .star-major-container {
            display: flex;
            flex-direction: column; /* 垂直排列：星名在上，四化在下 */
            align-items: center;
            margin-left: 2px;
            margin-right: 2px;
            writing-mode: vertical-rl; /* 關鍵：直書模式 */
        }

        /* 主星名字 */
        .star-name {
            font-size: 18px; 
            font-weight: 900;
            color: #000;
            letter-spacing: 2px;
            margin-bottom: 4px; /* 與四化標籤的距離 */
        }

        /* 四化標籤 (通用) */
        .hua-badge {
            font-size: 10px;
            border-radius: 2px;
            padding: 2px 2px;
            color: #fff;
            text-align: center;
            font-weight: normal;
            margin-top: 1px; /* 標籤之間的間距 */
            writing-mode: horizontal-tb; /* 讓字轉正 */
            width: 14px; /* 固定寬度，形成正方形感 */
            height: 14px;
            line-height: 10px;
            display: block;
        }
        
        /* 四化顏色定義 */
        .bg-ben { background-color: #d32f2f; } /* 本命：紅 */
        .bg-da  { background-color: #808080; } /* 大限：灰 */
        .bg-liu { background-color: #0056b3; } /* 流年：藍 */

        /* 輔星/煞星欄 (羊陀祿存等) - 直書 */
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
        
        /* === 底部資訊區 === */
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

        /* 中宮資訊 */
        .center-info-box {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center; text-align: center;
            border: 1px solid #ccc;
            color: #000;
            height: 100%;
        }

        /* 按鈕樣式 */
        div.stButton > button {
            width: 100%; border-radius: 0; border: 1px solid #ccc; 
            font-size: 12px; height: auto; min-height: 35px;
            background-color: #f9f9f9; color: #333;
            margin: 0; padding: 2px 0;
        }
        div.stButton > button:hover { border-color: #999; background-color: #e9e9e9; color: #000; }
        div.stButton > button[kind="primary"] { 
            background-color: #4B0082 !important; 
            color: white !important; 
            border: 1px solid #4B0082 !important; 
        }
    </style>
    """, unsafe_allow_html=True)
