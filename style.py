import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 基礎設定
           ================================================================= */
        :root {
            --primary-color: #4B0082;
            --background-color: #ffffff;
            --text-color: #000000;
        }
        .stApp { background-color: #ffffff !important; color: #000000 !important; }
        header[data-testid="stHeader"] { background-color: #ffffff !important; border-bottom: 1px solid #f0f0f0 !important; }
        div[data-baseweb="input"] { background-color: #ffffff !important; border: 1px solid #ccc !important; }
        div[data-baseweb="input"] input { color: #000000 !important; caret-color: #000000 !important; }
        button[kind="secondary"] { background-color: #ffffff !important; color: #000000 !important; border: 1px solid #ccc !important; }
        div[data-baseweb="select"] > div { background-color: #ffffff !important; color: #000000 !important; }
        label, .stMarkdown p { color: #333 !important; }

        /* =================================================================
           2. 版面與網格
           ================================================================= */
        .block-container {
            padding-top: 6rem !important; 
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

        .active-daxian { background-color: #f9f9f9 !important; border: 2px solid #666 !important; }
        .active-liunian { border: 3px solid #007bff !important; z-index: 5; }

        /* =================================================================
           3. 星曜樣式 (修正：左至右排列，紅->黑->藍)
           ================================================================= */
        .stars-box {
            display: flex;
            flex-direction: row; 
            flex: 1; 
            min-height: 0;
            align-items: flex-start;
            margin-bottom: auto; 
        }

        .star-major-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-right: 2px;
        }

        /* 主星：深紅 (#B71C1C) 粗體 */
        .star-name {
            font-size: 18px; 
            font-weight: 900;
            color: #B71C1C; 
            letter-spacing: 2px;
            margin-bottom: 4px;
            writing-mode: vertical-rl;
            text-orientation: upright;
        }

        .hua-badge {
            font-size: 11px;
            border-radius: 3px;
            padding: 1px 3px;
            color: #fff;
            text-align: center;
            font-weight: bold;
            margin-top: 2px;
            width: 18px;
            line-height: 1.2;
            display: block;
        }
        .bg-ben { background-color: #d32f2f; }
        .bg-da  { background-color: #808080; }
        .bg-liu { background-color: #0056b3; }

        /* 副星欄：改為 row (左至右) */
        .sub-stars-col {
            display: flex;
            flex-direction: row; /* 左至右 */
            flex-wrap: wrap;     /* 自動換行 */
            align-content: flex-start;
            gap: 4px;
            margin-left: 2px;
        }

        /* 輔星：黑色 (#000) 粗體 */
        .star-medium {
            font-size: 14px;
            font-weight: bold;
            color: #000000;
            writing-mode: vertical-rl;
            line-height: 1;
        }
        
        /* 雜曜：藍色 (#4169E1) 正常字體 */
        .star-small {
            font-size: 11px; /* 稍微大一點點方便閱讀 */
            color: #4169E1;  /* RoyalBlue */
            writing-mode: vertical-rl;
            line-height: 1;
            margin-top: 2px;
            font-weight: normal;
        }

        /* =================================================================
           4. 底部資訊
           ================================================================= */
        .cell-footer {
            margin-top: 2px;
            border-top: 1px solid #eee;
            padding-top: 2px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            background-color: #fff;
        }

        .footer-left { display: flex; flex-direction: column; line-height: 1; align-items: center; }
        .ganzhi-label { color: #000 !important; font-size: 16px !important; font-weight: 900 !important; margin-bottom: -2px; }
        .zhi-label { color: #000; font-size: 16px; font-weight: 900; }

        .footer-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; line-height: 1.1; }
        .p-name-liu { color: #0056b3; font-size: 14px; font-weight: 900; }
        .p-name-da { color: #666; font-size: 14px; font-weight: 900; }
        .p-name-ben { color: #d32f2f; font-size: 14px; font-weight: 900; }
        .limit-info { font-size: 11px; color: #333; font-weight: normal; margin-left: 2px; }
        
        /* 長生十二神 */
        .life-stage {
            font-size: 12px;
            color: #555;
            margin-bottom: 2px;
            font-weight: bold;
        }

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
