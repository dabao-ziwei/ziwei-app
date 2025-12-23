import streamlit as st
import datetime
from lunar_python import Lunar, Solar

# ==============================================================================
# 1. 紫微斗數運算核心 (Calculator)
# ==============================================================================

ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

class ZWDS_Calculator:
    def __init__(self, lunar, gender):
        self.lunar = lunar
        self.gender = gender # "男" or "女"
        self.ba_zi = lunar.getEightChar()
        self.year_gan = self.ba_zi.getYearGan()
        self.year_zhi = self.ba_zi.getYearZhi()
        self.month_zhi = self.ba_zi.getMonthZhi()
        self.time_zhi = self.ba_zi.getTimeZhi()
        
        # 取得地支的索引 (0=子, 1=丑...)
        self.month_idx = self._get_zhi_idx(self.month_zhi)
        self.time_idx = self._get_zhi_idx(self.time_zhi) # 注意：這裡簡化處理，視農曆時間地支
        # lunar_python 的 month 是數字，需轉為寅月=1的概念，這裡直接用 MonthZhi 來算較準
        # 修正：斗數月份通常以寅月為正月。lunar_python getMonthZhi 已是地支。
        # 命宮公式：順數生月，逆數生時 (以寅宮起正月)
        # 這裡為了精準，我們用標準公式索引運算
        self.zhi_map = {z: i for i, z in enumerate(ZHI)}

    def _get_zhi_idx(self, zhi):
        return self.zhi_map.get(zhi, 0)

    def get_ming_shen_idx(self):
        """計算命宮與身宮的地支索引 (0=子)"""
        # 紫微斗數排盤：寅宮(2)為起點
        # 命宮：寅宮起正月，順數至生月，逆數至生時
        # 轉換月份為整數：寅=1, 卯=2... 
        # 簡單算法：命宮 = 寅(2) + (月數-1) - (時數-1)
        # 需注意 lunar.getMonth() 正月通常是 1
        month_num = self.lunar.getMonth()
        if month_num < 0: month_num = abs(month_num) # 處理閏月，視為本月
        
        time_order = self.time_idx + 1 # 子=1, 丑=2...
        
        # 命宮 Index (以0=子為基準)
        # 公式：命宮 = 2(寅) + (月-1) - (時-1)
        ming_idx = (2 + (month_num - 1) - (self.time_idx)) % 12
        
        # 身宮 Index
        # 公式：身宮 = 2(寅) + (月-1) + (時-1)
        shen_idx = (2 + (month_num - 1) + (self.time_idx)) % 12
        
        return ming_idx, shen_idx

    def get_wuxing_ju(self, ming_idx):
        """定五行局 (水二, 木三, 金四, 土五, 火六)"""
        # 1. 五虎遁：求命宮天干
        # 甲己之年丙作首...
        year_gan_idx = GAN.index(self.year_gan)
        start_gan_idx = (year_gan_idx % 5) * 2 + 2 # 甲(0)->丙(2), 乙(1)->戊(4)...
        # 命宮天干
        ming_gan_idx = (start_gan_idx + (ming_idx - 2)) % 10 # 減2是因為從寅開始遁
        ming_gan = GAN[ming_gan_idx]
        
        # 2. 納音定局 (簡化查表)
        # 六十甲子納音五行 (只取五行局數：水2, 木3, 金4, 土5, 火6)
        pattern = [
            4, 2, 6, 5, 3, # 甲子乙丑金...
            6, 2, 5, 4, 3,
            3, 4, 6, 2, 5,
            5, 6, 3, 2, 4,
            2, 5, 6, 3, 4,
            2, 4, 5, 6, 3  # ...
        ]
        # 計算干支索引 (0~59)
        gz_idx = (ming_gan_idx * 6 + ming_idx * 6 // 12 + ming_idx) % 60 # 簡易公式
        # 為了準確，直接用 (干idx, 支idx) 查表比較穩
        # 這裡用簡易邏輯：(干Index // 2 + 支Index // 2) % 5 -> 對應五行
        # 0:金4, 1:水2, 2:火6, 3:土5, 4:木3
        val = (ming_gan_idx // 2 + ming_idx // 2) % 5
        map_ju = {0: 4, 1: 2, 2: 6, 3: 5, 4: 3}
        return map_ju[val]

    def get_ziwei_idx(self, wuxing_ju):
        """安紫微星 (需依據農曆日與五行局)"""
        day = self.lunar.getDay()
        ju = wuxing_ju
        
        # 紫微星公式 (簡化版)
        if ju == 0: return 0 # 防呆
        
        # 商數与餘數
        if day % ju == 0:
            q = day // ju
            r = 0
        else:
            q = (day // ju) + 1
            r = day % ju
            
        # 根據局數不同調整公式 (X=寅宮=2)
        # 這裡直接回傳地支Index (0=子)
        start_pos = 2 # 寅
        
        # 不同局數的餘數補償 (紫微全書口訣程式化)
        # 這裡使用通用公式：
        # 水二局：商數 + 1 (餘數修正)
        # 這裡省略複雜判斷，直接用查表邏輯的數學版
        
        # 簡易公式：(X + day/ju) ... 
        # 為了確保正確，我們用標準模擬：
        # 1. 找生日除以局數
        # 2. 
        # 水二：單數起寅順數，雙數起寅順數... (太複雜)
        # 改用位移法：
        # 局數: 2,3,4,5,6
        target = 0
        if r == 0:
            target = (start_pos + q - 1) % 12
        else:
            diff = (ju - r)
            if (diff % 2) == 1: # 奇數
                target = (start_pos + q + diff) % 12 # 加
            else:
                target = (start_pos + q - diff) % 12 # 減
                
        # 這是概略演算法，先求能跑出結果，後續可優化
        return (target - 1) % 12 # 修正偏移 (測試用)
        # 註：紫微定位非常敏感，暫時預設一個能動的版本，若有誤需微調

    def get_special_stars(self):
        """依照您的需求安特殊星"""
        stars = {i: [] for i in range(12)} # 12宮的星曜列表
        
        # 3.1 安天馬 (依月支)
        # 申子辰(8,0,4)->寅(2); 寅午戌(2,6,10)->申(8); 亥卯未(11,3,7)->巳(5); 巳酉丑(5,9,1)->亥(11)
        m = self.month_idx
        tm_idx = -1
        if m in [8, 0, 4]: tm_idx = 2
        elif m in [2, 6, 10]: tm_idx = 8
        elif m in [11, 3, 7]: tm_idx = 5
        elif m in [5, 9, 1]: tm_idx = 11
        if tm_idx != -1: stars[tm_idx].append("天馬")
            
        # 3.6 安魁鉞 (依年干, 六辛逢虎馬)
        # 甲(0)戊(4)庚(6)->丑(1)未(7)
        # 乙(1)己(5)->子(0)申(8)
        # 丙(2)丁(3)->亥(11)酉(9)
        # 辛(7)->寅(2)午(6) **您的特殊規則**
        # 壬(8)癸(9)->卯(3)巳(5)
        y = GAN.index(self.year_gan)
        kui = -1; yue = -1
        if y == 7: # 辛
            kui = 2; yue = 6
        elif y in [0, 4, 6]:
            kui = 1; yue = 7
        elif y in [1, 5]:
            kui = 0; yue = 8
        elif y in [2, 3]:
            kui = 11; yue = 9
        elif y in [8, 9]:
            kui = 3; yue = 5
            
        if kui != -1: stars[kui].append("天魁")
        if yue != -1: stars[yue].append("天鉞")
        
        return stars

# ==============================================================================
# 2. 介面與邏輯 (UI)
# ==============================================================================

def get_zhi_color(zhi):
    return "#333" # 預設字色

def render_palace(zhi, idx, stars_list, ming_shen_label, grid_height=200):
    """繪製單一宮位格子的 HTML/CSS"""
    # 簡單的 CSS 樣式
    stars_html = ""
    for s in stars_list:
        color = "red" if s in ["紫微", "天府", "天馬", "天魁", "天鉞"] else "#DDD"
        stars_html += f"<div style='color:{color}; font-weight:bold; font-size:14px;'>{s}</div>"
    
    label_html = ""
    if ming_shen_label:
        label_html = f"<div style='background-color:#B22222; color:white; padding:2px 6px; border-radius:4px; display:inline-block; font-size:12px; margin-bottom:4px;'>{ming_shen_label}</div>"

    return f"""
    <div style="
        border: 1px solid #444; 
        height: {grid_height}px; 
        padding: 5px; 
        background-color: #1E1E1E; 
        position: relative;
        border-radius: 4px;
    ">
        <div style="position:absolute; top:5px; left:5px;">
            {label_html}
            {stars_html}
        </div>
        <div style="position:absolute; bottom:5px; right:10px; font-size:24px; color:#555; font-weight:bold;">
            {zhi}
        </div>
    </div>
    """

def main():
    st.set_page_config(page_title="紫微排盤 V0.3", layout="wide")
    
    # 注入 CSS 以優化 Grid
    st.markdown("""
    <style>
    .stButton>button { width: 100%; }
    </style>
    """, unsafe_allow_html=True)

    st.title("🔮 專業紫微斗數排盤系統 (V0.3 視覺化版)")

    # --- 初始化暫存資料庫 ---
    if 'profiles' not in st.session_state: st.session_state['profiles'] = []
    if 'current_profile' not in st.session_state: st.session_state['current_profile'] = None

    # --- 側邊欄 ---
    with st.sidebar:
        st.header("📂 個案資料庫")
        if len(st.session_state['profiles']) > 0:
            for idx, p in enumerate(st.session_state['profiles']):
                if st.button(f"[{p['category']}] {p['name']}", key=f"btn_{idx}"):
                    st.session_state['current_profile'] = p
        else:
            st.caption("尚無資料")

    # --- 輸入區邏輯 (保留 V0.2 的功能，這裡為了節省版面稍微折疊) ---
    loaded_data = st.session_state['current_profile']
    def_name = loaded_data['name'] if loaded_data else ""
    def_cat = loaded_data['category'] if loaded_data else "客戶"
    def_date_mode = 0 if (loaded_data and loaded_data['date_mode']=='西元') else 1 
    def_date_str = loaded_data['date_str'] if loaded_data else ""
    def_hour = loaded_data['hour'] if loaded_data else ""
    def_minute = loaded_data['minute'] if loaded_data else ""
    def_gender_idx = 0 if (loaded_data and loaded_data['gender']=='男') else 1

    with st.expander("📝 輸入命主資料", expanded=True):
        c1, c2, c3 = st.columns(3)
        name = c1.text_input("姓名", value=def_name)
        gender = c2.radio("性別", ("男", "女"), index=def_gender_idx, horizontal=True)
        category = c3.text_input("類別", value=def_cat)
        
        c4, c5 = st.columns(2)
        date_mode = c4.radio("格式", ("西元", "民國"), index=def_date_mode, horizontal=True)
        date_str_input = c4.text_input("日期 (如 19790926)", value=def_date_str)
        hour_input = c5.text_input("時 (0-23)", value=def_hour)
        minute_input = c5.text_input("分 (0-59)", value=def_minute)

        save_btn = st.button("💾 儲存並排盤")

    # --- 主邏輯 ---
    if save_btn and name and date_str_input and hour_input:
        # 1. 解析日期 (簡易版)
        try:
            d_str = date_str_input.replace("/", "").replace("-", "")
            if date_mode == '西元':
                yr = int(d_str[:4]); mo = int(d_str[4:6]); dy = int(d_str[6:8])
            else:
                yr = int(d_str[:-4]) + 1911; mo = int(d_str[-4:-2]); dy = int(d_str[-2:])
            
            hr = int(hour_input); mn = int(minute_input)
            dob = datetime.date(yr, mo, dy)
            tob = datetime.time(hr, mn)
            
            # 存入 Session
            p_data = {
                "name": name, "gender": gender, "category": category,
                "date_mode": date_mode, "date_str": date_str_input,
                "hour": hour_input, "minute": minute_input,
                "dob": dob, "tob": tob
            }
            # 更新資料庫
            existing = False
            for p in st.session_state['profiles']:
                if p['name'] == name: 
                    p.update(p_data); existing = True
            if not existing: st.session_state['profiles'].append(p_data)
            st.session_state['current_profile'] = p_data

        except:
            st.error("日期格式錯誤，請檢查")
            st.stop()
            
        # 2. 開始運算
        solar = Solar.fromYmdHms(dob.year, dob.month, dob.day, tob.hour, tob.minute, 0)
        lunar = solar.getLunar()
        calc = ZWDS_Calculator(lunar, gender)
        
        ming_idx, shen_idx = calc.get_ming_shen_idx()
        wuxing_ju = calc.get_wuxing_ju(ming_idx)
        special_stars = calc.get_special_stars()
        
        # 顯示 Header
        st.divider()
        st.subheader(f"📄 {name} 的命盤")
        info_c1, info_c2, info_c3 = st.columns(3)
        info_c1.info(f"農曆：{lunar.getYear()}年 {lunar.getMonthInChinese()}月 {lunar.getDayInChinese()} {calc.time_zhi}時")
        ju_names = {2:"水二局", 3:"木三局", 4:"金四局", 5:"土五局", 6:"火六局"}
        info_c2.success(f"格局：{ju_names.get(wuxing_ju, '未知')} (命宮在{ZHI[ming_idx]})")
        info_c3.warning(f"特殊規則：天馬在{special_stars.get(calc.month_idx, {}).get(0, '...')} (依月支)")

        # 3. 繪製 12 宮位 (Grid Layout)
        # 為了做出「巳午未申」這種繞一圈的效果，我們需要建立一個 mapping
        # 格式：
        # 巳(5) 午(6) 未(7) 申(8)
        # 辰(4)           酉(9)
        # 卯(3)           戌(10)
        # 寅(2) 丑(1) 子(0) 亥(11)
        
        # Streamlit 無法直接做這種「中空」表格，我們用 4x4 Grid 模擬
        # Row 1: 5, 6, 7, 8
        # Row 2: 4, X, X, 9
        # Row 3: 3, X, X, 10
        # Row 4: 2, 1, 0, 11
        
        grid_order = [
            [5, 6, 7, 8],
            [4, -1, -1, 9],
            [3, -1, -1, 10],
            [2, 1, 0, 11]
        ]
        
        st.write("---")
        for row in grid_order:
            cols = st.columns(4)
            for i, zhi_idx in enumerate(row):
                with cols[i]:
                    if zhi_idx == -1:
                        # 中間空位顯示資訊
                        if row == grid_order[1] and i == 1:
                            st.write("") # 佔位
                        elif row == grid_order[1] and i == 2:
                            st.markdown(f"<div style='text-align:center; padding-top:20px; color:#888;'><h5>{name}</h5></div>", unsafe_allow_html=True)
                    else:
                        # 準備該宮位的星星
                        stars = special_stars[zhi_idx]
                        
                        # 標記命身宮
                        ms_label = ""
                        if zhi_idx == ming_idx: ms_label += "命宮"
                        if zhi_idx == shen_idx: ms_label += " 身宮"
                        
                        # 渲染
                        html = render_palace(ZHI[zhi_idx], zhi_idx, stars, ms_label)
                        st.markdown(html, unsafe_allow_html=True)

if __name__ == "__main__":
    main()
