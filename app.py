import streamlit as st
import pandas as pd
from datetime import datetime
import time

# --- 1. 頁面設定 (針對平板優化) ---
st.set_page_config(
    page_title="專業紫微斗數排盤系統",
    page_icon="🔮",
    layout="centered", # 使用 centered 在平板上閱讀體驗通常比 wide 好，較像 App
    initial_sidebar_state="expanded"
)

# --- 2. 模擬資料庫與 Session State 初始化 ---
# 初始化資料庫 (實際應用請連接 SQL 或 JSON)
if 'db' not in st.session_state:
    st.session_state.db = [
        {"id": 1, "name": "陳小美", "gender": "女", "category": "客戶", "cal_type": "民國", "y": 68, "m": 9, "d": 26, "h": 17, "min": 30, "stars": "紫微,七殺"},
        {"id": 2, "name": "王大明", "gender": "男", "category": "學員", "cal_type": "西元", "y": 1985, "m": 1, "d": 1, "h": 9, "min": 0, "stars": "天機,太陰"},
    ]

# 初始化當前編輯狀態
if 'current_profile' not in st.session_state:
    st.session_state.current_profile = None # None 代表新增模式
if 'chart_visible' not in st.session_state:
    st.session_state.chart_visible = False

# --- 3. 側邊欄：命理資料庫 (需求 1, 2, 6) ---
with st.sidebar:
    st.header("📂 命理資料庫") # 修改標題 (需求 1)
    
    # 搜尋引擎 (需求 6)
    search_query = st.text_input("🔍 全文檢索", placeholder="輸入姓名、日期或星曜...")
    
    # 類別篩選 (需求 2)
    # 先抓出所有存在的類別
    all_categories = ["全部"] + list(set([p['category'] for p in st.session_state.db]))
    category_filter = st.selectbox("📂 類別篩選", all_categories)
    
    st.divider()

    # 執行搜尋邏輯
    filtered_data = st.session_state.db
    
    # 1. 類別過濾
    if category_filter != "全部":
        filtered_data = [p for p in filtered_data if p['category'] == category_filter]
    
    # 2. 關鍵字搜尋 (包含姓名、日期字串、星曜)
    if search_query:
        query = search_query.lower()
        results = []
        for p in filtered_data:
            # 組合一個大字串來搜
            full_text = f"{p['name']}{p['y']}/{p['m']}/{p['d']}{p['stars']}".lower()
            if query in full_text:
                results.append(p)
        filtered_data = results

    # 顯示列表供選擇
    # 使用 Radio Button 讓使用者選擇 (包含一個「新增」選項)
    options = ["➕ 新增命盤"] + [f"{p['name']} ({p['category']})" for p in filtered_data]
    
    # 這裡使用 index 來控制預設選取，若有在 session_state 紀錄則維持
    selected_option = st.radio("請選擇個案：", options)

# --- 4. 資料載入邏輯 ---
# 當使用者在側邊欄切換選擇時，更新 Session State 中的輸入值
if selected_option == "➕ 新增命盤":
    if st.session_state.current_profile is not None:
        st.session_state.current_profile = None
        st.session_state.chart_visible = False
        st.rerun()
else:
    # 從選項文字反查 ID (這裡簡單處理，實際可用 ID 對應)
    name_selected = selected_option.split(" (")[0]
    profile = next((p for p in filtered_data if p['name'] == name_selected), None)
    
    if profile and st.session_state.current_profile != profile:
        st.session_state.current_profile = profile
        st.session_state.chart_visible = False # 切換人名時先隱藏舊盤
        st.rerun()

# 設定表單預設值
if st.session_state.current_profile:
    p = st.session_state.current_profile
    def_name, def_gender, def_cat = p['name'], p['gender'], p['category']
    def_cal, def_y, def_m, def_d = p['cal_type'], p['y'], p['m'], p['d']
    def_h, def_min = p['h'], p['min']
    is_edit_mode = True
else:
    def_name, def_gender, def_cat = "", "女", "客戶"
    def_cal, def_y, def_m, def_d = "民國", 68, 9, 26
    def_h, def_min = 17, 30
    is_edit_mode = False

# --- 5. 主畫面：一頁式操作 (需求 7) ---
st.title("🔮 專業紫微斗數排盤系統 (v0.3.3)")

# 使用 st.form 解決「按 Enter」問題 (需求 3)
with st.form(key='profile_form'):
    st.subheader("📝 命主資料輸入")
    
    # 第一列：基本資料
    c1, c2, c3 = st.columns([2, 1, 1.5])
    with c1:
        name = st.text_input("姓名", value=def_name)
    with c2:
        gender = st.radio("性別", ["男", "女"], index=0 if def_gender=="男" else 1, horizontal=True)
    with c3:
        # 這裡示範可編輯的下拉選單
        category = st.selectbox("類別", ["客戶", "學員", "親友", "名人"], index=["客戶", "學員", "親友", "名人"].index(def_cat) if def_cat in ["客戶", "學員", "親友", "名人"] else 0)

    # 第二列：日期 (需求 5：日期先)
    st.markdown("---")
    st.caption("出生日期")
    d1, d2, d3, d4 = st.columns([1, 1, 1, 1])
    with d1:
        cal_type = st.radio("曆法", ["西元", "民國"], index=0 if def_cal=="西元" else 1, horizontal=True)
    with d2:
        year = st.number_input("年", min_value=1, value=def_y)
    with d3:
        month = st.number_input("月", min_value=1, max_value=12, value=def_m)
    with d4:
        day = st.number_input("日", min_value=1, max_value=31, value=def_d)

    # 第三列：時間 (需求 5：時間後)
    st.caption("出生時間")
    t1, t2 = st.columns(2)
    with t1:
        hour = st.number_input("時 (0-23)", min_value=0, max_value=23, value=def_h)
    with t2:
        minute = st.number_input("分 (0-59)", min_value=0, max_value=59, value=def_min)

    # 按鈕區 (需求 4：儲存與排盤分開)
    st.markdown("---")
    b1, b2 = st.columns(2)
    with b1:
        # submit_button 會觸發整個 form 的提交
        save_btn = st.form_submit_button("💾 儲存資料", type="primary", use_container_width=True)
    with b2:
        chart_btn = st.form_submit_button("🔮 僅排盤 (不儲存)", use_container_width=True)

# --- 6. 邏輯處理區 ---

# 整理當前表單數據
current_input_data = {
    "name": name, "gender": gender, "category": category,
    "cal_type": cal_type, "y": year, "m": month, "d": day,
    "h": hour, "min": minute, "stars": "" # 這裡假設排盤後才會有星星資料
}

# 判斷是儲存還是排盤
if save_btn:
    # 執行儲存邏輯
    if is_edit_mode:
        # 更新舊資料
        p_index = st.session_state.db.index(st.session_state.current_profile)
        current_input_data['id'] = st.session_state.current_profile['id'] # 保持 ID
        st.session_state.db[p_index] = current_input_data
        st.session_state.current_profile = current_input_data
        st.success(f"✅ 已更新 {name} 的資料！")
    else:
        # 新增資料
        new_id = len(st.session_state.db) + 1
        current_input_data['id'] = new_id
        st.session_state.db.append(current_input_data)
        st.session_state.current_profile = current_input_data
        st.success(f"✅ 已新增 {name} 到資料庫！")
    
    # 儲存後通常順便排盤
    st.session_state.chart_visible = True

if chart_btn:
    # 需求 4：如果資料有變更，提醒使用者
    if is_edit_mode:
        # 簡單的比對邏輯 (比對當前輸入 vs 原始載入資料)
        # 為了比對方便，這裡忽略 stars 欄位
        original = {k:v for k,v in st.session_state.current_profile.items() if k != 'stars'}
        current = {k:v for k,v in current_input_data.items() if k != 'stars'}
        # 補上 ID 才能比對
        current['id'] = original['id'] 
        
        if original != current:
            st.warning("⚠️ 注意：您修改了資料但尚未儲存，以下顯示的是根據修改後數據的預覽。")
    
    st.session_state.chart_visible = True

# --- 7. 排盤結果顯示區 ---
if st.session_state.chart_visible:
    st.markdown("---")
    st.subheader(f"🌠 {name} 的命盤")
    
    # 這裡放您的排盤繪圖邏輯
    # 範例顯示
    st.info(f"【命造資訊】{cal_type} {year} 年 {month} 月 {day} 日 {hour}:{minute} 生")
    
    # 模擬顯示命盤結構 (Grid Layout)
    grid = st.columns(4)
    for i in range(12):
        with grid[i%4]:
            st.container(border=True).write(f"宮位 {i+1}\n\n主星: ...")
