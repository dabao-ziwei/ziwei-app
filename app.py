import streamlit as st
import time

# --- 1. 頁面設定與 CSS 樣式 ---
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="centered")

st.markdown("""
<style>
    /* 隱藏 Streamlit 預設選單以獲得更像 App 的體驗 */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* 命盤網格容器 (4x4) */
    .zwds-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-template-rows: 120px 120px 120px 120px;
        gap: 2px;
        background-color: #555;
        border: 2px solid #777;
        margin-top: 20px;
        border-radius: 8px;
        overflow: hidden;
    }
    /* 12宮位格子 */
    .zwds-cell {
        background-color: #1a1a1a;
        padding: 5px;
        position: relative;
        font-size: 13px;
        color: #eee;
        display: flex;
        flex-direction: column;
    }
    /* 中間命主資料區 (跨越中間 2x2 區域) */
    .zwds-center {
        grid-column: 2 / 4;
        grid-row: 2 / 4;
        background-color: #0E1117;
        display: flex;
        flex-direction: column;
        justify_content: center;
        align-items: center;
        text-align: center;
        border: 1px solid #333;
        padding: 10px;
    }
    /* 地支標籤 (右下角) */
    .cell-label {
        position: absolute;
        bottom: 2px;
        right: 5px;
        color: #666;
        font-size: 14px;
        font-weight: bold;
    }
    /* 星曜文字 */
    .cell-stars {
        color: #d4a0ff;
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 2px;
    }
    /* 錯誤訊息樣式 */
    .stAlert { margin-top: 10px; }
</style>
""", unsafe_allow_html=True)

# --- 2. 初始化資料庫與狀態 ---
if 'db' not in st.session_state:
    st.session_state.db = [] 
if 'current_id' not in st.session_state:
    st.session_state.current_id = 0
if 'show_chart' not in st.session_state:
    st.session_state.show_chart = False
# 用來暫存「僅試算」的資料，避免 NameError
if 'temp_preview_data' not in st.session_state:
    st.session_state.temp_preview_data = None

# --- 3. 核心邏輯：日期解析 (修正 7 碼問題) ---
def parse_date_input(d_str):
    """解析使用者輸入的日期字串"""
    if not d_str: return False, 0, 0, 0, ""
    d = d_str.strip()
    try:
        # 情況 A: 西元 8 碼 (19790926)
        if len(d) == 8:
            return True, int(d[:4]), int(d[4:6]), int(d[6:]), "西元"
        # 情況 B: 民國 7 碼 (1140926 -> 民國114年)
        elif len(d) == 7:
            return True, int(d[:3]) + 1911, int(d[3:5]), int(d[5:]), "民國"
        # 情況 C: 民國 6 碼 (680926 -> 民國68年)
        elif len(d) == 6:
            return True, int(d[:2]) + 1911, int(d[2:4]), int(d[4:]), "民國"
        else:
            return False, 0, 0, 0, ""
    except:
        return False, 0, 0, 0, ""

def get_demo_stars(year):
    """模擬星曜 (僅供顯示測試)"""
    stars = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"]
    return stars[year % 14]

# --- 4. 頂部導覽與搜尋 ---
st.title("🔮 專業紫微斗數排盤")

with st.container(border=True):
    col_search, col_select = st.columns([1, 1.5])
    
    with col_search:
        search_keyword = st.text_input("🔍 全文檢索", placeholder="輸入姓名、年份...")
    
    with col_select:
        # 建立選單
        options = {0: "➕ 新增空白命盤"}
        for p in st.session_state.db:
            search_text = f"{p['name']}{p['y']}{p['category']}"
            if not search_keyword or (search_keyword in search_text):
                display_text = f"[{p['category']}] {p['name']} ({p['y']-1911 if p['cal_type']=='民國' else p['y']})"
                options[p['id']] = display_text
        
        # 保持選單狀態
        current_idx = 0
        all_keys = list(options.keys())
        if st.session_state.current_id in all_keys:
            current_idx = all_keys.index(st.session_state.current_id)
            
        selected_id = st.selectbox("選擇命主", options=all_keys, format_func=lambda x: options[x], index=current_idx)
        
        if selected_id != st.session_state.current_id:
            st.session_state.current_id = selected_id
            st.session_state.show_chart = False # 切換人時先隱藏舊盤
            st.session_state.temp_preview_data = None # 清除試算暫存
            st.rerun()

# --- 5. 資料輸入表單 ---
st.subheader("📝 資料輸入")

# 準備表單預設值
if st.session_state.current_id == 0:
    val_name, val_gender, val_cat, val_date, val_time = "", "女", "", "", ""
    is_edit_mode = False
else:
    # 從 DB 抓取
    record = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)
    if record:
        is_edit_mode = True
        val_name = record['name']
        val_gender = record['gender']
        val_cat = record['category']
        # 還原日期顯示
        if record['cal_type'] == "西元":
            val_date = f"{record['y']:04d}{record['m']:02d}{record['d']:02d}"
        else:
            # 判斷是 3 位數還是 2 位數民國年
            roc_year = record['y'] - 1911
            val_date = f"{roc_year}{record['m']:02d}{record['d']:02d}"
        val_time = f"{record['h']:02d}{record['min']:02d}"
    else:
        val_name, val_gender, val_cat, val_date, val_time = "", "女", "", "", ""
        is_edit_mode = False

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
        inp_date = st.text_input("出生日期", value=val_date, placeholder="如: 1140926 或 680926", help="輸入民國或西元皆可")
    with c5:
        inp_time = st.text_input("出生時間 (24h)", value=val_time, placeholder="如: 1830", help="HHMM 格式")

    b1, b2 = st.columns(2)
    with b1:
        btn_save = st.form_submit_button("💾 儲存並排盤", type="primary", use_container_width=True)
    with b2:
        btn_calc = st.form_submit_button("🧪 僅試算 (不儲存)", use_container_width=True)

# --- 6. 處理按鈕動作 ---
if btn_save or btn_calc:
    # 驗證
    is_valid_date, y, m, d, cal_type = parse_date_input(inp_date)
    
    h, minute = 0, 0
    is_valid_time = False
    if len(inp_time) == 4 and inp_time.isdigit():
        h, minute = int(inp_time[:2]), int(inp_time[2:])
        if 0 <= h <= 23 and 0 <= minute <= 59:
            is_valid_time = True

    # 錯誤檢查
    has_error = False
    if btn_save and not inp_name:
        st.error("❌ 儲存時「姓名」為必填！")
        has_error = True
    elif not is_valid_date:
        st.error(f"❌ 日期格式無法識別：{inp_date}。請輸入如 1140926 (民國114年) 或 19790926。")
        has_error = True
    elif inp_time and not is_valid_time:
        st.error("❌ 時間格式錯誤，請輸入 4 碼數字，例如 1830。")
        has_error = True

    if not has_error:
        # 資料準備
        ming_star = get_demo_stars(y)
        data_packet = {
            "name": inp_name if inp_name else "未命名",
            "gender": inp_gender,
            "category": inp_cat,
            "y": y, "m": m, "d": d, "h": h, "min": minute,
            "cal_type": cal_type,
            "ming_star": ming_star
        }

        if btn_save:
            # 儲存邏輯
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
            st.session_state.temp_preview_data = None # 已存檔，清空試算暫存
            time.sleep(0.5)
            st.rerun()
        
        if btn_calc:
            # 試算邏輯：不存 DB，存在 temp 裡
            st.session_state.temp_preview_data = data_packet
            st.session_state.show_chart = True
            st.warning("⚠️ 這是試算模式，資料尚未儲存。")

# --- 7. 排盤顯示 (修正 NameError) ---
if st.session_state.show_chart:
    # 決定要顯示的資料來源
    display_data = None
    
    # 優先檢查是否有「試算暫存」
    if st.session_state.temp_preview_data:
        display_data = st.session_state.temp_preview_data
    # 否則從 DB 抓當前 ID
    elif st.session_state.current_id != 0:
        display_data = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)

    # 開始繪圖
    if display_data:
        # 解包資料，避免 NameError
        d_name = display_data['name']
        d_gender = display_data['gender']
        d_cat = display_data['category']
        d_y = display_data['y']
        d_m = display_data['m']
        d_d = display_data['d']
        d_h = display_data['h']
        d_min = display_data['min']
        d_cal = display_data['cal_type']
        
        st.markdown("---")
        
        # 定義宮位佈局 (對應 Grid)
        # 1-4 (上), 5,8 (右), 9,12 (下), 10,11 (左)
        # CSS Grid 順序: 
        # R1: 巳(1,1) 午(1,2) 未(1,3) 申(1,4)
        # R2: 辰(2,1)               酉(2,4)
        # R3: 卯(3,1)               戌(3,4)
        # R4: 寅(4,1) 丑(4,2) 子(4,3) 亥(4,4)
        
        layout_map = [
            ("巳", 1, 1), ("午", 1, 2), ("未", 1, 3), ("申", 1, 4),
            ("酉", 2, 4), ("戌", 3, 4),
            ("亥", 4, 4), ("子", 4, 3), ("丑", 4, 2), ("寅", 4, 1),
            ("卯", 3, 1), ("辰", 2, 1)
        ]
        
        stars_list = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁"]
        
        html = '<div class="zwds-grid">'
        
        # 繪製 12 宮
        for i, (branch, r, c) in enumerate(layout_map):
            star = stars_list[(i + d_y) % 12] # 假算法
            html += f"""
            <div class="zwds-cell" style="grid-row: {r}; grid-column: {c};">
                <div class="cell-stars">{star}</div>
                <div style="flex-grow:1;"></div>
                <div class="cell-label">{branch}</div>
            </div>
            """
            
        # 繪製中間
        center_html = f"""
        <div class="zwds-center">
            <h3 style="color:#FFF; margin:0;">{d_name}</h3>
            <p style="color:#CCC; font-size:14px; margin:2px;">{d_gender} | {d_cat}</p>
            <div style="margin-top:10px; color:#4CAF50; font-size:16px;">
                {d_cal} {d_y} 年 {d_m} 月 {d_d} 日
            </div>
            <div style="color:#4CAF50; font-size:16px;">
                {d_h:02d} 時 {d_min:02d} 分
            </div>
            <hr style="width:80%; border-color:#444; margin:10px 0;">
            <div style="color:#d4a0ff; font-size:14px;">命宮主星: {display_data.get('ming_star', '')}</div>
        </div>
        """
        html += center_html
        html += "</div>"
        
        st.markdown(html, unsafe_allow_html=True)
