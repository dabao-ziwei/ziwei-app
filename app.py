import streamlit as st
import datetime
from lunar_python import Lunar, Solar

# ================= 核心邏輯區 =================
ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

def get_tian_ma_by_month(month_zhi_char):
    """3.1 安天馬：依月支"""
    rules = {
        '申': '寅', '子': '寅', '辰': '寅',
        '寅': '申', '午': '申', '戌': '申',
        '亥': '巳', '卯': '巳', '未': '巳',
        '巳': '亥', '酉': '亥', '丑': '亥'
    }
    return rules.get(month_zhi_char, "")

def get_kui_yue(year_gan_char):
    """3.6 安魁鉞：六辛逢虎馬"""
    if year_gan_char == '辛':
        return {'魁': '寅', '鉞': '午'}
    elif year_gan_char in ['甲', '戊', '庚']:
        return {'魁': '丑', '鉞': '未'}
    elif year_gan_char in ['乙', '己']:
        return {'魁': '子', '鉞': '申'}
    elif year_gan_char in ['丙', '丁']:
        return {'魁': '亥', '鉞': '酉'}
    elif year_gan_char in ['壬', '癸']:
        return {'魁': '卯', '鉞': '巳'}
    else:
        return {'魁': '?', '鉞': '?'}

def parse_smart_date(date_str, type_mode):
    """
    智慧日期解析器
    type_mode: '西元' 或 '民國'
    input: 字串 (如 "19790926" 或 "680926")
    output: datetime object or None
    """
    if not date_str:
        return None
    
    try:
        # 移除可能輸入的斜線或空格
        clean_str = date_str.replace("/", "").replace(" ", "").replace("-", "")
        
        year = 0
        month = 0
        day = 0
        
        if len(clean_str) < 6: # 長度不足
            return None

        if type_mode == '西元':
            # 預期格式 YYYYMMDD (8碼)
            if len(clean_str) == 8:
                year = int(clean_str[0:4])
                month = int(clean_str[4:6])
                day = int(clean_str[6:8])
            else:
                return None
        else:
            # 民國預期格式 YYMMDD (6碼) 或 YYYMMDD (7碼，如 1000101)
            if len(clean_str) == 6:
                roc_year = int(clean_str[0:2])
                month = int(clean_str[2:4])
                day = int(clean_str[4:6])
                year = roc_year + 1911
            elif len(clean_str) == 7:
                roc_year = int(clean_str[0:3])
                month = int(clean_str[3:5])
                day = int(clean_str[5:7])
                year = roc_year + 1911
            else:
                return None

        return datetime.date(year, month, day)
    except:
        return None

# ================= 介面區 =================
def main():
    st.set_page_config(page_title="紫微個案管理 V0.2", layout="wide")
    st.title("🔮 專業紫微斗數排盤系統 (V0.2)")

    # --- 初始化暫存資料庫 ---
    if 'profiles' not in st.session_state:
        st.session_state['profiles'] = []
    
    # 用於檢查是否剛剛按了載入
    if 'current_profile' not in st.session_state:
        st.session_state['current_profile'] = None

    # --- 側邊欄：資料庫清單 ---
    with st.sidebar:
        st.header("📂 個案資料庫")
        st.info("目前為暫存模式 (重整網頁會清空)")
        
        if len(st.session_state['profiles']) > 0:
            for idx, p in enumerate(st.session_state['profiles']):
                # 顯示格式：[類別] 姓名
                btn_label = f"[{p['category']}] {p['name']}"
                if st.button(btn_label, key=f"btn_{idx}"):
                    st.session_state['current_profile'] = p
        else:
            st.caption("尚無資料，請在右側新增")

    # --- 主畫面：輸入與操作 ---
    
    # 判斷是否要載入舊資料
    loaded_data = st.session_state['current_profile']
    
    # 預設值設定 (若有載入資料則用載入的，否則為空)
    def_name = loaded_data['name'] if loaded_data else ""
    def_cat = loaded_data['category'] if loaded_data else "未分類"
    def_date_mode = 0 if (loaded_data and loaded_data['date_mode']=='西元') else 1 # 0是西元, 1是民國
    def_date_str = loaded_data['date_str'] if loaded_data else ""
    def_hour = loaded_data['hour'] if loaded_data else ""
    def_minute = loaded_data['minute'] if loaded_data else ""
    def_gender_idx = 0 if (loaded_data and loaded_data['gender']=='男') else 1

    st.subheader("1. 輸入命主資料")
    
    col_base1, col_base2, col_base3 = st.columns(3)
    with col_base1:
        name = st.text_input("姓名", value=def_name, placeholder="請輸入姓名")
    with col_base2:
        gender = st.radio("性別", ("男", "女"), index=def_gender_idx, horizontal=True)
    with col_base3:
        category = st.text_input("類別/標籤", value=def_cat, placeholder="如：客戶、親友")

    st.write("---")
    
    # 日期與時間輸入區
    col_dt1, col_dt2 = st.columns([1, 1])
    
    with col_dt1:
        st.write("**出生日期**")
        date_mode = st.radio("格式選擇", ("西元", "民國"), index=def_date_mode, horizontal=True)
        date_str_input = st.text_input(
            f"輸入{date_mode}日期", 
            value=def_date_str,
            placeholder="如 19790926" if date_mode == '西元' else "如 680926",
            help="直接輸入數字即可，不用加斜線"
        )
        
        # 即時解析與回饋
        parsed_date = parse_smart_date(date_str_input, date_mode)
        if date_str_input and parsed_date:
            st.success(f"系統判讀：西元 {parsed_date.year} 年 {parsed_date.month} 月 {parsed_date.day} 日")
        elif date_str_input:
            st.error("格式錯誤，請檢查輸入位數")

    with col_dt2:
        st.write("**出生時間 (24小時制)**")
        c_h, c_m = st.columns(2)
        hour_input = c_h.text_input("時 (Hour)", value=def_hour, placeholder="18", max_chars=2)
        minute_input = c_m.text_input("分 (Minute)", value=def_minute, placeholder="06", max_chars=2)
        
        # 時間解析
        final_time = None
        if hour_input and minute_input:
            try:
                h = int(hour_input)
                m = int(minute_input)
                if 0 <= h <= 23 and 0 <= m <= 59:
                    final_time = datetime.time(h, m)
                    st.success(f"系統判讀：{final_time.strftime('%H:%M')}")
                else:
                    st.error("時間數值不合理")
            except:
                st.error("請輸入純數字")

    # --- 按鈕區 ---
    col_btn1, col_btn2 = st.columns([1, 4])
    with col_btn1:
        save_btn = st.button("💾 新增/更新至資料庫", type="primary")
    with col_btn2:
        calc_btn = st.button("🚀 開始排盤")

    # --- 邏輯處理 ---
    
    # 1. 儲存功能
    if save_btn:
        if name and parsed_date and final_time:
            # 建立資料物件
            profile_data = {
                "name": name,
                "gender": gender,
                "category": category,
                "date_mode": date_mode,
                "date_str": date_str_input,
                "hour": hour_input,
                "minute": minute_input,
                "parsed_date": parsed_date,
                "final_time": final_time
            }
            # 簡單的儲存邏輯：如果是同名字就更新，不同就新增 (這裡簡化處理)
            existing = False
            for p in st.session_state['profiles']:
                if p['name'] == name:
                    p.update(profile_data)
                    existing = True
                    break
            if not existing:
                st.session_state['profiles'].append(profile_data)
            
            st.toast(f"✅ {name} 的資料已儲存！")
            st.rerun() # 重新整理以更新側邊欄
        else:
            st.error("請填寫完整姓名、正確日期與時間才能儲存")

    # 2. 排盤功能
    if calc_btn and parsed_date and final_time:
        st.divider()
        
        # 轉換農曆
        solar = Solar.fromYmdHms(parsed_date.year, parsed_date.month, parsed_date.day, final_time.hour, final_time.minute, 0)
        lunar = solar.getLunar()
        ba_zi = lunar.getEightChar()
        
        st.subheader(f"📄 {name} 的命盤資訊")
        
        # 顯示區塊
        res_c1, res_c2 = st.columns(2)
        with res_c1:
            st.write(f"**西曆**：{parsed_date} {final_time.strftime('%H:%M')}")
            st.write(f"**農曆**：{lunar.getYear()}年 {lunar.getMonthInChinese()}月 {lunar.getDayInChinese()} {ba_zi.getTimeZhi()}時")
        with res_c2:
            st.write(f"**八字**：{ba_zi.getYearGan()}{ba_zi.getYearZhi()} 年")
            st.write(f"**月日**：{ba_zi.getMonthGan()}{ba_zi.getMonthZhi()} 月 {ba_zi.getDayGan()}{ba_zi.getDayZhi()} 日")

        st.divider()
        st.write("### 🧮 特殊規則驗證")
        
        tm = get_tian_ma_by_month(ba_zi.getMonthZhi())
        ky = get_kui_yue(ba_zi.getYearGan())
        
        st.write(f"**月支天馬** (月支{ba_zi.getMonthZhi()}) ➡️ **{tm}**")
        st.write(f"**年干魁鉞** (年干{ba_zi.getYearGan()}) ➡️ 魁**{ky['魁']}**、鉞**{ky['鉞']}**")

if __name__ == "__main__":
    main()
