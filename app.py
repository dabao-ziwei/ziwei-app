import streamlit as st
import json
import os
import time
from style import apply_style
from logic import ZWDSCalculator, parse_date, get_ganzhi_for_year, GAN, ZHI
from renderer import get_palace_html, get_center_html, render_triangles_svg, PALACE_NAMES

# === 1. 狀態初始化 (最優先執行) ===
if 'init' not in st.session_state:
    st.session_state.init = True
    st.session_state.db = []
    st.session_state.current_id = 0
    st.session_state.page = 'list'
    st.session_state.temp_preview_data = None
    # 命盤狀態
    st.session_state.sel_daxian_idx = -1
    st.session_state.sel_liunian_offset = -1
    st.session_state.focus_palace_idx = -1
    
    # 載入資料
    if os.path.exists('zwds_db.json'):
        with open('zwds_db.json', 'r', encoding='utf-8') as f:
            try: st.session_state.db = json.load(f)
            except: pass

def save_to_disk():
    with open('zwds_db.json', 'w', encoding='utf-8') as f:
        json.dump(st.session_state.db, f, ensure_ascii=False, indent=4)

# === 2. UI 設定 ===
st.set_page_config(page_title="專業紫微", layout="wide")
apply_style()

# === 3. 頁面路由 ===

# --- 頁面 A: 客戶列表 ---
if st.session_state.page == 'list':
    st.title("📂 客戶管理")
    c1, c2 = st.columns([4, 1])
    with c1: search = st.text_input("搜尋", placeholder="姓名...")
    with c2: 
        if st.button("➕ 新增", use_container_width=True):
            st.session_state.current_id = 0
            st.session_state.page = 'chart'
            st.rerun()
            
    # 列表顯示
    for rec in st.session_state.db:
        if not search or search in rec['name']:
            with st.container():
                cols = st.columns([4, 1])
                cols[0].markdown(f"**{rec['name']}** - {rec['gender']} ({rec['y']}/{rec['m']}/{rec['d']})")
                if cols[1].button("開啟", key=f"btn_{rec['id']}"):
                    st.session_state.current_id = rec['id']
                    st.session_state.page = 'chart'
                    st.session_state.sel_daxian_idx = -1
                    st.session_state.sel_liunian_offset = -1
                    st.rerun()
    if not st.session_state.db: st.info("無資料")

# --- 頁面 B: 排盤 ---
elif st.session_state.page == 'chart':
    # 頂部導航
    if st.button("⬅ 回列表"):
        st.session_state.page = 'list'
        st.rerun()

    # 資料準備
    rec = None
    if st.session_state.current_id != 0:
        rec = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)
    
    # 編輯區
    with st.expander("📝 資料編輯", expanded=(st.session_state.current_id == 0)):
        with st.form("edit_form"):
            c1, c2 = st.columns(2)
            name = c1.text_input("姓名", value=rec['name'] if rec else "")
            gender = c2.radio("性別", ["男", "女"], index=0 if rec and rec['gender']=='男' else 1, horizontal=True)
            d_str = c1.text_input("日期 (YYYYMMDD)", value=f"{rec['y']:04}{rec['m']:02}{rec['d']:02}" if rec else "")
            t_str = c2.text_input("時間 (HHMM)", value=f"{rec['h']:02}{rec['min']:02}" if rec else "")
            
            if st.form_submit_button("💾 儲存並排盤", type="primary"):
                y, m, d, _ = parse_date(d_str)
                h, mn = (int(t_str[:2]), int(t_str[2:])) if len(t_str)==4 else (0,0)
                if name and y:
                    calc = ZWDSCalculator(y, m, d, h, mn, gender)
                    p_data, m_star, bur, _, ming_pos = calc.get_result()
                    new_rec = {
                        "id": int(time.time()) if st.session_state.current_id==0 else st.session_state.current_id,
                        "name": name, "gender": gender, "y": y, "m": m, "d": d, "h": h, "min": mn,
                        "ming_star": m_star, "bureau": bur, "ming_pos": ming_pos
                    }
                    # 更新 DB
                    if st.session_state.current_id == 0:
                        st.session_state.db.append(new_rec)
                    else:
                        idx = next(i for i, x in enumerate(st.session_state.db) if x['id'] == st.session_state.current_id)
                        st.session_state.db[idx] = new_rec
                    
                    save_to_disk()
                    st.session_state.current_id = new_rec['id']
                    st.rerun()

    # 取得顯示資料
    data = rec
    if data:
        calc = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        limits = sorted(calc.palaces.items(), key=lambda x: x[1]['age_start'])
        
        # 狀態變數
        d_idx = st.session_state.sel_daxian_idx
        l_off = st.session_state.sel_liunian_offset
        is_pure = (d_idx == -1)
        
        d_pos = int(limits[d_idx][0]) if not is_pure else -1
        l_pos = -1
        
        # 四化計算
        if not is_pure:
            d_gan = limits[d_idx][1]['gan_idx']
            if l_off != -1:
                cy = data['y'] + limits[d_idx][1]['age_start'] + l_off - 1
                l_gan, l_zhi = get_ganzhi_for_year(cy)
                calc.calculate_sihua(d_gan, l_gan)
                for pid, p in calc.palaces.items():
                    if p['zhi_idx'] == l_zhi: l_pos = int(pid)
            else:
                calc.calculate_sihua(d_gan, -1)
        else:
            calc.calculate_sihua(-1, -1)

        # 操作區
        col_focus, _ = st.columns([2, 4])
        with col_focus:
            opts = [(-1, "隱藏連線")] + [((calc.ming_pos - i)%12, PALACE_NAMES[i]) for i in range(12)]
            f_idx = st.selectbox("三方四正", options=[x[0] for x in opts], format_func=lambda x: next(n for i,n in opts if i==x))
            if f_idx != st.session_state.focus_palace_idx:
                st.session_state.focus_palace_idx = f_idx
                st.rerun()

        # 產生 HTML
        grid_html = ""
        layout = [(5,"巳",1,1),(6,"午",1,2),(7,"未",1,3),(8,"申",1,4),(4,"辰",2,1),(9,"酉",2,4),(3,"卯",3,1),(10,"戌",3,4),(2,"寅",4,1),(1,"丑",4,2),(0,"子",4,3),(11,"亥",4,4)]
        for idx, branch, r, c in layout:
            grid_html += get_palace_html(idx, branch, r, c, calc.palaces[idx], d_pos, l_pos, calc.ming_pos, is_pure, calc.shen_pos, st.session_state.focus_palace_idx)
        
        svg = render_triangles_svg(st.session_state.focus_palace_idx)
        
        # 1. 命盤區 (含 SVG)
        st.markdown(f"""
        <div class="chart-wrapper">
            {svg}
            <div class="zwds-grid">{grid_html}{get_center_html(data, calc)}</div>
        </div>
        """, unsafe_allow_html=True)

        # 2. 時間軸 (大限列表)
        # 我們用 HTML + Streamlit columns 混合技巧來模擬點擊
        # 為了更像圖片，這裡直接用 st.columns 渲染按鈕，但用 CSS 把它修飾成一條 Bar
        cols = st.columns(12)
        limit_names = ["一限", "二限", "三限", "四限", "五限", "六限", "七限", "八限", "九限", "十限", "十一", "十二"]
        
        for i, col in enumerate(cols):
            info = limits[i][1]
            txt = f"{limit_names[i]}\n{GAN[info['gan_idx']]}{ZHI[info['zhi_idx']]}"
            if col.button(txt, key=f"d_{i}", type="primary" if i==d_idx else "secondary", use_container_width=True):
                if i == d_idx: st.session_state.sel_daxian_idx = -1; st.session_state.sel_liunian_offset = -1
                else: st.session_state.sel_daxian_idx = i; st.session_state.sel_liunian_offset = -1
                st.rerun()
        
        # 3. 流年列 (如果有選大限)
        if not is_pure:
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
