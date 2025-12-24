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
    
    # 2. 副星 (輔星與雜曜)
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
    
    # 3. 左下角：三顆神煞 (歲前、將前、博士)
    # 依序取 list 中的第一個 (通常只有一個，除非有特殊邏輯)
    sui = info['sui_12'][0] if info['sui_12'] else ""
    jiang = info['jiang_12'][0] if info['jiang_12'] else ""
    boshi = info['boshi_12'][0] if info['boshi_12'] else ""
    
    gods_html = (
        f"<div class='gods-box'>"
        f"<div class='god-star god-sui'>{sui}</div>"
        f"<div class='god-star god-jiang'>{jiang}</div>"
        f"<div class='god-star god-boshi'>{boshi}</div>"
        f"</div>"
    )

    # 4. 右下角資訊
    name_liu_html = ""
    name_da_html = ""
    name_ben = get_relative_palace_name(benming_pos, idx)
    
    # 身宮標記 (只有在本命盤模式，且該宮是身宮時顯示)
    shen_badge_html = ""
    if is_pure_benming and (idx == (benming_pos + 2 + (info['zhi_idx'] - benming_pos)) % 12): # 簡單判斷身宮邏輯太雜，直接用 backend 傳來的字串判斷
        pass
    
    # 修正：Logic 層已經沒有在 name 加 (身宮) 字串了，所以我們要用 shen_pos 判斷
    # 這裡我們需要從 app.py 傳入 shen_pos，或者利用 logic 中已經算好的？
    # 暫時利用字串判斷法：如果 backend 傳來的 name (palace_name) 沒有 (身宮)，我們需要一個機制。
    # 比較好的方式是：在 renderer 參數中多傳一個 shen_pos。
    # 但為了不改動太多，我們直接檢查 info['name'] 是否包含 (身宮) -> 抱歉，logic 裡我剛剛拿掉了。
    # **更正**：我在 logic 裡保留了 self.shen_pos。最好是透過參數傳遞。
    # 為求簡便，這裡先不顯示身宮，等下在 app.py 傳入。
    
    # 實際上，logic.py 第 59 行我註解掉了 (身宮)，所以這裡無法用 name 判斷。
    # 我們需要在 footer 顯示邏輯中，判斷 benming_pos 與 idx 的關係? 不，身宮是依生時定的。
    # 最簡單的方法：恢復 logic.py 中的 (身宮) 標記，或者在 app.py 傳入 shen_pos。
    # 讓我們選擇：在 app.py 傳入 shen_pos。
    
    # ... (繼續下方代碼)

    limit_info_html = "" 
    if not is_pure_benming:
        if liunian_pos != -1:
            name_liu = "流" + get_relative_palace_name(liunian_pos, idx)[0]
            name_liu_html = f"<div class='p-name-liu'>{name_liu}</div>"
        if daxian_pos != -1:
            name_da = "大" + get_relative_palace_name(daxian_pos, idx)[0]
            name_da_html = f"<div class='p-name-da'>{name_da}</div>"
    else:
        limit_info_html = f"<span class='limit-info'> {info['age_start']}-{info['age_end']}</span>" # 改回 62-71 格式
        
    # 長生十二神 (紫色)
    life_stage_html = f"<div class='life-stage'>{info['life_stage']}</div>"

    # GanZhi (地支+天干) -> 放在最底下
    ganzhi_html = f"<span class='ganzhi-text'>{GAN[info['gan_idx']]}{branch}</span>"

    # 組合 Footer Right
    footer_right_html = (
        f"<div class='footer-right'>"
        f"{shen_badge_html}" # 暫時為空，稍後處理
        f"{life_stage_html}"
        f"{name_liu_html}"
        f"{name_da_html}"
        f"<div class='p-name-ben'>{name_ben}</div>"
        f"{ganzhi_html}" # 根據圖片，地支在宮名旁邊或下面
        f"{limit_info_html}"
        f"</div>"
    )

    # 5. 組合整體
    # 上半部：stars-box
    # 下半部：cell-bottom (包含 gods-box 和 footer-right)
    final_html = (
        f"<div class='{class_str}' style='grid-row: {r}; grid-column: {c};'>"
        f"<div class='stars-box'>"
        f"{main_stars_html}"  
        f"<div class='sub-stars-col'>{sub_stars_html}</div>"
        f"</div>"
        f"<div class='cell-bottom'>"
        f"{gods_html}"
        f"{footer_right_html}"
        f"</div>"
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
