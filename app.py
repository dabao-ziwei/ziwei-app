import streamlit as st
import time
from lunar_python import Lunar, Solar

# --- 1. 頁面設定與 CSS 樣式 (v2.0 專業版) ---
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="centered")

st.markdown("""
<style>
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* 全局佈局去縫隙 */
    [data-testid="stVerticalBlock"] { gap: 0px !important; }
    .element-container { margin-bottom: 0px !important; }
    [data-testid="column"] { padding: 0px !important; min-width: 0px !important; }
    [data-testid="stHorizontalBlock"] { gap: 0px !important; }
    .block-container { padding-top: 1rem; padding-bottom: 3rem; }

    /* === 命盤網格系統 === */
    .zwds-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-template-rows: 140px 140px 140px 140px; /* 增加高度以容納豐富資訊 */
        gap: 2px;
        background-color: #444; 
        border: 2px solid #333;
        margin-bottom: 5px;
        font-family: "Microsoft JhengHei", sans-serif;
    }
    
    /* 單一宮位容器 */
    .zwds-cell {
        background-color: #222;
        color: #fff;
        padding: 4px;
        position: relative;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #333;
        cursor: pointer;
    }
    
    /* 狀態高亮 */
    .zwds-cell.active-daxian { background-color: #1a2a40 !important; border: 1px solid #4da6ff; }
    .zwds-cell.active-liunian { border: 2px solid #ff4d4d !important; z-index: 10; }
    .zwds-cell.active-daxian.active-liunian { background-color: #2a1a30 !important; border: 2px solid #ff4dff !important; }

    /* === 2. 宮位內部佈局 (複雜排版核心) === */
    
    /* A. 左上：主星區 (直排) */
    .star-section {
        display: flex;
        flex-direction: row; /* 星曜並排 */
        gap: 4px;
        align-items: flex-start;
    }
    
    /* 單顆星曜直排容器 */
    .major-star-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 16px; /* 固定寬度確保對齊 */
    }
    
    .star-name {
        font-size: 14px;
        font-weight: bold;
        line-height: 1.1;
        writing-mode: vertical-rl; /* 直排文字 */
        letter-spacing: 2px;
    }
    
    /* 星曜亮度 (廟旺利陷) */
    .star-bright {
        font-size: 10px;
        color: #aaa;
        margin-top: 2px;
        transform: scale(0.9);
    }
    
    /* 四化標籤 (科祿權忌) */
    .sihua-badge {
        font-size: 10px;
        color: #fff;
        padding: 1px 2px;
        border-radius: 2px;
        margin-top: 2px;
        line-height: 1;
        font-weight: bold;
        width: 14px;
        text-align: center;
    }
    .sh-lu { background-color: #2E7D32; } /* 祿-綠 */
    .sh-quan { background-color: #1565C0; } /* 權-藍 */
    .sh-ke { background-color: #D84315; } /* 科-紅/橘 */
    .sh-ji { background-color: #C62828; } /* 忌-深紅 */

    /* B. 左下：雜曜與神煞區 */
    .minor-star-section {
        margin-top: auto; /* 推到底部 */
        display: flex;
        flex-wrap: wrap;
        gap: 2px;
        width: 75%; /* 留空間給右邊 */
    }
    .minor-star {
        font-size: 10px;
        color: #ccc;
        margin-right: 2px;
    }
    /* 煞星特定顏色 */
    .bad-star { color: #ff9999; }
    /* 吉星特定顏色 */
    .good-star { color: #99ccff; }

    /* C. 右側：宮位名稱堆疊 (直排) */
    .palace-name-stack {
        position: absolute;
        bottom: 2px;
        right: 18px; /* 留給干支 */
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
    }
    
    .p-name { font-size: 11px; padding: 0 2px; border-radius: 2px; writing-mode: horizontal-tb; }
    .p-ben { color: #aaa; } /* 本命宮名 */
    .p-da { color: #4da6ff; font-weight: bold; } /* 大限宮名 */
    .p-liu { color: #ff4d4d; font-weight: bold; background: rgba(50,0,0,0.5); } /* 流年宮名 */

    /* D. 最右側：干支 (直排) */
    .ganzhi-col {
        position: absolute;
        top: 2px;
        right: 2px;
        bottom: 2px;
        width: 14px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: center;
        background-color: #333;
        border-radius: 2px;
    }
    .ganzhi-text {
        writing-mode: vertical-rl;
        font-size: 12px;
        font-weight: bold;
        color: #fff;
        letter-spacing: 4px;
        margin-bottom: 4px;
    }

    /* 中間資料區 */
    .zwds-center {
        grid-column: 2 / 4; grid-row: 2 / 4;
        background-color: #111;
        display: flex; flex-direction: column;
        justify_content: center; align-items: center; text-align: center;
        border: 1px solid #444; padding: 5px; color: #fff;
    }

    /* === 3. 表格化按鈕 (Strip Style) === */
    div.stButton > button {
        width: 100%; border-radius: 0px; border: 1px solid #444; margin-right: -1px; margin-bottom: -1px; padding: 4px 0px !important; 
        font-size: 11px !important; white-space: pre-wrap !important; line-height: 1.3 !important;
        height: auto; min-height: 45px; background-color: #222; color: #bbb; transition: background-color 0.1s;
    }
    div.stButton > button:hover { background-color: #333; color: #fff; border-color: #666; z-index: 2; }
    div.stButton > button.daxian-active { background-color: #4B0082 !important; color: #fff !important; border: 1px solid #d4a0ff !important; font-weight: bold; z-index: 5; }
    div.stButton > button.liunian-active { background-color: #006080 !important; color: #fff !important; border: 1px solid #4da6ff !important; font-weight: bold; z-index: 5; }
    div.stButton > button p { font-size: 10px; }
</style>
""", unsafe_allow_html=True)

# --- 2. 紫微斗數運算核心 (v2.0 Enhanced) ---
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

        # 初始化資料結構 (擴充版)
        self.palaces = {i: {
            "name": "", 
            "major_stars": [], # [{'name':'紫微', 'bright':'廟', 'sihua':['祿(本)']}]
            "minor_stars": [], # ['天魁', '天鉞']
            "gan_idx": 0, 
            "zhi_idx": i, 
            "age_start": 0, 
            "age_end": 0
        } for i in range(12)}
        
        self._calc_palaces()
        self._calc_bureau()
        self._calc_main_stars()
        self._calc_minor_stars() # 新增: 雜曜
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
        # 紫微星定位
        b = self.bureau_num; d = self.lunar_day
        if d % b == 0: q = d // b; zp = (2 + q - 1) % 12 
        else: rem = d % b; add = b - rem; q = (d + add) // b; zp = (2 + q - 1 - add) % 12 if add % 2 == 1 else (2 + q - 1 + add) % 12
        
        # 定義星曜顏色與亮度 (模擬)
        # 這裡為了展示，隨機給定亮度，實際應用需完整查表
        def add_star(idx, name, is_bad=False):
            bright = "廟" if (idx + self.time_zhi_idx) % 3 == 0 else ("陷" if (idx)%4==0 else "利") # 假邏輯模擬
            self.palaces[idx]["major_stars"].append({'name': name, 'bright': bright, 'sihua': [], 'is_bad': is_bad})

        zw_map = {0:"紫微", -1:"天機", -3:"太陽", -4:"武曲", -5:"天同", -8:"廉貞"}
        for off, name in zw_map.items(): add_star((zp + off)%12, name)
            
        tp = (4 - zp) % 12
        tf_map = {0:"天府", 1:"太陰", 2:"貪狼", 3:"巨門", 4:"天相", 5:"天梁", 6:"七殺", 10:"破軍"}
        for off, name in tf_map.items(): add_star((tp + off)%12, name)
        
        self.ming_star = self.palaces[self.ming_pos]["major_stars"][0]['name'] if self.palaces[self.ming_pos]["major_stars"] else ""

    def _calc_minor_stars(self):
        # 模擬安雜曜 (煞星與吉星)
        # 煞星: 擎羊, 陀羅, 火星, 鈴星, 地空, 地劫
        # 這裡僅作簡單模擬，實際需完整公式
        # 擎羊(前), 陀羅(後) 依年干
        lu_pos = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0] # 甲~癸 祿存位置 (模擬)
        lu_idx = lu_pos[self.year_gan_idx]
        
        self.palaces[(lu_idx+1)%12]["minor_stars"].append(("擎羊", True)) # True=煞星
        self.palaces[(lu_idx-1)%12]["minor_stars"].append(("陀羅", True))
        
        # 模擬長生十二神 (僅列出臨官)
        self.palaces[(self.ming_pos + 4)%12]["minor_stars"].append(("臨官", False))
        
        # 模擬博士十二神
        self.palaces[(self.ming_pos + 1)%12]["minor_stars"].append(("力士", False))

    def calculate_sihua(self, daxian_gan_idx, liunian_gan_idx):
        # 四化表 (甲...癸) -> [祿, 權, 科, 忌]
        # 庚干特殊處理：陽武同相
        sihua_table = [
            ["廉貞", "破軍", "武曲", "太陽"], # 甲
            ["天機", "天梁", "紫微", "太陰"], # 乙
            ["天同", "天機", "文昌", "廉貞"], # 丙
            ["太陰", "天同", "天機", "巨門"], # 丁
            ["貪狼", "太陰", "右弼", "天機"], # 戊
            ["武曲", "貪狼", "天梁", "文曲"], # 己
            ["太陽", "武曲", "天同", "天相"], # 庚 (您的要求)
            ["巨門", "太陽", "文曲", "文昌"], # 辛
            ["天梁", "紫微", "左輔", "武曲"], # 壬
            ["破軍", "巨門", "太陰", "貪狼"]  # 癸
        ]
        
        layers = [
            (self.year_gan_idx, "本"), # 本命
            (daxian_gan_idx, "大"),    # 大限
            (liunian_gan_idx, "流")    # 流年
        ]
        
        types = ["祿", "權", "科", "忌"]
        
        # 遍歷所有宮位的所有星曜
        for pid, palace in self.palaces.items():
            for star in palace["major_stars"]:
                star['sihua'] = [] # 重置
                s_name = star['name']
                
                # 檢查三層四化
                for gan_idx, layer_name in layers:
                    stars_list = sihua_table[gan_idx]
                    if s_name in stars_list:
                        s_type = types[stars_list.index(s_name)]
                        star['sihua'].append({'type': s_type, 'layer': layer_name})

    def get_result(self):
        return self.palaces, self.ming_star, self.bureau_name, self.birth_year, self.ming_pos

# --- 3. 狀態與輔助 ---
if 'db' not in st.session_state: st.session_state.db = [] 
if 'current_id' not in st.session_state: st.session_state.current_id = 0
if 'show_chart' not in st.session_state: st.session_state.show_chart = False
if 'temp_preview_data' not in st.session_state: st.session_state.temp_preview_data = None
if 'sel_daxian_idx' not in st.session_state: st.session_state.sel_daxian_idx = 0 
if 'sel_liunian_offset' not in st.session_state: st.session_state.sel_liunian_offset = 0 

GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
PALACE_NAMES = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "交友", "官祿", "田宅", "福德", "父母"]

def parse_date(d):
    try:
        d = d.strip()
        if len(d)==8: return int(d[:4]), int(d[4:6]), int(d[6:]), "西元"
        elif len(d)==7: return int(d[:3])+1911, int(d[3:5]), int(d[5:]), "民國"
        elif len(d)==6: return int(d[:2])+1911, int(d[2:4]), int(d[4:]), "民國"
    except: return 0,0,0,""
    return 0,0,0,""

def get_ganzhi_for_year(year): return (year - 1984) % 10, (year - 1984) % 12

# --- 4. 介面 ---
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

# --- 5. 排盤與時間軸 ---
if st.session_state.show_chart:
    data = st.session_state.temp_preview_data or next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    if data:
        # 重建運算物件
        calc_obj = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        
        # 準備資料
        sorted_limits = sorted(calc_obj.palaces.items(), key=lambda x: x[1]['age_start'])
        daxian_idx = st.session_state.sel_daxian_idx
        liunian_off = st.session_state.sel_liunian_offset
        d_pos_idx, d_info = sorted_limits[daxian_idx]
        daxian_pos = int(d_pos_idx)
        start_age = d_info['age_start']
        curr_year = data['y'] + start_age + liunian_off - 1 # 出生年+虛歲-1
        
        # 取得大限與流年天干 (關鍵：用於四化疊加)
        daxian_gan = d_info['gan_idx']
        ln_gan, ln_zhi = get_ganzhi_for_year(curr_year)
        
        # 執行四化飛星
        calc_obj.calculate_sihua(daxian_gan, ln_gan)
        
        # 找出流年命宮位置
        liunian_pos = -1
        for pid, info in calc_obj.palaces.items():
            if info['zhi_idx'] == ln_zhi: liunian_pos = int(pid); break
            
        # 計算宮位重疊名稱 (本命/大限/流年)
        # 本命命宮 = calc_obj.ming_pos
        # 大限命宮 = daxian_pos
        # 流年命宮 = liunian_pos
        # 每個格子的相對位置
        def get_stacked_names(cell_idx, ben_ming_idx, da_ming_idx, liu_ming_idx):
            # 1. 本命 (固定)
            offset_ben = (ben_ming_idx - cell_idx) % 12
            n1 = PALACE_NAMES[offset_ben]
            # 2. 大限 (相對大限命宮)
            offset_da = (da_ming_idx - cell_idx) % 12
            n2 = "大" + PALACE_NAMES[offset_da][0] # 取首字 e.g. 大子
            # 3. 流年 (相對流年命宮)
            offset_liu = (liu_ming_idx - cell_idx) % 12
            n3 = "流" + PALACE_NAMES[offset_liu][0] # 取首字 e.g. 流命
            return n1, n2, n3

        # A. 命盤區
        layout = [(5,"巳",1,1),(6,"午",1,2),(7,"未",1,3),(8,"申",1,4),(4,"辰",2,1),(9,"酉",2,4),(3,"卯",3,1),(10,"戌",3,4),(2,"寅",4,1),(1,"丑",4,2),(0,"子",4,3),(11,"亥",4,4)]
        cells_html = ""
        for idx, branch, r, c in layout:
            info = calc_obj.palaces[idx]
            classes = []; markers = ""
            if idx == daxian_pos: classes.append("active-daxian"); 
            if idx == liunian_pos: classes.append("active-liunian"); 
            
            # 星曜 HTML 生成 (直排 + 亮度 + 四化)
            stars_html = '<div class="star-section">'
            for star in info['major_stars']:
                color_cls = "color:#d4a0ff;" # 主星預設紫
                if star.get('is_bad'): color_cls = "color:#ff9999;" # 煞星紅
                
                # 四化標籤
                sihua_html = ""
                for sh in star['sihua']: # sh = {'type':'祿', 'layer':'本'}
                    # 顏色
                    bg_cls = {"祿":"sh-lu", "權":"sh-quan", "科":"sh-ke", "忌":"sh-ji"}[sh['type']]
                    sihua_html += f'<div class="sihua-badge {bg_cls}">{sh["type"]}</div>' # 暫時只顯示 祿/權...
                
                stars_html += f'''
                <div class="major-star-col">
                    <div class="star-name" style="{color_cls}">{star['name']}</div>
                    <div class="star-bright">{star['bright']}</div>
                    {sihua_html}
                </div>
                '''
            stars_html += '</div>'
            
            # 雜曜 HTML
            minor_html = '<div class="minor-star-section">'
            for m_name, is_bad in info['minor_stars']:
                cls = "bad-star" if is_bad else "good-star"
                minor_html += f'<span class="minor-star {cls}">{m_name}</span>'
            minor_html += '</div>'
            
            # 宮位名稱堆疊 (本/大/流)
            n_ben, n_da, n_liu = get_stacked_names(idx, calc_obj.ming_pos, daxian_pos, liunian_pos)
            names_html = f'''
            <div class="palace-name-stack">
                <div class="p-name p-liu">{n_liu}</div>
                <div class="p-name p-da">{n_da}</div>
                <div class="p-name p-ben">{n_ben}</div>
            </div>
            '''
            
            # 干支 (直排)
            ganzhi_html = f'''
            <div class="ganzhi-col">
                <div class="ganzhi-text">{GAN[info['gan_idx']]}<br>{branch}</div>
            </div>
            '''

            cell_html = f'<div class="zwds-cell {" ".join(classes)}" style="grid-row: {r}; grid-column: {c};">'
            cell_html += stars_html
            cell_html += minor_html
            cell_html += names_html
            cell_html += ganzhi_html
            cell_html += f'<div class="cell-age">{info["age_start"]}-{info["age_end"]}</div>' # 歲數放回右上角
            cell_html += '</div>'
            cells_html += cell_html

        center_html = f'<div class="zwds-center"><h3 style="margin:0;color:#d4a0ff;">{data["name"]}</h3><div style="color:#aaa;font-size:12px;">{data["gender"]}|{calc_obj.bureau_name}</div>'
        center_html += f'<div style="margin-top:5px;color:#4CAF50;">{data["y"]}/{data["m"]}/{data["d"]} {data["h"]}:{data["min"]:02d}</div>'
        center_html += f'<hr style="width:80%;border-color:#444;margin:5px 0;"><div style="color:#fff;">命宮: {data.get("ming_star","")}</div></div>'
        st.markdown(f'<div class="zwds-grid">{cells_html}{center_html}</div>', unsafe_allow_html=True)
        
        # B. 無縫控制列
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

        st.markdown("""
        <style>
            div.stButton > button[kind="primary"] { background-color: #4B0082 !important; border-color: #9933ff !important; color: white !important; }
        </style>
        """, unsafe_allow_html=True)
