# 修正：補上 get_ganzhi_for_year 引用
from logic import GAN, ZHI, get_ganzhi_for_year

PALACE_NAMES = ["命宮", "兄弟", "夫妻", "子女", "財帛", "疾厄", "遷移", "僕役", "官祿", "田宅", "福德", "父母"]

def clean(s): return s.replace("\n", "").strip()

def get_relative_palace_name(ming_pos, current_cell_pos):
    return PALACE_NAMES[(ming_pos - current_cell_pos) % 12]

def get_grid_coord(zhi_idx):
    coords = {
        5: (0, 0), 6: (0, 1), 7: (0, 2), 8: (0, 3),
        4: (1, 0),                    9: (1, 3),
        3: (2, 0),                    10: (2, 3),
        2: (3, 0), 1: (3, 1), 0: (3, 2), 11: (3, 3)
    }
    return coords[zhi_idx]

def render_full_chart_html(calc, data, d_idx, l_off, focus_idx):
    # 1. 準備數據
    limits = sorted(calc.palaces.items(), key=lambda x: x[1]['age_start'])
    is_pure = (d_idx == -1)
    d_pos = int(limits[d_idx][0]) if not is_pure else -1
    l_pos = -1
    
    if not is_pure:
        d_gan = limits[d_idx][1]['gan_idx']
        if l_off != -1:
            cy = data['y'] + limits[d_idx][1]['age_start'] + l_off - 1
            l_gan, l_zhi = get_ganzhi_for_year(cy)
            calc.calculate_sihua(d_gan, l_gan)
            for pid, p in calc.palaces.items():
                if p['zhi_idx'] == l_zhi: l_pos = int(pid)
        else: calc.calculate_sihua(d_gan, -1)
    else: calc.calculate_sihua(-1, -1)

    # 2. 生成 SVG (連線層)
    svg_html = ""
    if focus_idx != -1:
        def get_pct(idx):
            r, c = get_grid_coord(idx)
            return c * 25 + 12.5, r * 25 + 12.5
        
        p1, p2, p3 = focus_idx, (focus_idx+4)%12, (focus_idx+8)%12
        po = (focus_idx+6)%12
        x1, y1 = get_pct(p1); x2, y2 = get_pct(p2); x3, y3 = get_pct(p3); xo, yo = get_pct(po)
        
        # 修正：強制 style="fill: none !important" 避免出現巨大色塊
        svg_html = f"""
        <div style="position:absolute;top:0;left:0;width:100%;height:560px;pointer-events:none;z-index:1;">
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;">
                <polygon points="{x1},{y1} {x2},{y2} {x3},{y3}" style="fill: none !important;" stroke="#008000" stroke-width="1.5" />
                <line x1="{x1}" y1="{y1}" x2="{xo}" y2="{yo}" stroke="#008000" stroke-width="1.5" stroke-dasharray="4,2" />
                <circle cx="{x1}" cy="{y1}" r="2" fill="#008000" />
            </svg>
        </div>
        """

    # 3. 生成 Grid Cells
    cells_html = ""
    layout = [(5,1,1),(6,1,2),(7,1,3),(8,1,4),(4,2,1),(9,2,4),(3,3,1),(10,3,4),(2,4,1),(1,4,2),(0,4,3),(11,4,4)]
    
    for idx, r, c in layout:
        info = calc.palaces[idx]
        classes = ["zwds-cell"]
        if idx == d_pos: classes.append("border-daxian")
        if idx == l_pos: classes.append("border-liunian")
        
        if idx == focus_idx: classes.append("cell-focus")
        elif focus_idx!=-1 and idx in [(focus_idx+4)%12, (focus_idx+8)%12]: classes.append("cell-sanfang")
        elif focus_idx!=-1 and idx == (focus_idx+6)%12: classes.append("cell-duigong")
        
        stars = ""
        for s in info['major_stars']:
            sh = "".join([f"<span class='hua-badge { {'本':'bg-ben','大':'bg-da','流':'bg-liu'}.get(h['layer']) }'>{h['type']}</span>" for h in s['sihua'] if not is_pure or h['layer']=='本'])
            stars += f"<div class='star-item'><span class='txt-major'>{s['name']}</span>{sh}</div>"
        for m in info['minor_stars']:
            cls_s = "txt-med" if m[2] else "txt-sml"
            stars += f"<div class='star-item'><span class='{cls_s}'>{m[0]}</span></div>"
            
        ft_l = f"<div class='footer-left'><div class='gods-col'><span class='god-text' style='color:#008080'>{info['sui_12'][0]}</span><span class='god-text' style='color:#4682B4'>{info['jiang_12'][0]}</span></div><div class='limit-text'>{info['age_start']}-{info['age_end']}</div></div>"
        
        p_names = f"<div class='palace-name'>{get_relative_palace_name(calc.ming_pos, idx)}</div>"
        if not is_pure:
            if l_pos != -1: p_names = f"<div style='color:#0056b3;font-size:12px;font-weight:900'>流{get_relative_palace_name(l_pos, idx)[0]}</div>" + p_names
            if d_pos != -1: p_names = f"<div style='color:#666;font-size:12px;font-weight:900'>大{get_relative_palace_name(d_pos, idx)[0]}</div>" + p_names
            
        ft_r = f"<div class='footer-right'><div class='info-col'>{'<div class=badge-shen>身</div>' if is_pure and idx==calc.shen_pos else ''}<span class='life-stage'>{info['life_stage']}</span>{p_names}</div><div class='ganzhi-col'>{GAN[info['gan_idx']]}{ZHI[idx]}</div></div>"
        
        cells_html += f"<div id='p_{idx}' class='{' '.join(classes)}' style='grid-row:{r};grid-column:{c};'><div class='cell-content'><div class='stars-box'>{stars}</div>{ft_l}{ft_r}</div></div>"

    center_html = f"<div class='center-box'><h3 style='margin:0;color:#000;'>{data['name']}</h3><div style='font-size:13px;color:#555'>{data['gender']} | {calc.bureau_name} | {data.get('ming_star','')}坐命</div><div style='font-size:13px;font-weight:bold;color:#2E7D32'>國：{data['y']}/{data['m']}/{data['d']} {data['h']}:{data['min']:02d}</div><div style='font-size:13px;color:#555'>農：{calc.lunar.getYearInGanZhi()}年 {calc.lunar.getMonthInChinese()}月 {calc.lunar.getDayInChinese()}</div></div>"

    # 4. 生成大限按鈕 (HTML)
    d_html = ""
    lnames = ["一限", "二限", "三限", "四限", "五限", "六限", "七限", "八限", "九限", "十限", "十一", "十二"]
    for i in range(12):
        inf = limits[i][1]
        cls = "btn-limit btn-active" if i == d_idx else "btn-limit"
        d_html += f"<div id='d_{i}' class='{cls}'>{lnames[i]}<br>{GAN[inf['gan_idx']]}{ZHI[inf['zhi_idx']]}</div>"
    
    # 5. 生成流年按鈕 (HTML)
    l_row = ""
    if not is_pure:
        l_html = ""
        d_start = limits[d_idx][1]['age_start']
        for j in range(10):
            age = d_start + j
            yr = data['y'] + age - 1
            gy, zy = get_ganzhi_for_year(yr)
            cls = "btn-limit btn-active" if j == l_off else "btn-limit"
            l_html += f"<div id='l_{j}' class='{cls}'>{yr}<br>{GAN[gy]}{ZHI[zy]}({age})</div>"
        l_row = f"<div class='timeline-row' style='grid-template-columns: repeat(10, 1fr);'>{l_html}</div>"

    full_html = f"""
    <div class="master-container">
        {clean(svg_html)}
        <div class="zwds-grid">
            {clean(cells_html)}
            {clean(center_html)}
        </div>
        <div class="timeline-row">
            {clean(d_html)}
        </div>
        {clean(l_row)}
    </div>
    """
    return clean(full_html)
