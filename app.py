import streamlit as st
import time
from lunar_python import Lunar, Solar

# --- 1. 頁面設定與 CSS 樣式 (極致無縫版) ---
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="centered")

st.markdown("""
<style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* 命盤外框 */
    .zwds-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-template-rows: 120px 120px 120px 120px;
        gap: 3px;
        background-color: #555;
        border: 4px solid #333;
        border-radius: 6px;
        margin-top: 0px; 
        margin-bottom: 0px; /* 緊貼下方 */
        font-family: "Microsoft JhengHei", sans-serif;
    }
    
    /* 宮位格子 */
    .zwds-cell {
        background-color: #222;
        color: #fff;
        padding: 2px 4px;
        position: relative;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #333;
        cursor: pointer;
    }
    
    /* 狀態顯示 */
    .zwds-cell.active-daxian {
        background-color: #1a2a40 !important; 
        border: 1px solid #4da6ff;
        box-shadow: inset 0 0 15px rgba(77, 166, 255, 0.4);
    }
    .zwds-cell.active-liunian {
        border: 2px solid #ff4d4d !important;
        box-shadow: inset 0 0 10px rgba(255, 77, 77, 0.5);
        z-index: 10;
    }
    
    /* 標籤小字 */
    .marker-daxian { position: absolute; top: 20px; right: 2px; background-color: #004d99; color: #fff; font-size: 10px; padding: 1px 3px; border-radius: 3px; opacity: 0.8; }
    .marker-liunian { position: absolute; top: 36px; right: 2px; background-color: #990000; color: #fff; font-size: 10px; padding: 1px 3px; border-radius: 3px; opacity: 0.9; }

    /* 中間資料區 */
    .zwds-center {
        grid-column: 2 / 4; grid-row: 2 / 4;
        background-color: #111;
        display: flex; flex-direction: column;
        justify_content: center; align-items: center; text-align: center;
        border: 1px solid #444; padding: 5px; color: #fff;
    }
    
    /* 文字樣式 */
    .cell-stars { color: #d4a0ff; font-weight: bold; font-size: 14px; line-height: 1.2; }
    .cell-age { position: absolute; top: 2px; right: 4px; color: #ffeb3b; font-size: 12px; font-weight: bold;}
    .cell-name { position: absolute; bottom: 2px; left: 4px; background-color: #444; color: #ccc; padding: 0 3px; font-size: 11px; border-radius: 2px; }
    .cell-ganzhi { position: absolute; bottom: 2px; right: 4px; color: #aaa; font-weight: bold; font-size: 13px; }
    
    /* === 關鍵 CSS: 無縫表格修正 === */
    
    /* 1. 移除 Column 間隙 */
    [data-testid="column"] { padding: 0px !important; min-width: 0px !important; }
    [data-testid="stHorizontalBlock"] { gap: 0px !important; }
    
    /* 2. 按鈕樣式極致壓縮 */
    div.stButton > button {
        width: 100%;
        border-radius: 0px;
        border: 1px solid #333; 
        margin: 0px;
        /* 上下 padding 縮小，讓高度更緊湊 */
        padding: 8px 0px !important; 
        
        /* 字體縮小並強制不換行 */
        font-size: 11px !important; 
        white-space: nowrap !important;
        
        line-height: 1.2;
        height: auto;
        min-height: 40px; 
        background-color: #222;
        color: #ccc;
        transition: all 0.1s;
    }
    
    /* Hover */
    div.stButton > button:hover {
        border-color: #666;
        color: #fff;
        background-color: #333;
        z-index: 2; 
    }
    
    /* 選中狀態 - 大限 (深紫) */
    div.stButton > button.daxian-active {
        background-color: #4B0082 !important; 
        color: white !important;
        border: 1px solid #aaa !important;
        font-weight: bold;
    }
    
    /* 選中狀態 - 流年 (亮藍) */
    div.stButton > button.liunian-active {
        background-color: #008CBA !important;
        color: white !important;
        border: 1px solid #fff !important;
        font-weight: bold;
    }

    /* 調整主容器邊距 */
    .block-container {
        padding-top: 1rem;
        padding-bottom: 2rem;
    }
</style>
""", unsafe_allow_html=True)

# --- 2. 紫微斗數運算核心 ---
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

        self.palaces = {i: {"name": "", "stars": [], "gan_idx": 0, "zhi_idx": i, "age_start": 0, "age_end": 0} for i in range(12)}
        
        self._calc_palaces()    
        self._calc_bureau()      
        self._calc_main_stars()  
        self._calc_daxian()      

    def _calc_palaces(self):
        start_idx = 2 
        self.ming_pos = (start_idx + (self.lunar_month - 1) - self.time_zhi_idx) % 12
        self.shen_pos = (start_idx + (self.lunar_month - 1) + self.time_zhi_idx) % 12
        names = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "交友", "官祿", "田宅", "福德", "父母"]
        for i in range(12):
            pos = (self.ming_pos - i) % 12
            self.palaces[pos]["name"] = names[i]
            if pos == self.shen_pos: self.palaces[pos]["name"] += "(身宮)"
        start_gan = (self.year_gan_idx % 5) * 2 + 2
        for i in range(12):
            self.palaces[i]["gan_idx"] = (start_gan + (i - 2) % 12) % 10

    def _calc_bureau(self):
        m_gan = self.palaces[self.ming_pos]["gan_idx"]
        m_zhi = self.ming_pos
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
            self.palaces[pos]["age_start"] = start_age
            self.palaces[pos]["age_end"] = start_age + 9
            start_age += 10

    def _calc_main_stars(self):
        b = self.bureau_num; d = self.lunar_day
        if d % b == 0: q = d // b; zp = (2 + q - 1) % 12 
        else: rem = d % b; add = b - rem; q = (d + add) // b; zp = (2 + q - 1 - add) % 12 if add % 2 == 1 else (2 + q - 1 + add) % 12
        zw_map = {0:"紫微", -1:"天機", -3:"太陽", -4:"武曲", -5:"天同", -8:"廉貞"}
        for off, name in zw_map.items(): self.palaces[(zp + off)%12]["stars"].append(name)
        tp = (4 - zp) % 12
        tf_map = {0:"天府", 1:"太陰", 2:"貪狼", 3:"巨門", 4:"天相", 5:"天梁", 6:"七殺", 10:"破軍"}
        for off, name in tf_map.items(): self.palaces[(tp + off)%12]["stars"].append(name)
        self.ming_star = self.palaces[self.ming_pos]["stars"][0] if self.palaces[self.ming_pos]["stars"] else ""

    def get_result(self):
        return self.palaces, self.ming_star, self.bureau_name, self.birth_year

# --- 3. 狀態與輔助 ---
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
        elif len(d)==6: return int(d[:2])+1911, int(d[2:4]), int(d[4:]), "民國"
    except: return 0,0,0,""
    return 0,0,0,""

def get_ganzhi_for_year(year):
    return (year - 1984) % 10, (year - 1984) % 12

# --- 4. 頂部與輸入區 ---
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
else:
    v_name, v_gen, v_cat, v_date, v_time = "", "女", "", "", ""

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
        calc = ZWDSCalculator(y, m, d, h, mn, i_gen)
        p_data, m_star, bur, b_yr = calc.get_result()
        pkt = {"name": i_name, "gender": i_gen, "category": i_cat, "y": y, "m": m, "d": d, "h": h, "min": mn, "cal_type": cal, "ming_star": m_star, "bureau": bur, "palace_data": p_data}
        if btn_save:
            pkt['id'] = int(time.time()) if st.session_state.current_id==0 else st.session_state.current_id
            if st.session_state.current_id==0: st.session_state.db.append(pkt); st.session_state.current_id = pkt['id']
            else: 
                for idx, x in enumerate(st.session_state.db):
                    if x['id']==st.session_state.current_id: st.session_state.db[idx]=pkt
            st.session_state.temp_preview_data = None; st.session_state.show_chart = True; st.rerun()
        if btn_calc:
            st.session_state.temp_preview_data = pkt; st.session_state.show_chart = True

# --- 5. 排盤與時間軸 ---
if st.session_state.show_chart:
    data = st.session_state.temp_preview_data or next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    if data:
        calc_obj = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        p_data, m_star, bur, b_yr = calc_obj.get_result()
        sorted_limits = sorted(p_data.items(), key=lambda x: x[1]['age_start'])

        daxian_idx = st.session_state.sel_daxian_idx
        liunian_off = st.session_state.sel_liunian_offset
        d_pos_idx, d_info = sorted_limits[daxian_idx]
        daxian_pos = int(d_pos_idx)
        start_age = d_info['age_start']
        curr_year = b_yr + start_age + liunian_off - 1
        ln_gan, ln_zhi = get_ganzhi_for_year(curr_year)
        liunian_pos = -1
        for pid, info in p_data.items():
            if info['zhi_idx'] == ln_zhi: liunian_pos = int(pid); break

        # === A. 命盤 ===
        layout = [(5,"巳",1,1),(6,"午",1,2),(7,"未",1,3),(8,"申",1,4),(4,"辰",2,1),(9,"酉",2,4),(3,"卯",3,1),(10,"戌",3,4),(2,"寅",4,1),(1,"丑",4,2),(0,"子",4,3),(11,"亥",4,4)]
        cells_html = ""
        for idx, branch, r, c in layout:
            info = p_data[str(idx)] if str(idx) in p_data else p_data[idx]
            classes = []
            markers = ""
            if idx == daxian_pos: classes.append("active-daxian"); markers += '<div class="marker-daxian">大限</div>'
            if idx == liunian_pos: classes.append("active-liunian"); markers += '<div class="marker-liunian">流年</div>'
            
            cell_html = f'<div class="zwds-cell {" ".join(classes)}" style="grid-row: {r}; grid-column: {c};">'
            cell_html += f'<div class="cell-stars">{" ".join(info["stars"])}</div>'
            cell_html += f'<div class="cell-age">{info["age_start"]}-{info["age_end"]}</div>{markers}'
            cell_html += f'<div style="flex-grow:1"></div><div class="cell-name">{info["name"]}</div><div class="cell-ganzhi">{GAN[info["gan_idx"]]}{branch}</div></div>'
            cells_html += cell_html

        center_html = f'<div class="zwds-center"><h3 style="margin:0;color:#d4a0ff;">{data["name"]}</h3><div style="color:#aaa;font-size:12px;">{data["gender"]}|{bur}</div>'
        center_html += f'<div style="margin-top:5px;color:#4CAF50;">{data["y"]}/{data["m"]}/{data["d"]} {data["h"]}:{data["min"]:02d}</div>'
        center_html += f'<hr style="width:80%;border-color:#444;margin:5px 0;"><div style="color:#fff;">命宮: {data.get("ming_star","")}</div></div>'
        st.markdown(f'<div class="zwds-grid">{cells_html}{center_html}</div>', unsafe_allow_html=True)
        
        # === B. 無縫控制列 (Seamless Strip) ===
        limit_names = ["一限", "二限", "三限", "四限", "五限", "六限", "七限", "八限", "九限", "十限", "十一", "十二"]
        
        # Row 1: 大限
        cols_d = st.columns(12)
        for i, col in enumerate(cols_d):
            pos_idx, info = sorted_limits[i]
            gz = f"{GAN[info['gan_idx']]}{ZHI[info['zhi_idx']]}"
            label = f"{limit_names[i]}{gz}" # 移除換行符，嘗試單行
            is_selected = (i == daxian_idx)
            btn_type = "primary" if is_selected else "secondary"
            if col.button(label, key=f"d_{i}", type=btn_type, use_container_width=True):
                st.session_state.sel_daxian_idx = i; st.session_state.sel_liunian_offset = 0; st.rerun()

        # 垂直縫隙消除術 (Super Gap Killer) - 增加負值以抵銷容器 padding
        st.markdown('<div style="margin-top: -30px;"></div>', unsafe_allow_html=True)

        # Row 2: 流年
        cols_l = st.columns(10)
        for j, col in enumerate(cols_l):
            age = d_info['age_start'] + j
            yr = b_yr + age - 1
            gy, zy = get_ganzhi_for_year(yr)
            gz = f"{GAN[gy]}{ZHI[zy]}"
            label = f"{yr}{gz}\n{age}"
            is_selected = (j == liunian_off)
            btn_type = "primary" if is_selected else "secondary"
            if col.button(label, key=f"l_{j}", type=btn_type, use_container_width=True):
                st.session_state.sel_liunian_offset = j; st.rerun()

        # JS/CSS 注入
        st.markdown("""
        <style>
            div.stButton > button[kind="primary"] {
                background-color: #4B0082 !important;
                border-color: #9933ff !important;
                color: white !important;
            }
        </style>
        """, unsafe_allow_html=True)
