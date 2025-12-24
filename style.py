import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 基礎設定
           ================================================================= */
        :root { --primary-color: #4B0082; --background-color: #ffffff; --text-color: #000000; }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { display: none !important; } /* 直接隱藏頂部 Header */
        div[data-baseweb="input"] { background-color: #ffffff !important; border: 1px solid #ccc !important; }
        div[data-baseweb="input"] input { color: #000000 !important; caret-color: #000000 !important; }
        button[kind="secondary"] { background-color: #ffffff !important; color: #000000 !important; border: 1px solid #ccc !important; }
        div[data-baseweb="select"] > div { background-color: #ffffff !important; color: #000000 !important; }
        label, .stMarkdown p { color: #333 !important; }

        /* 縮減頂部間距：原本 6rem 改為 2rem */
        .block-container {
            padding-top: 2rem !important; 
            padding-bottom: 2rem !important;
            max-width: 1200px !important;
        }
        [data-testid="stVerticalBlock"] { gap: 0px !important; }

        /* =================================================================
           2. 命盤網格 (縮減高度)
           ================================================================= */
        .zwds-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            /* 關鍵修改：將高度從 160px 縮減為 115px */
            grid-template-rows: repeat(4, 115px); 
            gap: 0;
            background-color: #000; 
            border: 2px solid #000;
            margin-bottom: 10px;
            font-family: "Microsoft JhengHei", "Heiti TC", sans-serif;
            max-width: 1200px;
            margin-left: auto;
            margin-right: auto;
        }
        @media (max-width: 800px) { .zwds-grid { grid-template-columns: repeat(2, 1fr); grid-template-rows: auto; } }

        .zwds-cell {
            background-color: #ffffff;
            border: 1px solid #ccc;
            padding: 1px; /* 極小內距 */
            position: relative;
            display: flex;
            flex-direction: column;
            height: 100%;
            overflow: hidden;
        }

        .active-daxian { background-color: #f9f9f9 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #007bff !important; z-index: 5; }

        /* =================================================================
           3. 星曜區 (消除缺角門牙：零間距)
           ================================================================= */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex-wrap: wrap;
            align-content: flex-start;
            align-items: flex-start;
            width: 100%;
            padding-top: 1px;
            padding-left: 1px;
            /* 關鍵修改：間距設為 0 */
            gap: 0px; 
        }

        /* 主星容器 */
        .star-major-container { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            /* 關鍵修改：右邊距歸零 */
            margin-right: 0px; 
            padding-right: 2px; /* 稍微留一點點呼吸空間，但不會造成斷層 */
        }
        /* 主星文字 */
        .star-name { 
            font-size: 18px; 
            font-weight: 900; 
            color: #B71C1C; 
            letter-spacing: 1px; /* 稍微縮小字距 */
            margin-bottom: 1px; 
            writing-mode: vertical-rl; 
            text-orientation: upright; 
        }
        .hua-badge { font-size: 10px; border-radius: 2px; padding: 0px 0px; color: #fff; text-align: center; font-weight: bold; margin-top: 1px; width: 14px; line-height: 1.1; display: block; }
        .bg-ben { background-color: #d32f2f; } .bg-da { background-color: #808080; } .bg-liu { background-color: #0056b3; }
        
        /* 副星 */
        .star-medium { 
            font-size: 14px; 
            font-weight: bold; 
            color: #000000; 
            writing-mode: vertical-rl; 
            line-height: 1.1; 
            margin-right: 1px; /* 極小間距 */
        }
        .star-small { 
            font-size: 11px; 
            color: #4169E1; 
            writing-mode: vertical-rl; 
            line-height: 1.1; 
            font-weight: normal; 
            margin-top: 0;
            margin-right: 1px;
        }

        /* =================================================================
           4. 底部資訊 (配合高度縮減進行微調)
           ================================================================= */
        
        .footer-left {
            position: absolute; bottom: 1px; left: 1px;
            display: flex; flex-direction: row; align-items: flex-end; gap: 2px;
        }
        /* 神煞字體微調 */
        .gods-col { display: flex; flex-direction: column; align-items: flex-start; line-height: 1; }
        .god-star { font-size: 10px; writing-mode: horizontal-tb; margin-bottom: 1px; }
        .god-sui { color: #008080; } .god-jiang { color: #4682B4; } .god-boshi { color: #9370DB; }
        
        .limit-info { font-size: 12px; color: #333; font-weight: normal; line-height: 1; margin-bottom: 0px; }

        .footer-right {
            position: absolute; bottom: 1px; right: 1px;
            display: flex; flex-direction: row; align-items: flex-end; gap: 1px;
        }
        .palace-info-col { display: flex; flex-direction: column; align-items: flex-end; line-height: 1; }
        
        /* 干支字體微調 */
        .ganzhi-col { 
            writing-mode: vertical-rl; text-orientation: upright; 
            font-size: 15px; font-weight: 900; line-height: 1; 
            color: #000; margin-left: 1px; 
        }

        .shen-badge { background-color: #1E90FF; color: #fff; font-size: 9px; padding: 0px 2px; border-radius: 2px; margin-bottom: 1px; font-weight: bold; }
        .life-stage { font-size: 11px; color: #800080; font-weight: bold; margin-bottom: 1px; }
        
        /* 宮名間距微調 */
        .p-name-liu { color: #0056b3; font-size: 13px; font-weight: 900; margin-bottom: 0px; }
        .p-name-da { color: #666; font-size: 13px; font-weight: 900; margin-bottom: 0px; }
        .p-name-ben { color: #d32f2f; font-size: 13px; font-weight: 900; }

        .center-info-box {
            grid-column: 2 / 4; grid-row: 2 / 4;
            background-color: #fff;
            display: flex; flex-direction: column;
            justify-content: center; align-items: center; text-align: center;
            border: 1px solid #ccc;
            color: #000;
            height: 100%;
            /* 中宮資訊也稍微縮小一點 */
            padding: 5px;
        }
        .center-info-box h3 { font-size: 20px !important; margin-bottom: 5px !important; }
        .center-info-box div { font-size: 12px !important; margin-bottom: 2px !important; }
    </style>
    """, unsafe_allow_html=True)
