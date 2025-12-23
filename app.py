import streamlit as st
import datetime
from lunar_python import Lunar, Solar

# ================= 核心邏輯區 =================
# 3.1 安天馬：依據「月支」(特殊需求)
def get_tian_ma_by_month(month_zhi_char):
    rules = {
        '申': '寅', '子': '寅', '辰': '寅',
        '寅': '申', '午': '申', '戌': '申',
        '亥': '巳', '卯': '巳', '未': '巳',
        '巳': '亥', '酉': '亥', '丑': '亥'
    }
    return rules.get(month_zhi_char, "")

# 3.6 安魁鉞：六辛逢虎馬 (特殊需求)
def get_kui_yue(year_gan_char):
    if year_gan_char == '辛':
        return {'魁': '寅', '鉞': '午'}
    elif year_gan_char in ['甲', '戊', '庚']:
        # 甲戊庚牛羊 (丑未)
        return {'魁': '丑', '鉞': '未'}
    elif year_gan in ['乙', '己']:
        # 乙己鼠猴鄉 (子申)
        return {'魁': '子', '鉞': '申'}
    elif year_gan == '丙' or year_gan == '丁':
        # 丙丁豬雞位 (亥酉)
        return {'魁': '亥', '鉞': '酉'}
    elif year_gan == '壬' or year_gan == '癸':
        # 壬癸兔蛇藏 (卯巳)
        return {'魁': '卯', '鉞': '巳'}
    else:
        return {'魁': '?', '鉞': '?'}

# ================= 介面區 =================
def main():
    st.set_page_config(page_title="紫微排盤 V0.1", layout="wide")
    st.title("🔮 客製化紫微斗數排盤 (Web App版)")

    with st.sidebar:
        st.header("請輸入命主資料")
        name = st.text_input("姓名", "測試命主")
        gender = st.radio("性別", ("男", "女"))
        # 預設為您的生日
        dob = st.date_input("出生日期", datetime.date(1979, 9, 26), min_value=datetime.date(1900, 1, 1))
        # 預設為您的時辰 (酉時)
        tob = st.time_input("出生時間", datetime.time(17, 30))
        
        submit = st.button("開始排盤")

    if submit:
        st.divider()
        # 1. 轉換西曆 -> 農曆
        solar = Solar.fromYmdHms(dob.year, dob.month, dob.day, tob.hour, tob.minute, 0)
        lunar = solar.getLunar()
        ba_zi = lunar.getEightChar()
        
        # 2. 顯示基礎資訊
        st.subheader(f"📄 {name} 的命盤資訊")
        col1, col2 = st.columns(2)
        with col1:
            st.info(f"**西曆**：{dob} {tob}")
            st.success(f"**農曆**：{lunar.getYear()}年 {lunar.getMonthInChinese()}月 {lunar.getDayInChinese()} {ba_zi.getTimeZhi()}時")
        with col2:
            st.error(f"**八字**：{ba_zi.getYearGan()}{ba_zi.getYearZhi()} 年 | {ba_zi.getMonthGan()}{ba_zi.getMonthZhi()} 月")

        st.divider()
        st.write("### 🧮 特殊規則邏輯驗證")
        
        # 驗證天馬
        tm = get_tian_ma_by_month(ba_zi.getMonthZhi())
        st.metric("月支天馬 (您的規則)", f"{ba_zi.getMonthZhi()}月 ➡️ 在 {tm}")
        
        # 驗證魁鉞
        ky = get_kui_yue(ba_zi.getYearGan())
        st.metric("年干魁鉞 (您的規則)", f"{ba_zi.getYearGan()}干 ➡️ 魁{ky['魁']}、鉞{ky['鉞']}")
        
        if ba_zi.getYearGan() == '辛':
            st.caption("✅ 檢測到辛干，已啟用「六辛逢虎馬」規則")

if __name__ == "__main__":
    main()
