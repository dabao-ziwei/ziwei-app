from lunar_python import Lunar, Solar

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
            "life_stage": "",
            "gan_idx": 0, 
            "zhi_idx": i, 
            "age_start": 0, 
            "age_end": 0
        } for i in range(12)}
        
        self._calc_palaces()
        self._calc_bureau()
        self._calc_main_stars()
        self._calc_minor_stars()
        self._calc_shen_sha()
        self._calc_life_stages()
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
            bright = "" 
            self.palaces[idx]["major_stars"].append({'name': name, 'bright': bright, 'sihua': []})

        zw_map = {0:"紫微", -1:"天機", -3:"太陽", -4:"武曲", -5:"天同", -8:"廉貞"}
        for off, name in zw_map.items(): add_star((zp + off)%12, name)
            
        tp = (4 - zp) % 12
        tf_map = {0:"天府", 1:"太陰", 2:"貪狼", 3:"巨門", 4:"天相", 5:"天梁", 6:"七殺", 10:"破軍"}
        for off, name in tf_map.items(): add_star((tp + off)%12, name)
        
        self.ming_star = self.palaces[self.ming_pos]["major_stars"][0]['name'] if self.palaces[self.ming_pos]["major_stars"] else ""

    def _calc_minor_stars(self):
        # (名稱, 是否煞星, 是否重要輔星)
        def add_minor(idx, name, is_bad=False, is_imp=False):
            self.palaces[idx % 12]["minor_stars"].append((name, is_bad, is_imp))

        y_zhi = self.year_zhi_idx
        y_gan = self.year_gan_idx
        h_zhi = self.time_zhi_idx
        m_num = self.lunar_month
        d_num = self.lunar_day

        # 1. 祿存、擎羊、陀羅 (重要)
        lu_pos = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][y_gan]
        add_minor(lu, "祿存", False, True)
        add_minor(lu + 1, "擎羊", True, True)
        add_minor(lu - 1, "陀羅", True, True)

        # 2. 魁鉞 (重要)
        kui_yue = {0:(1,7), 1:(0,8), 2:(11,9), 3:(11,9), 4:(1,7), 5:(0,8), 6:(1,7), 7:(6,2), 8:(3,5), 9:(3,5)}
        k, y = kui_yue[y_gan]
        add_minor(k, "天魁", False, True)
        add_minor(y, "天鉞", False, True)

        # 3. 輔弼 (重要)
        add_minor(4 + (m_num - 1), "左輔", False, True)
        add_minor(10 - (m_num - 1), "右弼", False, True)

        # 4. 昌曲 (重要)
        pos_chang = (10 - h_zhi) % 12
        pos_qu = (4 + h_zhi) % 12
        add_minor(pos_chang, "文昌", False, True)
        add_minor(pos_qu, "文曲", False, True)

        # 5. 火鈴 (重要)
        fire_bell_start = {2:(1,3), 6:(1,3), 10:(1,3), 8:(2,10), 0:(2,10), 4:(2,10), 5:(3,10), 9:(3,10), 1:(3,10), 11:(9,10), 3:(9,10), 7:(9,10)}
        st_fire, st_bell = fire_bell_start[y_zhi]
        add_minor(st_fire + h_zhi, "火星", True, True)
        add_minor(st_bell + h_zhi, "鈴星", True, True)

        # 6. 空劫 (重要)
        add_minor(11 - h_zhi, "地空", True, True)
        add_minor(11 + h_zhi, "地劫", True, True)

        # === 雜曜 (不重要) ===
        add_minor(pos_chang + d_num - 1, "恩光")
        add_minor(pos_qu + d_num - 1, "天貴")
        pos_fu = (4 + m_num - 1) % 12
        pos_bi = (10 - m_num + 1) % 12
        add_minor(pos_fu + d_num - 1, "三台")
        add_minor(pos_bi - (d_num - 1), "八座")
        add_minor(9 + m_num - 1, "天刑", True)
        add_minor(1 + m_num - 1, "天姚")
        pos_luan = (3 - y_zhi) % 12
        add_minor(pos_luan, "紅鸞")
        add_minor(pos_luan + 6, "天喜")
        
        if y_zhi in [11,0,1]: add_minor(2,"孤辰"); add_minor(10,"寡宿")
        elif y_zhi in [2,3,4]: add_minor(5,"孤辰"); add_minor(1,"寡宿")
        elif y_zhi in [5,6,7]: add_minor(8,"孤辰"); add_minor(4,"寡宿")
        else: add_minor(11,"孤辰"); add_minor(7,"寡宿")

        add_minor(4 + y_zhi, "龍池")
        add_minor(10 - y_zhi, "鳳閣")
        add_minor(1 + y_zhi, "天空", True)
        add_minor(6 - y_zhi, "天哭")
        add_minor(6 + y_zhi, "天虛")
        
        feilian_map = {0:8, 1:9, 2:10, 3:5, 4:6, 5:7, 6:2, 7:3, 8:4, 9:11, 10:1, 11:0}
        add_minor(feilian_map[y_zhi], "蜚廉")
        
        if y_zhi in [0,6,3,9]: add_minor(5, "破碎")
        elif y_zhi in [2,8,5,11]: add_minor(9, "破碎")
        else: add_minor(1, "破碎")

        add_minor(self.ming_pos - 7, "天傷", True)
        add_minor(self.ming_pos - 5, "天使", True)

        tian_guan = [7, 4, 5, 2, 3, 9, 11, 9, 10, 6]
        tian_fu = [9, 8, 0, 11, 3, 2, 6, 5, 6, 5]
        add_minor(tian_guan[y_gan], "天官")
        add_minor(tian_fu[y_gan], "天福")
        
        tian_chu = [5, 6, 0, 5, 6, 8, 2, 6, 9, 11]
        add_minor(tian_chu[y_gan], "天廚")
        
        add_minor(self.ming_pos + y_zhi, "天才")
        add_minor(self.shen_pos + y_zhi, "天壽")
        
        jie_kong = {0:(8,9), 5:(8,9), 1:(6,7), 6:(6,7), 2:(4,5), 7:(4,5), 3:(2,3), 8:(2,3), 4:(0,1), 9:(0,1)}
        jk1, jk2 = jie_kong[y_gan]
        add_minor(jk1, "截空", True)
        add_minor(jk2, "截空", True)
        
        shift = (y_zhi - y_gan + 12) % 12
        xk1 = (shift - 2 + 12) % 12
        xk2 = (shift - 1 + 12) % 12
        add_minor(xk1, "旬空", True)
        add_minor(xk2, "旬空", True)
        
        tian_yue = [10, 5, 4, 2, 7, 3, 11, 7, 2, 6, 10, 2]
        add_minor(tian_yue[m_num-1], "天月", True)

    def _calc_shen_sha(self):
        # 博士
        lu_pos = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0][self.year_gan_idx]
        boshi_names = ["博士","力士","青龍","小耗","將軍","奏書","飛廉","喜神","病符","大耗","伏兵","官府"]
        for i, name in enumerate(boshi_names):
            pos = (lu_pos + i * self.direction) % 12
            self.palaces[pos]["minor_stars"].append((name, False, False)) # 不重要

        # 歲前
        sui_names = ["歲建","晦氣","喪門","貫索","官符","小耗","大耗","龍德","白虎","天德","吊客","病符"]
        for i, name in enumerate(sui_names):
            pos = (self.year_zhi_idx + i) % 12
            self.palaces[pos]["minor_stars"].append((name, False, False))

        # 將前
        jiang_start = {2:6, 6:6, 10:6, 8:0, 0:0, 4:0, 5:9, 9:9, 1:9, 11:3, 3:3, 7:3}
        start = jiang_start[self.year_zhi_idx]
        jiang_names = ["將星","攀鞍","歲驛","息神","華蓋","劫煞","災煞","天煞","指背","咸池","月煞","亡神"]
        for i, name in enumerate(jiang_names):
            pos = (start + i) % 12
            self.palaces[pos]["minor_stars"].append((name, False, False))

    def _calc_life_stages(self):
        start_map = {2:8, 5:8, 3:11, 4:5, 6:2}
        start_pos = start_map[self.bureau_num]
        stages = ["長生","沐浴","冠帶","臨官","帝旺","衰","病","死","墓","絕","胎","養"]
        for i, name in enumerate(stages):
            pos = (start_pos + i * self.direction) % 12
            self.palaces[pos]["life_stage"] = name

    def calculate_sihua(self, daxian_gan_idx, liunian_gan_idx):
        sihua_table = [
            ["廉貞", "破軍", "武曲", "太陽"], ["天機", "天梁", "紫微", "太陰"], ["天同", "天機", "文昌", "廉貞"], 
            ["太陰", "天同", "天機", "巨門"], ["貪狼", "太陰", "右弼", "天機"], ["武曲", "貪狼", "天梁", "文曲"], 
            ["太陽", "武曲", "天同", "天相"], ["巨門", "太陽", "文曲", "文昌"], ["天梁", "紫微", "左輔", "武曲"], 
            ["破軍", "巨門", "太陰", "貪狼"]
        ]
        layers = [(self.year_gan_idx, "本"), (daxian_gan_idx, "大"), (liunian_gan_idx, "流")]
        types = ["祿", "權", "科", "忌"]
        
        for pid, palace in self.palaces.items():
            for star in palace["major_stars"]:
                star['sihua'] = [] 
                s_name = star['name']
                for gan_idx, layer_name in layers:
                    if gan_idx == -1: continue
                    stars_list = sihua_table[gan_idx]
                    if s_name in stars_list:
                        s_type = types[stars_list.index(s_name)]
                        star['sihua'].append({'type': s_type, 'layer': layer_name})

    def get_result(self):
        return self.palaces, self.ming_star, self.bureau_name, self.birth_year, self.ming_pos
