import streamlit as st
import time
import json
import os
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

st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="wide")
apply_style()

# 初始化 Session State
if 'db' not in st.session_state: st.session_state.db = load_db()
if 'current_id' not in st.session_state: st.session_state.current_id = 0
if 'page' not in st.session_state: st.session_state.page = 'list'
if 'sel_daxian_idx' not in st.session_state: st.session_state.sel_daxian_idx = -1 
if 'sel_liunian_offset' not in st.session_state: st.session_state.sel_liunian_offset = -1 
if 'focus_palace_idx' not in st.session_state: st.session_state.focus_palace_idx = -1
if 'temp_preview_data' not in st.session_state: st.session_state.temp_preview_data = None

# ==========================================
# 頁面 1: 客戶列表
# ==========================================
if st.session_state.page == 'list':
    st.title("📂 客戶資料庫")
    c1, c2 = st.columns([3, 1])
    with c1: search_kw = st.text_input("🔍 搜尋客戶", placeholder="姓名/分類...")
    with c2:
        if st.button("➕ 新增命盤", use_container_width=True):
            st.session_state.current_id = 0
            st.session_state.temp_preview_data = None
            st.session_state.page = 'chart'
            st.session_state.sel_daxian_idx = -1
            st.session_state.sel_liunian_offset = -1
            st.rerun()

    categories = {}
    sorted_db = sorted(st.session_state.db, key=lambda x: x.get('category', '未分類'))
    for rec in sorted_db:
        cat = rec.get('category', '未分類')
        if not cat: cat = '未分類'
        if cat not in categories: categories[cat] = []
        if search_kw:
            if search_kw in rec['name'] or search_kw in cat: categories[cat].append(rec)
        else: categories[cat].append(rec)

    if not st.session_state.db: st.info("尚無資料")
    
    for cat, items in categories.items():
        if items:
            with st.expander(f"📁 {cat} ({len(items)})", expanded=True):
                for item in items:
                    col_info, col_btn = st.columns([4, 1])
                    with col_info: st.markdown(f"**{item['name']}** <span style='color:#666;font-size:12px'>({item['gender']} | {item['y']}/{item['m']}/{item['d']})</span>", unsafe_allow_html=True)
                    with col_btn:
                        if st.button("開啟", key=f"open_{item['id']}", use_container_width=True):
                            st.session_state.current_id = item['id']
                            st.session_state.temp_preview_data = None
                            st.session_state.page = 'chart'
                            st.session_state.sel_daxian_idx = -1
                            st.session_state.sel_liunian_offset = -1
                            st.rerun()

# ==========================================
# 頁面 2: 命盤
# ==========================================
elif st.session_state.page == 'chart':
    nav_c1, nav_c2 = st.columns([1, 6])
    with nav_c1:
        if st.button("⬅ 回列表", use_container_width=True): st.session_state.page = 'list'; st.rerun()
    
    # 決定資料來源：已儲存資料 或 新增模式
    rec = None
    if st.session_state.current_id != 0:
        rec = next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    
    v_name = rec['name'] if rec else ""
    v_gen = rec['gender'] if rec else "女"
    v_cat = rec['category'] if rec else ""
    v_date = f"{rec['y']:04d}{rec['m']:02d}{rec['d']:02d}" if rec else ""
    v_time = f"{rec['h']:02d}{rec['min']:02d}" if rec else ""

    with st.expander("📝 資料輸入 / 修改", expanded=(st.session_state.current_id == 0)):
        with st.form("main_form"):
            c1, c2, c3 = st.columns([1.5, 1, 1.5])
            with c1: i_name = st.text_input("姓名", value=v_name)
            with c2: i_gen = st.radio("性別", ["男", "女"], index=0 if v_gen=="男" else 1, horizontal=True)
            with c3: i_cat = st.text_input("分類", value=v_cat)
            c4, c5 = st.columns(2)
            with c4: i_date = st.text_input("出生年月日", value=v_date, help="19790926")
            with c5: i_time = st.text_input("出生時間", value=v_time, help="1830")
            b1, b2 = st.columns(2)
            with b1: btn_save = st.form_submit_button("💾 儲存", type="primary", use_container_width=True)
            with b2: btn_calc = st.form_submit_button("🧪 試算", use_container_width=True)

    if btn_save or btn_calc:
        y, m, d, cal = parse_date(i_date)
        h, mn = int(i_time[:2]) if len(i_time)==4 else 0, int(i_time[2:]) if len(i_time)==4 else 0
        if not i_name or y==0: st.error("資料不完整")
        else:
            calc = ZWDSCalculator(y, m, d, h, mn, i_gen); p_data, m_star, bur, b_yr, ming_pos = calc.get_result()
            pkt = {"name": i_name, "gender": i_gen, "category": i_cat, "y": y, "m": m, "d": d, "h": h, "min": mn, "cal_type": cal, "ming_star": m_star, "bureau": bur, "palace_data": p_data, "ming_pos": ming_pos}
            if btn_save:
                pkt['id'] = int(time.time()) if st.session_state.current_id==0 else st.session_state.current_id
                ids = [x['id'] for x in st.session_state.db]
                if pkt['id'] in ids: st.session_state.db[ids.index(pkt['id'])] = pkt
                else: st.session_state.db.append(pkt)
                save_db(st.session_state.db)
                st.session_state.current_id = pkt['id']
                st.session_state.temp_preview_data = None
                st.rerun()
            if btn_calc:
                st.session_state.temp_preview_data = pkt

    # 顯示資料：優先顯示預覽(試算)，否則顯示已儲存
    data = st.session_state.temp_preview_data or rec
    
    if data:
        calc_obj = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        sorted_limits = sorted(calc_obj.palaces.items(), key=lambda x: x[1]['age_start'])
        daxian_idx = st.session_state.sel_daxian_idx
        liunian_off = st.session_state.sel_liunian_offset
        is_pure_benming = (daxian_idx == -1)
        daxian_pos = int(sorted_limits[daxian_idx][0]) if not is_pure_benming else -1
        liunian_pos = -1
        
        if not is_pure_benming:
            d_gan = sorted_limits[daxian_idx][1]['gan_idx']
            if liunian_off != -1:
                curr_year = data['y'] + sorted_limits[daxian_idx][1]['age_start'] + liunian_off - 1
                ln_gan, ln_zhi = get_ganzhi_for_year(curr_year)
                calc_obj.calculate_sihua(d_gan, ln_gan)
                for pid, info in calc_obj.palaces.items():
                    if info['zhi_idx'] == ln_zhi: liunian_pos = int(pid); break
            else: calc_obj.calculate_sihua(d_gan, -1)
        else: calc_obj.calculate_sihua(-1, -1)

        fc1, fc2 = st.columns([1, 3])
        with fc1:
            focus_opts = [(-1, "隱藏連線")] + [((calc_obj.ming_pos - i)%12, PALACE_NAMES[i]) for i in range(12)]
            sel_focus = st.selectbox("🎯 三方四正", options=[x[0] for x in focus_opts], format_func=lambda x: next(l for i,l in focus_opts if i==x), index=0)
            if sel_focus != st.session_state.focus_palace_idx: st.session_state.focus_palace_idx = sel_focus; st.rerun()

        cells_html = ""
        layout = [(5,"巳",1,1),(6,"午",1,2),(7,"未",1,3),(8,"申",1,4),(4,"辰",2,1),(9,"酉",2,4),(3,"卯",3,1),(10,"戌",3,4),(2,"寅",4,1),(1,"丑",4,2),(0,"子",4,3),(11,"亥",4,4)]
        for idx, branch, r, c in layout:
            cells_html += get_palace_html(idx, branch, r, c, calc_obj.palaces[idx], daxian_pos, liunian_pos, calc_obj.ming_pos, is_pure_benming, calc_obj.shen_pos, st.session_state.focus_palace_idx)
        
        svg_html = render_triangles_svg(st.session_state.focus_palace_idx)
        
        # 關鍵修正：將 HTML 封裝在變數，並用 st.markdown 渲染，避免直接 print 出來
        final_chart_html = f'<div class="chart-container">{svg_html}<div class="zwds-grid">{cells_html}{get_center_html(data, calc_obj)}</div></div>'
        st.markdown(final_chart_html, unsafe_allow_html=True)
        
        st.markdown('<div class="button-container">', unsafe_allow_html=True)
        limit_names = ["一限", "二限", "三限", "四限", "五限", "六限", "七限", "八限", "九限", "十限", "十一", "十二"]
        cols_d = st.columns(12)
        for i, col in enumerate(cols_d):
            pos_idx, info = sorted_limits[i]
            label = f"{limit_names[i]}\n{GAN[info['gan_idx']]}{ZHI[info['zhi_idx']]}"
            if col.button(label, key=f"d_{i}", type="primary" if i==daxian_idx else "secondary", use_container_width=True):
                if i==daxian_idx: st.session_state.sel_daxian_idx = -1; st.session_state.sel_liunian_offset = -1
                else: st.session_state.sel_daxian_idx = i; st.session_state.sel_liunian_offset = -1
                st.rerun()
        if not is_pure_benming:
            cols_l = st.columns(10)
            d_info = sorted_limits[daxian_idx][1]
            for j, col in enumerate(cols_l):
                yr = calc_obj.birth_year + d_info['age_start'] + j - 1
                gy, zy = get_ganzhi_for_year(yr)
                label = f"{yr}\n{GAN[gy]}{ZHI[zy]}({d_info['age_start']+j})"
                if col.button(label, key=f"l_{j}", type="primary" if j==liunian_off else "secondary", use_container_width=True):
                    st.session_state.sel_liunian_offset = -1 if j==liunian_off else j
                    st.rerun()
        st.markdown('</div>', unsafe_allow_html=True)
