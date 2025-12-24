import streamlit as st
import json
import os
import time
from st_click_detector import click_detector
from style import apply_style
from logic import ZWDSCalculator, parse_date, get_ganzhi_for_year, GAN, ZHI
from renderer import render_full_chart_html

DB_FILE = 'zwds_db.json'

def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            try: return json.load(f)
            except: return []
    return []

def save_db(db_data):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db_data, f, ensure_ascii=False, indent=4)

st.set_page_config(page_title="紫微排盤", page_icon="🔮", layout="wide")
apply_style()

if 'db' not in st.session_state: st.session_state.db = load_db()
if 'current_id' not in st.session_state: st.session_state.current_id = 0
if 'sel_daxian_idx' not in st.session_state: st.session_state.sel_daxian_idx = -1 
if 'sel_liunian_offset' not in st.session_state: st.session_state.sel_liunian_offset = -1 
if 'focus_palace_idx' not in st.session_state: st.session_state.focus_palace_idx = -1

with st.sidebar:
    st.header("功能選單")
    opts = {0: "➕ 新增命盤"}
    for p in st.session_state.db: opts[p['id']] = f"{p['name']} ({p['gender']})"
    
    current_idx = 0
    if st.session_state.current_id in opts:
        current_idx = list(opts.keys()).index(st.session_state.current_id)
        
    selected_id = st.selectbox("選擇命主", options=list(opts.keys()), format_func=lambda x: opts[x], index=current_idx)

    if selected_id != st.session_state.current_id:
        st.session_state.current_id = selected_id
        st.session_state.sel_daxian_idx = -1
        st.session_state.sel_liunian_offset = -1
        st.session_state.focus_palace_idx = -1
        st.rerun()

    rec = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)
    with st.expander("📝 編輯資料", expanded=(st.session_state.current_id == 0)):
        with st.form("edit_form"):
            name = st.text_input("姓名", value=rec['name'] if rec else "")
            gender = st.radio("性別", ["男", "女"], index=0 if rec and rec['gender']=='男' else 1, horizontal=True)
            d_val = f"{rec['y']:04}{rec['m']:02}{rec['d']:02}" if rec else ""
            t_val = f"{rec['h']:02}{rec['min']:02}" if rec else ""
            date_str = st.text_input("日期 (YYYYMMDD)", value=d_val)
            time_str = st.text_input("時間 (HHMM)", value=t_val)
            if st.form_submit_button("💾 儲存"):
                try:
                    y, m, d, _ = parse_date(date_str)
                    h, mn = (int(time_str[:2]), int(time_str[2:])) if len(time_str)==4 else (0,0)
                    if name and y > 0:
                        calc = ZWDSCalculator(y, m, d, h, mn, gender)
                        p_data, m_star, bur, _, ming_pos = calc.get_result()
                        new_rec = {
                            "id": int(time.time()) if st.session_state.current_id==0 else st.session_state.current_id,
                            "name": name, "gender": gender, "category": "",
                            "y": y, "m": m, "d": d, "h": h, "min": mn,
                            "ming_star": m_star, "bureau": bur, "ming_pos": ming_pos
                        }
                        if st.session_state.current_id == 0:
                            st.session_state.db.append(new_rec)
                        else:
                            idx = next(i for i, x in enumerate(st.session_state.db) if x['id'] == st.session_state.current_id)
                            st.session_state.db[idx] = new_rec
                        save_db(st.session_state.db)
                        st.session_state.current_id = new_rec['id']
                        st.rerun()
                except: st.error("輸入錯誤")

if st.session_state.current_id != 0:
    data = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)
    if data:
        calc = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        
        # 產生一體化 HTML
        html_content = render_full_chart_html(
            calc, data, 
            st.session_state.sel_daxian_idx, 
            st.session_state.sel_liunian_offset, 
            st.session_state.focus_palace_idx
        )
        
        # 使用 click_detector
        clicked = click_detector(html_content, key="chart_interaction")
        
        if clicked:
            parts = clicked.split("_")
            type_code, idx = parts[0], int(parts[1])
            
            if type_code == "p": # 宮位
                st.session_state.focus_palace_idx = -1 if st.session_state.focus_palace_idx == idx else idx
                st.rerun()
            elif type_code == "d": # 大限
                st.session_state.sel_daxian_idx = -1 if st.session_state.sel_daxian_idx == idx else idx
                st.session_state.sel_liunian_offset = -1
                st.rerun()
            elif type_code == "l": # 流年
                st.session_state.sel_liunian_offset = -1 if st.session_state.sel_liunian_offset == idx else idx
                st.rerun()
else:
    st.info("👈 請從左側選單「新增命盤」開始。")
