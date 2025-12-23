# renderer.py
from logic import GAN, ZHI

def render_chart_html(data, calc_obj, daxian_idx, liunian_off):
    # 準備資料
    sorted_limits = sorted(calc_obj.palaces.items(), key=lambda x: x[1]['age_start'])
    d_pos_idx, d_info = sorted_limits[daxian_idx]
    daxian_pos = int(d_pos_idx)
    
    curr_year = data['y'] + d_info['age_start'] + liunian_off - 1
    daxian_gan = d_info['gan_idx']
    ln_gan, ln_zhi = calc_obj.lunar.getYearGanIndex(), calc_obj.lunar.getYearZhiIndex() # 修正流年取法
    # 重新計算流年干支 (簡易版，依賴外部輸入或 logic 內方法)
    # 這裡為了確保正確，我們調用 logic 內的 get_ganzhi_for_year (需確保 renderer 能訪問或傳入)
    # 簡單起見，直接在 app.py 算好傳入會更好，但這裡先維持結構
    
    # 執行飛星 (四化)
    # 注意：這裡假設 calc_obj 已經在 app.py 被呼叫過 calculate_sihua
    
    # 找流年命宮
    liunian_pos = -1
    # 需由 app.py 傳入正確的流年支，這裡先暫存邏輯
    
    return "" # 實際渲染邏輯由下方 render_grid 處理

def get_palace_html(idx, branch, r, c, info, is_daxian, is_liunian):
    """
    生成單一宮位的 HTML，使用純字串拼接避免縮排錯誤
    """
    classes = []
    if is_daxian: classes.append("active-daxian")
    if is_liunian: classes.append("active-liunian")
    
    # --- 主星 HTML ---
    main_stars_html = ""
    for star in info['major_stars']:
        sihua_html = ""
        for sh in star['sihua']:
            bg_cls = ""
            if sh['layer'] == '本': bg_cls = "bg-ben"
            elif sh['layer'] == '大': bg_cls = "bg-da"
            elif sh['layer'] == '流': bg_cls = "bg-liu"
            sihua_html += f'<span class="hua-badge {bg_cls}">{sh["type"]}</span>'
        
        main_stars_html += '<div class="star-major-container">'
        main_stars_html += f'<div class="star-name">{star["name"]}</div>'
        main_stars_html += sihua_html
        main_stars_html += '</div>'
    
    # --- 副星 HTML ---
    sub_stars_html = ""
    for m_name, is_bad, is_impt in info['minor_stars']:
        style_cls = ""
        if m_name == "祿存": style_cls = "color-good"
        elif is_bad: style_cls = "color-bad"
        
        size_cls = "star-medium" if is_impt else "star-small"
        sub_stars_html += f'<div class="{size_cls} {style_cls}">{m_name}</div>'
    
    # --- 狀態標籤 ---
    status_tags = ""
    if is_liunian: status_tags += '<div class="tag-flow tag-liu">流命</div>'
    if is_daxian: status_tags += '<div class="tag-flow tag-da">大限</div>'
    
    # --- 組合完整 HTML ---
    html = f'<div class="zwds-cell {" ".join(classes)}" style="grid-row: {r}; grid-column: {c};">'
    html += '<div class="stars-box">'
    html += f'<div class="main-stars-col">{main_stars_html}</div>'
    html += f'<div class="sub-stars-col">{sub_stars_html}</div>'
    html += '</div>'
    
    html += '<div class="cell-footer">'
    html += '<div class="footer-left">'
    html += f'<span class="ganzhi-label">{GAN[info["gan_idx"]]}</span>'
    html += f'<span class="zhi-label">{branch}</span>'
    html += '</div>'
    
    html += '<div class="footer-right">'
    html += f'<div class="palace-name">{info["name"]}</div>'
    html += f'<div class="limit-info">{info["age_start"]}-{info["age_end"]}</div>'
    html += f'<div class="status-tags">{status_tags}</div>'
    html += '</div></div></div>'
    
    return html

def get_center_html(data, calc_obj):
    html = '<div class="center-info-box">'
    html += f'<h3 style="margin:0;color:#000;font-size:24px;">{data["name"]}</h3>'
    html += f'<div style="color:#666;font-size:14px;margin:3px 0;">{data["gender"]} | {calc_obj.bureau_name} | {data.get("ming_star","")}坐命</div>'
    html += f'<div style="color:#2e7d32;font-size:14px;font-weight:bold;">國曆：{data["y"]}/{data["m"]}/{data["d"]} {data["h"]}:{data["min"]:02d}</div>'
    html += f'<div style="color:#555;font-size:12px;">農曆：{calc_obj.lunar.getYearInGanZhi()}年 {calc_obj.lunar.getMonthInChinese()}月 {calc_obj.lunar.getDayInChinese()}</div>'
    html += '</div>'
    return html
