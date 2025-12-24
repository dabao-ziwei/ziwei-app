import streamlit as st

def apply_style():
    st.markdown("""
    <style>
        /* =================================================================
           1. 基礎設定 (白底黑字)
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
           2. 命盤網格
           ================================================================= */
        .block-container {
            padding-top: 6rem !important; 
            padding-bottom: 2rem !important;
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
            margin-bottom: 10px;
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
            padding: 2px 4px;
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
           3. 星曜樣式
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

        .star-name {
            font-size: 18px; 
            font-weight: 900;
            color: #8B0000;
            letter-spacing: 2px;
            margin-bottom: 2px;
            writing-mode: vertical-rl;
            text-orientation: upright;
        }

        .hua-badge {
            font-size: 11px;
            border-radius: 3px;
            padding: 1px 2px;
            color: #fff;
            text-align: center;
            font-weight: bold;
            margin-top: 1px;
            width: 16px;
            line-height: 1.2;
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
            gap: 2px;
        }

        .star-medium { font-size: 14px; font-weight: bold; color: #000; writing-mode: vertical-rl; line-height: 1; }
        .star-small { font-size: 10px; color: #000; writing-mode: vertical-rl; line-height: 1; margin-top: 2px; }
        
        /* 修正：祿存也改為黑色 */
        .color-bad { color: #000 !important; } 
        .color-good { color: #000 !important; } 

        /* =================================================================
           4. 底部資訊
           ================================================================= */
        .cell-footer {
            margin-top: 0px; 
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
