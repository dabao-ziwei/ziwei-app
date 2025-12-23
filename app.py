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

# 追蹤是否要顯示命盤 (關鍵修改：用這個狀態來控制排盤顯示)
if 'show_chart' not in st.session_state:
    st.session_state.show_chart = False

# --- 3. 頂部導覽區 (無側邊欄設計) ---
st.title("🔮 專業紫微斗數排盤系統")

with st.container(border=True):
    c1, c2 = st.columns([1, 2])
    
    # 類別篩選
    all_categories = ["全部"] + list(set([p['category'] for p in st.session_state.db]))
    with c1:
        cat_filter = st.selectbox("📂 篩選類別", all_categories)
    
    # 篩選名單
    filtered_list = st.session_state.db
    if cat_filter != "全部":
        filtered_list = [p for p in filtered_list if p['category'] == cat_filter]
    
    # 製作選單選項
    options = {0: "➕ 新增命盤 (請在此輸入新資料)"}
    for p in filtered_list:
        options[p['id']] = f"{p['name']} ({p['category']}) - {p['y']}/{p['m']}/{p['d']}"
    
    # 選擇命主
    with c2:
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
        
        # 切換命主時的動作
        if selected_id != st.session_state.current_id:
            st.session_state.current_id = selected_id
            st.session_state.show_chart = False # 切換人時先隱藏舊盤，避免混淆
            st.rerun()

# --- 4. 準備表單預設值 ---
if st.session_state.current_id == 0:
    # 新增模式
    p_data = {"name": "", "gender": "女", "category": "客戶", "cal_type": "民國", "y": 70, "m": 1, "d": 1, "h": 0, "min": 0}
    is_edit = False
else:
    # 編輯模式
    p_data = next((item for item in st.session_state.db if item["id"] == st.session_state.current_id), None)
    is_edit = True

# --- 5. 主輸入表單 (防止 Enter 誤觸) ---
st.write("") 
st.subheader("📝 命盤資料設定")

with st.form(key='main_form'):
    # 第一列：基本資料
    c1, c2, c3 = st.columns([2, 1, 1.5])
    with c1:
        name = st.text_input("姓名 (必填)", value=p_data['name'])
    with c2:
        gender = st.radio("性別", ["男", "女"], index=0 if p_data['gender']=="男" else 1, horizontal=True)
    with c3:
        category = st.selectbox("類別", ["客戶", "學員", "親友", "自分"], index=["客戶", "學員", "親友", "自分"].index(p_data['category']) if p_data['category'] in ["客戶", "學員", "親友", "自分"] else 0)

    st.markdown("---")
    
    # 第二列：日期 (上)
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

    # 第三列：時間 (下)
    st.caption("⏰ 出生時間")
    t1, t2 = st.columns(2)
    with t1:
        hour = st.number_input("時 (0-23)", min_value=0, max_value=23, value=p_data['h'])
    with t2:
        minute = st.number_input("分 (0-59)", min_value=0, max_value=59, value=p_data['min'])

    st.markdown("---")
    
    # --- 按鈕區 (關鍵修改：文字與功能更明確) ---
    b1, b2 = st.columns(2)
    with b1:
        # 按鈕 1：這是最常用的，存檔並且直接看結果
        btn_save = st.form_submit_button("💾 儲存並排盤", type="primary", use_container_width=True)
    with b2:
        # 按鈕 2：這是給想嘗試調整時間但不存檔用的
        btn_preview = st.form_submit_button("🧪 僅試算 (不儲存)", use_container_width=True)

# --- 6. 邏輯處理 ---

if btn_save or btn_preview:
    # 必填驗證
    if not name.strip():
        st.error("⚠️ 姓名不能為空！請輸入姓名。")
    else:
        # 整理表單數據
        form_data = {
            "name": name, "gender": gender, "category": category,
            "cal_type": cal_type, "y": year, "m": month, "d": day,
            "h": hour, "min": minute
        }

        # 處理【儲存並排盤】
        if btn_save:
            if is_edit:
                # 更新模式
                form_data['id'] = st.session_state.current_id
                for idx, item in enumerate(st.session_state.db):
                    if item['id'] == st.session_state.current_id:
                        st.session_state.db[idx] = form_data
                        break
                st.toast(f"✅ {name} 資料已更新！", icon="🎉")
            else:
                # 新增模式
                new_id = len(st.session_state.db) + 1 + int(time.time())
                form_data['id'] = new_id
                st.session_state.db.append(form_data)
                st.session_state.current_id = new_id
                st.toast(f"✅ 已新增 {name}！", icon="🎉")
            
            # 關鍵：設定「顯示命盤」為 True，並重新執行以更新選單
            st.session_state.show_chart = True
            time.sleep(0.5) # 稍微停一下讓提示顯示
            st.rerun()

        # 處理【僅試算】
        if btn_preview:
            # 不存入 DB，直接顯示結果
            st.session_state.show_chart = True
            st.warning("⚠️ 這是試算模式，資料尚未儲存。")

# --- 7. 排盤結果顯示區 ---
# 只有當 show_chart 為 True 時才顯示，或是剛剛按了預覽
if st.session_state.show_chart or btn_preview:
    st.markdown("---")
    st.markdown(f"### 🌠 {name} 的命盤")
    
    # 顯示生辰
    st.info(f"【命造】 {gender} | {cal_type} {year} 年 {month} 月 {day} 日 {hour} 時 {minute} 分")
    
    # 模擬排盤顯示 (這裡為了展示用，先用方塊代替)
    grid = st.columns(4)
    stars_demo = ["紫微", "天機", "太陽", "武曲", "天同", "廉貞", "天府", "太陰", "貪狼", "巨門", "天相", "天梁"]
    for i in range(12):
        with grid[i%4]:
            with st.container(border=True):
                st.write(f"**宮位 {i+1}**")
                # 這裡未來會接上您的真實排盤算法
                if i < len(stars_demo):
                    st.caption(f"{stars_demo[i]}")
                else:
                    st.caption("")
                st.write("\n\n\n") # 留點高度
