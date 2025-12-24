from logic import GAN, ZHI

PALACE_NAMES = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"]

def get_relative_palace_name(ming_pos, current_cell_pos):
    idx = (ming_pos - current_cell_pos) % 12
    return PALACE_NAMES[idx]

def get_palace_html(idx, branch, r, c, info, daxian_pos, liunian_pos, benming_pos, is_pure_benming=False, shen_pos=-1):
    is_daxian = (idx == daxian_pos) and not is_pure_benming
    is_liunian = (idx == liunian_pos) and not is_pure_benming
    
    classes = ["zwds-cell"]
    if is_daxian: classes.append("active-daxian")
    if is_liunian: classes.append("active-liunian")
    class_str = " ".join(classes)
    
    # 1. 星曜區
    main_stars_html = ""
    for star in info['major_stars']:
        sihua_html = ""
        for sh in star['sihua']:
            if is_pure_benming and sh['layer'] != '本': continue
            bg_cls = {"本":"bg-ben", "大":"bg-da", "流":"bg-liu"}.get(sh['layer'], "")
            sihua_html += f"<span class='hua-badge {bg_cls}'>{sh['type']}</span>"
        main_stars_html += f"<div class='star-major-container'><div class='star-name'>{star['name']}</div>{sihua_html}</div>"
    
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
    
    # 2. 左下角：神煞 + 歲數
    sui = info['sui_12'][0] if info['sui_12'] else ""
    jiang = info['jiang_12'][0] if info['jiang_12'] else ""
    boshi = info['boshi_12'][0] if info['boshi_12'] else ""
    
    # 歲數顯示邏輯：純本命顯示 72/81
    # 若依您的圖片，即使在大限流年盤，基礎的歲數資訊放在左下角也是合理的
    # 這裡將連接號改為 /
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

    # 3. 右下角：長生 + 宮名 + 干支
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

    # 宮位資訊欄 (靠左貼著干支)
    palace_info_html = (
        f"<div class='palace-info-col'>"
        f"{shen_badge_html}"
        f"{life_stage_html}"
        f"{name_liu_html}"
        f"{name_da_html}"
        f"<div class='p-name-ben'>{name_ben}</div>"
        f"</div>"
    )

    # 干支欄 (直書，最右)
    ganzhi_html = f"<div class='ganzhi-col'>{GAN[info['gan_idx']]}{branch}</div>"

    footer_right_html = (
        f"<div class='footer-right'>"
        f"{palace_info_html}"
        f"{ganzhi_html}"
        f"</div>"
    )

    # 4. 組合整體
    final_html = (
        f"<div class='{class_str}' style='grid-row: {r}; grid-column: {c};'>"
        f"<div class='stars-box'>"
        f"{main_stars_html}"  
        f"<div class='sub-stars-col'>{sub_stars_html}</div>"
        f"</div>"
        f"{footer_left_html}"
        f"{footer_right_html}"
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
