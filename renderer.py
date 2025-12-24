from logic import GAN, ZHI

PALACE_NAMES = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"]

def get_relative_palace_name(ming_pos, current_cell_pos):
    idx = (ming_pos - current_cell_pos) % 12
    return PALACE_NAMES[idx]

# 根據地支位置(0-11) 取得 Grid 中的 (row, col)
# 布局: 
# 5(巳) 6(午) 7(未) 8(申) -> Row 1
# 4(辰)             9(酉) -> Row 2
# 3(卯)             10(戌) -> Row 3
# 2(寅) 1(丑) 0(子) 11(亥) -> Row 4
def get_grid_coord(zhi_idx):
    # map[zhi_idx] = (row_start, col_start) 1-based for css grid, but here we need 0-based for calculation
    # Grid is 4x4.
    coords = {
        5: (0, 0), 6: (0, 1), 7: (0, 2), 8: (0, 3),
        4: (1, 0),                    9: (1, 3),
        3: (2, 0),                    10: (2, 3),
        2: (3, 0), 1: (3, 1), 0: (3, 2), 11: (3, 3)
    }
    return coords[zhi_idx]

def render_triangles_svg(focus_idx):
    if focus_idx == -1: return ""
    
    # 三方：Focus, Focus+4, Focus+8 (mod 12)
    # 四正：Focus+6 (mod 12)
    p1 = focus_idx
    p2 = (focus_idx + 4) % 12
    p3 = (focus_idx + 8) % 12
    p_opp = (focus_idx + 6) % 12
    
    def get_center_pct(idx):
        r, c = get_grid_coord(idx)
        # 每個格子 25% 寬高，中心點在 12.5% + offset
        x = c * 25 + 12.5
        y = r * 25 + 12.5
        return x, y

    x1, y1 = get_center_pct(p1)
    x2, y2 = get_center_pct(p2)
    x3, y3 = get_center_pct(p3)
    xo, yo = get_center_pct(p_opp)
    
    # SVG 線條：紅色，半透明
    svg = f"""
    <svg class="svg-overlay" viewBox="0 0 100 100" preserveAspectRatio="none">
        <line x1="{x1}%" y1="{y1}%" x2="{x2}%" y2="{y2}%" stroke="rgba(255,0,0,0.6)" stroke-width="0.5" />
        <line x2="{x2}%" y2="{y2}%" x1="{x3}%" y1="{y3}%" stroke="rgba(255,0,0,0.6)" stroke-width="0.5" />
        <line x1="{x3}%" y1="{y3}%" x2="{x1}%" y2="{y1}%" stroke="rgba(255,0,0,0.6)" stroke-width="0.5" />
        <line x1="{x1}%" y1="{y1}%" x2="{xo}%" y2="{yo}%" stroke="rgba(255,0,0,0.4)" stroke-width="0.5" stroke-dasharray="2" />
    </svg>
    """
    return svg

def get_palace_html(idx, branch, r, c, info, daxian_pos, liunian_pos, benming_pos, is_pure_benming=False, shen_pos=-1, focus_idx=-1):
    is_daxian = (idx == daxian_pos) and not is_pure_benming
    is_liunian = (idx == liunian_pos) and not is_pure_benming
    
    # 判斷三方四正高亮
    is_focus = (idx == focus_idx)
    is_sanfang = (focus_idx != -1) and (idx == (focus_idx+4)%12 or idx == (focus_idx+8)%12)
    is_duigong = (focus_idx != -1) and (idx == (focus_idx+6)%12)

    classes = ["zwds-cell"]
    if is_daxian: classes.append("active-daxian")
    if is_liunian: classes.append("active-liunian")
    
    # 加入高亮 class
    if is_focus: classes.append("highlight-focus")
    if is_sanfang: classes.append("highlight-sanfang")
    if is_duigong: classes.append("highlight-duigong")

    class_str = " ".join(classes)
    
    # 1. 主星
    main_stars_html = ""
    for star in info['major_stars']:
        sihua_html = ""
        for sh in star['sihua']:
            if is_pure_benming and sh['layer'] != '本': continue
            bg_cls = {"本":"bg-ben", "大":"bg-da", "流":"bg-liu"}.get(sh['layer'], "")
            sihua_html += f"<span class='hua-badge {bg_cls}'>{sh['type']}</span>"
        main_stars_html += f"<div class='star-major-container'><div class='star-name'>{star['name']}</div>{sihua_html}</div>"
    
    # 2. 副星 (扁平化)
    aux_stars = []
    misc_stars = [] 
    for m_name, is_bad, is_impt in info['minor_stars']:
        if is_impt: aux_stars.append(m_name)
        else: misc_stars.append(m_name)
    
    sub_stars_html = ""
    for m_name in aux_stars:
        sub_stars_html += f"<div class='star-medium'>{m_name}</div>"
    for m_name in misc_stars:
        sub_stars_html += f"<div class='star-small'>{m_name}</div>"
    
    # 3. 左下角
    sui = info['sui_12'][0] if info['sui_12'] else ""
    jiang = info['jiang_12'][0] if info['jiang_12'] else ""
    boshi = info['boshi_12'][0] if info['boshi_12'] else ""
    limit_text = f"{info['age_start']}/{info['age_end']}"
    limit_info_html = f"<div class='limit-info'>{limit_text}</div>"
    
    footer_left_html = (
        f"<div class='footer-left'>"
        f"<div class='gods-col'>"
        f"<div class='god-star god-sui'>{sui}</div>"
        f"<div class='god-star god-jiang'>{jiang}</div>"
        f"<div class='god-star god-boshi'>{boshi}</div>"
        f"</div>"
        f"{limit_info_html}"
        f"</div>"
    )

    # 4. 右下角
    name_liu_html = ""
    name_da_html = ""
    name_ben = get_relative_palace_name(benming_pos, idx)
    shen_badge_html = ""
    if is_pure_benming and idx == shen_pos:
        shen_badge_html = "<div class='shen-badge'>身</div>"

    if not is_pure_benming:
        if liunian_pos != -1:
            name_liu = "流" + get_relative_palace_name(liunian_pos, idx)[0]
            name_liu_html = f"<div class='p-name-liu'>{name_liu}</div>"
        if daxian_pos != -1:
            name_da = "大" + get_relative_palace_name(daxian_pos, idx)[0]
            name_da_html = f"<div class='p-name-da'>{name_da}</div>"
    
    life_stage_html = f"<div class='life-stage'>{info['life_stage']}</div>"
    
    palace_info_html = (
        f"<div class='palace-info-col'>"
        f"{shen_badge_html}"
        f"{life_stage_html}"
        f"{name_liu_html}"
        f"{name_da_html}"
        f"<div class='p-name-ben'>{name_ben}</div>"
        f"</div>"
    )
    ganzhi_html = f"<div class='ganzhi-col'>{GAN[info['gan_idx']]}{branch}</div>"

    footer_right_html = f"<div class='footer-right'>{palace_info_html}{ganzhi_html}</div>"

    # 5. 組合
    final_html = (
        f"<div class='{class_str}' style='grid-row: {r}; grid-column: {c};'>"
        f"<div class='stars-box'>{main_stars_html}{sub_stars_html}</div>"
        f"{footer_left_html}"
        f"{footer_right_html}"
        f"</div>"
    )
    return final_html

def get_center_html(data, calc_obj):
    return (
        f"<div class='center-info-box'>"
        f"<h3 style='margin:0;color:#000;font-size:20px;'>{data['name']}</h3>"
        f"<div style='color:#666;font-size:12px;margin:2px 0;'>{data['gender']} | {calc_obj.bureau_name} | {data.get('ming_star','')}坐命</div>"
        f"<div style='color:#2e7d32;font-size:13px;font-weight:bold;'>國曆：{data['y']}/{data['m']}/{data['d']} {data['h']}:{data['min']:02d}</div>"
        f"<div style='color:#555;font-size:12px;'>農曆：{calc_obj.lunar.getYearInGanZhi()}年 {calc_obj.lunar.getMonthInChinese()}月 {calc_obj.lunar.getDayInChinese()}</div>"
        f"</div>"
    )
