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
        cursor: pointer; /* 暗示可點擊(未來擴充) */
    }
    
    /* 狀態 A: 被選中的【大限】宮位 (深藍背景 + 綠光) */
    .zwds-cell.active-daxian {
        background-color: #1a2a40 !important; 
        border: 1px solid #4da6ff;
        box-shadow: inset 0 0 15px rgba(77, 166, 255, 0.4);
    }

    /* 狀態 B: 被選中的【流年】宮位 (紅框 + 紅光) */
    .zwds-cell.active-liunian {
        border: 2px solid #ff4d4d !important;
        box-shadow: inset 0 0 10px rgba(255, 77, 77, 0.5);
        z-index: 10; /* 確保浮在最上層 */
    }
    
    /* 狀態 AB: 大限與流年重疊 (紫光特效) */
    .zwds-cell.active-daxian.active-liunian {
        background-color: #2a1a30 !important;
        border: 2px solid #ff4dff !important;
        box-shadow: inset 0 0 20px rgba(255, 77, 255, 0.5);
    }

    /* 標籤顯示 */
    .marker-daxian {
        position: absolute; top: 20px; right: 2px;
        background-color: #004d99; color: #fff;
        font-size: 10px; padding: 1px 3px; border-radius: 3px;
        opacity: 0.8;
    }
    .marker-liunian {
        position: absolute; top: 36px; right: 2px;
        background-color: #990000; color: #fff;
        font-size: 10px; padding: 1px 3px; border-radius: 3px;
        opacity: 0.9;
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
    
    /* 按鈕樣式微調 (讓按鈕看起來像表格) */
    div.stButton > button {
        width: 100%;
        padding: 4px 8px;
        font-size: 13px;
        border-radius: 4px;
        height: auto;
        white-space: pre-wrap; /* 允許換行 */
        line-height: 1.2;
    }
</style>
""", unsafe_allow_html=True)

# --- 2. 紫微斗數運算核心 (Engine) ---
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
            offset = (i - 2) % 12 
            gan = (start_gan + offset) % 10
            self.palaces[i]["gan_idx"] = gan

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
            end_age = start_age + 9
            self.palaces[pos]["age_start"] = start_age
            self.palaces[pos]["age_end"] = end_age
            start_age += 10

    def _calc_main_stars(self):
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

# 【關鍵修正】互動狀態：使用 Index 追蹤按鈕選取
if 'sel_daxian_idx' not in st.session_state: st.session_state.sel_daxian_idx = 0 
if 'sel_liunian_offset' not in st.session_state: st.session_state.sel_liunian_offset = 0 # 0~9

# --- 4. 輔助函式 ---
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
    # 1984=甲子 (0,0)
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

# --- 8. 排盤與互動面板 (Dashboard) ---
if st.session_state.show_chart:
    data = st.session_state.temp_preview_data or next((x for x in st.session_state.db if x['id']==st.session_state.current_id), None)
    if data:
        calc_obj = ZWDSCalculator(data['y'], data['m'], data['d'], data['h'], data['min'], data['gender'])
        p_data, m_star, bur, b_yr = calc_obj.get_result()
        sorted_limits = sorted(p_data.items(), key=lambda x: x[1]['age_start']) # list of (pos_idx, info)
        
        st.write("---")
        
        # === 區域 A: 大限儀表板 (Daxian Dashboard) ===
        st.markdown(f"**🌠 運限控制盤：{data['name']}**")
        st.caption("👇 第一步：點選大限 (觀察干支)")
        
        # 建立大限按鈕陣列 (使用 columns 模擬表格)
        # 分兩行顯示，每行6個，符合手機與桌機閱讀
        # 準備資料
        limit_names = ["一限", "二限", "三限", "四限", "五限", "六限", "七限", "八限", "九限", "十限", "十一", "十二"]
        
        # 繪製第一排 (1-6限)
        cols_d1 = st.columns(6)
        for i in range(6):
            pos_idx, info = sorted_limits[i]
            gz = f"{GAN[info['gan_idx']]}{ZHI[info['zhi_idx']]}"
            btn_label = f"{limit_names[i]}\n{gz}"
            
            # 判斷是否被選中 (樣式區分)
            is_active = (i == st.session_state.sel_daxian_idx)
            btn_type = "primary" if is_active else "secondary"
            
            if cols_d1[i].button(btn_label, key=f"dx_btn_{i}", type=btn_type, use_container_width=True):
                st.session_state.sel_daxian_idx = i
                st.session_state.sel_liunian_offset = 0 # 重置流年
                st.rerun()

        # 繪製第二排 (7-12限)
        cols_d2 = st.columns(6)
        for i in range(6, 12):
            pos_idx, info = sorted_limits[i]
            gz = f"{GAN[info['gan_idx']]}{ZHI[info['zhi_idx']]}"
            btn_label = f"{limit_names[i]}\n{gz}"
            
            is_active = (i == st.session_state.sel_daxian_idx)
            btn_type = "primary" if is_active else "secondary"
            
            if cols_d2[i-6].button(btn_label, key=f"dx_btn_{i}", type=btn_type, use_container_width=True):
                st.session_state.sel_daxian_idx = i
                st.session_state.sel_liunian_offset = 0
                st.rerun()

        # === 區域 B: 流年儀表板 (Liunian Dashboard) ===
        # 根據目前選中的大限，計算 10 年流年
        curr_daxian_pos_idx, curr_daxian_info = sorted_limits[st.session_state.sel_daxian_idx]
        start_age = curr_daxian_info['age_start']
        
        st.caption(f"👇 第二步：點選流年 (目前大限：{limit_names[st.session_state.sel_daxian_idx]} {start_age}-{curr_daxian_info['age_end']}歲)")
        
        # 準備流年資料
        liunian_list = []
        for offset in range(10):
            age = start_age + offset
            curr_year = b_yr + age - 1
            g_idx, z_idx = get_ganzhi_for_year(curr_year)
            gz = f"{GAN[g_idx]}{ZHI[z_idx]}"
            liunian_list.append({
                "year": curr_year, "gz": gz, "age": age, "zhi_idx": z_idx, "gan_idx": g_idx
            })
            
        # 繪製流年按鈕 (5個一排，共兩排)
        row1 = st.columns(5)
        for j in range(5):
            ln = liunian_list[j]
            label = f"{ln['year']} {ln['gz']}\n({ln['age']}歲)"
            is_active = (j == st.session_state.sel_liunian_offset)
            btn_type = "primary" if is_active else "secondary"
            
            if row1[j].button(label, key=f"ln_btn_{j}", type=btn_type, use_container_width=True):
                st.session_state.sel_liunian_offset = j
                st.rerun()
                
        row2 = st.columns(5)
        for j in range(5, 10):
            ln = liunian_list[j]
            label = f"{ln['year']} {ln['gz']}\n({ln['age']}歲)"
            is_active = (j == st.session_state.sel_liunian_offset)
            btn_type = "primary" if is_active else "secondary"
            
            if row2[j-5].button(label, key=f"ln_btn_{j}", type=btn_type, use_container_width=True):
                st.session_state.sel_liunian_offset = j
                st.rerun()

        # === 區域 C: 命盤繪製 ===
        # 計算高亮位置
        # 1. 大限位置
        daxian_pos = int(curr_daxian_pos_idx)
        
        # 2. 流年位置
        # 根據選中的流年地支，去找對應的宮位
        curr_liunian = liunian_list[st.session_state.sel_liunian_offset]
        ln_zhi_idx = curr_liunian['zhi_idx']
        
        liunian_pos = -1
        for pid, info in p_data.items():
            if info['zhi_idx'] == ln_zhi_idx:
                liunian_pos = int(pid)
                break

        # 繪圖 HTML
        layout = [
            (5, "巳", 1, 1), (6, "午", 1, 2), (7, "未", 1, 3), (8, "申", 1, 4),
            (4, "辰", 2, 1),                                 (9, "酉", 2, 4),
            (3, "卯", 3, 1),                                 (10,"戌", 3, 4),
            (2, "寅", 4, 1), (1, "丑", 4, 2), (0, "子", 4, 3), (11,"亥", 4, 4)
        ]
        
        cells_html = ""
        for idx, branch, r, c in layout:
            info = p_data[str(idx)] if str(idx) in p_data else p_data[idx]
            
            classes = []
            markers = ""
            
            if idx == daxian_pos:
                classes.append("active-daxian")
                markers += '<div class="marker-daxian">大限</div>'
                
            if idx == liunian_pos:
                classes.append("active-liunian")
                markers += '<div class="marker-liunian">流年</div>'
            
            cls_str = " ".join(classes)
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
        center_html += f'<div style="margin-top:5px; background:#222; padding:5px; border-radius:4px; font-size:13px; border:1px solid #555;">'
        center_html += f'<span style="color:#4da6ff;">大限: {limit_names[st.session_state.sel_daxian_idx]}</span><br>'
        center_html += f'<span style="color:#ff4d4d;">流年: {curr_liunian["year"]} {curr_liunian["gz"]}</span>'
        center_html += '</div>'
        center_html += '</div>'
        
        st.markdown(f'<div class="zwds-grid">{cells_html}{center_html}</div>', unsafe_allow_html=True)
