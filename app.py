import streamlit as st
import time
from lunar_python import Lunar, Solar

# --- 1. 頁面設定與 CSS 樣式 ---
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
        margin-top: 10px;
        font-family: "Microsoft JhengHei", sans-serif;
    }
    
    /* 宮位格子基礎 */
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
    }
    
    /* 狀態 A: 被選中的【大限】宮位 (深藍背景) */
    .zwds-cell.active-daxian {
        background-color: #1a2a40 !important; 
        border: 1px solid #4da6ff;
        box-shadow: inset 0 0 15px rgba(77, 166, 255, 0.3);
    }

    /* 狀態 B: 被選中的【流年】宮位 (紅色邊框 + 微紅光) */
    .zwds-cell.active-liunian {
        border: 2px solid #ff4d4d !important;
        box-shadow: inset 0 0 10px rgba(255, 77, 77, 0.4);
    }
    
    /* 狀態 AB: 大限與流年重疊 (紫光) */
    .zwds-cell.active-daxian.active-liunian {
        background-color: #2a1a30 !important;
        border: 2px solid #ff4dff !important;
    }

    /* 標籤顯示 */
    .marker-daxian {
        position: absolute; top: 20px; right: 2px;
        background-color: #004d99; color: #fff;
        font-size: 10px; padding: 1px 3px; border-radius: 3px;
    }
    .marker-liunian {
        position: absolute; top: 36px; right: 2px;
        background-color: #990000; color: #fff;
        font-size: 10px; padding: 1px 3px; border-radius: 3px;
    }

    /* 中間命主資料區 */
    .zwds-center {
        grid-column: 2 / 4;
        grid-row: 2 / 4;
        background-color: #111;
        display: flex;
        flex-direction: column;
        justify_content: center;
        align-items: center;
        text-align: center;
        border: 1px solid #444;
        padding: 5px;
        color: #fff;
    }
    
    /* 字體樣式 */
    .cell-stars { color: #d4a0ff; font-weight: bold; font-size: 14px; line-height: 1.2; }
    .cell-age { position: absolute; top: 2px; right: 4px; color: #ffeb3b; font-size: 12px; font-weight: bold;}
    .cell-name { position: absolute; bottom: 2px; left: 4px; background-color: #444; color: #ccc; padding: 0 3px; font-size: 11px; border-radius: 2px; }
    .cell-ganzhi { position: absolute; bottom: 2px; right: 4px; color: #aaa; font-weight: bold; font-size: 13px; }
    
    /* 按鈕群組優化 */
    .stRadio > div { flex-direction: row; overflow-x: auto; }
</style>
""", unsafe_allow_html=True)

# --- 2. 紫微斗數運算核心 (Engine v3) ---
class ZWDSCalculator:
    def __init__(self, year, month, day, hour, minute, gender):
        self.solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
        self.lunar = self.solar.getLunar()
        self.gender = gender 
        self.birth_year = year # 紀錄出生西元年，算歲數用
        
        self.lunar_month = self.lunar.getMonth()
        self.lunar_day = self.lunar.getDay()
        self.time_zhi_idx = (hour + 1) // 2 % 12
        self.year_gan_idx = self.lunar.getYearGanIndex() 
        self.year_zhi_idx = self.lunar.getYearZhiIndex() 
        
        # 陰陽順逆
        is_yang_year = (self.year_gan_idx % 2 == 0)
        is_male = (self.gender == "男")
        self.direction = 1 if (is_yang_year and is_male) or (not is_yang_year and not is_male) else -1 

        # 初始化 12 宮
        self.palaces = {i: {"name": "", "stars": [], "gan_idx": 0, "zhi_idx": i, "age_start": 0, "age_end": 0} for i in range(12)}
        
        self._calc_palaces()    
        self._calc_bureau()      
        self._calc_main_stars()  
        self._calc_daxian()      

    def _calc_palaces(self):
        # 安命身
        start_idx = 2 
        self.ming_pos = (start_idx + (self.lunar_month - 1) - self.time_zhi_idx) % 12
        self.shen_pos = (start_idx + (self.lunar_month - 1) + self.time_zhi_idx) % 12

        names = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "交友", "官祿", "田宅", "福德", "父母"]
        for i in range(12):
            pos = (self.ming_pos - i) % 12
            self.palaces[pos]["name"] = names[i]
            if pos == self.shen_pos: self.palaces[pos]["name"] += "(身宮)"
            
        # 安宮干 (五虎遁)
        start_gan = (self.year_gan_idx % 5) * 2 + 2
        for i in range(12):
            offset = (i - 2) % 12 
            gan = (start_gan + offset) % 10
            self.palaces[i]["gan_idx"] = gan

    def _calc_bureau(self):
        # 五行局
        m_gan = self.palaces[self.ming_pos]["gan_idx"]
        m_zhi = self.ming_pos
        table = {0: [4,4,6,6,5,5,4,4,6,6,5,5], 1: [2,2,5,5,6,6,2,2,5,5,6,6], 
                 2: [6,6,3,3,5,5,6,6,3,3,5,5], 3: [5,5,4,4,3,3,5,5,4,4,3,3], 
                 4: [3,3,4,4,2,2,3,3,4,4,2,2]}
        self.bureau_num = table[m_gan // 2][m_zhi]
        self.bureau_name = {2:"水二局", 3:"木三局", 4:"金四局", 5:"土五局", 6:"火六局"}[self.bureau_num]

    def _calc_daxian(self):
        # 大限
        start_age = self.bureau_num
        for i in range(12):
            offset = i if self.direction == 1 else -i
            pos = (self.ming_pos + offset) % 12
            end_age = start_age + 9
            self.palaces[pos]["age_start"] = start_age
            self.palaces[pos]["age_end"] = end_age
            start_age += 10

    def _calc_main_stars(self):
        # 紫微與諸星
        b = self.bureau_num
        d = self.lunar_day
        if d % b == 0: q = d // b; ziwei_pos = (2 + q - 1) % 12 
        else:
            rem = d % b; add = b - rem; q = (d + add) // b
            ziwei_pos = (2 + q - 1 - add) % 12 if add % 2 == 1 else (2 + q - 1 + add) % 12
        
        zw_map = {0:"紫微", -1:"天機", -3:"太陽", -4:"武曲", -5:"天同", -8:"廉貞"}
        for off, name in zw_map.items(): self.palaces[(ziwei_pos + off)%12]["stars"].append(name)
            
        tianfu_pos = (4 - ziwei_pos) % 12
        tf_map = {0:"天府", 1:"太陰", 2:"貪狼", 3:"巨門", 4:"天相", 5:"天梁", 6:"七殺", 10:"破軍"}
        for off, name in tf_map.items(): self.palaces[(tianfu_pos + off)%12]["stars"].append(name)
            
        self.ming_star = self.palaces[self.ming_pos]["stars"][0] if self.palaces[self.ming_pos]["stars"] else ""

    def get_result(self):
        return self.palaces, self.ming_star, self.bureau_name, self.birth_year

# --- 3. 狀態管理 ---
if 'db' not in st.session_state: st.session_state.db = [] 
if 'current_id' not in st.session_state: st.session_state.current_id = 0
if 'show_chart' not in st.session_state: st.session_state.show_chart = False
if 'temp_preview_data' not in st.session_state: st.session_state.temp_preview_data = None

# 互動狀態：紀錄目前使用者選了哪個「大限」和哪個「流年」
if 'sel_daxian_idx' not in st.session_state: st.session_state.sel_daxian_idx = 0 # 預設第一限
if 'sel_liunian_offset' not in st.session_state: st.session_state.sel_liunian_offset = 0 # 預設大限的第1年

# --- 4. 輔助常數與函式 ---
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
    # 計算某西元年的干支 (簡單公式)
    # 4年=甲子? NO. 1984=甲子. 
    # 干: (year - 4) % 10. 支: (year - 4) % 12
    # 修正: 1984是甲子
    offset = year - 1984
    gan_idx = (0 + offset) % 10
    zhi_idx = (0 + offset) % 12
    return gan_idx, zhi_idx

# --- 5. UI 頂部區 ---
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
            st.session_state.current_id = sel
            st.session_state.show_chart = False 
            st.session_state.temp_preview_data = None
            st.rerun()

# --- 6. 輸入表單 ---
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

# --- 7. 邏輯處理 ---
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
            if st.session_state.current_id==0: 
                st.session_state.db.append(pkt)
                st.session_state.current_id = pkt['id']
            else:
                for idx, x in enumerate(st.session_state.db):
                    if x['id']==st.session_state.current_id: st.session_state.db[idx]=pkt
            st.session_state.temp_preview_data = None
            st.session_state.show_chart = True
            st.rerun()
        if btn_calc:
            st.session_state.temp_preview_data = pkt
            st.session_state.show_chart = True

# --- 8. 排盤顯示與運限互動 ---
if st.session_state.show_chart:
    data = st.session_state.temp_preview_data or next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    if data:
        # 重建運算物件以取得完整方法
        calc_obj = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        p_data, m_star, bur, b_yr = calc_obj.get_result()
        
        # 1. 整理 12 大限資料
        # p_data 裡面的 key 是 '0'...'11' (宮位索引)，我們需要根據 age_start 排序找出第一限、第二限...
        # 建立一個 list: [(宮位idx, 宮位資料), ...]
        sorted_limits = sorted(p_data.items(), key=lambda x: x[1]['age_start'])
        
        # --- UI: 運限選擇器 (仿表格) ---
        st.write("---")
        st.markdown(f"**🌠 {data['name']} 的運限盤**")
        
        # 【第一層：選擇大限】
        limit_options = []
        limit_map = {} # label -> (index_in_sorted, palace_idx, age_start)
        
        limit_names = ["第一限", "第二限", "第三限", "第四限", "第五限", "第六限", "第七限", "第八限", "第九限", "第十限", "十一限", "十二限"]
        
        for i, (pos_idx, info) in enumerate(sorted_limits):
            gz = f"{GAN[info['gan_idx']]}{ZHI[info['zhi_idx']]}"
            label = f"{limit_names[i]} [{gz}] {info['age_start']}-{info['age_end']}歲"
            limit_options.append(label)
            limit_map[label] = (i, int(pos_idx), info['age_start'])

        # 使用 selectbox 當作第一層選擇 (較整齊)
        current_daxian_label = limit_options[st.session_state.sel_daxian_idx]
        selected_daxian = st.selectbox("1. 選擇大限 (十年大運)", limit_options, index=st.session_state.sel_daxian_idx)
        
        # 更新 state
        new_daxian_idx = limit_options.index(selected_daxian)
        if new_daxian_idx != st.session_state.sel_daxian_idx:
            st.session_state.sel_daxian_idx = new_daxian_idx
            st.session_state.sel_liunian_offset = 0 # 重置流年到第一年
            st.rerun()

        # 取得當前大限的資訊
        daxian_order, daxian_palace_pos, daxian_start_age = limit_map[selected_daxian]
        
        # 【第二層：選擇流年】
        # 根據大限起始歲數，算出這 10 年的：歲數、西元年、干支
        liunian_options = [] # 顯示文字
        liunian_data = []    # (year, age, gan_idx, zhi_idx)
        
        for offset in range(10):
            age = daxian_start_age + offset
            # 算出這歲數對應的西元年
            # 出生年(b_yr) = 1歲 (虛歲算法) -> current_year = b_yr + age - 1
            curr_year = b_yr + age - 1
            g_idx, z_idx = get_ganzhi_for_year(curr_year)
            
            gz_str = f"{GAN[g_idx]}{ZHI[z_idx]}"
            label = f"{curr_year} ({gz_str}) {age}歲"
            
            liunian_options.append(label)
            liunian_data.append((curr_year, age, g_idx, z_idx))
            
        # 使用 Radio Button (水平排列) 讓使用者點選流年
        # 為了美觀，用 columns 模擬排版，或者直接用 horizontal radio
        st.write("2. 選擇流年 (每年運勢)")
        selected_liunian_label = st.radio("流年選擇", liunian_options, index=st.session_state.sel_liunian_offset, horizontal=True, label_visibility="collapsed")
        
        # 更新流年 State
        new_liunian_offset = liunian_options.index(selected_liunian_label)
        if new_liunian_offset != st.session_state.sel_liunian_offset:
            st.session_state.sel_liunian_offset = new_liunian_offset
            st.rerun()
            
        # 取得當前流年資訊
        ln_year, ln_age, ln_gan, ln_zhi = liunian_data[new_liunian_offset]
        
        # --- 計算亮燈位置 ---
        # 1. 大限宮位: daxian_palace_pos (已取得)
        # 2. 流年宮位: 流年地支(ln_zhi) 在哪一宮
        #    我們的 p_data key 是宮位索引(0-11)，對應的 zhi_idx 也是 0-11
        #    例如流年是辰(4)，我們就找 zhi_idx == 4 的那個宮位
        liunian_palace_pos = -1
        for pid, info in p_data.items():
            if info['zhi_idx'] == ln_zhi:
                liunian_palace_pos = int(pid)
                break
        
        # --- 繪製命盤 (Grid) ---
        layout = [
            (5, "巳", 1, 1), (6, "午", 1, 2), (7, "未", 1, 3), (8, "申", 1, 4),
            (4, "辰", 2, 1),                                 (9, "酉", 2, 4),
            (3, "卯", 3, 1),                                 (10,"戌", 3, 4),
            (2, "寅", 4, 1), (1, "丑", 4, 2), (0, "子", 4, 3), (11,"亥", 4, 4)
        ]
        
        cells_html = ""
        for idx, branch, r, c in layout:
            info = p_data[str(idx)] if str(idx) in p_data else p_data[idx]
            
            # 判斷 Class
            classes = []
            markers = ""
            
            if idx == daxian_palace_pos:
                classes.append("active-daxian")
                markers += '<div class="marker-daxian">大限</div>'
                
            if idx == liunian_palace_pos:
                classes.append("active-liunian")
                markers += '<div class="marker-liunian">流年</div>'
            
            cls_str = " ".join(classes)
            
            # 內容
            stars = " ".join(info['stars'])
            ganzhi = f"{GAN[info['gan_idx']]}{branch}"
            age_range = f"{info['age_start']}-{info['age_end']}"
            
            cell_html = f'<div class="zwds-cell {cls_str}" style="grid-row: {r}; grid-column: {c};">'
            cell_html += f'<div class="cell-stars">{stars}</div>'
            cell_html += f'<div class="cell-age">{age_range}</div>'
            cell_html += markers
            cell_html += '<div style="flex-grow:1"></div>'
            cell_html += f'<div class="cell-name">{info["name"]}</div>'
            cell_html += f'<div class="cell-ganzhi">{ganzhi}</div>'
            cell_html += '</div>'
            cells_html += cell_html

        center_html = '<div class="zwds-center">'
        center_html += f'<h3 style="margin:0; color:#d4a0ff;">{data["name"]}</h3>'
        center_html += f'<div style="color:#aaa; font-size:12px;">{data["gender"]} | {bur}</div>'
        center_html += f'<div style="margin-top:5px; color:#4CAF50;">{data["cal_type"]} {data["y"]} 年 {data["m"]} 月 {data["d"]} 日</div>'
        center_html += f'<div style="color:#4CAF50;">{data["h"]:02d} 時 {data["min"]:02d} 分</div>'
        center_html += '<hr style="width:80%; border-color:#444; margin:8px 0;">'
        center_html += f'<div style="color:#fff;">命宮主星: {data.get("ming_star","")}</div>'
        # 顯示目前選到的時空
        center_html += f'<div style="margin-top:5px; background:#1a2a40; padding:4px; border-radius:4px; font-size:13px;">'
        center_html += f'<span style="color:#4da6ff;">大限: {limit_names[daxian_order]}</span><br>'
        center_html += f'<span style="color:#ff4d4d;">流年: {ln_year} {GAN[ln_gan]}{ZHI[ln_zhi]}</span>'
        center_html += '</div>'
        center_html += '</div>'
        
        st.markdown(f'<div class="zwds-grid">{cells_html}{center_html}</div>', unsafe_allow_html=True)
