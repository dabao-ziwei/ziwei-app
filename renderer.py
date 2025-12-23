from logic import GAN, ZHI

# 宮位名稱列表 (逆時針排列)
PALACE_NAMES = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"]

def get_relative_palace_name(ming_pos, current_cell_pos):
    """
    計算相對宮位名稱
    ming_pos: 命宮(或其他盤命宮)的地支索引 (0=子, 1=丑...)
    current_cell_pos: 當前格子索引
    公式: (命宮位置 - 當前位置) % 12
    """
    idx = (ming_pos - current_cell_pos) % 12
    return PALACE_NAMES[idx]

def get_palace_html(idx, branch, r, c, info, daxian_pos, liunian_pos, benming_pos):
    """
    idx: 當前宮位索引 (0-11)
    daxian_pos: 大限命宮索引
    liunian_pos: 流年命宮索引
    benming_pos: 本命命宮索引
    """
    is_daxian = (idx == daxian_pos)
    is_liunian = (idx == liunian_pos)
    
    classes = ["zwds-cell"]
    if is_daxian: classes.append("active-daxian")
    if is_liunian: classes.append("active-liunian")
    class_str = " ".join(classes)
    
    # 1. 主星區塊
    main_stars_html = ""
    for star in info['major_stars']:
        sihua_html = ""
        for sh in star['sihua']:
            bg_cls = {"本":"bg-ben", "大":"bg-da", "流":"bg-liu"}.get(sh['layer'], "")
            sihua_html += f"<span class='hua-badge {bg_cls}'>{sh['type']}</span>"
        
        main_stars_html += f"<div class='star-major-container'><div class='star-name'>{star['name']}</div>{sihua_html}</div>"
    
    # 2. 副星區塊
    sub_stars_html = ""
    for m_name, is_bad, is_impt in info['minor_stars']:
        style_cls = ""
        if m_name == "祿存": style_cls = "color-good"
        elif is_bad: style_cls = "color-bad"
        
        size_cls = "star-medium" if is_impt else "star-small"
        sub_stars_html += f"<div class='{size_cls} {style_cls}'>{m_name}</div>"
    
    # 3. 計算堆疊宮名 (流 -> 大 -> 本)
    # 取得本命、大限、流年在這一格的宮位名稱
    name_liu = "流" + get_relative_palace_name(liunian_pos, idx)[0] # 取簡稱，如 "流命"
    name_da = "大" + get_relative_palace_name(daxian_pos, idx)[0]   # 取簡稱，如 "大子"
    name_ben = get_relative_palace_name(benming_pos, idx)           # 本命顯示全名，如 "僕役"
    
    # 身宮標記
    if "身宮" in info['name']:
        name_ben += "(身)"

    # 4. 底部資訊 HTML 組合
    footer_html = (
        f"<div class='cell-footer'>"
        f"<div class='footer-left'><span class='ganzhi-label'>{GAN[info['gan_idx']]}</span><span class='zhi-label'>{branch}</span></div>"
        f"<div class='footer-right'>"
        f"<div class='p-name-liu'>{name_liu}</div>"
        f"<div class='p-name-da'>{name_da}</div>"
        f"<div class='p-name-ben'>{name_ben}<span class='limit-info'> {info['age_start']}-{info['age_end']}</span></div>"
        f"</div>"
        f"</div>"
    )

    # 5. 組合最終 HTML
    final_html = (
        f"<div class='{class_str}' style='grid-row: {r}; grid-column: {c};'>"
        f"<div class='stars-box'>"
        f"{main_stars_html}"  
        f"<div class='sub-stars-col'>{sub_stars_html}</div>"
        f"</div>"
        f"{footer_html}"
        f"</div>"
    )
    
    return final_html

def get_center_html(data, calc_obj):
    return (
        f"<div class='center-info-box'>"
        f"<h3 style='margin:0;color:#000;font-size:24px;'>{data['name']}</h3>"
        f"<div style='color:#666;font-size:14px;margin:3px 0;'>{data['gender']} | {calc_obj.bureau_name} | {data.get('ming_star','')}坐命</div>"
        f"<div style='color:#2e7d32;font-size:14px;font-weight:bold;'>國曆：{data['y']}/{data['m']}/{data['d']} {data['h']}:{data['min']:02d}</div>"
        f"<div style='color:#555;font-size:12px;'>農曆：{calc_obj.lunar.getYearInGanZhi()}年 {calc_obj.lunar.getMonthInChinese()}月 {calc_obj.lunar.getDayInChinese()}</div>"
        f"</div>"
    )
