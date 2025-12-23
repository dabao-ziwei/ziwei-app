import streamlit as st
import time
from lunar_python import Lunar, Solar

# ==========================================
# 1. 頁面設定與 CSS 樣式 (v5.0 白底/直書/四化修正版)
# ==========================================
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="wide")

st.markdown("""
<style>
    /* === 全局設定：白底黑字 === */
    .stApp { background-color: #ffffff; color: #000000; }
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    header {visibility: hidden;}
    
    .block-container { padding-top: 1rem; padding-bottom: 2rem; }
    [data-testid="stVerticalBlock"] { gap: 0px !important; }
    
    /* === 命盤網格 === */
    .zwds-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 160px); /* 加高高度，確保底部資訊不被切到 */
        gap: 0; /* 貼合 */
        background-color: #000; /* 格線顏色 */
        border: 2px solid #000; /* 外框加粗 */
        margin-bottom: 20px;
        font-family: "Microsoft JhengHei", "Heiti TC", sans-serif;
        max-width: 1200px;
        margin-left: auto;
        margin-right: auto;
    }
    
    @media (max-width: 800px) {
        .zwds-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: auto;
        }
    }

    /* 單一宮位卡片 */
    .zwds-cell {
        background-color: #ffffff;
        border: 1px solid #ccc; /* 內格線 */
        padding: 4px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 100%;
        overflow: hidden;
    }

    /* 狀態高亮 (邊框加粗變色) */
    .active-daxian { background-color: #f5f5f5 !important; border: 2px solid #666 !important; }
    .active-liunian { border: 3px solid #007bff !important; z-index: 5; } /* 流年藍框 */
    .active-benming { border: 2px solid #d32f2f !important; } /* 暫留 */

    /* === 星曜區塊 === */
    .stars-box {
        display: flex;
        flex-direction: row; 
        flex: 1;
        min-height: 0;
        align-items: flex-start;
    }

    /* 左側：主星欄 */
    .main-stars-col {
        display: flex;
        flex-direction: row; /* 雙星並排 */
        padding-right: 4px;
        margin-right: 4px;
        border-right: 1px dashed #ccc;
    }

    /* 主星樣式 */
    .star-major {
        font-size: 18px; /* 大於12號字 */
        font-weight: 900;
        line-height: 1.1;
        color: #000; /* 黑字 */
        writing-mode: vertical-rl;
        margin-left: 4px;
        position: relative;
        letter-spacing: 2px;
    }
    
    /* 輔星/煞星欄 (羊陀祿存等) - 強制直書 */
    .sub-stars-col {
        display: flex;
        flex-direction: row-reverse; /* 讓星星從右向左排列 */
        flex-wrap: wrap-reverse;
        align-content: flex-start;
        gap: 4px;
    }

    /* 乙級星/煞星樣式 (直書) */
    .star-medium {
        font-size: 14px; /* 清晰可見 */
        font-weight: bold;
        writing-mode: vertical-rl; /* 關鍵：直書 */
        line-height: 1;
        color: #333;
    }
    
    /* 丙級/雜曜樣式 (可小一點) */
    .star-small {
        font-size: 10px;
        color: #666;
        writing-mode: vertical-rl;
        line-height: 1;
        margin-top: 2px;
    }
    
    /* 顏色定義 */
    .color-bad { color: #d32f2f !important; } /* 煞星紅 */
    .color-good { color: #2e7d32 !important; } /* 吉星綠 */
    
    /* === 四化標籤系統 (修正版) === */
    .hua-badge {
        font-size: 10px;
        border-radius: 2px;
        padding: 1px 2px;
        position: absolute;
        bottom: -12px; 
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        writing-mode: horizontal-tb;
        font-weight: normal;
        box-shadow: 0 1px 2px rgba(0,0,0,0.2);
    }
    /* 依照指示配色 */
    .bg-ben { background-color: #d32f2f; color: #fff; } /* 本命：紅底白字 */
    .bg-da  { background-color: #808080; color: #fff; } /* 大限：灰底白字 */
    .bg-liu { background-color: #0056b3; color: #fff; } /* 流年：藍底白字 */

    /* === 底部資訊區 === */
    .cell-footer {
        margin-top: 2px;
        border-top: 1px solid #eee;
        padding-top: 2px;
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
    }

    .footer-left {
        display: flex;
        flex-direction: column;
        line-height: 1;
    }
    
    .ganzhi-label { color: #666; font-size: 12px; font-weight: bold; }
    .zhi-label { color: #000; font-size: 16px; font-weight: 900; }

    .footer-right {
        text-align: right;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        line-height: 1.1;
    }

    .palace-name { font-size: 14px; font-weight: 900; color: #000; }
    .limit-info { font-size: 12px; color: #444; font-weight: bold; }
    
    /* 流運標籤 */
    .status-tags { display: flex; gap: 2px; margin-top: 2px; }
    .tag-flow { font-size: 10px; padding: 1px 3px; border-radius: 2px; color: white; font-weight: bold; }
    .tag-liu { background-color: #0056b3; } /* 流命藍 */
    .tag-da { background-color: #666; } /* 大限灰 */

    /* 中宮資訊 */
    .center-info-box {
        grid-column: 2 / 4; grid-row: 2 / 4;
        background-color: #fff;
        display: flex; flex-direction: column;
        justify-content: center; align-items: center; text-align: center;
        border: 1px solid #ccc;
        color: #000;
        height: 100%;
    }

    /* 按鈕樣式 (白底風格) */
    div.stButton > button {
        width: 100%; border-radius: 0; border: 1px solid #ccc; 
        font-size: 12px; height: auto; min-height: 35px;
        background-color: #f9f9f9; color: #333;
        margin: 0; padding: 2px 0;
    }
    div.stButton > button:hover { border-color: #999; background-color: #e9e9e9; color: #000; }
    /* 選中狀態：深紫 */
    div.stButton > button[kind="primary"] { 
        background-color: #4B0082 !important; 
        color: white !important; 
        border: 1px solid #4B0082 !important; 
    }

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
        
        # 參數: (名稱, 是否為煞星, 是否為重要乙級星)
        self.palaces[lu_idx]["minor_stars"].append(("祿存", False, True)) 
        self.palaces[(lu_idx+1)%12]["minor_stars"].append(("擎羊", True, True)) 
        self.palaces[(lu_idx-1)%12]["minor_stars"].append(("陀羅", True, True)) 
        
        # 示範用，之後可依需求恢復安星
        # self.palaces[(self.ming_pos + 4)%12]["minor_stars"].append(("火星", True, True))

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
# 5. 排盤顯示核心 (白底直書版)
# ==========================================
if st.session_state.show_chart:
    data = st.session_state.temp_preview_data or next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    if data:
        calc_obj = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        
        sorted_limits = sorted(calc_obj.palaces.items(), key=lambda x: x[1]['age_start'])
        daxian_idx = st.session_state.sel_daxian_idx
        liunian_off = st.session_state.sel_liunian_offset
        d_pos_idx, d_info = sorted_limits[daxian_idx]
        daxian_pos = int(d_pos_idx)
        
        curr_year = data['y'] + d_info['age_start'] + liunian_off - 1
        daxian_gan = d_info['gan_idx']
        ln_gan, ln_zhi = get_ganzhi_for_year(curr_year)
        
        calc_obj.calculate_sihua(daxian_gan, ln_gan)
        
        liunian_pos = -1
        for pid, info in calc_obj.palaces.items():
            if info['zhi_idx'] == ln_zhi: liunian_pos = int(pid); break

        layout = [(5,"巳",1,1),(6,"午",1,2),(7,"未",1,3),(8,"申",1,4),
                  (4,"辰",2,1),                    (9,"酉",2,4),
                  (3,"卯",3,1),                    (10,"戌",3,4),
                  (2,"寅",4,1),(1,"丑",4,2),(0,"子",4,3),(11,"亥",4,4)]
        
        cells_html = ""
        for idx, branch, r, c in layout:
            info = calc_obj.palaces[idx]
            
            classes = []
            if idx == daxian_pos: classes.append("active-daxian")
            if idx == liunian_pos: classes.append("active-liunian")
            
            # --- 主星 (直書，不換行) ---
            main_stars_html = ""
            for star in info['major_stars']:
                sihua_html = ""
                # 四化標籤渲染：顏色判斷
                for sh in star['sihua']:
                    layer_cls = ""
                    if sh['layer'] == '本': layer_cls = "bg-ben"
                    elif sh['layer'] == '大': layer_cls = "bg-da"
                    elif sh['layer'] == '流': layer_cls = "bg-liu"
                    # 顯示文字：本忌、大祿...
                    sihua_html += f'<span class="hua-badge {layer_cls}">{sh["layer"]}{sh["type"]}</span>'
                
                main_stars_html += f'<div class="star-major">{star["name"]}{sihua_html}</div>'
            
            # --- 副星/煞星 (直書) ---
            sub_stars_html = ""
            for m_name, is_bad, is_impt in info['minor_stars']:
                # 配色
                if m_name == "祿存": style_cls = "color-good"
                elif is_bad: style_cls = "color-bad"
                else: style_cls = ""
                
                # 字體大小控制
                size_cls = "star-medium" if is_impt else "star-small"
                
                sub_stars_html += f'<div class="{size_cls} {style_cls}">{m_name}</div>'
            
            # --- 狀態標籤 ---
            status_tags = ""
            if (idx == liunian_pos): status_tags += '<div class="tag-flow tag-liu">流命</div>'
            if (idx == daxian_pos): status_tags += '<div class="tag-flow tag-da">大限</div>'
            
            # --- 組合 Cell HTML ---
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
            cell_html += '</div></div></div>'
            
            cells_html += cell_html
            
        # 中宮
        center_html = '<div class="center-info-box">'
        center_html += f'<h3 style="margin:0;color:#000;font-size:24px;">{data["name"]}</h3>'
        center_html += f'<div style="color:#666;font-size:14px;margin:3px 0;">{data["gender"]} | {calc_obj.bureau_name} | {data.get("ming_star","")}坐命</div>'
        center_html += f'<div style="color:#2e7d32;font-size:14px;font-weight:bold;">國曆：{data["y"]}/{data["m"]}/{data["d"]} {data["h"]}:{data["min"]:02d}</div>'
        center_html += f'<div style="color:#555;font-size:12px;">農曆：{calc_obj.lunar.getYearInGanZhi()}年 {calc_obj.lunar.getMonthInChinese()}月 {calc_obj.lunar.getDayInChinese()}</div>'
        center_html += '</div>'
        
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
