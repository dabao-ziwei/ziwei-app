import streamlit as st
import time
import json
import os
from style import apply_style
from logic import ZWDSCalculator, parse_date, get_ganzhi_for_year, GAN, ZHI
# 確保從 renderer 引用所需的函式和變數
from renderer import get_palace_html, get_center_html, render_triangles_svg, PALACE_NAMES

DB_FILE = 'zwds_db.json'

# === 資料庫操作 ===
def load_db():
    if os.path.exists(DB_FILE):
        with open(DB_FILE, 'r', encoding='utf-8') as f:
            try: return json.load(f)
            except: return []
    return []

def save_db(db_data):
    with open(DB_FILE, 'w', encoding='utf-8') as f:
        json.dump(db_data, f, ensure_ascii=False, indent=4)

# === 初始化 ===
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="wide")
apply_style()

if 'db' not in st.session_state: st.session_state.db = load_db()
if 'current_id' not in st.session_state: st.session_state.current_id = 0
if 'page' not in st.session_state: st.session_state.page = 'list' # 預設進入列表
if 'sel_daxian_idx' not in st.session_state: st.session_state.sel_daxian_idx = -1 
if 'sel_liunian_offset' not in st.session_state: st.session_state.sel_liunian_offset = -1 
if 'focus_palace_idx' not in st.session_state: st.session_state.focus_palace_idx = -1 # 三方四正焦點

# ==============================================================================
# 頁面 1: 客戶列表 (CRM 模式)
# ==============================================================================
if st.session_state.page == 'list':
    st.title("📂 客戶資料庫")
    
    # 頂部工具列
    c1, c2 = st.columns([3, 1])
    with c1: search_kw = st.text_input("🔍 搜尋客戶 (姓名/分類)", placeholder="輸入關鍵字...")
    with c2:
        if st.button("➕ 新增命盤", use_container_width=True):
            st.session_state.current_id = 0 
            st.session_state.page = 'chart'
            # 重置狀態
            st.session_state.sel_daxian_idx = -1
            st.session_state.sel_liunian_offset = -1
            st.session_state.focus_palace_idx = -1
            st.rerun()

    # 資料分類與過濾
    categories = {}
    sorted_db = sorted(st.session_state.db, key=lambda x: x.get('category', '未分類'))
    
    has_data = False
    for rec in sorted_db:
        cat = rec.get('category', '未分類')
        if not cat: cat = '未分類'
        if cat not in categories: categories[cat] = []
        
        # 搜尋邏輯
        if search_kw:
            if search_kw in rec['name'] or search_kw in cat:
                categories[cat].append(rec)
        else:
            categories[cat].append(rec)

    if not st.session_state.db:
        st.info("尚無資料，請點擊右上角新增。")
    
    # 渲染分類列表
    for cat, items in categories.items():
        if items:
            has_data = True
            with st.expander(f"📁 {cat} ({len(items)})", expanded=True):
                for item in items:
                    col_info, col_btn = st.columns([4, 1])
                    with col_info:
                        st.markdown(f"**{item['name']}** <span style='color:#666;font-size:12px'>({item['gender']} | {item['y']}/{item['m']}/{item['d']})</span>", unsafe_allow_html=True)
                    with col_btn:
                        if st.button("開啟", key=f"open_{item['id']}", use_container_width=True):
                            st.session_state.current_id = item['id']
                            st.session_state.page = 'chart'
                            # 重置盤面狀態
                            st.session_state.sel_daxian_idx = -1
                            st.session_state.sel_liunian_offset = -1
                            st.session_state.focus_palace_idx = -1
                            st.rerun()
    if not has_data and st.session_state.db:
        st.warning("查無符合資料。")

# ==============================================================================
# 頁面 2: 命盤操作 (Chart Mode)
# ==============================================================================
elif st.session_state.page == 'chart':
    # 導航列
    nav_c1, nav_c2 = st.columns([1, 6])
    with nav_c1:
        if st.button("⬅ 回列表", use_container_width=True):
            st.session_state.page = 'list'
            st.rerun()
    
    # 讀取當前資料 (如果是新增模式則為空)
    if st.session_state.current_id != 0:
        rec = next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
        if rec:
            v_name, v_gen, v_cat = rec['name'], rec['gender'], rec['category']
            v_date = f"{rec['y']:04d}{rec['m']:02d}{rec['d']:02d}"
            v_time = f"{rec['h']:02d}{rec['min']:02d}"
        else: v_name, v_gen, v_cat, v_date, v_time = "", "女", "", "", ""
    else:
        v_name, v_gen, v_cat, v_date, v_time = "", "女", "", "", ""

    # 資料編輯區 (新增時預設展開，舊資料預設收合)
    with st.expander("📝 資料輸入 / 修改", expanded=(st.session_state.current_id == 0)):
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

    # 處理表單提交
    if btn_save or btn_calc:
        y, m, d, cal = parse_date(i_date)
        h, mn = int(i_time[:2]) if len(i_time)==4 else 0, int(i_time[2:]) if len(i_time)==4 else 0
        if not i_name or y==0: st.error("資料不完整")
        else:
            calc = ZWDSCalculator(y, m, d, h, mn, i_gen); p_data, m_star, bur, b_yr, ming_pos = calc.get_result()
            pkt = {"name": i_name, "gender": i_gen, "category": i_cat, "y": y, "m": m, "d": d, "h": h, "min": mn, "cal_type": cal, "ming_star": m_star, "bureau": bur, "palace_data": p_data, "ming_pos": ming_pos}
            
            if btn_save:
                pkt['id'] = int(time.time()) if st.session_state.current_id==0 else st.session_state.current_id
                # 更新 list 中的資料
                existing_ids = [x['id'] for x in st.session_state.db]
                if pkt['id'] in existing_ids:
                    idx = existing_ids.index(pkt['id'])
                    st.session_state.db[idx] = pkt
                else:
                    st.session_state.db.append(pkt)
                
                save_db(st.session_state.db) # 寫入硬碟
                st.session_state.current_id = pkt['id']
                st.session_state.temp_preview_data = None
                st.rerun()
            
            if btn_calc:
                st.session_state.temp_preview_data = pkt

    # 決定要顯示的資料 (預覽資料優先，其次是資料庫資料)
    data = st.session_state.temp_preview_data or next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    
    if data:
        # === 計算邏輯 ===
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

        # === 7. 三方四正操作區 (Selectbox 選擇焦點宮位) ===
        # 建立選項：(地支index, 顯示名稱)
        focus_opts = [(-1, "無 (隱藏連線)")]
        # 從命宮開始，逆時針列出 12 宮
        for i in range(12):
            # i=0 -> 命宮位置
            real_idx = (benming_pos - i) % 12
            name = PALACE_NAMES[i]
            focus_opts.append((real_idx, name))
            
        fc1, fc2 = st.columns([1, 4])
        with fc1:
            sel_focus = st.selectbox(
                "🎯 檢視三方四正", 
                options=[x[0] for x in focus_opts],
                format_func=lambda x: next(label for idx, label in focus_opts if idx == x),
                index=0
            )
            if sel_focus != st.session_state.focus_palace_idx:
                st.session_state.focus_palace_idx = sel_focus
                st.rerun()

        # === 繪製命盤 (Grid + SVG) ===
        layout = [(5,"巳",1,1),(6,"午",1,2),(7,"未",1,3),(8,"申",1,4),
                  (4,"辰",2,1),                    (9,"酉",2,4),
                  (3,"卯",3,1),                    (10,"戌",3,4),
                  (2,"寅",4,1),(1,"丑",4,2),(0,"子",4,3),(11,"亥",4,4)]
        
        cells_html = ""
        for idx, branch, r, c in layout:
            info = calc_obj.palaces[idx]
            # 產生每一個宮位的 HTML
            cells_html += get_palace_html(idx, branch, r, c, info, daxian_pos, liunian_pos, benming_pos, is_pure_benming, shen_pos, st.session_state.focus_palace_idx)
            
        center_html = get_center_html(data, calc_obj)
        
        # 產生 SVG 連線字串
        svg_html = render_triangles_svg(st.session_state.focus_palace_idx)
        
        # 組合最終 HTML (SVG 覆蓋在 Grid 上)
        chart_html = f"""
        <div class="chart-container">
            {svg_html}
            <div class="zwds-grid">{cells_html}{center_html}</div>
        </div>
        """
        
        st.markdown(chart_html, unsafe_allow_html=True)
        
        # === 底部按鈕區 (緊貼命盤) ===
        st.markdown('<div class="button-container">', unsafe_allow_html=True)
        
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
                    st.session_state.sel_daxian_idx = -1; st.session_state.sel_liunian_offset = -1
                else: 
                    st.session_state.sel_daxian_idx = i; st.session_state.sel_liunian_offset = -1 
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
                    if is_selected: st.session_state.sel_liunian_offset = -1
                    else: st.session_state.sel_liunian_offset = j
                    st.rerun()
        
        st.markdown('</div>', unsafe_allow_html=True)
