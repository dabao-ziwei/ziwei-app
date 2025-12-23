import streamlit as st
import time

# --- 1. 頁面設定與 CSS 樣式 ---
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="centered")

# CSS 樣式定義 (修復顯示問題)
st.markdown("""
<style>
    /* 隱藏預設選單 */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* 命盤外框 (4x4 網格) */
    .zwds-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-template-rows: 110px 110px 110px 110px;
        gap: 2px;
        background-color: #666;
        border: 4px solid #444;
        border-radius: 4px;
        margin-top: 10px;
        font-family: "Microsoft JhengHei", sans-serif;
    }
    
    /* 12宮位格子樣式 */
    .zwds-cell {
        background-color: #222;
        color: #fff;
        padding: 4px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        font-size: 13px;
        overflow: hidden;
    }

    /* 中間命主資料區 (跨越中間 2x2 區域) */
    .zwds-center {
        grid-column: 2 / 4;
        grid-row: 2 / 4;
        background-color: #111;
        display: flex;
        flex-direction: column;
        justify_content: center;
        align-items: center;
        text-align: center;
        border: 1px solid #333;
        padding: 5px;
        color: #fff;
    }
    
    /* 地支標籤 (右下角) */
    .cell-label {
        align-self: flex-end;
        color: #888;
        font-weight: bold;
        font-size: 14px;
    }
    
    /* 星曜顯示 (左上角) */
    .cell-stars {
        color: #d4a0ff; /* 紫色字 */
        font-weight: bold;
        font-size: 14px;
        line-height: 1.2;
    }
    
    /* 宮位名稱 (左下角 - 模擬用) */
    .cell-name {
        font-size: 11px;
        color: #aaa;
    }
</style>
""", unsafe_allow_html=True)

# --- 2. 初始化資料庫與狀態 ---
if 'db' not in st.session_state:
    st.session_state.db = [] 
if 'current_id' not in st.session_state:
    st.session_state.current_id = 0
if 'show_chart' not in st.session_state:
    st.session_state.show_chart = False
if 'temp_preview_data' not in st.session_state:
    st.session_state.temp_preview_data = None

# --- 3. 核心邏輯：日期解析 ---
def parse_date_input(d_str):
    if not d_str: return False, 0, 0, 0, ""
    d = d_str.strip()
    try:
        # 西元 8 碼
        if len(d) == 8:
            return True, int(d[:4]), int(d[4:6]), int(d[6:]), "西元"
        # 民國 7 碼 (1140926)
        elif len(d) == 7:
            return True, int(d[:3]) + 1911, int(d[3:5]), int(d[5:]), "民國"
        # 民國 6 碼 (680926)
        elif len(d) == 6:
            return True, int(d[:2]) + 1911, int(d[2:4]), int(d[4:]), "民國"
        else:
            return False, 0, 0, 0, ""
    except:
        return False, 0, 0, 0, ""

def get_demo_stars(year):
    """模擬星曜"""
    stars = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"]
    return stars[year % 14]

# --- 4. 頂部導覽與搜尋 ---
st.title("🔮 專業紫微斗數排盤")

with st.container(border=True):
    col_search, col_select = st.columns([1, 1.5])
    
    with col_search:
        search_keyword = st.text_input("🔍 全文檢索", placeholder="輸入姓名、年份...")
    
    with col_select:
        options = {0: "➕ 新增空白命盤"}
        for p in st.session_state.db:
            search_text = f"{p['name']}{p['y']}{p['category']}{p.get('ming_star','')}"
            if not search_keyword or (search_keyword in search_text):
                d_y_str = str(p['y']-1911) if p['cal_type']=='民國' else str(p['y'])
                display_text = f"[{p['category']}] {p['name']} ({d_y_str}年)"
                options[p['id']] = display_text
        
        current_idx = 0
        all_keys = list(options.keys())
        if st.session_state.current_id in all_keys:
            current_idx = all_keys.index(st.session_state.current_id)
            
        selected_id = st.selectbox("選擇命主", options=all_keys, format_func=lambda x: options[x], index=current_idx)
        
        if selected_id != st.session_state.current_id:
            st.session_state.current_id = selected_id
            st.session_state.show_chart = False 
            st.session_state.temp_preview_data = None
            st.rerun()

# --- 5. 資料輸入表單 ---
st.subheader("📝 資料輸入")

val_name, val_gender, val_cat, val_date, val_time = "", "女", "", "", ""
is_edit_mode = False

if st.session_state.current_id != 0:
    record = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)
    if record:
        is_edit_mode = True
        val_name = record['name']
        val_gender = record['gender']
        val_cat = record['category']
        if record['cal_type'] == "西元":
            val_date = f"{record['y']:04d}{record['m']:02d}{record['d']:02d}"
        else:
            roc_year = record['y'] - 1911
            val_date = f"{roc_year}{record['m']:02d}{record['d']:02d}"
        val_time = f"{record['h']:02d}{record['min']:02d}"

with st.form("main_form"):
    c1, c2, c3 = st.columns([1.5, 1, 1.5])
    with c1:
        inp_name = st.text_input("姓名 (必填)", value=val_name)
    with c2:
        inp_gender = st.radio("性別", ["男", "女"], index=0 if val_gender=="男" else 1, horizontal=True)
    with c3:
        inp_cat = st.text_input("類別", value=val_cat, placeholder="如：客戶、家人...")

    c4, c5 = st.columns(2)
    with c4:
        inp_date = st.text_input("出生日期", value=val_date, placeholder="如: 1140926 或 19790926", help="輸入民國或西元皆可")
    with c5:
        inp_time = st.text_input("出生時間 (24h)", value=val_time, placeholder="如: 1830", help="HHMM 格式")

    b1, b2 = st.columns(2)
    with b1:
        btn_save = st.form_submit_button("💾 儲存並排盤", type="primary", use_container_width=True)
    with b2:
        btn_calc = st.form_submit_button("🧪 僅試算 (不儲存)", use_container_width=True)

# --- 6. 按鈕邏輯 ---
if btn_save or btn_calc:
    is_valid_date, y, m, d, cal_type = parse_date_input(inp_date)
    h, minute = 0, 0
    is_valid_time = False
    
    if len(inp_time) == 4 and inp_time.isdigit():
        h, minute = int(inp_time[:2]), int(inp_time[2:])
        if 0 <= h <= 23 and 0 <= minute <= 59:
            is_valid_time = True

    has_error = False
    if btn_save and not inp_name:
        st.error("❌ 儲存時「姓名」為必填！")
        has_error = True
    elif not is_valid_date:
        st.error(f"❌ 日期格式錯誤：{inp_date}")
        has_error = True
    elif inp_time and not is_valid_time:
        st.error("❌ 時間格式錯誤")
        has_error = True

    if not has_error:
        ming_star = get_demo_stars(y)
        data_packet = {
            "name": inp_name if inp_name else "試算命主",
            "gender": inp_gender,
            "category": inp_cat,
            "y": y, "m": m, "d": d, "h": h, "min": minute,
            "cal_type": cal_type,
            "ming_star": ming_star
        }

        if btn_save:
            if is_edit_mode:
                data_packet['id'] = st.session_state.current_id
                for i, item in enumerate(st.session_state.db):
                    if item['id'] == st.session_state.current_id:
                        st.session_state.db[i] = data_packet
                        break
                st.toast(f"已更新資料")
            else:
                new_id = int(time.time())
                data_packet['id'] = new_id
                st.session_state.db.append(data_packet)
                st.session_state.current_id = new_id
                st.toast(f"已新增資料")
            
            st.session_state.show_chart = True
            st.session_state.temp_preview_data = None
            time.sleep(0.5)
            st.rerun()
        
        if btn_calc:
            st.session_state.temp_preview_data = data_packet
            st.session_state.show_chart = True

# --- 7. 排盤顯示 (修正 Markdown 縮排問題) ---
if st.session_state.show_chart:
    display_data = None
    if st.session_state.temp_preview_data:
        display_data = st.session_state.temp_preview_data
    elif st.session_state.current_id != 0:
        display_data = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)

    if display_data:
        # 解包變數
        d_name = display_data.get('name', '')
        d_gender = display_data.get('gender', '')
        d_cat = display_data.get('category', '')
        d_y = display_data.get('y', 0)
        d_m = display_data.get('m', 0)
        d_d = display_data.get('d', 0)
        d_h = display_data.get('h', 0)
        d_min = display_data.get('min', 0)
        d_cal = display_data.get('cal_type', '')
        d_star = display_data.get('ming_star', '')

        st.markdown("---")

        # 定義 12 格位置
        # 巳(1,1) 午(1,2) 未(1,3) 申(1,4)
        # 辰(2,1)               酉(2,4)
        # 卯(3,1)               戌(3,4)
        # 寅(4,1) 丑(4,2) 子(4,3) 亥(4,4)
        layout_map = [
            ("巳", 1, 1), ("午", 1, 2), ("未", 1, 3), ("申", 1, 4),
            ("酉", 2, 4), ("戌", 3, 4),
            ("亥", 4, 4), ("子", 4, 3), ("丑", 4, 2), ("寅", 4, 1),
            ("卯", 3, 1), ("辰", 2, 1)
        ]
        
        stars_list = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁"]
        
        # 構建 HTML 字串 (注意：這裡強制移除所有縮排，避免被當成 Code Block)
        cells_html = ""
        for i, (branch, r, c) in enumerate(layout_map):
            star = stars_list[(i + d_y) % 12]
            # 使用單行拼接，這是最安全的方法
            cell_style = f"grid-row: {r}; grid-column: {c};"
            cells_html += f'<div class="zwds-cell" style="{cell_style}">'
            cells_html += f'<div class="cell-stars">{star}</div>'
            cells_html += f'<div class="cell-name">宮位</div>'
            cells_html += f'<div class="cell-label">{branch}</div>'
            cells_html += '</div>'

        # 中間命主資料
        center_html = f'<div class="zwds-center">'
        center_html += f'<h3 style="margin:0; color:#d4a0ff;">{d_name}</h3>'
        center_html += f'<p style="font-size:12px; margin:5px 0; color:#ccc;">{d_gender} | {d_cat}</p>'
        center_html += f'<div style="font-size:16px; color:#4CAF50; margin-top:5px;">{d_cal} {d_y} 年 {d_m} 月 {d_d} 日</div>'
        center_html += f'<div style="font-size:16px; color:#4CAF50;">{d_h:02d} 時 {d_min:02d} 分</div>'
        center_html += f'<hr style="width:80%; border-color:#444; margin:10px 0;">'
        center_html += f'<div style="color:#fff;">命宮主星: {d_star}</div>'
        center_html += '</div>'
        
        # 最終渲染
        final_html = f'<div class="zwds-grid">{cells_html}{center_html}</div>'
        st.markdown(final_html, unsafe_allow_html=True)
