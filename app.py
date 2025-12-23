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
        # 定義地支對照表
        self.zhi_map = {z: i for i, z in enumerate(ZHI)}
        
        self.lunar = lunar
        self.gender = gender 
        self.ba_zi = lunar.getEightChar()
        self.year_gan = self.ba_zi.getYearGan()
        self.year_zhi = self.ba_zi.getYearZhi()
        self.month_zhi = self.ba_zi.getMonthZhi()
        self.time_zhi = self.ba_zi.getTimeZhi()
        
        # 取得地支的索引
        self.month_idx = self._get_zhi_idx(self.month_zhi)
        self.time_idx = self._get_zhi_idx(self.time_zhi) 

    def _get_zhi_idx(self, zhi):
        return self.zhi_map.get(zhi, 0)

    def get_ming_shen_idx(self):
        """計算命宮與身宮"""
        month_num = self.lunar.getMonth()
        if month_num < 0: month_num = abs(month_num)
        
        # 命宮公式：2(寅) + (月數-1) - (時支索引)
        ming_idx = (2 + (month_num - 1) - self.time_idx) % 12
        # 身宮公式：2(寅) + (月數-1) + (時支索引)
        shen_idx = (2 + (month_num - 1) + self.time_idx) % 12
        
        return ming_idx, shen_idx

    def get_wuxing_ju(self, ming_idx):
        """定五行局"""
        # 1. 五虎遁
        year_gan_idx = GAN.index(self.year_gan)
        start_gan_idx = (year_gan_idx % 5) * 2 + 2 
        steps = ming_idx - 2
        if steps < 0: steps += 12
        ming_gan_idx = (start_gan_idx + steps) % 10
        
        # 2. 納音定局
        val = (ming_gan_idx // 2 + ming_idx // 2) % 5
        map_ju = {0: 4, 1: 2, 2: 6, 3: 5, 4: 3}
        return map_ju[val]

    def get_special_stars(self):
        """安特殊星"""
        stars = {i: [] for i in range(12)} 
        
        # 安天馬
        m = self.month_idx
        tm_idx = -1
        if m in [8, 0, 4]: tm_idx = 2
        elif m in [2, 6, 10]: tm_idx = 8
        elif m in [11, 3, 7]: tm_idx = 5
        elif m in [5, 9, 1]: tm_idx = 11
        if tm_idx != -1: stars[tm_idx].append("天馬")
            
        # 安魁鉞 (六辛逢虎馬)
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

def render_palace(zhi, idx, stars_list, ming_shen_label, grid_height=180):
    """繪製單一宮位格子的 HTML (移除縮排以修復顯示問題)"""
    stars_html = ""
    for s in stars_list:
        color = "#FF4B4B" if s in ["天馬", "天魁", "天鉞"] else "#E0E0E0"
        stars_html += f"<div style='color:{color}; font-weight:bold; font-size:15px; margin-bottom:2px;'>{s}</div>"
    
    label_html = ""
    if "命宮" in ming_shen_label:
        label_html += f"<span style='background-color:#D32F2F; color:white; padding:2px 6px; border-radius:4px; font-size:12px; margin-right:4px;'>命宮</span>"
    if "身宮" in ming_shen_label:
        label_html += f"<span style='background-color:#1976D2; color:white; padding:2px 6px; border-radius:4px; font-size:12px;'>身宮</span>"

    # [Fix] 這裡將 HTML 字串壓縮為一行或移除所有縮排，避免被當成 Markdown 程式碼區塊
    return f"""<div style="border: 1px solid #444; height: {grid_height}px; padding: 8px; background-color: #262730; position: relative; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
<div style="position:absolute; top:8px; left:8px;">{label_html}<div style="margin-top:8px;">{stars_html}</div></div>
<div style="position:absolute; bottom:5px; right:10px; font-size:20px; color:#666; font-weight:bold;">{zhi}</div>
</div>"""

def main():
    st.set_page_config(page_title="紫微排盤 V0.3.2", layout="wide")
    
    st.markdown("""
    <style>
    .stButton>button { width: 100%; border-radius: 8px; }
    .block-container { padding-top: 2rem; }
    </style>
    """, unsafe_allow_html=True)

    st.title("🔮 專業紫微斗數排盤系統 (V0.3.2)")

    if 'profiles' not in st.session_state: st.session_state['profiles'] = []
    if 'current_profile' not in st.session_state: st.session_state['current_profile'] = None

    with st.sidebar:
        st.header("📂 個案資料庫")
        if len(st.session_state['profiles']) > 0:
            for idx, p in enumerate(st.session_state['profiles']):
                if st.button(f"[{p['category']}] {p['name']}", key=f"btn_{idx}"):
                    st.session_state['current_profile'] = p
        else:
            st.caption("尚無資料，請輸入並儲存")

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
        date_str_input = c4.text_input("日期 (如 680926)", value=def_date_str)
        hour_input = c5.text_input("時 (0-23)", value=def_hour)
        minute_input = c5.text_input("分 (0-59)", value=def_minute)

        save_btn = st.button("💾 儲存並排盤", type="primary")

    if save_btn and name and date_str_input and hour_input:
        try:
            d_str = date_str_input.replace("/", "").replace("-", "").strip()
            if date_mode == '西元':
                if len(d_str) != 8: raise ValueError("西元格式需8碼")
                yr = int(d_str[:4]); mo = int(d_str[4:6]); dy = int(d_str[6:8])
            else:
                if len(d_str) == 6:
                    yr = int(d_str[:2]) + 1911; mo = int(d_str[2:4]); dy = int(d_str[4:6])
                elif len(d_str) == 7:
                    yr = int(d_str[:3]) + 1911; mo = int(d_str[3:5]); dy = int(d_str[5:7])
                else:
                    raise ValueError("民國格式需6或7碼")
            
            hr = int(hour_input); mn = int(minute_input)
            dob = datetime.date(yr, mo, dy)
            tob = datetime.time(hr, mn)
            
            p_data = {
                "name": name, "gender": gender, "category": category,
                "date_mode": date_mode, "date_str": date_str_input,
                "hour": hour_input, "minute": minute_input,
                "dob": dob, "tob": tob
            }
            existing = False
            for p in st.session_state['profiles']:
                if p['name'] == name: 
                    p.update(p_data); existing = True
            if not existing: st.session_state['profiles'].append(p_data)
            st.session_state['current_profile'] = p_data

        except Exception as e:
            st.error(f"輸入錯誤：{str(e)}")
            st.stop()
            
        # 運算
        solar = Solar.fromYmdHms(dob.year, dob.month, dob.day, tob.hour, tob.minute, 0)
        lunar = solar.getLunar()
        calc = ZWDS_Calculator(lunar, gender)
        
        ming_idx, shen_idx = calc.get_ming_shen_idx()
        wuxing_ju = calc.get_wuxing_ju(ming_idx)
        special_stars = calc.get_special_stars()
        
        # 顯示
        st.divider()
        st.subheader(f"📄 {name} 的命盤")
        
        i1, i2, i3, i4 = st.columns(4)
        i1.info(f"農曆：{lunar.getYear()} {lunar.getMonthInChinese()}月 {lunar.getDayInChinese()}")
        i2.info(f"時間：{calc.time_zhi}時 ({tob.strftime('%H:%M')})")
        ju_names = {2:"水二局", 3:"木三局", 4:"金四局", 5:"土五局", 6:"火六局"}
        i3.success(f"五行局：{ju_names.get(wuxing_ju, '未知')}")
        i4.warning(f"命宮位置：{ZHI[ming_idx]}宮")

        # 繪圖
        grid_order = [
            [5, 6, 7, 8],     # 巳 午 未 申
            [4, -1, -1, 9],   # 辰       酉
            [3, -1, -1, 10],  # 卯       戌
            [2, 1, 0, 11]     # 寅 丑 子 亥
        ]
        
        st.write("---")
        for row in grid_order:
            cols = st.columns(4)
            for i, zhi_idx in enumerate(row):
                with cols[i]:
                    if zhi_idx == -1:
                        if row == grid_order[1] and i == 2:
                            st.markdown(f"""
                            <div style='text-align:center; color:#888; margin-top:40px;'>
                                <h3>{name}</h3>
                                <p>{gender}命</p>
                            </div>
                            """, unsafe_allow_html=True)
                    else:
                        stars = special_stars[zhi_idx]
                        ms_label = ""
                        if zhi_idx == ming_idx: ms_label += "命宮 "
                        if zhi_idx == shen_idx: ms_label += "身宮"
                        
                        st.markdown(render_palace(ZHI[zhi_idx], zhi_idx, stars, ms_label), unsafe_allow_html=True)

if __name__ == "__main__":
    main()
