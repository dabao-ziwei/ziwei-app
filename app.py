import streamlit as st
import json
import os
import time
from style import apply_style
from logic import ZWDSCalculator, parse_date, get_ganzhi_for_year, GAN, ZHI
from renderer import get_palace_html, get_center_html, render_triangles_svg, PALACE_NAMES

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

# === Sidebar ===
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
            cat = st.text_input("分類", value=rec.get('category', '') if rec else "")
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
                            "name": name, "gender": gender, "category": cat,
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

# === Main Chart ===
if st.session_state.current_id != 0:
    data = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)
    if data:
        calc = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        limits = sorted(calc.palaces.items(), key=lambda x: x[1]['age_start'])
        
        d_idx = st.session_state.sel_daxian_idx
        l_off = st.session_state.sel_liunian_offset
        is_pure = (d_idx == -1)
        
        d_pos = int(limits[d_idx][0]) if not is_pure else -1
        l_pos = -1
        
        if not is_pure:
            d_gan = limits[d_idx][1]['gan_idx']
            if l_off != -1:
                cy = data['y'] + limits[d_idx][1]['age_start'] + l_off - 1
                l_gan, l_zhi = get_ganzhi_for_year(cy)
                calc.calculate_sihua(d_gan, l_gan)
                for pid, p in calc.palaces.items():
                    if p['zhi_idx'] == l_zhi: l_pos = int(pid)
            else: calc.calculate_sihua(d_gan, -1)
        else: calc.calculate_sihua(-1, -1)

        c_tool, _ = st.columns([2, 5])
        with c_tool:
            f_opts = [(-1, "隱藏連線")] + [((calc.ming_pos - i)%12, PALACE_NAMES[i]) for i in range(12)]
            f_idx = st.selectbox("三方四正", options=[x[0] for x in f_opts], format_func=lambda x: next(n for i,n in f_opts if i==x), label_visibility="collapsed")
            if f_idx != st.session_state.focus_palace_idx:
                st.session_state.focus_palace_idx = f_idx
                st.rerun()

        grid_html = ""
        layout = [(5,"巳",1,1),(6,"午",1,2),(7,"未",1,3),(8,"申",1,4),(4,"辰",2,1),(9,"酉",2,4),(3,"卯",3,1),(10,"戌",3,4),(2,"寅",4,1),(1,"丑",4,2),(0,"子",4,3),(11,"亥",4,4)]
        for idx, branch, r, c in layout:
            grid_html += get_palace_html(idx, branch, r, c, calc.palaces[idx], d_pos, l_pos, calc.ming_pos, is_pure, calc.shen_pos, st.session_state.focus_palace_idx)
        
        svg = render_triangles_svg(st.session_state.focus_palace_idx)
        final_chart = f'<div class="chart-wrapper">{svg}<div class="zwds-grid">{grid_html}{get_center_html(data, calc)}</div></div>'.replace('\n', '')
        
        # 1. 命盤
        st.markdown(final_chart, unsafe_allow_html=True)

        # 2. 緩衝區 (物理防撞)
        st.write("") 

        # 3. 大限按鈕
        st.markdown('<div class="timeline-bar">', unsafe_allow_html=True)
        cols = st.columns(12)
        lnames = ["一限", "二限", "三限", "四限", "五限", "六限", "七限", "八限", "九限", "十限", "十一", "十二"]
        
        for i, col in enumerate(cols):
            info = limits[i][1]
            txt = f"{lnames[i]}\n{GAN[info['gan_idx']]}{ZHI[info['zhi_idx']]}"
            if col.button(txt, key=f"d_{i}", type="primary" if i==d_idx else "secondary", use_container_width=True):
                st.session_state.sel_daxian_idx = -1 if i==d_idx else i
                st.session_state.sel_liunian_offset = -1
                st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
        
        # 4. 流年按鈕
        if not is_pure:
            st.markdown('<div class="timeline-bar" style="border-top:none;">', unsafe_allow_html=True)
            l_cols = st.columns(10)
            d_start = limits[d_idx][1]['age_start']
            for j, col in enumerate(l_cols):
                age = d_start + j
                yr = data['y'] + age - 1
                gy, zy = get_ganzhi_for_year(yr)
                txt = f"{yr}\n{GAN[gy]}{ZHI[zy]}({age})"
                if col.button(txt, key=f"l_{j}", type="primary" if j==l_off else "secondary", use_container_width=True):
                    st.session_state.sel_liunian_offset = -1 if j==l_off else j
                    st.rerun()
            st.markdown('</div>', unsafe_allow_html=True)
else:
    st.info("👈 請從左側選單「新增命盤」開始。")
