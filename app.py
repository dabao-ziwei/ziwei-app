import streamlit as st
import time

# --- 1. 頁面設定與 CSS 樣式 (解決命盤顯示問題) ---
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="centered")

# 這裡定義了紫微斗數命盤的「方格佈局」樣式
st.markdown("""
<style>
    /* 命盤網格容器 */
    .zwds-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr; /* 4欄 */
        grid-template-rows: 150px 150px 150px 150px; /* 4列固定高度 */
        gap: 2px;
        background-color: #444; /* 格線顏色 */
        border: 2px solid #666;
        margin-top: 20px;
    }
    /* 12宮位格子 */
    .zwds-cell {
        background-color: #1a1a1a;
        padding: 8px;
        position: relative;
        font-size: 14px;
        color: #fff;
    }
    /* 中間命主資料區 (跨越中間 2x2 區域) */
    .zwds-center {
        grid-column: 2 / 4; /* 橫跨第2到第3欄 */
        grid-row: 2 / 4;    /* 橫跨第2到第3列 */
        background-color: #0E1117;
        display: flex;
        flex-direction: column;
        justify_content: center;
        align-items: center;
        text-align: center;
        border: none;
        padding: 20px;
    }
    /* 地支標籤 (右下角) */
    .cell-label {
        position: absolute;
        bottom: 5px;
        right: 8px;
        color: #888;
        font-size: 16px;
        font-weight: bold;
    }
    /* 星曜文字 */
    .cell-stars {
        color: #d4a0ff;
        font-weight: bold;
        font-size: 16px;
    }
</style>
""", unsafe_allow_html=True)

# --- 2. 初始化全空白資料庫 (解決預設值問題) ---
if 'db' not in st.session_state:
    st.session_state.db = []  # 預設為空清單
if 'current_id' not in st.session_state:
    st.session_state.current_id = 0 # 0 代表新增模式
if 'show_chart' not in st.session_state:
    st.session_state.show_chart = False

# --- 3. 輔助功能：日期解析與模擬排盤 ---
def parse_date_input(d_str):
    """解析使用者輸入的日期字串 (支援西元8碼 與 民國6-7碼)"""
    if not d_str: return False, 0, 0, 0, ""
    d = d_str.strip()
    try:
        if len(d) == 8: # 19790926
            return True, int(d[:4]), int(d[4:6]), int(d[6:]), "西元"
        elif len(d) == 7: # 0680926
            return True, int(d[:3]) + 1911, int(d[3:5]), int(d[5:]), "民國"
        elif len(d) == 6: # 680926
            return True, int(d[:2]) + 1911, int(d[2:4]), int(d[4:]), "民國"
        else:
            return False, 0, 0, 0, ""
    except:
        return False, 0, 0, 0, ""

def get_demo_stars(year):
    """模擬產生命宮主星供搜尋測試用 (實際應接上運算邏輯)"""
    stars = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁", "七殺", "破軍"]
    return stars[year % 14]

# --- 4. 頂部搜尋區 (解決搜尋與選單問題) ---
st.title("🔮 專業紫微斗數排盤")

with st.container(border=True):
    col_search, col_select = st.columns([1, 1.5])
    
    with col_search:
        # 1. 全文檢索框
        search_keyword = st.text_input("🔍 全文檢索", placeholder="輸入姓名、年份、主星...")
    
    with col_select:
        # 2. 篩選邏輯
        options = {0: "➕ 新增空白命盤"} # 預設選項
        
        # 遍歷資料庫建立選項
        for p in st.session_state.db:
            # 建立搜尋字串 (包含姓名、類別、年份、已儲存的主星)
            search_text = f"{p['name']}{p['y']}{p.get('ming_star','')}{p['category']}"
            
            # 如果搜尋框是空的，或者關鍵字有在資料裡，就顯示該選項
            if not search_keyword or (search_keyword in search_text):
                # 顯示格式：[類別] 姓名 (主星)
                display_text = f"[{p['category']}] {p['name']}"
                if 'ming_star' in p:
                    display_text += f" - 命宮: {p['ming_star']}"
                options[p['id']] = display_text
        
        # 處理目前選擇的索引
        current_idx = 0
        all_keys = list(options.keys())
        if st.session_state.current_id in all_keys:
            current_idx = all_keys.index(st.session_state.current_id)
        
        # 下拉選單
        selected_id = st.selectbox("選擇命主", options=all_keys, format_func=lambda x: options[x], index=current_idx)
        
        # 切換觸發
        if selected_id != st.session_state.current_id:
            st.session_state.current_id = selected_id
            st.session_state.show_chart = False
            st.rerun()

# --- 5. 資料輸入區 (解決預設值與輸入框過多問題) ---
st.subheader("📝 資料輸入")

# 準備欄位變數 (若是新增模式則全空)
if st.session_state.current_id == 0:
    val_name = ""
    val_gender = "女"
    val_cat = ""
    val_date = ""
    val_time = ""
    is_edit_mode = False
else:
    # 讀取舊資料
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
            val_date = f"{record['y']-1911:02d}{record['m']:02d}{record['d']:02d}" # 簡易還原民國年
        # 還原時間顯示
        val_time = f"{record['h']:02d}{record['min']:02d}"
    else:
        # 防呆
        val_name, val_gender, val_cat, val_date, val_time = "", "女", "", "", ""
        is_edit_mode = False

with st.form("main_form"):
    c1, c2, c3 = st.columns([1.5, 1, 1.5])
    with c1:
        # 必填姓名，預設為空
        inp_name = st.text_input("姓名 (必填)", value=val_name)
    with c2:
        inp_gender = st.radio("性別", ["男", "女"], index=0 if val_gender=="男" else 1, horizontal=True)
    with c3:
        # 改為純文字輸入，解決類別被覆蓋問題
        inp_cat = st.text_input("類別", value=val_cat, placeholder="如：客戶、家人、朋友...")

    c4, c5 = st.columns(2)
    with c4:
        # 單一日期輸入框
        inp_date = st.text_input("出生日期 (YYYYMMDD 或 YYMMDD)", value=val_date, help="輸入範例：19790926 (西元) 或 680926 (民國)")
    with c5:
        # 單一時間輸入框
        inp_time = st.text_input("出生時間 (HHMM 24小時制)", value=val_time, help="輸入範例：1830 (代表下午六點半)")

    b1, b2 = st.columns(2)
    with b1:
        btn_save = st.form_submit_button("💾 儲存並排盤", type="primary", use_container_width=True)
    with b2:
        btn_calc = st.form_submit_button("🧪 僅試算 (不儲存)", use_container_width=True)

# --- 6. 邏輯處理 (儲存與驗證) ---
if btn_save or btn_calc:
    # 驗證日期
    is_valid_date, y, m, d, cal_type = parse_date_input(inp_date)
    # 驗證時間
    h, minute = 0, 0
    is_valid_time = False
    if len(inp_time) == 4 and inp_time.isdigit():
        h = int(inp_time[:2])
        minute = int(inp_time[2:])
        if 0 <= h <= 23 and 0 <= minute <= 59:
            is_valid_time = True
            
    # 錯誤處理
    if not inp_name and btn_save:
        st.error("❌ 請輸入姓名！")
    elif not is_valid_date:
        st.error("❌ 日期格式錯誤！請輸入 8 碼 (西元) 或 6-7 碼 (民國)，例如 680926")
    elif inp_time and not is_valid_time:
        st.error("❌ 時間格式錯誤！請輸入 4 碼數字，例如 0930")
    else:
        # 資料正確，準備處理
        # 模擬算出主星 (為了讓搜尋功能可以搜到星曜)
        ming_star = get_demo_stars(y)
        
        save_data = {
            "name": inp_name, "gender": inp_gender, "category": inp_cat,
            "y": y, "m": m, "d": d, "h": h, "min": minute,
            "cal_type": cal_type, "ming_star": ming_star
        }

        if btn_save:
            if is_edit_mode:
                # 更新
                save_data['id'] = st.session_state.current_id
                for i, item in enumerate(st.session_state.db):
                    if item['id'] == st.session_state.current_id:
                        st.session_state.db[i] = save_data
                        break
                st.toast(f"已更新 {inp_name} 資料")
            else:
                # 新增
                new_id = int(time.time())
                save_data['id'] = new_id
                st.session_state.db.append(save_data)
                st.session_state.current_id = new_id # 儲存後自動鎖定該筆
                st.toast(f"已新增 {inp_name}")
            
            st.session_state.show_chart = True
            time.sleep(0.5)
            st.rerun() # 刷新頁面更新選單
        
        if btn_calc:
            st.session_state.show_chart = True
            st.warning("⚠️ 僅試算模式 (未存檔)")

# --- 7. 排盤顯示 (解決命盤樣式問題) ---
# 只有在資料存在且有效時顯示
if st.session_state.show_chart and (is_edit_mode or (btn_calc and is_valid_date)):
    # 重新取得顯示用的資料 (若試算則用輸入框的值，若已存則用 DB 值，這邊簡化直接用解析後的變數)
    if not btn_calc: # 如果不是試算，重新解析一次當前 DB 資料確保一致
        # (略過繁瑣代碼，直接使用上方解析結果 y, m, d...)
        pass
        
    st.markdown("---")
    
    # 建立命盤 HTML
    # 定義 12 格順序 (配合 CSS Grid 位置)
    # [巳] [午] [未] [申]  -> Row 1
    # [辰]           [酉]  -> Row 2
    # [卯]           [戌]  -> Row 3
    # [寅] [丑] [子] [亥]  -> Row 4
    
    # Grid 座標定義 (row, col)
    layout_map = [
        ("巳", 1, 1), ("午", 1, 2), ("未", 1, 3), ("申", 1, 4),
        ("酉", 2, 4), ("戌", 3, 4),
        ("亥", 4, 4), ("子", 4, 3), ("丑", 4, 2), ("寅", 4, 1),
        ("卯", 3, 1), ("辰", 2, 1)
    ]
    # 注意：上面順序是依照視覺繞一圈，方便填入星曜
    
    # 模擬星曜列表 (配合上面的地支順序)
    stars_list = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁"]
    
    html_content = '<div class="zwds-grid">'
    
    # 1. 產生周圍 12 宮
    for i, (branch, r, c) in enumerate(layout_map):
        star_name = stars_list[i % 12] # 這裡之後要換成真實演算法
        style_str = f"grid-row: {r}; grid-column: {c};"
        html_content += f"""
        <div class="zwds-cell" style="{style_str}">
            <div class="cell-stars">{star_name}</div>
            <div style="font-size:12px; margin-top:10px; color:#aaa;">(宮位功能)</div>
            <div class="cell-label">{branch}</div>
        </div>
        """
    
    # 2. 產生中間命主資料
    center_html = f"""
    <div class="zwds-center">
        <h2 style="color:#FFF; margin:0;">{inp_name}</h2>
        <p style="color:#CCC; margin:5px 0;">{inp_gender} | {inp_cat}</p>
        <p style="color:#4CAF50; font-size:18px;">{cal_type} {y} 年 {m} 月 {d} 日</p>
        <p style="color:#4CAF50; font-size:18px;">{h:02d} 時 {minute:02d} 分</p>
        <hr style="width:50%; border-color:#555;">
        <p style="color:#d4a0ff;">命宮主星: {get_demo_stars(y)}</p>
    </div>
    """
    html_content += center_html
    html_content += "</div>"
    
    st.markdown(html_content, unsafe_allow_html=True)
