import streamlit as st
import time
from lunar_python import Lunar, Solar

# ==========================================
# 1. 頁面設定與 CSS 樣式 (v2.2 縮排修正版)
# ==========================================
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="wide")

st.markdown("""
<style>
    /* 全局暗黑風格 */
    .stApp { background-color: #121212; color: #e0e0e0; }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    /* 去除 Streamlit 預設間距 */
    .block-container { padding-top: 1rem; padding-bottom: 3rem; }
    [data-testid="stVerticalBlock"] { gap: 0px !important; }
    
    /* === 命盤網格系統 === */
    .zwds-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 160px);
        gap: 6px;
        background-color: #222; 
        padding: 5px;
        margin-bottom: 5px;
        font-family: "Microsoft JhengHei", sans-serif;
    }
    
    /* 手機版適配 */
    @media (max-width: 800px) {
        .zwds-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: auto;
        }
    }

    /* 單一宮位卡片 */
    .zwds-cell {
        background-color: #1e1e1e;
        border: 1px solid #333;
        border-radius: 4px;
        padding: 4px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
    }

    /* 狀態高亮 */
    .active-daxian { border: 1px solid #4da6ff !important; box-shadow: inset 0 0 10px rgba(77, 166, 255, 0.2); }
    .active-liunian { border: 2px solid #ff4d4d !important; z-index: 10; }

    /* === 核心排版：左右分欄 === */
    .stars-box {
        display: flex;
        flex-direction: row;
        flex: 1;
        min-height: 0;
    }

    /* 左側：主星欄 */
    .main-stars-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding-right: 6px;
        margin-right: 4px;
        border-right: 1px dashed #444;
        min-width: 38px;
    }

    .star-major {
        font-size: 1.3rem;
        font-weight: bold;
        line-height: 1.1;
        color: #b197fc;
        margin-bottom: 6px;
        writing-mode: vertical-rl;
        text-shadow: 0 0 2px rgba(177, 151, 252, 0.3);
        position: relative;
    }

    /* 右側：副星與雜曜欄 */
    .sub-stars-col {
        display: flex;
        flex-wrap: wrap;
        align-content: flex-start;
        gap: 3px;
        padding-top: 2px;
    }

    /* 星星標籤樣式 */
    .star-tag {
        font-size: 0.8rem;
        padding: 0 2px;
        border-radius: 2px;
        line-height: 1.2;
    }
    
    .color-bad { color: #ff6b6b; font-weight: bold; }
    .color-good { color: #51cf66; font-weight: bold; }
    .color-normal { color: #aaaaaa; font-size: 0.75rem; }
    
    /* 四化標籤 */
    .hua-badge {
        font-size: 0.6rem;
        color: #fff;
        border-radius: 2px;
        padding: 1px;
        position: absolute;
        bottom: -10px; 
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        writing-mode: horizontal-tb;
    }
    .sh-lu { background-color: #2b8a3e; }
    .sh-quan { background-color: #1971c2; }
    .sh-ke { background-color: #e67700; }
    .sh-ji { background-color: #c92a2a; }

    /* === 底部資訊區 === */
    .cell-footer {
        margin-top: 4px;
        border-top: 1px solid #333;
        padding-top: 2px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
    }

    .footer-left {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1;
    }
    
    .ganzhi-label { color: #888; font-size: 0.8rem; }
    .zhi-label { color: #ddd; font-size: 1.1rem; font-weight: bold; }

    .footer-right {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }

    .palace-name { font-size: 0.95rem; font-weight: bold; color: #fff; }
    .limit-info { font-size: 0.7rem; color: #666; }

    .status-tags { display: flex; gap: 2px; margin-top: 2px; }
    .tag-flow { font-size: 0.7rem; padding: 0 3px; border-radius: 2px; color: white; }
    .tag-liu { background-color: #c92a2a; }
    .tag-da { background-color: #1971c2; }

    /* 中宮資訊 */
    .center-info-box {
        grid-column: 2 / 4; grid-row: 2 / 4;
        background-color: #111;
        display: flex; flex-direction: column;
        justify-content: center; align-items: center; text-align: center;
        border: 1px solid #444;
        color: #fff;
    }

    /* 按鈕列樣式 */
    div.stButton > button {
        width: 100%; border-radius: 0; border: 1px solid #444; 
        font-size: 12px; height: auto; min-height: 40px;
        background-color: #222; color: #ccc;
    }
    div.stButton > button:hover { border-color: #888; color: white; }
    div.stButton > button[kind="primary"] { background-color: #4B0082 !important; color: white !important; border: 1px solid #d4a0ff !important; }

</style>
""", unsafe_allow_html=True)

# ==========================================
# 2. 紫微斗數運算核心
# ==========================================
class ZWDSCalculator:
    def __init__(self, year, month, day, hour, minute, gender):
        self.solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
        self.lunar = self.solar.getLunar()
        self.gender = gender 
        self.birth_year = year 
        
        self.lunar_month = self.lunar.getMonth()
        self.lunar_day = self.lunar.getDay()
        self.time_zhi_idx = (hour + 1) // 2 % 12
        self.year_gan_idx = self.lunar.getYearGanIndex() 
        self.year_zhi_idx = self.lunar.getYearZhiIndex() 
        
        is_yang_year = (self.year_gan_idx % 2 == 0)
        is_male = (self.gender == "男")
        self.direction = 1 if (is_yang_year and is_male) or (not is_yang_year and not is_male) else -1 

        self.palaces = {i: {
            "name": "", 
            "major_stars": [],
            "minor_stars": [],
            "gan_idx": 0, 
            "zhi_idx": i, 
            "age_start": 0, 
            "age_end": 0
        } for i in range(12)}
        
        self._calc_palaces()
        self._calc_bureau()
        self._calc_main_stars()
        self._calc_minor_stars()
        self._calc_daxian()

    def _calc_palaces(self):
        start_idx = 2 
        self.ming_pos = (start_idx + (self.lunar_month - 1) - self.time_zhi_idx) % 12
        self.shen_pos = (start_idx + (self.lunar_month - 1) + self.time_zhi_idx) % 12
        # 更名：交友 -> 僕役
        names = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"]
        for i in range(12):
            pos = (self.ming_pos - i) % 12
            self.palaces[pos]["name"] = names[i]
            if pos == self.shen_pos: self.palaces[pos]["name"] += "(身宮)"
        start_gan = (self.year_gan_idx % 5) * 2 + 2
        for i in range(12): self.palaces[i]["gan_idx"] = (start_gan + (i - 2) % 12) % 10

    def _calc_bureau(self):
        m_gan = self.palaces[self.ming_pos]["gan_idx"]; m_zhi = self.ming_pos
        table = {0: [4,4,6,6,5,5,4,4,6,6,5,5], 1: [2,2,5,5,6,6,2,2,5,5,6,6], 
                 2: [6,6,3,3,5,5,6,6,3,3,5,5], 3: [5,5,4,4,3,3,5,5,4,4,3,3], 
                 4: [3,3,4,4,2,2,3,3,4,4,2,2]}
        self.bureau_num = table[m_gan // 2][m_zhi]
        self.bureau_name = {2:"水二局", 3:"木三局", 4:"金四局", 5:"土五局", 6:"火六局"}[self.bureau_num]

    def _calc_daxian(self):
        start_age = self.bureau_num
        for i in range(12):
            offset = i if self.direction == 1 else -i
            pos = (self.ming_pos + offset) % 12
            self.palaces[pos]["age_start"] = start_age; self.palaces[pos]["age_end"] = start_age + 9; start_age += 10

    def _calc_main_stars(self):
        b = self.bureau_num; d = self.lunar_day
        if d % b == 0: q = d // b; zp = (2 + q - 1) % 12 
        else: rem = d % b; add = b - rem; q = (d + add) // b; zp = (2 + q - 1 - add) % 12 if add % 2 == 1 else (2 + q - 1 + add) % 12
        
        def add_star(idx, name):
            bright = "廟" 
            self.palaces[idx]["major_stars"].append({'name': name, 'bright': bright, 'sihua': []})

        zw_map = {0:"紫微", -1:"天機", -3:"太陽", -4:"武曲", -5:"天同", -8:"廉貞"}
        for off, name in zw_map.items(): add_star((zp + off)%12, name)
            
        tp = (4 - zp) % 12
        tf_map = {0:"天府", 1:"太陰", 2:"貪狼", 3:"巨門", 4:"天相", 5:"天梁", 6:"七殺", 10:"破軍"}
        for off, name in tf_map.items(): add_star((tp + off)%12, name)
        
        self.ming_star = self.palaces[self.ming_pos]["major_stars"][0]['name'] if self.palaces[self.ming_pos]["major_stars"] else ""

    def _calc_minor_stars(self):
        lu_pos = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0] 
        lu_idx = lu_pos[self.year_gan_idx]
        
        self.palaces[lu_idx]["minor_stars"].append(("祿存", False)) 
        self.palaces[(lu_idx+1)%12]["minor_stars"].append(("擎羊", True)) 
        self.palaces[(lu_idx-1)%12]["minor_stars"].append(("陀羅", True)) 
        
        self.palaces[(self.ming_pos + 4)%12]["minor_stars"].append(("火星", True))
        self.palaces[(self.ming_pos + 8)%12]["minor_stars"].append(("鈴星", True))
        self.palaces[(self.ming_pos + 2)%12]["minor_stars"].append(("天魁", False))
        self.palaces[(self.ming_pos + 10)%12]["minor_stars"].append(("天鉞", False))
        self.palaces[(self.ming_pos)%12]["minor_stars"].append(("紅鸞", False))

    def calculate_sihua(self, daxian_gan_idx, liunian_gan_idx):
        sihua_table = [
            ["廉貞", "破軍", "武曲", "太陽"], 
            ["天機", "天梁", "紫微", "太陰"], 
            ["天同", "天機", "文昌", "廉貞"], 
            ["太陰", "天同", "天機", "巨門"], 
            ["貪狼", "太陰", "右弼", "天機"], 
            ["武曲", "貪狼", "天梁", "文曲"], 
            ["太陽", "武曲", "天同", "天相"], 
            ["巨門", "太陽", "文曲", "文昌"], 
            ["天梁", "紫微", "左輔", "武曲"], 
            ["破軍", "巨門", "太陰", "貪狼"]
        ]
        
        layers = [
            (self.year_gan_idx, "本"),
            (daxian_gan_idx, "大"), 
            (liunian_gan_idx, "流") 
        ]
        types = ["祿", "權", "科", "忌"]
        
        for pid, palace in self.palaces.items():
            for star in palace["major_stars"]:
                star['sihua'] = [] 
                s_name = star['name']
                for gan_idx, layer_name in layers:
                    stars_list = sihua_table[gan_idx]
                    if s_name in stars_list:
                        s_type = types[stars_list.index(s_name)]
                        star['sihua'].append({'type': s_type, 'layer': layer_name})

    def get_result(self):
        return self.palaces, self.ming_star, self.bureau_name, self.birth_year, self.ming_pos

# ==========================================
# 3. 狀態與輔助
# ==========================================
if 'db' not in st.session_state: st.session_state.db = [] 
if 'current_id' not in st.session_state: st.session_state.current_id = 0
if 'show_chart' not in st.session_state: st.session_state.show_chart = False
if 'temp_preview_data' not in st.session_state: st.session_state.temp_preview_data = None
if 'sel_daxian_idx' not in st.session_state: st.session_state.sel_daxian_idx = 0 
if 'sel_liunian_offset' not in st.session_state: st.session_state.sel_liunian_offset = 0 

GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

def parse_date(d):
    try:
        d = d.strip()
        if len(d)==8: return int(d[:4]), int(d[4:6]), int(d[6:]), "西元"
        elif len(d)==7: return int(d[:3])+1911, int(d[3:5]), int(d[5:]), "民國"
    except: return 0,0,0,""
    return 0,0,0,""

def get_ganzhi_for_year(year): return (year - 1984) % 10, (year - 1984) % 12

# ==========================================
# 4. 介面邏輯
# ==========================================
st.title("🔮 專業紫微斗數排盤")
with st.container(border=True):
    c1, c2 = st.columns([1, 1.5])
    with c1: search = st.text_input("🔍 檢索", placeholder="姓名/年份")
    with c2:
        opts = {0: "➕ 新增命盤"}
        for p in st.session_state.db: opts[p['id']] = f"[{p['category']}] {p['name']}"
        curr = st.session_state.current_id if st.session_state.current_id in opts else 0
        sel = st.selectbox("選擇命主", options=list(opts.keys()), format_func=lambda x: opts[x], index=list(opts.keys()).index(curr))
        if sel != st.session_state.current_id:
            st.session_state.current_id = sel; st.session_state.show_chart = False; st.session_state.temp_preview_data = None; st.rerun()

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
        with c3: i_cat = st.text_input("類別", value=v_cat)
        c4, c5 = st.columns(2)
        with c4: i_date = st.text_input("日期", value=v_date, help="如 1140926")
        with c5: i_time = st.text_input("時間", value=v_time, help="如 1830")
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
            st.session_state.temp_preview_data = None; st.session_state.show_chart = True; st.rerun()
        if btn_calc: st.session_state.temp_preview_data = pkt; st.session_state.show_chart = True

# ==========================================
# 5. 排盤顯示核心 (HTML 組合邏輯修正版 - 無縮排)
# ==========================================
if st.session_state.show_chart:
    data = st.session_state.temp_preview_data or next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    if data:
        # 重建運算物件
        calc_obj = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        
        # 準備大限與流年資料
        sorted_limits = sorted(calc_obj.palaces.items(), key=lambda x: x[1]['age_start'])
        daxian_idx = st.session_state.sel_daxian_idx
        liunian_off = st.session_state.sel_liunian_offset
        d_pos_idx, d_info = sorted_limits[daxian_idx]
        daxian_pos = int(d_pos_idx)
        
        curr_year = data['y'] + d_info['age_start'] + liunian_off - 1
        daxian_gan = d_info['gan_idx']
        ln_gan, ln_zhi = get_ganzhi_for_year(curr_year)
        
        # 執行飛星
        calc_obj.calculate_sihua(daxian_gan, ln_gan)
        
        # 找流年命宮
        liunian_pos = -1
        for pid, info in calc_obj.palaces.items():
            if info['zhi_idx'] == ln_zhi: liunian_pos = int(pid); break

        # A. 產生 12 宮位 HTML
        layout = [(5,"巳",1,1),(6,"午",1,2),(7,"未",1,3),(8,"申",1,4),
                  (4,"辰",2,1),                    (9,"酉",2,4),
                  (3,"卯",3,1),                    (10,"戌",3,4),
                  (2,"寅",4,1),(1,"丑",4,2),(0,"子",4,3),(11,"亥",4,4)]
        
        cells_html = ""
        for idx, branch, r, c in layout:
            info = calc_obj.palaces[idx]
            
            # 判斷 Class
            classes = []
            if idx == daxian_pos: classes.append("active-daxian")
            if idx == liunian_pos: classes.append("active-liunian")
            
            # --- 1. 左欄：主星 HTML (完全無縮排拼接) ---
            main_stars_html = ""
            for star in info['major_stars']:
                sihua_html = ""
                for sh in star['sihua']:
                    bg_cls = {"祿":"sh-lu", "權":"sh-quan", "科":"sh-ke", "忌":"sh-ji"}[sh['type']]
                    sihua_html += f'<span class="hua-badge {bg_cls}">{sh["type"]}</span>'
                
                main_stars_html += f'<div class="star-major">{star["name"]}{sihua_html}</div>'
            
            # --- 2. 右欄：副星/雜曜 HTML ---
            sub_stars_html = ""
            for m_name, is_bad in info['minor_stars']:
                if m_name == "祿存": style_cls = "color-good"
                elif is_bad: style_cls = "color-bad"
                else: style_cls = "color-normal"
                sub_stars_html += f'<span class="star-tag {style_cls}">{m_name}</span>'
            
            # --- 3. 底部資訊 ---
            is_liu = (idx == liunian_pos)
            is_da = (idx == daxian_pos)
            
            status_tags = ""
            if is_liu: status_tags += '<div class="tag-flow tag-liu">流命</div>'
            if is_da: status_tags += '<div class="tag-flow tag-da">大限</div>'
            
            # --- 4. 組合 Cell HTML (極度重要：不要用多行字串，改用 +=) ---
            # 這樣可以確保 Streamlit 不會誤判縮排
            cell_html = f'<div class="zwds-cell {" ".join(classes)}" style="grid-row: {r}; grid-column: {c};">'
            cell_html += '<div class="stars-box">'
            cell_html += f'<div class="main-stars-col">{main_stars_html}</div>'
            cell_html += f'<div class="sub-stars-col">{sub_stars_html}</div>'
            cell_html += '</div>'
            
            cell_html += '<div class="cell-footer">'
            cell_html += '<div class="footer-left">'
            cell_html += f'<span class="ganzhi-label">{GAN[info["gan_idx"]]}</span>'
            cell_html += f'<span class="zhi-label">{branch}</span>'
            cell_html += '</div>'
            
            cell_html += '<div class="footer-right">'
            cell_html += f'<div class="palace-name">{info["name"]}</div>'
            cell_html += f'<div class="limit-info">{info["age_start"]}-{info["age_end"]}</div>'
            cell_html += f'<div class="status-tags">{status_tags}</div>'
            cell_html += '</div></div>'
            cell_html += '</div>'
            
            cells_html += cell_html
            
        # 中宮資訊
        center_html = '<div class="center-info-box">'
        center_html += f'<h3 style="margin:0;color:#d4a0ff;font-size:1.5rem;">{data["name"]}</h3>'
        center_html += f'<div style="color:#aaa;font-size:0.9rem;margin:5px 0;">{data["gender"]} | {calc_obj.bureau_name} | {data.get("ming_star","")}坐命</div>'
        center_html += f'<div style="color:#4CAF50;">國曆：{data["y"]}/{data["m"]}/{data["d"]} {data["h"]}:{data["min"]:02d}</div>'
        center_html += f'<div style="color:#888;font-size:0.8rem;">農曆：{calc_obj.lunar.getYearInGanZhi()}年 {calc_obj.lunar.getMonthInChinese()}月 {calc_obj.lunar.getDayInChinese()}</div>'
        center_html += '</div>'
        
        # 渲染
        st.markdown(f'<div class="zwds-grid">{cells_html}{center_html}</div>', unsafe_allow_html=True)
        
        # B. 運限控制列
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
                st.session_state.sel_daxian_idx = i; st.session_state.sel_liunian_offset = 0; st.rerun()

        cols_l = st.columns(10)
        for j, col in enumerate(cols_l):
            age = d_info['age_start'] + j
            yr = calc_obj.birth_year + age - 1
            gy, zy = get_ganzhi_for_year(yr)
            gz = f"{GAN[gy]}{ZHI[zy]}"
            label = f"{yr}\n{gz}({age})"
            is_selected = (j == liunian_off)
            btn_type = "primary" if is_selected else "secondary"
            if col.button(label, key=f"l_{j}", type=btn_type, use_container_width=True):
                st.session_state.sel_liunian_offset = j; st.rerun()
