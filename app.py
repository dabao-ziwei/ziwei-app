import streamlit as st
import time
from style import apply_style
from logic import ZWDSCalculator, parse_date, get_ganzhi_for_year, GAN, ZHI
from renderer import get_palace_html, get_center_html

# 1. 套用樣式
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="wide")
apply_style()

# 2. 初始化 Session State
if 'db' not in st.session_state: st.session_state.db = [] 
if 'current_id' not in st.session_state: st.session_state.current_id = 0
if 'show_chart' not in st.session_state: st.session_state.show_chart = False
if 'temp_preview_data' not in st.session_state: st.session_state.temp_preview_data = None
if 'sel_daxian_idx' not in st.session_state: st.session_state.sel_daxian_idx = -1 
if 'sel_liunian_offset' not in st.session_state: st.session_state.sel_liunian_offset = -1 

# 3. 標題與搜尋
st.title("🔮 專業紫微斗數排盤")

with st.container(border=True):
    c1, c2 = st.columns([1, 1.5])
    with c1: search = st.text_input("🔍 搜尋", placeholder="姓名/年份")
    with c2:
        opts = {0: "➕ 新增命盤"}
        for p in st.session_state.db: opts[p['id']] = f"[{p['category']}] {p['name']}"
        curr = st.session_state.current_id if st.session_state.current_id in opts else 0
        sel = st.selectbox("選擇命主", options=list(opts.keys()), format_func=lambda x: opts[x], index=list(opts.keys()).index(curr))
        if sel != st.session_state.current_id:
            st.session_state.current_id = sel; st.session_state.show_chart = False; st.session_state.temp_preview_data = None; 
            st.session_state.sel_daxian_idx = -1; st.session_state.sel_liunian_offset = -1; 
            st.rerun()

# 4. 資料輸入表單
if st.session_state.current_id != 0:
    rec = next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    v_name, v_gen, v_cat = rec['name'], rec['gender'], rec['category']
    v_date = f"{rec['y']:04d}{rec['m']:02d}{rec['d']:02d}" if rec['cal_type']=="西元" else f"{rec['y']-1911}{rec['m']:02d}{rec['d']:02d}"
    v_time = f"{rec['h']:02d}{rec['min']:02d}"
else: v_name, v_gen, v_cat, v_date, v_time = "", "女", "", "", ""

with st.expander("📝 資料輸入 / 修改", expanded=(not st.session_state.show_chart)):
    with st.form("main_form"):
        c1, c2, c3 = st.columns([1.5, 1, 1.5])
        with c1: i_name = st.text_input("姓名", value=v_name)
        with c2: i_gen = st.radio("性別", ["男", "女"], index=0 if v_gen=="男" else 1, horizontal=True)
        with c3: i_cat = st.text_input("分類", value=v_cat)
        c4, c5 = st.columns(2)
        with c4: i_date = st.text_input("出生年月日", value=v_date, help="如 19790926")
        with c5: i_time = st.text_input("出生時間", value=v_time, help="如 1830")
        b1, b2 = st.columns(2)
        with b1: btn_save = st.form_submit_button("💾 儲存並排盤", type="primary", use_container_width=True)
        with b2: btn_calc = st.form_submit_button("🧪 僅試算", use_container_width=True)

if btn_save or btn_calc:
    y, m, d, cal = parse_date(i_date)
    h, mn = int(i_time[:2]) if len(i_time)==4 else 0, int(i_time[2:]) if len(i_time)==4 else 0
    if not i_name or y==0: st.error("資料不完整")
    else:
        calc = ZWDSCalculator(y, m, d, h, mn, i_gen); p_data, m_star, bur, b_yr, ming_pos = calc.get_result()
        pkt = {"name": i_name, "gender": i_gen, "category": i_cat, "y": y, "m": m, "d": d, "h": h, "min": mn, "cal_type": cal, "ming_star": m_star, "bureau": bur, "palace_data": p_data, "ming_pos": ming_pos}
        if btn_save:
            pkt['id'] = int(time.time()) if st.session_state.current_id==0 else st.session_state.current_id
            if st.session_state.current_id==0: st.session_state.db.append(pkt); st.session_state.current_id = pkt['id']
            else: 
                for idx, x in enumerate(st.session_state.db):
                    if x['id']==st.session_state.current_id: st.session_state.db[idx]=pkt
            st.session_state.temp_preview_data = None; st.session_state.show_chart = True
            st.session_state.sel_daxian_idx = -1; st.session_state.sel_liunian_offset = -1;
            st.rerun()
        if btn_calc: 
            st.session_state.temp_preview_data = pkt; st.session_state.show_chart = True
            st.session_state.sel_daxian_idx = -1; st.session_state.sel_liunian_offset = -1;

# 5. 顯示命盤
if st.session_state.show_chart:
    data = st.session_state.temp_preview_data or next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    if data:
        calc_obj = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        
        sorted_limits = sorted(calc_obj.palaces.items(), key=lambda x: x[1]['age_start'])
        daxian_idx = st.session_state.sel_daxian_idx
        liunian_off = st.session_state.sel_liunian_offset
        is_pure_benming = (daxian_idx == -1)

        daxian_pos = -1
        liunian_pos = -1
        
        if not is_pure_benming:
            d_pos_idx, d_info = sorted_limits[daxian_idx]
            daxian_pos = int(d_pos_idx)
            
            if liunian_off != -1:
                curr_year = data['y'] + d_info['age_start'] + liunian_off - 1
                daxian_gan = d_info['gan_idx']
                ln_gan, ln_zhi = get_ganzhi_for_year(curr_year)
                calc_obj.calculate_sihua(daxian_gan, ln_gan)
                
                for pid, info in calc_obj.palaces.items():
                    if info['zhi_idx'] == ln_zhi: liunian_pos = int(pid); break
            else:
                daxian_gan = d_info['gan_idx']
                calc_obj.calculate_sihua(daxian_gan, -1) 
        else:
            calc_obj.calculate_sihua(-1, -1)

        benming_pos = calc_obj.ming_pos
        shen_pos = calc_obj.shen_pos 

        layout = [(5,"巳",1,1),(6,"午",1,2),(7,"未",1,3),(8,"申",1,4),
                  (4,"辰",2,1),                    (9,"酉",2,4),
                  (3,"卯",3,1),                    (10,"戌",3,4),
                  (2,"寅",4,1),(1,"丑",4,2),(0,"子",4,3),(11,"亥",4,4)]
        
        cells_html = ""
        for idx, branch, r, c in layout:
            info = calc_obj.palaces[idx]
            cells_html += get_palace_html(idx, branch, r, c, info, daxian_pos, liunian_pos, benming_pos, is_pure_benming, shen_pos)
            
        center_html = get_center_html(data, calc_obj)
        st.markdown(f'<div class="zwds-grid">{cells_html}{center_html}</div>', unsafe_allow_html=True)
        
        st.markdown("---")
        limit_names = ["一限", "二限", "三限", "四限", "五限", "六限", "七限", "八限", "九限", "十限", "十一", "十二"]
        cols_d = st.columns(12)
        for i, col in enumerate(cols_d):
            pos_idx, info = sorted_limits[i]
            gz = f"{GAN[info['gan_idx']]}{ZHI[info['zhi_idx']]}"
            label = f"{limit_names[i]}\n{gz}"
            is_selected = (i == daxian_idx)
            btn_type = "primary" if is_selected else "secondary"
            
            if col.button(label, key=f"d_{i}", type=btn_type, use_container_width=True):
                if is_selected: 
                    st.session_state.sel_daxian_idx = -1
                    st.session_state.sel_liunian_offset = -1
                else: 
                    st.session_state.sel_daxian_idx = i
                    st.session_state.sel_liunian_offset = -1 
                st.rerun()

        if not is_pure_benming:
            cols_l = st.columns(10)
            d_info = sorted_limits[daxian_idx][1]
            for j, col in enumerate(cols_l):
                age = d_info['age_start'] + j
                yr = calc_obj.birth_year + age - 1
                gy, zy = get_ganzhi_for_year(yr)
                gz = f"{GAN[gy]}{ZHI[zy]}"
                label = f"{yr}\n{gz}({age})"
                is_selected = (j == liunian_off)
                btn_type = "primary" if is_selected else "secondary"
                
                if col.button(label, key=f"l_{j}", type=btn_type, use_container_width=True):
                    if is_selected: 
                        st.session_state.sel_liunian_offset = -1
                    else: 
                        st.session_state.sel_liunian_offset = j
                    st.rerun()
