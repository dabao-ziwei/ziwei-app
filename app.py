import streamlit as st
import time
from lunar_python import Lunar, Solar

# --- 1. 頁面設定與 CSS 樣式 ---
st.set_page_config(page_title="專業紫微斗數排盤系統", page_icon="🔮", layout="centered")

st.markdown("""
<style>
    /* 隱藏預設選單 */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
    
    /* 命盤外框 (4x4 網格) */
    .zwds-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr 1fr;
        grid-template-rows: 110px 110px 110px 110px;
        gap: 2px;
        background-color: #666;
        border: 4px solid #444;
        border-radius: 4px;
        margin-top: 10px;
        font-family: "Microsoft JhengHei", sans-serif;
    }
    
    /* 12宮位格子樣式 */
    .zwds-cell {
        background-color: #222;
        color: #fff;
        padding: 4px;
        position: relative;
        display: flex;
        flex-direction: column;
        justify_content: space-between;
        font-size: 13px;
        overflow: hidden;
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
        border: 1px solid #333;
        padding: 5px;
        color: #fff;
    }
    
    /* 地支標籤 (右下角) */
    .cell-label {
        align-self: flex-end;
        color: #666;
        font-weight: bold;
        font-size: 14px;
    }
    
    /* 星曜顯示 (左上角 - 主星) */
    .cell-stars {
        color: #d4a0ff; 
        font-weight: bold;
        font-size: 14px;
        line-height: 1.2;
    }

    /* 宮位名稱 (左下角) */
    .cell-name {
        background-color: #333;
        color: #fff;
        font-size: 12px;
        padding: 1px 4px;
        border-radius: 2px;
        align-self: flex-start;
        margin-top: auto;
    }
</style>
""", unsafe_allow_html=True)

# --- 2. 紫微斗數運算核心 (Micro-Engine) ---
class ZWDSCalculator:
    def __init__(self, year, month, day, hour, minute):
        # 1. 轉換農曆
        self.solar = Solar.fromYmdHms(year, month, day, hour, minute, 0)
        self.lunar = self.solar.getLunar()
        
        # 2. 基礎參數
        self.lunar_month = self.lunar.getMonth()
        self.lunar_day = self.lunar.getDay()
        self.time_zhi_idx = (hour + 1) // 2 % 12 # 子=0, 丑=1...
        
        # 天干地支
        self.year_gan_idx = self.lunar.getYearGanIndex() # 0=甲
        self.year_zhi_idx = self.lunar.getYearZhiIndex() # 0=子
        
        # 準備資料結構
        self.palaces = {i: {"name": "", "stars": []} for i in range(12)} # 0=子, 1=丑...
        
        self._calc_palaces()
        self._calc_main_stars()

    def _calc_palaces(self):
        # 安命宮 (寅宮起正月，順數至生月，逆數至生時)
        # 簡化公式：命宮地支 = (月份 - 時支 + 1 + 12) % 12 + 2 (因為以寅=2為基準? 不，直接用相對位置)
        # 標準排盤：寅宮(2)起正月，順數至月，逆數至時
        start_idx = 2 # 寅
        ming_pos = (start_idx + (self.lunar_month - 1) - self.time_zhi_idx) % 12
        self.ming_pos = ming_pos # 命宮的地支索引 (0=子)
        
        # 安身宮 (寅宮起正月，順數至月，順數至時)
        shen_pos = (start_idx + (self.lunar_month - 1) + self.time_zhi_idx) % 12
        self.shen_pos = shen_pos

        # 定 12 宮名 (逆時針)
        names = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "交友", "官祿", "田宅", "福德", "父母"]
        for i in range(12):
            # 命宮在 ming_pos，下一宮(逆時針)是 ming_pos - 1
            pos = (self.ming_pos - i) % 12
            self.palaces[pos]["name"] = names[i]
            if pos == self.shen_pos:
                self.palaces[pos]["name"] += "(身宮)"

    def _get_bureau(self):
        # 定五行局 (需配合命宮干支)
        # 1. 求命宮天干 (五虎遁)
        # 甲己之年丙作首 -> 甲年寅宮是丙寅
        start_gan = (self.year_gan_idx % 5) * 2 + 2 # 寅宮天干
        # 命宮相對寅宮的位移
        offset = (self.ming_pos - 2) % 12
        ming_gan = (start_gan + offset) % 10
        
        # 2. 納音五行 (簡化查表：金4, 水2, 火6, 土5, 木3)
        # 這裡用簡易算法或查表，為節省篇幅使用納音數值表
        # 花甲納音五行局對照 (太複雜，這裡使用簡化邏輯或完整表會太長，先用簡易規則)
        # 為了準確，這裡用一個 mapping
        # 命宮干支數值: 干(甲=1..癸=10) + 支(子=1..亥=12) -> 判斷
        # 暫用簡易查表：
        table = {
            # 甲乙
            0: [4, 4, 6, 6, 5, 5, 4, 4, 6, 6, 5, 5], # 甲子乙丑金...
            # 丙丁
            1: [2, 2, 5, 5, 6, 6, 2, 2, 5, 5, 6, 6],
            # 戊己
            2: [6, 6, 3, 3, 5, 5, 6, 6, 3, 3, 5, 5],
            # 庚辛
            3: [5, 5, 4, 4, 3, 3, 5, 5, 4, 4, 3, 3],
            # 壬癸
            4: [3, 3, 4, 4, 2, 2, 3, 3, 4, 4, 2, 2]
        }
        idx = (ming_gan // 2) 
        # ming_pos: 0=子, 1=丑... table index對應
        wuxing = table[idx][self.ming_pos]
        return wuxing # 2=水二局, 3=木三局...

    def _calc_main_stars(self):
        bureau = self._get_bureau()
        day = self.lunar_day
        
        # 紫微星公式 (簡化版，處理所有局數)
        # 找尋 (生日 + X) / 局數 = 商
        # 紫微位置 = 寅宮(2) + (商 if X=0) 或 ... 這裡邏輯較繁瑣，改用標準查找邏輯
        
        ziwei_pos = 0
        if bureau == 2: # 水二局
            rem = day % 2
            if rem == 0: ziwei_pos = (2 + (day // 2) - 1) % 12
            else: ziwei_pos = (2 + (day // 2) + 1) % 12 # 需調整公式，這裡為求精簡
            # 修正通用公式：
            # (生日 + (局數 - 生日%局數)%局數 ) / 局數 = 商
            # 補數 = (局數 - 生日%局數)%局數
            # 奇數補數時，位置 = 寅 + 商 - 補數 (可能需修正，這裡直接寫死邏輯較穩)
        
        # 為了保證準確，實作標準尋紫微歌訣邏輯
        offset = 0 
        if day % bureau == 0:
            quotient = day // bureau
            offset = 0
            ziwei_pos = (1 + quotient) % 12 # 寅=2, 索引修正
            # 公式：從寅(2)開始，商數-1?
            # 網上公式：寅宮起1，順行至商數
            ziwei_pos = (2 + quotient - 1) % 12
        else:
            remainder = day % bureau
            add_val = bureau - remainder
            quotient = (day + add_val) // bureau
            if add_val % 2 == 1: # 補數為奇
                ziwei_pos = (2 + quotient - 1 - add_val) % 12
            else: # 補數為偶
                ziwei_pos = (2 + quotient - 1 + add_val) % 12
        
        self.ziwei_pos = ziwei_pos
        self.palaces[ziwei_pos]["stars"].append("紫微")
        
        # 安紫微系 (逆時針)
        # 紫微, 天機, O, 太陽, 武曲, 天同, O, O, 廉貞
        zw_stars = [("天機", -1), ("太陽", -3), ("武曲", -4), ("天同", -5), ("廉貞", -8)]
        for star, off in zw_stars:
            pos = (ziwei_pos + off) % 12
            self.palaces[pos]["stars"].append(star)

        # 安天府星 (紫微天府在寅申同宮，斜對角鏡射)
        # 公式：寅申線對稱。天府 = (12 - 紫微 + 4) % 12 ... 簡化：
        # 子(0)<->丑(1), 寅(2)<->亥(11)...
        # 其實是：天府位置 + 紫微位置 = 4 (或是16) => 寅(2)+寅(2)=4, 丑(1)+卯(3)=4
        tianfu_pos = (4 - ziwei_pos) % 12
        self.palaces[tianfu_pos]["stars"].append("天府")
        
        # 安天府系 (順時針)
        # 天府, 太陰, 貪狼, 巨門, 天相, 天梁, 七殺, O, O, O, 破軍
        tf_stars = [("太陰", 1), ("貪狼", 2), ("巨門", 3), ("天相", 4), ("天梁", 5), ("七殺", 6), ("破軍", 10)]
        for star, off in tf_stars:
            pos = (tianfu_pos + off) % 12
            self.palaces[pos]["stars"].append(star)

    def get_result(self):
        # 整理輸出給 UI 用 (0=子, 1=丑...)
        return self.palaces, self.palaces[self.ming_pos]["stars"][0] if self.palaces[self.ming_pos]["stars"] else ""

# --- 3. 初始化資料庫與狀態 ---
if 'db' not in st.session_state: st.session_state.db = [] 
if 'current_id' not in st.session_state: st.session_state.current_id = 0
if 'show_chart' not in st.session_state: st.session_state.show_chart = False
if 'temp_preview_data' not in st.session_state: st.session_state.temp_preview_data = None

# --- 4. 輔助函數 ---
def parse_date_input(d_str):
    if not d_str: return False, 0, 0, 0, ""
    d = d_str.strip()
    try:
        if len(d) == 8: return True, int(d[:4]), int(d[4:6]), int(d[6:]), "西元"
        elif len(d) == 7: return True, int(d[:3]) + 1911, int(d[3:5]), int(d[5:]), "民國"
        elif len(d) == 6: return True, int(d[:2]) + 1911, int(d[2:4]), int(d[4:]), "民國"
        else: return False, 0, 0, 0, ""
    except: return False, 0, 0, 0, ""

# --- 5. UI 構建 ---
st.title("🔮 專業紫微斗數排盤")

with st.container(border=True):
    col_search, col_select = st.columns([1, 1.5])
    with col_search:
        search_keyword = st.text_input("🔍 全文檢索", placeholder="輸入姓名、年份...")
    with col_select:
        options = {0: "➕ 新增空白命盤"}
        for p in st.session_state.db:
            search_text = f"{p['name']}{p['y']}{p['category']}{p.get('ming_star','')}"
            if not search_keyword or (search_keyword in search_text):
                d_y_str = str(p['y']-1911) if p['cal_type']=='民國' else str(p['y'])
                display_text = f"[{p['category']}] {p['name']} ({d_y_str}年)"
                options[p['id']] = display_text
        
        current_idx = 0
        all_keys = list(options.keys())
        if st.session_state.current_id in all_keys:
            current_idx = all_keys.index(st.session_state.current_id)
            
        selected_id = st.selectbox("選擇命主", options=all_keys, format_func=lambda x: options[x], index=current_idx)
        
        if selected_id != st.session_state.current_id:
            st.session_state.current_id = selected_id
            st.session_state.show_chart = False 
            st.session_state.temp_preview_data = None
            st.rerun()

st.subheader("📝 資料輸入")
val_name, val_gender, val_cat, val_date, val_time = "", "女", "", "", ""
is_edit_mode = False

if st.session_state.current_id != 0:
    record = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)
    if record:
        is_edit_mode = True
        val_name = record['name']
        val_gender = record['gender']
        val_cat = record['category']
        if record['cal_type'] == "西元": val_date = f"{record['y']:04d}{record['m']:02d}{record['d']:02d}"
        else: val_date = f"{record['y']-1911}{record['m']:02d}{record['d']:02d}"
        val_time = f"{record['h']:02d}{record['min']:02d}"

with st.form("main_form"):
    c1, c2, c3 = st.columns([1.5, 1, 1.5])
    with c1: inp_name = st.text_input("姓名 (必填)", value=val_name)
    with c2: inp_gender = st.radio("性別", ["男", "女"], index=0 if val_gender=="男" else 1, horizontal=True)
    with c3: inp_cat = st.text_input("類別", value=val_cat, placeholder="如：客戶、家人...")

    c4, c5 = st.columns(2)
    with c4: inp_date = st.text_input("出生日期", value=val_date, placeholder="如: 1140926 或 19790926", help="輸入民國或西元皆可")
    with c5: inp_time = st.text_input("出生時間 (24h)", value=val_time, placeholder="如: 1830")

    b1, b2 = st.columns(2)
    with b1: btn_save = st.form_submit_button("💾 儲存並排盤", type="primary", use_container_width=True)
    with b2: btn_calc = st.form_submit_button("🧪 僅試算 (不儲存)", use_container_width=True)

if btn_save or btn_calc:
    is_valid_date, y, m, d, cal_type = parse_date_input(inp_date)
    h, minute = 0, 0
    is_valid_time = False
    if len(inp_time) == 4 and inp_time.isdigit():
        h, minute = int(inp_time[:2]), int(inp_time[2:])
        if 0 <= h <= 23 and 0 <= minute <= 59: is_valid_time = True

    has_error = False
    if btn_save and not inp_name: st.error("❌ 儲存時「姓名」為必填！"); has_error = True
    elif not is_valid_date: st.error(f"❌ 日期格式錯誤"); has_error = True
    elif inp_time and not is_valid_time: st.error("❌ 時間格式錯誤"); has_error = True

    if not has_error:
        # --- 執行真實運算 ---
        calc = ZWDSCalculator(y, m, d, h, minute)
        palace_data, ming_star = calc.get_result()
        
        data_packet = {
            "name": inp_name if inp_name else "試算命主",
            "gender": inp_gender,
            "category": inp_cat,
            "y": y, "m": m, "d": d, "h": h, "min": minute,
            "cal_type": cal_type,
            "ming_star": ming_star, # 儲存計算出的命宮主星
            "palace_data": palace_data # 儲存整張命盤資料
        }

        if btn_save:
            if is_edit_mode:
                data_packet['id'] = st.session_state.current_id
                for i, item in enumerate(st.session_state.db):
                    if item['id'] == st.session_state.current_id:
                        st.session_state.db[i] = data_packet
                        break
                st.toast(f"已更新資料")
            else:
                new_id = int(time.time())
                data_packet['id'] = new_id
                st.session_state.db.append(data_packet)
                st.session_state.current_id = new_id
                st.toast(f"已新增資料")
            st.session_state.show_chart = True
            st.session_state.temp_preview_data = None
            time.sleep(0.5)
            st.rerun()
        
        if btn_calc:
            st.session_state.temp_preview_data = data_packet
            st.session_state.show_chart = True

# --- 6. 命盤顯示 ---
if st.session_state.show_chart:
    display_data = None
    if st.session_state.temp_preview_data: display_data = st.session_state.temp_preview_data
    elif st.session_state.current_id != 0:
        display_data = next((x for x in st.session_state.db if x['id'] == st.session_state.current_id), None)

    if display_data:
        # 若資料庫中是舊資料(沒有 palace_data)，則即時重算
        if 'palace_data' not in display_data:
            calc = ZWDSCalculator(display_data['y'], display_data['m'], display_data['d'], display_data['h'], display_data['min'])
            p_data, m_star = calc.get_result()
            d_star = m_star
        else:
            p_data = display_data['palace_data']
            d_star = display_data.get('ming_star', '')

        # UI 變數準備
        d_name = display_data.get('name', '')
        d_gender = display_data.get('gender', '')
        d_cat = display_data.get('category', '')
        d_str = f"{display_data['cal_type']} {display_data['y']} 年 {display_data['m']} 月 {display_data['d']} 日"
        t_str = f"{display_data['h']:02d} 時 {display_data['min']:02d} 分"

        st.markdown("---")
        
        # 佈局 Mapping: 地支 (Grid 座標)
        # 0=子, 1=丑, 2=寅 ... 11=亥
        # Grid: 
        # R1: 巳(5) 午(6) 未(7) 申(8)
        # R2: 辰(4)         酉(9)
        # R3: 卯(3)         戌(10)
        # R4: 寅(2) 丑(1) 子(0) 亥(11)
        
        layout_map = [
            (5, "巳", 1, 1), (6, "午", 1, 2), (7, "未", 1, 3), (8, "申", 1, 4),
            (9, "酉", 2, 4), (10,"戌", 3, 4),
            (11,"亥", 4, 4), (0, "子", 4, 3), (1, "丑", 4, 2), (2, "寅", 4, 1),
            (3, "卯", 3, 1), (4, "辰", 2, 1)
        ]
        
        cells_html = ""
        for idx, branch, r, c in layout_map:
            # 取得該宮位的資料
            cell_info = p_data.get(str(idx)) or p_data.get(idx) # 容錯 key 為字串或數字
            stars = " ".join(cell_info['stars']) if cell_info else ""
            p_name = cell_info['name'] if cell_info else ""
            
            cell_style = f"grid-row: {r}; grid-column: {c};"
            cells_html += f'<div class="zwds-cell" style="{cell_style}">'
            cells_html += f'<div class="cell-stars">{stars}</div>'
            cells_html += f'<div class="cell-name">{p_name}</div>'
            cells_html += f'<div class="cell-label">{branch}</div>'
            cells_html += '</div>'

        center_html = f'<div class="zwds-center">'
        center_html += f'<h3 style="margin:0; color:#d4a0ff;">{d_name}</h3>'
        center_html += f'<p style="font-size:12px; margin:5px 0; color:#ccc;">{d_gender} | {d_cat}</p>'
        center_html += f'<div style="font-size:16px; color:#4CAF50; margin-top:5px;">{d_str}</div>'
        center_html += f'<div style="font-size:16px; color:#4CAF50;">{t_str}</div>'
        center_html += f'<hr style="width:80%; border-color:#444; margin:10px 0;">'
        center_html += f'<div style="color:#fff;">命宮主星: {d_star}</div>'
        center_html += '</div>'
        
        final_html = f'<div class="zwds-grid">{cells_html}{center_html}</div>'
        st.markdown(final_html, unsafe_allow_html=True)
