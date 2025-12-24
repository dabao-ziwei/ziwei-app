from logic import GAN, ZHI

PALACE_NAMES = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"]

def get_relative_palace_name(ming_pos, current_cell_pos):
    idx = (ming_pos - current_cell_pos) % 12
    return PALACE_NAMES[idx]

def get_palace_html(idx, branch, r, c, info, daxian_pos, liunian_pos, benming_pos, is_pure_benming=False):
    is_daxian = (idx == daxian_pos) and not is_pure_benming
    is_liunian = (idx == liunian_pos) and not is_pure_benming
    
    classes = ["zwds-cell"]
    if is_daxian: classes.append("active-daxian")
    if is_liunian: classes.append("active-liunian")
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
    
    # 2. 副星 (增加雜曜顯示)
    sub_stars_html = ""
    for m_name, is_bad, is_impt in info['minor_stars']:
        style_cls = ""
        if m_name == "祿存": style_cls = "color-good"
        elif is_bad: style_cls = "color-bad"
        
        # 字體控制：重要的(甲乙級)用 bold，丙級神煞用 small
        size_cls = "star-medium" if is_impt else "star-small"
        sub_stars_html += f"<div class='{size_cls} {style_cls}'>{m_name}</div>"
    
    # 3. 宮名
    name_liu_html = ""
    name_da_html = ""
    name_ben = get_relative_palace_name(benming_pos, idx)
    if "身宮" in info['name']: name_ben += "(身)"
    
    limit_info_html = "" 

    if not is_pure_benming:
        if liunian_pos != -1:
            name_liu = "流" + get_relative_palace_name(liunian_pos, idx)[0]
            name_liu_html = f"<div class='p-name-liu'>{name_liu}</div>"
        if daxian_pos != -1:
            name_da = "大" + get_relative_palace_name(daxian_pos, idx)[0]
            name_da_html = f"<div class='p-name-da'>{name_da}</div>"
    else:
        limit_info_html = f"<span class='limit-info'> {info['age_start']}/{info['age_end']}</span>"

    # 4. 長生十二神 (新增)
    # 放在 footer-right 的最上面
    life_stage_html = f"<div class='life-stage'>{info['life_stage']}</div>"

    # 5. 組合
    footer_html = (
        f"<div class='cell-footer'>"
        f"<div class='footer-left'><span class='ganzhi-label'>{GAN[info['gan_idx']]}</span><span class='zhi-label'>{branch}</span></div>"
        f"<div class='footer-right'>"
        f"{life_stage_html}"  # 放在這裡
        f"{name_liu_html}"
        f"{name_da_html}"
        f"<div class='p-name-ben'>{name_ben}{limit_info_html}</div>"
        f"</div>"
        f"</div>"
    )

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
