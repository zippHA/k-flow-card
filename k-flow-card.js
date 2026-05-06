// k-flow-card.js – v1.0.5 (Centered vertical drops for battery & grid)
// Place grid-icon.png and home-icon.png in /config/www/

class KFlowCard extends HTMLElement {
  constructor() {
    super();
    this._hass = null;
    this.config = {};
    this._prevPvTotal = -1;
    this._prevSunPos = { bx: -1, by: -1 };
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this.config = {
      pv1_power: 'sensor.goodwe_pv1_power',
      pv2_power: 'sensor.goodwe_pv2_power',
      pv_total_power: 'sensor.goodwe_pv_power',
      grid_active_power: 'sensor.goodwe_active_power',
      grid_import_energy: 'sensor.goodwe_today_energy_import',
      consump: 'sensor.goodwe_house_consumption',
      today_pv: 'sensor.goodwe_today_s_pv_generation',
      today_batt_chg: 'sensor.goodwe_today_battery_charge',
      today_load: 'sensor.goodwe_today_load',
      battery_soc: 'sensor.jk_soc',
      battery_power: 'sensor.jk_power',
      battery_current: 'sensor.jk_current',
      battery_voltage: 'sensor.jk_voltage',
      battery_temp1: 'sensor.jk_temp1',
      battery_temp2: 'sensor.jk_temp2',
      battery_mos: 'sensor.jk_mos',
      battery_min_cell: 'sensor.jk_cellmin',
      battery_max_cell: 'sensor.jk_cellmax',
      battery_rem_cap: 'sensor.jk_remain',
      goodwe_battery_soc: 'sensor.goodwe_battery_state_of_charge',
      goodwe_battery_curr: 'sensor.goodwe_battery_current',
      inv_temp: 'sensor.goodwe_inverter_temperature_module',
      batt_dis: 'sensor.goodwe_today_battery_discharge',
      grid_power_alt: 'sensor.grid_phase_a_power',
      sun: 'sun.sun',
      ...config
    };
    this._buildStaticSVG();
  }

  set hass(hass) {
    this._hass = hass;
    this._updateDynamic();
  }

  _val(eid) {
    const s = this._hass ? this._hass.states[eid] : null;
    if (!s || s.state === 'unavailable' || s.state === 'unknown') return null;
    return parseFloat(s.state);
  }

  _socColor(p) { return p <= 25 ? '#f85149' : p <= 50 ? '#f39c4b' : p <= 75 ? '#58a6ff' : '#4CAF50'; }
  _tempColor(t) { return t <= 25 ? '#3fb950' : t <= 45 ? '#f0883e' : '#f85149'; }
  _remCapColor(p) { return p <= 15 ? '#e34d4c' : p <= 30 ? '#f39c4b' : p <= 55 ? '#f4d03f' : '#2ecc71'; }

  _fmtTime(h) {
    if (!isFinite(h) || h <= 0) return '--';
    const hh = Math.floor(h), mm = Math.round((h - hh) * 60);
    return hh + 'h ' + (mm < 10 ? '0' : '') + mm + 'm';
  }

  _sunData() {
    const sunEnt = this.config.sun || 'sun.sun';
    const attrs = this._hass?.states[sunEnt]?.attributes;
    let rise = '06:00', set = '18:00';
    if (attrs) {
      const fmt = iso => { try { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); } catch (e) { return null; } };
      if (attrs.next_rising) rise = fmt(attrs.next_rising) || rise;
      if (attrs.next_setting) set = fmt(attrs.next_setting) || set;
    }
    const toMin = str => { const p = str.split(':').map(Number); return p[0] * 60 + p[1]; };
    const NOW = new Date(); const nowMin = NOW.getHours() * 60 + NOW.getMinutes();
    const RISE = toMin(rise), SET = toMin(set);
    let t = Math.max(0, Math.min(1, (nowMin - RISE) / (SET - RISE)));
    const night = nowMin < RISE || nowMin > SET;
    const bell = 1 - Math.pow(Math.abs(2 * t - 1), 1.5);
    const bx = Math.round((1 - t) * (1 - t) * 35 + 2 * (1 - t) * t * 260 + t * t * 485);
    const by = Math.round((1 - t) * (1 - t) * 78 + 2 * (1 - t) * t * (-45) + t * t * 78);
    let mx = 260, my = 72;
    if (night) {
      const nightLen = 1440 - (SET - RISE);
      let tMoon = nowMin > SET ? (nowMin - SET) / nightLen : (nowMin + 1440 - SET) / nightLen;
      tMoon = Math.max(0, Math.min(1, tMoon));
      mx = Math.round((1 - tMoon) * (1 - tMoon) * 485 + 2 * (1 - tMoon) * tMoon * 260 + tMoon * tMoon * 35);
      my = Math.round((1 - tMoon) * (1 - tMoon) * 78 + 2 * (1 - tMoon) * tMoon * 158 + tMoon * tMoon * 78);
    }
    return { rise, set, t, night, bell, bx, by, mx, my };
  }

  _battFill(soc) {
    const fillTop = 145, fillBot = 263, fillAreaH = 118;
    const fillH = Math.round((soc || 0) / 100 * fillAreaH);
    const fillY = fillBot - fillH;
    let color, filter, textColor;
    if (soc <= 20) { color = '#ff2200'; filter = 'url(#battGlowRed)'; textColor = '#000'; }
    else if (soc <= 40) { color = '#f4d03f'; filter = 'url(#battGlowOrange)'; textColor = '#000'; }
    else if (soc <= 75) { color = '#44ff00'; filter = 'url(#battGlowGreen)'; textColor = '#fff'; }
    else { color = '#00d4ff'; filter = 'url(#battGlowCyan)'; textColor = '#fff'; }
    return { y: fillY, height: fillH, color, filter: fillH > 4 ? filter : 'none', textColor };
  }

  _flowLevel(w, type) {
    if (type === 'solar') {
      if (w < 200) return { dur: 4.0, size: 1.8, count: 6 };
      if (w < 600) return { dur: 3.2, size: 2.2, count: 12 };
      if (w < 1200) return { dur: 2.7, size: 2.5, count: 20 };
      if (w < 2500) return { dur: 2.4, size: 2.8, count: 30 };
      if (w < 4000) return { dur: 1.8, size: 3.2, count: 42 };
      if (w < 6000) return { dur: 1.2, size: 3.5, count: 55 };
      return { dur: 0.9, size: 3.8, count: 65 };
    }
    if (w < 150) return { dur: 4.0, size: 1.8, count: 4 };
    if (w < 500) return { dur: 3.2, size: 2.2, count: 8 };
    if (w < 1000) return { dur: 2.7, size: 2.5, count: 14 };
    if (w < 2000) return { dur: 2.4, size: 2.8, count: 22 };
    if (w < 3000) return { dur: 1.8, size: 3.2, count: 30 };
    if (w < 4500) return { dur: 1.5, size: 3.5, count: 40 };
    return { dur: 0.9, size: 3.8, count: 50 };
  }

  _buildPvWaveHTML(bx, by, pvTotal) {
    if (pvTotal <= 10) return '';
    const fl = this._flowLevel(pvTotal, 'solar');
    const pvStartY = by + 7;
    const pvPathD = 'M ' + bx.toFixed(1) + ',' + pvStartY.toFixed(1) +
                    ' C ' + bx.toFixed(1) + ',85 260,5 260,155';
    const color = 'rgba(255,232,60,.95)';
    const gc = 'rgba(255,190,20,.55)';
    const dashDur = (fl.dur * 0.8).toFixed(2);
    const dashLen = (8 + fl.size * 1.5).toFixed(1);
    const gapLen = (6 + fl.size * 1.2).toFixed(1);
    const dashTotal = (parseFloat(dashLen) + parseFloat(gapLen)).toFixed(1);
    let h = '';
    h += '<path d="' + pvPathD + '" fill="none" stroke="' + gc + '" stroke-width="6" stroke-dasharray="' + dashLen + ' ' + gapLen + '" stroke-linecap="round" opacity="0.25" filter="url(#arcSunF2)"><animate attributeName="stroke-dashoffset" from="' + dashTotal + '" to="0" dur="' + dashDur + 's" repeatCount="indefinite" calcMode="linear"/></path>';
    h += '<path d="' + pvPathD + '" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="1.8" stroke-dasharray="' + dashLen + ' ' + gapLen + '" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="' + dashTotal + '" to="0" dur="' + dashDur + 's" repeatCount="indefinite" calcMode="linear"/></path>';
    h += '<path d="' + pvPathD + '" fill="none" stroke="' + color + '" stroke-width="1.0" stroke-dasharray="' + dashLen + ' ' + gapLen + '" stroke-linecap="round" opacity="0.85"><animate attributeName="stroke-dashoffset" from="' + dashTotal + '" to="0" dur="' + dashDur + 's" repeatCount="indefinite" calcMode="linear"/></path>';
    const waveDefs = [
      { amp: 6, dur: fl.dur * 0.9, ox: 0, op: 0.9, sc: 'rgba(255,255,255,0.92)', dLen: '3.0', dGap: '40.0' },
      { amp: 10, dur: fl.dur * 1.1, ox: 3, op: 0.6, sc: color, dLen: '4.5', dGap: '50.0' }
    ];
    const wc = Math.min(2, Math.max(1, Math.round(fl.count / 5)));
    for (let wi = 0; wi < wc; wi++) {
      const wd = waveDefs[wi];
      const sineCount = Math.round(fl.count * 0.5);
      const sineDur = wd.dur.toFixed(2);
      const sineCycle = (parseFloat(wd.dLen) + parseFloat(wd.dGap)).toFixed(1);
      for (let si = 0; si < sineCount; si++) {
        const frac = si / sineCount;
        const phase = frac * Math.PI * 2;
        const sY = (wd.amp * Math.sin(phase + wi * 1.1)).toFixed(1);
        const sX = (wd.ox + wd.amp * 0.3 * Math.cos(phase * 0.5)).toFixed(1);
        const sDelay = (frac * wd.dur % wd.dur).toFixed(3);
        const sOp = (wd.op * (0.5 + 0.5 * Math.abs(Math.sin(phase))) * 0.6).toFixed(2);
        h += '<g transform="translate(' + sX + ',' + sY + ')"><path d="' + pvPathD + '" fill="none" stroke="' + wd.sc + '" stroke-width="1.2" stroke-dasharray="' + wd.dLen + ' ' + wd.dGap + '" stroke-linecap="round" opacity="' + sOp + '"><animate attributeName="stroke-dashoffset" from="' + sineCycle + '" to="0" dur="' + sineDur + 's" begin="-' + sDelay + 's" repeatCount="indefinite" calcMode="linear"/></path></g>';
      }
    }
    return h;
  }

  _buildStaticSVG() {
    this.shadowRoot.innerHTML = `<style>
      :host { display: block; }
      @keyframes svgPulseOrange { 0%,100%{ filter: drop-shadow(0 0 5px #f39c4b); } 50%{ filter: drop-shadow(0 0 8px #f39c4bff); } }
      .st { background:#0d1117; border:1px solid #21262d; border-radius:8px; padding:7px 9px; }
      .st .l { font-size:.48rem; color:#8b949e; letter-spacing:1px; text-transform:uppercase; margin-bottom:2px; }
      .st .v { font-size:.8rem; font-weight:600; color:#c9d1d9; }
      .dv { height:1px; background:#21262d; margin:8px 0; }
      .ct { font-size:.56rem; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#8b949e; margin-bottom:10px; display:flex; align-items:center; gap:7px; }
      .ct::after { content:''; flex:1; height:1px; background:#21262d; }
      .pvf { display:grid; grid-template-columns:repeat(4,1fr); gap:4px; margin-bottom:2px; }
      .pvi { text-align:center; background:#0d1117; border:1px solid #21262d; border-radius:8px; padding:6px 2px; }
      .pvi .ico { font-size:.95rem; margin-bottom:2px; }
      .pvi .lbl { font-size:.44rem; color:#8b949e; letter-spacing:1px; text-transform:uppercase; margin-bottom:2px; }
      .pvi .val { font-size:.76rem; font-weight:700; color:#c9d1d9; }
      .pvi .val.yw { color:#f4d03f; }
    </style>
    <div style="background:#161b22;border:1px solid #21262d;border-radius:12px;padding:13px;box-shadow:0 4px 20px rgba(0,0,0,.4);width:100%;box-sizing:border-box;">
      <div style="font-size:.56rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8b949e;margin-bottom:10px;display:flex;align-items:center;gap:7px;">
        ⚡ Energy Flow
        <span id="battStatusBadge" style="margin-left:auto;font-size:.5rem;font-weight:700;letter-spacing:1.5px;padding:1px 8px;border-radius:8px;background:#21262d;color:#8b949e;text-transform:uppercase;">IDLE</span>
      </div>
      <div style="width:100%;max-width:520px;margin:0 auto;">
        <svg id="flowSvg" viewBox="0 0 520 470" style="width:100%;display:block;">
          <defs>
            <filter id="arcSunF" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="7"/></filter>
            <filter id="arcSunF2" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>
            <filter id="moonF"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <radialGradient id="dynAuraG" cx="50%" cy="45%" r="55%">
              <stop offset="0%" stop-color="rgba(30,100,200,.28)"/><stop offset="55%" stop-color="rgba(30,80,160,.10)"/><stop offset="100%" stop-color="rgba(0,0,0,0)"/>
            </radialGradient>
            <radialGradient id="sunCG" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stop-color="rgba(255,255,220,.98)"/><stop offset="40%" stop-color="rgb(255,125,10)"/><stop offset="100%" stop-color="rgba(255,130,10,.6)"/>
            </radialGradient>
            <linearGradient id="arcDayGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(255,180,50,0)"/><stop offset="20%" stop-color="rgba(255,200,70,.5)"/><stop offset="50%" stop-color="rgba(255,228,110,.92)"/><stop offset="80%" stop-color="rgba(255,200,70,.5)"/><stop offset="100%" stop-color="rgba(255,180,50,0)"/>
            </linearGradient>
            <linearGradient id="arcNightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(140,170,255,0)"/><stop offset="30%" stop-color="rgba(155,185,255,.35)"/><stop offset="50%" stop-color="rgba(200,215,255,.7)"/><stop offset="70%" stop-color="rgba(155,185,255,.35)"/><stop offset="100%" stop-color="rgba(140,170,255,0)"/>
            </linearGradient>
            <linearGradient id="battCapGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#2d2d2d"/><stop offset="18%" stop-color="#8f8f8f"/><stop offset="50%" stop-color="#ececec"/><stop offset="82%" stop-color="#7a7a7a"/><stop offset="100%" stop-color="#242424"/>
            </linearGradient>
            <linearGradient id="battShellGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#050505"/><stop offset="18%" stop-color="#111"/><stop offset="50%" stop-color="#080808"/><stop offset="82%" stop-color="#111"/><stop offset="100%" stop-color="#030303"/>
            </linearGradient>
            <linearGradient id="battGlassBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(255,255,255,0.03)"/><stop offset="15%" stop-color="rgba(255,255,255,0.22)"/><stop offset="33%" stop-color="rgba(255,255,255,0.05)"/><stop offset="50%" stop-color="rgba(255,255,255,0)"/><stop offset="67%" stop-color="rgba(255,255,255,0.05)"/><stop offset="85%" stop-color="rgba(255,255,255,0.18)"/><stop offset="100%" stop-color="rgba(255,255,255,0.03)"/>
            </linearGradient>
            <linearGradient id="battFillHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="rgba(255,255,255,0.02)"/><stop offset="20%" stop-color="rgba(255,255,255,0.22)"/><stop offset="48%" stop-color="rgba(255,255,255,0.44)"/><stop offset="60%" stop-color="rgba(255,255,255,0.12)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/>
            </linearGradient>
            <clipPath id="battBodyClip"><rect x="53" y="145" width="62" height="118" rx="8"/></clipPath>
            <filter id="battGlowRed"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="battGlowOrange"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="battGlowGreen"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="battGlowCyan"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            <filter id="battGlowBolt"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          </defs>
          <ellipse id="skyAura" cx="260" cy="84" rx="230" ry="110" fill="url(#dynAuraG)"/>
          <path d="M 35,78 Q 260,-45 485,78 Z" fill="rgba(30,100,200,.05)"/>
          <line x1="8" y1="78" x2="512" y2="78" stroke="rgba(255,255,255,.12)" stroke-width="1" stroke-dasharray="3,8"/>
          <circle cx="35" cy="78" r="3.5" fill="rgba(255,200,80,.7)"/>
          <circle cx="260" cy="78" r="2.5" fill="rgba(255,255,255,.25)"/>
          <circle cx="485" cy="78" r="3.5" fill="rgba(255,110,55,.7)"/>
          <text id="arcRiseLabel" x="35" y="92" fill="rgba(255,255,255,.5)" font-size="10" text-anchor="middle">06:00</text>
          <text x="260" y="92" fill="rgba(255,255,255,.28)" font-size="10" text-anchor="middle">12:00</text>
          <text id="arcSetLabel" x="485" y="92" fill="rgba(255,255,255,.5)" font-size="10" text-anchor="middle">18:00</text>
          <path d="M 35,78 Q 260,-45 485,78" fill="none" stroke="url(#arcDayGrad)" stroke-width="2.2"/>
          <path d="M 485,78 Q 260,158 35,78" fill="none" stroke="url(#arcNightGrad)" stroke-width="1.5" stroke-dasharray="4,5" opacity=".35"/>
          <g id="arcSunGroup" opacity="1">
            <circle id="arcSunGlow2" cx="260" cy="35" r="28" fill="rgba(255,200,60,.12)" filter="url(#arcSunF)">
              <animate attributeName="r" values="28;34;28" dur="2.2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.55;0.9;0.55" dur="2.2s" repeatCount="indefinite"/>
            </circle>
            <circle id="arcSunGlow1" cx="260" cy="35" r="14" fill="rgba(255,200,60,.5)" filter="url(#arcSunF2)">
              <animate attributeName="r" values="14;17;14" dur="2.2s" repeatCount="indefinite"/>
            </circle>
            <circle id="arcSunDot" cx="260" cy="35" r="7" fill="url(#sunCG)" stroke="rgba(255,255,200,.85)" stroke-width="1.2">
              <animate attributeName="r" values="7;8;7" dur="2.2s" repeatCount="indefinite"/>
            </circle>
          </g>
          <g id="moonGroup" opacity="0" filter="url(#moonF)">
            <circle id="moonGlow" cx="260" cy="72" r="12" fill="rgba(180,205,255,.18)"/>
            <circle id="moonDot" cx="260" cy="72" r="6" fill="rgba(220,235,255,.92)" stroke="rgba(240,248,255,.9)" stroke-width="1.2"/>
          </g>
          <rect id="arcPvLabelRect" x="162" y="22" width="96" height="26" rx="13" fill="rgba(255,200,50,.22)" stroke="rgba(255,210,60,.5)" stroke-width="1.2"/>
          <text id="arcPvLabelText" x="210" y="39" text-anchor="middle" fill="rgba(255,235,110,.98)" font-size="13" font-weight="800">0 W ⚡</text>
          <g id="pvFlowGroup"></g>

          <!-- Battery track (centered vertical drop) -->
          <path d="M 59,175 H 126 Q 132,175 132,180 V 205 Q 132,210 138,210 H 205" fill="none" stroke="#1e3a5f" stroke-width="3" stroke-linecap="round" opacity="0.18"/>
          <!-- Grid track (centered vertical drop) -->
          <path d="M 420,175 H 368 Q 362,175 362,180 V 202 Q 362,210 368,210 H 315" fill="none" stroke="#1e3a5f" stroke-width="3" stroke-linecap="round" opacity="0.18"/>
          <!-- Home track -->
          <path d="M 260,265 V 327" fill="none" stroke="#1e3a5f" stroke-width="3" stroke-linecap="round" opacity="0.18"/>

          <!-- Grid flow lines (centered) -->
          <path id="flowGridIn" d="M 420,175 H 368 Q 362,175 362,180 V 202 Q 362,210 368,210 H 315" fill="none" stroke="#FF2929" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="0.8s" repeatCount="indefinite"/></path>
          <path id="flowGridOut" d="M 420,175 H 368 Q 362,175 362,180 V 202 Q 362,210 368,210 H 315" fill="none" stroke="#FF2929" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"><animate attributeName="stroke-dashoffset" from="-24" to="0" dur="0.8s" repeatCount="indefinite"/></path>

          <!-- Battery flow lines (centered) -->
          <path id="flowBattIn" d="M 59,175 H 126 Q 132,175 132,180 V 205 Q 132,210 138,210 H 205" fill="none" stroke="#8b949e" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"><animate attributeName="stroke-dashoffset" from="-24" to="0" dur="4.0s" repeatCount="indefinite"/></path>
          <path id="flowBattOut" d="M 59,175 H 126 Q 132,175 132,180 V 205 Q 132,210 138,210 H 205" fill="none" stroke="#8b949e" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"><animate attributeName="stroke-dashoffset" from="0" to="-24" dur="4.0s" repeatCount="indefinite"/></path>

          <path id="flowInvLoad" d="M 260,350 V 265" fill="none" stroke="#29c4f6" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 10" opacity="0" style="display:none"><animate attributeName="stroke-dashoffset" from="-24" to="0" dur="0.8s" repeatCount="indefinite"/></path>

          <!-- Battery moved left and scaled 80% -->
          <g transform="translate(-36.6, 25.4) scale(0.8)">
            <g id="battGlow">
              <rect x="77" y="127" width="14" height="9" rx="3" fill="url(#battCapGrad)"/>
              <rect x="79" y="128" width="10" height="3" rx="1.5" fill="rgba(255,255,255,0.45)"/>
              <rect x="49" y="135" width="70" height="132" rx="10" fill="url(#battShellGrad)"/>
              <rect x="51" y="137" width="66" height="7" rx="4" fill="url(#battCapGrad)"/>
              <rect x="51" y="258" width="66" height="9" rx="4" fill="url(#battCapGrad)"/>
              <rect x="53" y="145" width="62" height="118" rx="8" fill="#0f1214"/>
              <rect id="battFillBar" x="53" y="263" width="62" height="0" rx="0" fill="#3fb950" clip-path="url(#battBodyClip)"/>
              <rect id="battFillHL" x="53" y="263" width="62" height="0" rx="0" fill="url(#battFillHighlight)" clip-path="url(#battBodyClip)" style="pointer-events:none"/>
              <rect x="49" y="135" width="70" height="132" rx="10" fill="url(#battGlassBody)" style="pointer-events:none"/>
              <g id="battBoltGroup" opacity="0">
                <polygon points="86,176 74,199 82,199 77,223 93,195 85,195 97,176" fill="#1a4aff" stroke="rgba(100,150,255,.5)" stroke-width="0.8" filter="url(#battGlowBolt)">
                  <animate attributeName="opacity" values="0.5;1;0.5" dur="1.0s" repeatCount="indefinite"/>
                </polygon>
              </g>
            </g>
            <text id="fcBattVal" x="84" y="211" text-anchor="middle" font-size="18" font-weight="900" fill="#fff">--%</text>
            <text id="battVoltageFlow" x="84" y="285" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">-- V</text>
            <text id="battCurrFlow" x="125" y="155" font-size="10" font-weight="600" fill="#fff">-- A</text>
            <text id="battPwrFlow" x="125" y="170" font-size="10" font-weight="600" fill="#cde">-- W</text>
          </g>

          <!-- ========== GRID NODE replaced with PNG ========== -->
          <image id="gridIconImg" href="/local/grid-icon.png" x="407" y="138" width="110" height="110" style="filter: drop-shadow(0 0 8px #e05c00); opacity: 1;"/>
          <text id="fcGridVal" x="445" y="" text-anchor="middle" font-size="13" font-weight="700" fill="#e05c00">-- W</text>
          <text id="gridImportVal" x="395" y="163" text-anchor="end" font-size="10" font-weight="600" fill="#cde">-- kWh</text>

          <rect id="fcInvRect" x="205" y="155" width="110" height="110" rx="18" fill="#161b22" stroke="#f4a93b" stroke-width="4"/>
          <text x="260" y="203" text-anchor="middle" font-size="14" font-weight="800" fill="#f4a93b" letter-spacing="1">INV</text>
          <text id="invTempFlow" x="260" y="222" text-anchor="middle" font-size="12" font-weight="700" fill="#58a6ff">-- °C</text>
          <text id="invLoadPctFlow" x="260" y="240" text-anchor="middle" font-size="12" font-weight="700" fill="#3ce878">--%</text>
          <text x="8" y="371" font-size="9" fill="#8b949e" letter-spacing="1">PV1</text>
          <text id="pv1FlowVal" x="8" y="385" font-size="12" font-weight="700" fill="#ffe83c">-- W</text>
          <text x="8" y="403" font-size="9" fill="#8b949e" letter-spacing="1">PV2</text>
          <text id="pv2FlowVal" x="8" y="417" font-size="12" font-weight="700" fill="#ffe83c">-- W</text>
          <text x="515" y="373" text-anchor="end" font-size="9" fill="#8b949e" letter-spacing="1.5">ENDURANCE</text>
          <text id="flowEndurance" x="515" y="393" text-anchor="end" font-size="15" font-weight="700" fill="#8b949e">--</text>
          <text id="flowEnduranceSub" x="515" y="410" text-anchor="end" font-size="9" fill="#8b949e66">remaining</text>

          <!-- ========== HOME NODE replaced with PNG ========== -->
          <image id="homeIconImg" href="/local/home-icon.png" x="190" y="340" width="150" height="140" style="filter: drop-shadow(0 0 8px #ffb228); opacity: 1;"/>
          <text id="fcLoadVal" x="312" y="377" font-size="13" font-weight="700" fill="#F7F6D3">-- W</text>
        </svg>
      </div>
      <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
        <div style="flex:1;display:flex;align-items:center;gap:4px;">
          <span style="font-size:.42rem;color:#8b949e;letter-spacing:1px;text-transform:uppercase;">PV</span>
          <div style="flex:1;display:flex;gap:2px;align-items:flex-end;height:10px;" id="pvBlocks"></div>
        </div>
        <div style="flex:1;display:flex;align-items:center;gap:4px;">
          <span style="font-size:.42rem;color:#8b949e;letter-spacing:1px;text-transform:uppercase;">Pwr</span>
          <div style="flex:1;background:#21262d;border-radius:20px;height:9px;overflow:hidden;position:relative;">
            <div id="pwrBar" style="position:absolute;inset:0;right:auto;width:0%;border-radius:20px;background:#3fb950;transition:width .4s,background .4s;"></div>
          </div>
        </div>
      </div>
      <div class="dv"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:5px;">
        <div class="st"><div class="l">Temp 1</div><div class="v" id="bTemp1">-- °C</div></div>
        <div class="st"><div class="l">Temp 2</div><div class="v" id="bTemp2">-- °C</div></div>
        <div class="st"><div class="l">MOS Temp</div><div class="v" id="bMos">-- °C</div></div>
        <div class="st"><div class="l">Min Cell</div><div class="v" id="bMinCell">-- V</div></div>
        <div class="st"><div class="l">Max Cell</div><div class="v" id="bMaxCell">-- V</div></div>
        <div class="st"><div class="l">Batt Dis.</div><div class="v" id="invBattDis2">-- kWh</div></div>
      </div>
      <div class="dv"></div>
      <div class="ct">☀️ GoodWe Inverter</div>
      <div class="pvf">
        <div class="pvi"><div class="ico">☀️</div><div class="lbl">Today PV</div><div class="val yw" id="invTodayPv">-- kWh</div></div>
        <div class="pvi"><div class="ico">🔋</div><div class="lbl">Batt Chg</div><div class="val" id="invTodayBattChg">-- kWh</div></div>
        <div class="pvi"><div class="ico">⚡</div><div class="lbl">Remaining</div><div class="val" id="invRemCap">-- Ah</div></div>
        <div class="pvi"><div class="ico">🏡</div><div class="lbl">Today Load</div><div class="val" id="invTodayLoad">-- kWh</div></div>
      </div>
    </div>`;
  }

  _updateDynamic() {
    if (!this._hass || !this.config) return;
    const root = this.shadowRoot;
    const getEl = (id) => root.getElementById(id);

    const pv1 = this._val(this.config.pv1_power) || 0;
    const pv2 = this._val(this.config.pv2_power) || 0;
    const pvTotal = this._val(this.config.pv_total_power) || 0;
    const gridActive = this._val(this.config.grid_active_power) || this._val(this.config.grid_power_alt) || 0;
    const gridImport = this._val(this.config.grid_import_energy) || 0;
    const load = this._val(this.config.consump) || 0;
    const todayPv = this._val(this.config.today_pv) || 0;
    const todayBattChg = this._val(this.config.today_batt_chg) || 0;
    const todayLoad = this._val(this.config.today_load) || 0;
    const battSoc = this._val(this.config.battery_soc) || this._val(this.config.goodwe_battery_soc) || 0;
    const battPwr = this._val(this.config.battery_power) || 0;
    const battCurr = this._val(this.config.battery_current) || this._val(this.config.goodwe_battery_curr) || 0;
    const battVolt = this._val(this.config.battery_voltage) || 0;
    const temp1 = this._val(this.config.battery_temp1) || 0;
    const temp2 = this._val(this.config.battery_temp2) || 0;
    const mos = this._val(this.config.battery_mos) || 0;
    const minCell = this._val(this.config.battery_min_cell) || 0;
    const maxCell = this._val(this.config.battery_max_cell) || 0;
    const remCap = this._val(this.config.battery_rem_cap) || 0;
    const invTemp = this._val(this.config.inv_temp) || 0;
    const battDis = this._val(this.config.batt_dis) || 0;

    const sun = this._sunData();
    const auraEl = getEl('skyAura');
    if (auraEl) auraEl.setAttribute('cy', (94 - Math.round(sun.bell * 22)).toString());

    ['arcSunDot', 'arcSunGlow1', 'arcSunGlow2'].forEach(id => {
      const e = getEl(id);
      if (e) { e.setAttribute('cx', sun.bx); e.setAttribute('cy', sun.by); }
    });
    getEl('arcSunGroup')?.setAttribute('opacity', sun.night ? '0' : '1');

    const moonGroup = getEl('moonGroup');
    if (sun.night) {
      ['moonGlow', 'moonDot'].forEach(id => {
        const e = getEl(id);
        if (e) { e.setAttribute('cx', sun.mx); e.setAttribute('cy', sun.my); }
      });
      if (moonGroup) moonGroup.setAttribute('opacity', '1');
    } else {
      if (moonGroup) moonGroup.setAttribute('opacity', '0');
    }

    const pvLabelRect = getEl('arcPvLabelRect');
    const pvLabelText = getEl('arcPvLabelText');
    const pvTxt = (pvTotal >= 1000 ? (pvTotal / 1000).toFixed(2) + ' kW' : pvTotal.toFixed(0) + ' W') + ' ⚡';
    const lbw = 96;
    let lbx = sun.t < 0.5 ? sun.bx - lbw - 12 : sun.bx + 14;
    lbx = Math.max(4, Math.min(520 - lbw - 4, lbx));
    let lby = sun.by - 28; if (lby < 2) lby = 2;
    if (pvLabelRect) { pvLabelRect.setAttribute('x', lbx); pvLabelRect.setAttribute('y', lby); }
    if (pvLabelText) { pvLabelText.setAttribute('x', lbx + lbw / 2); pvLabelText.setAttribute('y', lby + 17); pvLabelText.textContent = pvTxt; }

    const riseEl = getEl('arcRiseLabel'), setEl = getEl('arcSetLabel');
    if (riseEl) riseEl.textContent = sun.rise;
    if (setEl) setEl.textContent = sun.set;

    if (pvTotal !== this._prevPvTotal || sun.bx !== this._prevSunPos.bx || sun.by !== this._prevSunPos.by) {
      this._prevPvTotal = pvTotal;
      this._prevSunPos = { bx: sun.bx, by: sun.by };
      const pvGroup = getEl('pvFlowGroup');
      if (pvGroup) pvGroup.innerHTML = this._buildPvWaveHTML(sun.bx, sun.by, pvTotal);
    }

    const flowDur = (w) => Math.max(0.5, 3.0 - (Math.min(Math.abs(w), 8000) / 8000) * 2.5).toFixed(2) + 's';
    const setFlow = (id, show, watts, durStr, color) => {
      const el = getEl(id);
      if (!el) return;
      el.setAttribute('opacity', show ? '1' : '0');
      el.style.display = show ? '' : 'none';
      if (show && durStr !== undefined) {
        const anim = el.querySelector('animate');
        if (anim) anim.setAttribute('dur', durStr);
      }
      if (color !== undefined) el.setAttribute('stroke', color);
    };

    const absBattPwr = Math.abs(battPwr);
    const isCharging = battPwr >= 0;
    const showBattIn = battPwr > 10;
    const showBattOut = battPwr < -10;

    let battLineColor = '#8b949e';
    let battDur = '4.0s';
    let battShowIn = false;
    let battShowOut = false;

    if (absBattPwr < 10) {
      battShowIn = false;
      battShowOut = false;
    } else if (absBattPwr < 50) {
      battShowIn = showBattIn;
      battShowOut = showBattOut;
      battLineColor = '#8b949e';
      battDur = '4.0s';
    } else {
      battShowIn = showBattIn;
      battShowOut = showBattOut;
      battDur = flowDur(absBattPwr);
      if (isCharging) {
        battLineColor = '#2b59ff';
      } else {
        if (absBattPwr < 1000) battLineColor = '#f39c4b';
        else if (absBattPwr < 2500) battLineColor = '#e67e22';
        else battLineColor = '#f85149';
      }
    }

    setFlow('flowBattIn', battShowIn, absBattPwr, battDur, battLineColor);
    setFlow('flowBattOut', battShowOut, absBattPwr, battDur, battLineColor);

    const showGridIn = gridActive > 10, showGridOut = gridActive < -10;
    const showInvLoad = load > 10;

    setFlow('flowGridIn', showGridIn, gridActive, flowDur(gridActive), '#FF2929');
    setFlow('flowGridOut', showGridOut, Math.abs(gridActive), flowDur(Math.abs(gridActive)), '#FF2929');

    const absGrid = Math.abs(gridActive);
    const absBatt = Math.abs(battPwr < -10 ? battPwr : 0);
    const domColor = (absGrid >= pvTotal && absGrid >= absBatt) ? '#f39c4b' :
                     (absBatt >= pvTotal) ? '#f39c4b' : '#f4d03f';
    setFlow('flowInvLoad', showInvLoad, load, flowDur(load), domColor);

    const gridImg = getEl('gridIconImg');
    if (gridImg) {
      const noGrid = Math.abs(gridActive) < 10;
      gridImg.style.filter = noGrid ? 'none' : 'drop-shadow(0 0 8px #e05c00)';
      gridImg.style.opacity = noGrid ? '0.4' : '1';
    }
    const homeImg = getEl('homeIconImg');
    if (homeImg) {
      const homeActive = load > 10;
      homeImg.style.filter = homeActive ? 'drop-shadow(0 0 10px ' + domColor + ') drop-shadow(0 0 4px ' + domColor + '88)' : 'none';
      homeImg.style.opacity = homeActive ? '1' : '0.7';
    }

    const fill = this._battFill(battSoc);
    const bf = getEl('battFillBar');
    if (bf) { bf.setAttribute('y', fill.y); bf.setAttribute('height', fill.height); bf.setAttribute('fill', fill.color); bf.setAttribute('filter', fill.filter); }
    const bh = getEl('battFillHL');
    if (bh) { bh.setAttribute('y', fill.y); bh.setAttribute('height', fill.height); }
    const fcBv = getEl('fcBattVal');
    if (fcBv) { fcBv.textContent = battSoc + '%'; fcBv.setAttribute('fill', fill.textColor); }
    const bolt = getEl('battBoltGroup');
    if (bolt) bolt.setAttribute('opacity', (isCharging && absBattPwr >= 10) ? '1' : '0');

    const pwrBar = getEl('pwrBar');
    if (pwrBar) {
      pwrBar.style.width = Math.min(absBattPwr / 6000 * 100, 100).toFixed(1) + '%';
      if (absBattPwr < 50) pwrBar.style.background = '#8b949e';
      else if (isCharging) pwrBar.style.background = '#2b59ff';
      else {
        const pct = (absBattPwr / 6000 * 100);
        pwrBar.style.background = 'linear-gradient(to right, #f4d03f, #f39c4b ' + (pct * 0.5).toFixed(0) + '%, #f85149)';
      }
    }

    const badge = getEl('battStatusBadge');
    if (badge) {
      badge.textContent = absBattPwr < 50 ? 'IDLE' : (isCharging ? 'CHG' : 'DISCHG');
      badge.style.color = absBattPwr < 50 ? '#8b949e' : (isCharging ? '#00d7ff' : '#3ce878');
      badge.style.background = absBattPwr < 50 ? '#21262d' : (isCharging ? 'rgba(0,215,255,.14)' : 'rgba(60,232,120,.14)');
    }

    const remWh = (remCap / 314) * 16076, totalWh = 16076;
    let endText = '--', endColor = '#8b949e', endSub = 'standby', endSubColor = '#8b949e55';
    if (isCharging && absBattPwr > 10) {
      const eta = Math.max(0, (totalWh - remWh) / absBattPwr);
      endText = 'ETA ' + this._fmtTime(eta); endColor = '#00d7ff'; endSub = 'to full'; endSubColor = '#00d7ff88';
    } else if (!isCharging && absBattPwr > 10) {
      const left = Math.max(0, remWh / absBattPwr);
      const ec = left >= 5 ? '#4ade80' : '#f85149';
      endText = this._fmtTime(left); endColor = ec; endSub = 'remaining'; endSubColor = ec + '88';
    }
    const fe = getEl('flowEndurance'), fs = getEl('flowEnduranceSub');
    if (fe) { fe.textContent = endText; fe.setAttribute('fill', endColor); }
    if (fs) { fs.textContent = endSub; fs.setAttribute('fill', endSubColor); }

    const invLoadPct = Math.min(load / 6000 * 100, 100).toFixed(0);
    const invLoadColor = invLoadPct <= 50 ? '#3fb950' : '#f39c4b';
    const invTempColor = invTemp <= 45 ? '#58a6ff' : invTemp <= 55 ? '#f39c4b' : '#f85149';
    const invTempEl = getEl('invTempFlow');
    if (invTempEl) { invTempEl.textContent = invTemp.toFixed(1) + ' °C'; invTempEl.setAttribute('fill', invTempColor); }
    const invLoadEl2 = getEl('invLoadPctFlow');
    if (invLoadEl2) { invLoadEl2.textContent = invLoadPct + '%'; invLoadEl2.setAttribute('fill', invLoadColor); }
    const invRect = getEl('fcInvRect');
    if (invRect) {
      invRect.setAttribute('stroke', invTemp > 55 ? '#f85149' : '#f4a93b');
      invRect.style.filter = load > 10 ? 'drop-shadow(0 0 10px #f4a93b)' : 'drop-shadow(0 0 4px #f4a93b66)';
    }

    const gvEl = getEl('fcGridVal');
    if (gvEl) {
      const noGrid = Math.abs(gridActive) < 10;
      gvEl.textContent = Math.abs(gridActive).toFixed(0) + ' W';
      gvEl.setAttribute('fill', noGrid ? '#3a3a3a' : '#e05c00');
    }

    const lv = getEl('fcLoadVal');
    if (lv) {
      const homeActive = load > 10;
      lv.textContent = load >= 1000 ? (load / 1000).toFixed(2) + ' kW' : load.toFixed(0) + ' W';
      lv.setAttribute('fill', homeActive ? domColor : '#8b949e');
    }

    const e1 = getEl('pv1FlowVal'), e2 = getEl('pv2FlowVal');
    if (e1) e1.textContent = pv1 >= 1000 ? (pv1 / 1000).toFixed(2) + ' kW' : pv1.toFixed(0) + ' W';
    if (e2) e2.textContent = pv2 >= 1000 ? (pv2 / 1000).toFixed(2) + ' kW' : pv2.toFixed(0) + ' W';

    ['bTemp1', 'bTemp2', 'bMos'].forEach((id, i) => {
      const el = getEl(id);
      if (el) el.textContent = [temp1, temp2, mos][i].toFixed(1) + ' °C';
      if (el) el.style.color = this._tempColor([temp1, temp2, mos][i]);
    });
    getEl('bMinCell').textContent = minCell.toFixed(3) + ' V';
    getEl('bMaxCell').textContent = maxCell.toFixed(3) + ' V';
    getEl('invBattDis2').textContent = battDis + ' kWh';

    getEl('invTodayPv').textContent = todayPv + ' kWh';
    getEl('invTodayBattChg').textContent = todayBattChg + ' kWh';
    getEl('invTodayLoad').textContent = todayLoad + ' kWh';
    const invRemCap = getEl('invRemCap');
    if (invRemCap) { invRemCap.textContent = remCap.toFixed(1) + ' Ah'; invRemCap.style.color = this._remCapColor((remCap / 314) * 100); }
    getEl('gridImportVal').textContent = gridImport.toFixed(2) + ' kWh';

    const pvBlocks = getEl('pvBlocks');
    if (pvBlocks) {
      const maxW = 7500, total = 20, lit = Math.round((pvTotal / maxW) * total);
      const heights = [20, 35, 50, 60, 70, 80, 90, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      let html = '';
      for (let i = 0; i < total; i++) {
        const h = heights[i];
        html += `<div style="flex:1; background:${i < lit ? 'rgba(255,255,255,0.55)' : '#21262d'}; height:${i < lit ? h : 100}%; opacity:${i < lit ? 1 : 0.35}; border-radius:2px;"></div>`;
      }
      pvBlocks.innerHTML = html;
    }

    getEl('battCurrFlow').textContent = battCurr.toFixed(1) + ' A';
    getEl('battPwrFlow').textContent = absBattPwr.toFixed(0) + ' W';
    getEl('battVoltageFlow').textContent = battVolt.toFixed(1) + ' V';
  }
}

customElements.define('k-flow-card', KFlowCard);