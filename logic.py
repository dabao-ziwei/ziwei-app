# logic.py
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

    def calculate_sihua(self, daxian_gan_idx, liunian_gan_idx):
        sihua_table = [
            ["廉貞", "破軍", "武曲", "太陽"], # 甲
            ["天機", "天梁", "紫微", "太陰"], # 乙
            ["天同", "天機", "文昌", "廉貞"], # 丙
            ["太陰", "天同", "天機", "巨門"], # 丁
            ["貪狼", "太陰", "右弼", "天機"], # 戊
            ["武曲", "貪狼", "天梁", "文曲"], # 己
            ["太陽", "武曲", "天同", "天相"], # 庚
            ["巨門", "太陽", "文曲", "文昌"], # 辛
            ["天梁", "紫微", "左輔", "武曲"], # 壬
            ["破軍", "巨門", "太陰", "貪狼"]  # 癸
        ]
        
        layers = [
            (self.year_gan_idx, "本"),
            (daxian_gan_idx, "大"), 
            (liunian_gan_idx, "流") 
        ]
        types = ["祿", "權", "科", "忌"]
        
        for pid, palace in self.palaces.items():
            for star in palace["major_stars"]:
                star['sihua'] = [] # 重置
                s_name = star['name']
                # 遍歷每一層 (本、大、流)
                for gan_idx, layer_name in layers:
                    stars_list = sihua_table[gan_idx]
                    if s_name in stars_list:
                        s_type = types[stars_list.index(s_name)]
                        # 存入列表，後續會依照列表順序渲染
                        star['sihua'].append({'type': s_type, 'layer': layer_name})

    def get_result(self):
        return self.palaces, self.ming_star, self.bureau_name, self.birth_year, self.ming_pos
