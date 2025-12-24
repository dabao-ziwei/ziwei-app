import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* === 全局設定 === */
        :root { --primary-color: #4B0082; --bg-color: #fff; --text-color: #000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { display: none !important; }
        .block-container { padding: 1rem 1rem !important; max-width: 1200px !important; }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }

        /* === 命盤容器 (Chart Container) === */
        .chart-wrapper {
            position: relative;
            width: 100%;
            border: 2px solid #333;
            background-color: #333; /* 格線顏色 */
            margin-bottom: 0px;
        }

        /* SVG 疊加層 (虛線連線) */
        .svg-overlay {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none; /* 讓點擊穿透 */
            z-index: 20; /* 最上層 */
        }

        /* 網格系統 */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, 120px); /* 高度 */
            gap: 1px; /* 格線寬度 */
            background-color: #999; 
        }

        /* 單一宮位格子 */
        .zwds-cell {
            background-color: #ffffff;
            position: relative;
            padding: 2px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        /* 高亮背景顏色 */
        .highlight-focus { background-color: #F0F8FF !important; } /* 淺藍 */
        .highlight-sanfang { background-color: #FFF8F0 !important; } /* 淺橘 */
        .highlight-duigong { background-color: #F0FFF0 !important; } /* 淺綠 */

        /* === 星曜區 (零間隙) === */
        .stars-box {
            display: flex;
            flex-direction: row;
            flex-wrap: wrap;
            align-content: flex-start;
            gap: 0px; /* 關鍵：無間隙 */
            margin-bottom: auto;
        }

        /* 主星 */
        .star-major {
            display: flex; flex-direction: column; align-items: center;
            width: fit-content; margin-right: 2px;
        }
        .star-name {
            font-size: 18px; font-weight: 900; color: #B71C1C; /* 深紅 */
            writing-mode: vertical-rl; text-orientation: upright;
            line-height: 1; letter-spacing: -2px; margin-bottom: 2px;
        }
        .hua-badge {
            font-size: 10px; color: #fff; padding: 0 1px;
            border-radius: 2px; text-align: center; width: 14px; display: block;
        }
        .bg-ben { background-color: #d32f2f; } 
        .bg-da { background-color: #808080; } 
        .bg-liu { background-color: #0056b3; }

        /* 副星 */
        .star-med { font-size: 14px; font-weight: 700; color: #000; writing-mode: vertical-rl; line-height: 1.1; }
        .star-sml { font-size: 11px; color: #4169E1; writing-mode: vertical-rl; line-height: 1.1; }

        /* === 底部資訊 (參照圖片佈局) === */
        /* 左下：神煞堆疊 + 歲數 */
        .footer-left {
            position: absolute; bottom: 1px; left: 1px;
            display: flex; align-items: flex-end; gap: 4px;
        }
        .gods-col { display: flex; flex-direction: column; line-height: 1; }
        .god-text { font-size: 10px; color: #555; writing-mode: horizontal-tb; }
        .limit-text { font-size: 14px; font-weight: normal; color: #000; line-height: 1; }

        /* 右下：宮位資訊 + 干支 */
        .footer-right {
            position: absolute; bottom: 1px; right: 1px;
            display: flex; align-items: flex-end; gap: 2px;
        }
        .info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .badge-shen { background-color: #007bff; color: #fff; font-size: 9px; padding: 0 2px; border-radius: 2px; }
        .life-stage { font-size: 11px; color: #800080; }
        .palace-name { font-size: 13px; font-weight: 900; color: #d32f2f; } /* 本命紅 */
        .ganzhi-label { 
            font-size: 16px; font-weight: 900; color: #000; 
            writing-mode: vertical-rl; text-orientation: upright; line-height: 1;
        }

        /* === 大限時間軸 (仿照圖片下方) === */
        .timeline-container {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            background-color: #eee;
            border: 1px solid #ccc;
            border-top: none;
            margin-bottom: 5px;
        }
        .timeline-cell {
            text-align: center;
            padding: 4px 0;
            font-size: 12px;
            cursor: pointer;
            border-right: 1px solid #ddd;
            transition: background 0.2s;
        }
        .timeline-cell:hover { background-color: #ddd; }
        .timeline-cell.active { background-color: #4B0082; color: white; }
        .timeline-top { font-weight: bold; font-size: 13px; display: block; }
        .timeline-btm { font-size: 11px; display: block; }

        /* 中宮 */
        .center-box {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center;
            padding: 10px;
        }
        
        /* 隱藏 Streamlit 預設按鈕樣式，我們用自定義 HTML */
        .stButton { display: none; } 
    </style>
    """, unsafe_allow_html=True)
