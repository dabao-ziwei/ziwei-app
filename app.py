import streamlit as st
import pandas as pd
from datetime import datetime
import time

# --- 1. 頁面設定 ---
st.set_page_config(
    page_title="專業紫微斗數排盤系統",
    page_icon="🔮",
    layout="centered" 
)

# --- 2. 資料庫與狀態初始化 ---
if 'db' not in st.session_state:
    st.session_state.db = [
        {"id": 1, "name": "陳小美", "gender": "女", "category": "客戶", "cal_type": "民國", "y": 68, "m": 9, "d": 26, "h": 17, "min": 30},
        {"id": 2, "name": "王大明", "gender": "男", "category": "學員", "cal_type": "西元", "y": 1985, "m": 1, "d": 1, "h": 9, "min": 0},
    ]

# 追蹤當前選擇的命盤 ID (預設為 0 代表新增)
if 'current_id' not in st.session_state:
    st.session_state.current_id = 0 

# --- 3. 頂部導覽區 (取代側邊欄) ---
st.title("🔮 專業紫微斗數排盤系統")

# 使用容器將搜尋區塊包起來
with st.container(border=True):
    c1, c2 = st.columns([1, 2])
    
    # 3-1. 類別篩選
    all_categories = ["全部"] + list(set([p['category'] for p in st.session_state.db]))
    with c1:
        cat_filter = st.selectbox("📂 篩選類別", all_categories)
    
    # 3-2. 建立選單列表
    # 過濾資料
    filtered_list = st.session_state.db
    if cat_filter != "全部":
        filtered_list = [p for p in filtered_list if p['category'] == cat_filter]
    
    # 製作下拉選單選項：(ID, 顯示文字)
    # 格式：0: ➕ 新增命盤, 1: 陳小美..., 2: 王大明...
    options = {0: "➕ 新增命盤 (請在此輸入新資料)"}
    for p in filtered_list:
        options[p['id']] = f"{p['name']} ({p['category']}) - {p['y']}/{p['m']}/{p['d']}"
    
    # 讓使用者選擇 (根據 options 的 key 來選，顯示 value)
    with c2:
        # 找出當前 session_state.current_id 是否還在選項中 (避免篩選後消失)
        current_index = 0
        current_keys = list(options.keys())
        if st.session_state.current_id in current_keys:
            current_index = current_keys.index(st.session_state.current_id)
            
        selected_id = st.selectbox(
            "👤 選擇命主 / 新增", 
            options=current_keys, 
            format_func=lambda x: options[x],
            index=current_index
        )
        
        # 如果使用者改變了選擇，更新 session_state
        if selected_id != st.session_state.current_id:
            st.session_state.current_id = selected_id
            st.rerun() # 立即刷新載入資料

# --- 4. 準備表單預設值 ---
# 根據 selected_id 抓取資料
if st.session_state.current_id == 0:
    # 新增模式：給預設空值
    p_data = {"name": "", "gender": "女", "category": "客戶", "cal_type": "民國", "y": 70, "m": 1, "d": 1, "h": 0, "min": 0}
    is_edit = False
else:
    # 編輯模式：抓出該 ID 的資料
    p_data = next((item for item in st.session_state.db if item["id"] == st.session_state.current_id), None)
    is_edit = True

# --- 5. 主輸入表單 ---
# 使用 st.form 避免輸入一格就重整
st.write("") # 間距
st.subheader("📝 命盤資料設定")

with st.form(key='main_form'):
    # 第一列：基本資料
    c1, c2, c3 = st.columns([2, 1, 1.5])
    with c1:
        # 注意：这里的提示文字 "Press Enter..." 是 Streamlit 內建的，無法完全隱藏，
        # 但我們透過下面的程式邏輯防止它誤存。
        name = st.text_input("姓名 (必填)", value=p_data['name'])
    with c2:
        gender = st.radio("性別", ["男", "女"], index=0 if p_data['gender']=="男" else 1, horizontal=True)
    with c3:
        # 這裡可以手動輸入新類別，也可以選舊的
        category = st.selectbox("類別", ["客戶", "學員", "親友", "自分"], index=["客戶", "學員", "親友", "自分"].index(p_data['category']) if p_data['category'] in ["客戶", "學員", "親友", "自分"] else 0)

    st.markdown("---")
    
    # 第二列：日期 (日期在上)
    st.caption("📅 出生日期")
    d1, d2, d3, d4 = st.columns([1, 1.2, 1.2, 1.2])
    with d1:
        cal_type = st.radio("曆法", ["西元", "民國"], index=0 if p_data['cal_type']=="西元" else 1)
    with d2:
        year = st.number_input("年", min_value=1, value=p_data['y'])
    with d3:
        month = st.number_input("月", min_value=1, max_value=12, value=p_data['m'])
    with d4:
        day = st.number_input("日", min_value=1, max_value=31, value=p_data['d'])

    # 第三列：時間 (時間在下)
    st.caption("⏰ 出生時間")
    t1, t2 = st.columns(2)
    with t1:
        hour = st.number_input("時 (0-23)", min_value=0, max_value=23, value=p_data['h'])
    with t2:
        minute = st.number_input("分 (0-59)", min_value=0, max_value=59, value=p_data['min'])

    st.markdown("---")
    
    # 按鈕區 (分開儲存與排盤)
    b1, b2 = st.columns(2)
    with b1:
        btn_save = st.form_submit_button("💾 儲存資料", type="primary", use_container_width=True)
    with b2:
        btn_chart = st.form_submit_button("🔮 僅排盤 (暫不儲存)", use_container_width=True)

# --- 6. 邏輯處理與驗證 ---

if btn_save or btn_chart:
    # 0. 必填驗證 (防止按 Enter 產生空資料)
    if not name.strip():
        st.error("⚠️ 姓名不能為空！請輸入姓名後再試。")
    else:
        # 準備資料物件
        form_data = {
            "name": name, "gender": gender, "category": category,
            "cal_type": cal_type, "y": year, "m": month, "d": day,
            "h": hour, "min": minute
        }

        # 邏輯 A: 按下儲存
        if btn_save:
            if is_edit:
                # 更新舊資料
                form_data['id'] = st.session_state.current_id
                # 找到原本在 list 中的位置並更新
                for idx, item in enumerate(st.session_state.db):
                    if item['id'] == st.session_state.current_id:
                        st.session_state.db[idx] = form_data
                        break
                st.success(f"✅ {name} 資料已更新！")
            else:
                # 新增資料
                new_id = len(st.session_state.db) + 1 + int(time.time()) # 簡單產生唯一 ID
                form_data['id'] = new_id
                st.session_state.db.append(form_data)
                st.session_state.current_id = new_id # 儲存後自動切換到這個人
                st.success(f"✅ 已新增 {name} 到資料庫！")
                time.sleep(1) # 稍等一下讓使用者看到成功訊息
                st.rerun()

        # 邏輯 B: 排盤 (無論是只排盤還是儲存後都要顯示)
        st.markdown("### 🌠 排盤結果")
        st.info(f"正在為 **{name}** 排盤... \n\n {cal_type} {year} 年 {month} 月 {day} 日 {hour} 時 {minute} 分")
        
        # --- 這裡放您的排盤核心程式碼 (ZWDS_Calculator) ---
        # 範例顯示區塊
        grid = st.columns(4)
        for i in range(12):
            with grid[i%4]:
                st.container(border=True).write(f"【宮位 {i+1}】\n\n(星曜顯示區)")
