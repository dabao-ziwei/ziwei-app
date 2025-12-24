from logic import GAN, ZHI

PALACE_NAMES = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"]

def get_relative_palace_name(ming_pos, current_cell_pos):
    idx = (ming_pos - current_cell_pos) % 12
    return PALACE_NAMES[idx]

# 取得 Grid 座標 (0-3, 0-3)
def get_grid_coord(zhi_idx):
    coords = {
        5: (0, 0), 6: (0, 1), 7: (0, 2), 8: (0, 3),
        4: (1, 0),                    9: (1, 3),
        3: (2, 0),                    10: (2, 3),
        2: (3, 0), 1: (3, 1), 0: (3, 2), 11: (3, 3)
    }
    return coords[zhi_idx]

def render_triangles_svg(focus_idx):
    """ 繪製虛線三角形與對宮連線 """
    if focus_idx == -1: return ""
    
    p1, p2, p3 = focus_idx, (focus_idx + 4) % 12, (focus_idx + 8) % 12
    p_opp = (focus_idx + 6) % 12
    
    def get_pos(idx):
        r, c = get_grid_coord(idx)
        return c * 25 + 12.5, r * 25 + 12.5 # 中心點百分比

    x1, y1 = get_pos(p1)
    x2, y2 = get_pos(p2)
    x3, y3 = get_pos(p3)
    xo, yo = get_pos(p_opp)
    
    # style: stroke-dasharray="5,5" 做出虛線效果，像參考圖一樣
    svg = f"""
    <svg class="svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polygon points="{x1},{y1} {x2},{y2} {x3},{y3}" fill="none" stroke="#666" stroke-width="0.3" stroke-dasharray="2,2" />
        <line x1="{x1}" y1="{y1}" x2="{xo}" y2="{yo}" stroke="#666" stroke-width="0.3" stroke-dasharray="2,2" />
        <circle cx="{x1}" cy="{y1}" r="0.8" fill="red" />
    </svg>
    """
    return svg

def get_palace_html(idx, branch, r, c, info, daxian_pos, liunian_pos, benming_pos, is_pure_benming=False, shen_pos=-1, focus_idx=-1):
    # 狀態判斷
    is_daxian = (idx == daxian_pos) and not is_pure_benming
    is_liunian = (idx == liunian_pos) and not is_pure_benming
    
    # 高亮判斷
    cls = ["zwds-cell"]
    if is_daxian: cls.append("active-daxian")
    if is_liunian: cls.append("active-liunian")
    
    # 三方四正高亮
    if focus_idx != -1:
        if idx == focus_idx: cls.append("highlight-focus")
        elif idx in [(focus_idx+4)%12, (focus_idx+8)%12]: cls.append("highlight-sanfang")
        elif idx == (focus_idx+6)%12: cls.append("highlight-duigong")

    # 1. 星曜區 (主星+副星 直接串接)
    stars_html = ""
    # 主星
    for star in info['major_stars']:
        sihua = "".join([f"<span class='hua-badge { {'本':'bg-ben','大':'bg-da','流':'bg-liu'}.get(s['layer']) }'>{s['type']}</span>" for s in star['sihua'] if not is_pure_benming or s['layer']=='本'])
        stars_html += f"<div class='star-major'><span class='star-name'>{star['name']}</span>{sihua}</div>"
    
    # 副星 (分類)
    for m in info['minor_stars']:
        # (name, is_bad, is_imp)
        style = "star-med" if m[2] else "star-sml"
        stars_html += f"<div class='{style}'>{m[0]}</div>"

    # 2. 左下 (神煞+歲數)
    sui = info['sui_12'][0] if info['sui_12'] else ""
    jiang = info['jiang_12'][0] if info['jiang_12'] else ""
    boshi = info['boshi_12'][0] if info['boshi_12'] else ""
    age_range = f"{info['age_start']}-{info['age_end']}" if is_pure_benming else f"{info['age_start']}/{info['age_end']}"
    
    left_html = f"""
    <div class='footer-left'>
        <div class='gods-col'>
            <span class='god-text' style='color:#008080'>{sui}</span>
            <span class='god-text' style='color:#4682B4'>{jiang}</span>
            <span class='god-text' style='color:#9370DB'>{boshi}</span>
        </div>
        <div class='limit-text'>{age_range}</div>
    </div>
    """

    # 3. 右下 (宮位+干支)
    # 身宮
    shen_html = "<div class='badge-shen'>身</div>" if is_pure_benming and idx == shen_pos else ""
    # 長生
    life_html = f"<div class='life-stage'>{info['life_stage']}</div>"
    # 宮名
    ben_name = get_relative_palace_name(benming_pos, idx)
    names_html = f"<div class='palace-name'>{ben_name}</div>"
    if not is_pure_benming:
        if liunian_pos != -1: 
            ln_name = get_relative_palace_name(liunian_pos, idx)[0]
            names_html = f"<div style='color:#0056b3;font-size:13px;font-weight:900'>流{ln_name}</div>" + names_html
        if daxian_pos != -1:
            dn_name = get_relative_palace_name(daxian_pos, idx)[0]
            names_html = f"<div style='color:#666;font-size:13px;font-weight:900'>大{dn_name}</div>" + names_html
            
    right_html = f"""
    <div class='footer-right'>
        <div class='info-col'>
            {shen_html}
            {life_html}
            {names_html}
        </div>
        <div class='ganzhi-label'>{GAN[info['gan_idx']]}{branch}</div>
    </div>
    """

    return f"<div class='{' '.join(cls)}' style='grid-row: {r}; grid-column: {c};'><div class='stars-box'>{stars_html}</div>{left_html}{right_html}</div>"

def get_center_html(data, calc_obj):
    return f"""
    <div class='center-box'>
        <h2 style='margin:0;font-size:24px;color:#000;'>{data['name']}</h2>
        <div style='font-size:13px;color:#666;margin:5px 0;'>{data['gender']} | {calc_obj.bureau_name} | {data.get('ming_star','')}坐命</div>
        <div style='font-size:14px;font-weight:bold;color:#2E7D32;'>國曆：{data['y']}/{data['m']}/{data['d']} {data['h']}:{data['min']:02d}</div>
        <div style='font-size:13px;color:#555;'>農曆：{calc_obj.lunar.getYearInGanZhi()}年 {calc_obj.lunar.getMonthInChinese()}月 {calc_obj.lunar.getDayInChinese()}</div>
    </div>
    """
