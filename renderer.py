from logic import GAN, ZHI

def get_palace_html(idx, branch, r, c, info, is_daxian, is_liunian):
    classes = ["zwds-cell"]
    if is_daxian: classes.append("active-daxian")
    if is_liunian: classes.append("active-liunian")
    class_str = " ".join(classes)
    
    # 1. 主星區塊 (Main Stars)
    # 每個主星是一個獨立的 .star-major-container，裡面垂直排列：名字 -> 四化
    main_stars_html = ""
    for star in info['major_stars']:
        sihua_html = ""
        for sh in star['sihua']:
            bg_cls = {"本":"bg-ben", "大":"bg-da", "流":"bg-liu"}.get(sh['layer'], "")
            sihua_html += f"<span class='hua-badge {bg_cls}'>{sh['type']}</span>"
        
        main_stars_html += f"<div class='star-major-container'><div class='star-name'>{star['name']}</div>{sihua_html}</div>"
    
    # 2. 副星區塊 (Minor Stars)
    sub_stars_html = ""
    for m_name, is_bad, is_impt in info['minor_stars']:
        style_cls = ""
        if m_name == "祿存": style_cls = "color-good"
        elif is_bad: style_cls = "color-bad"
        
        size_cls = "star-medium" if is_impt else "star-small"
        sub_stars_html += f"<div class='{size_cls} {style_cls}'>{m_name}</div>"
    
    # 3. 狀態標籤
    status_tags = ""
    if is_liunian: status_tags += "<div class='tag-flow tag-liu'>流命</div>"
    if is_daxian: status_tags += "<div class='tag-flow tag-da'>大限</div>"
    
    # 4. 底部資訊
    # 這裡將 ganzhi-label 與 zhi-label 放在 footer-left
    footer_html = (
        f"<div class='cell-footer'>"
        f"<div class='footer-left'><span class='ganzhi-label'>{GAN[info['gan_idx']]}</span><span class='zhi-label'>{branch}</span></div>"
        f"<div class='footer-right'><div class='palace-name'>{info['name']}</div><div class='limit-info'>{info['age_start']}-{info['age_end']}</div><div class='status-tags'>{status_tags}</div></div>"
        f"</div>"
    )

    # 5. 組合最終 HTML
    # 注意：main_stars_html 直接放在 stars-box 裡，不再包一層 main-stars-col，這樣多顆主星可以自然並排
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
