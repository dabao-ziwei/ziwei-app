import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { PalaceGrid } from '../components/Chart/PalaceGrid';
import { ZiWeiEngine } from '../logic/engine';
import { ZHI } from '../logic/constants';
import { getFeaturePermission } from '../logic/permissions';
import type { Client, UserProfile } from '../db';

declare const __CONSULTATION_RENDER_VERSION__: string;
export const rendererRevision = __CONSULTATION_RENDER_VERSION__;
export function canExportProfile(profile: Record<string, any>): boolean {
  return getFeaturePermission({ id: profile.id, role: profile.role, email: '', feature_flags: profile.feature_flags,
    isBanned: profile.is_banned, accessExpiry: profile.access_expiry, maxCharts: 0, maxEditsPerChart: 0, points_balance: 0,
    can_use_divination: false } as UserProfile, 'screenshot') === 'enabled';
}

// Deliberately accept persisted DB columns only, not a SingleChart state or an engine instance.
export function buildNatalSnapshot(row: Record<string, any>) {
  const numbers = [row.birth_year, row.birth_month, row.birth_day, row.birth_hour, row.birth_minute];
  const [year, month, day, hour, minute] = numbers;
  if (!numbers.every(Number.isInteger) || year < 1 || year > 9999 || month < 1 || month > 12 || day < 1
    || day > new Date(Date.UTC(year, month, 0)).getUTCDate() || hour < 0 || hour > 23 || minute < 0 || minute > 59
    || !['男','女'].includes(row.gender) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 256) {
    throw new Error('Invalid persisted chart data');
  }
  const client: Client = { id: row.id, name: row.name, gender: row.gender, birthYear: year, birthMonth: month,
    birthDay: day, birthHour: hour, birthMinute: minute };
  const engine = new ZiWeiEngine(year, month, day, hour, minute, client.gender);
  engine.computeLimitStars(-1, -1, -1, -1, false);
  engine.computeSiHua(-1, -1, -1);
  return { client, chartData: engine.getChartData(), mingPos: engine.getMingPos() };
}
const noop = () => {};
export function PureNatalChart({ row }: { row: Record<string, any> }) {
  const { client, chartData, mingPos } = buildNatalSnapshot(row);
  const hourIndex = Math.floor((client.birthHour + 1) / 2) % 12;
  const hourZhi = hourIndex === 0 ? (client.birthHour === 23 ? '晚子' : '早子') : ZHI[hourIndex];
  return <div id="consultation-natal" className="consultation-natal-chart" style={{ width: 1280, height: 960 }}>
    <PalaceGrid staticNatalExport client={client} chartData={chartData} relationships={[]} historyStack={[]}
      mode="standard" selectedPalace={null} flyingPalace={null} daXianSeq={-1} liuNianYear={null}
      showXiaoXian={false} isReverse={false} isTwinMode={false} showCompass={false} externalGan={null}
      benMingMajorStarsStr={chartData.palaces[mingPos].majorStars.map(s => s.name).join('、')}
      currentHourZhi={hourZhi} isTimeModified={false} connections={{ self: -1, tri1: -1, tri2: -1, opp: -1 }}
      daXianList={[]} xiaoXianMingIdx={-1} getRelativeNames={() => ({})} getIsBenMingMing={idx => idx === mingPos}
      getAnchorCoord={() => ({ x: 0, y: 0 })} onHistoryBack={noop} onNavigate={noop} onCompatibility={noop}
      onChangeHour={noop} onResetTime={noop} onToggleTwin={noop} onToggleSmallLimit={noop} onPalaceClick={noop} onTriggerClick={noop}
      activeSiHuaTrace={null} liuMonth={null} liuDay={null}
      permissionFlags={{ twin: 'hidden', inverted: 'hidden', xiao: 'hidden', liu_month: 'hidden', liu_day: 'hidden', dual_chart: 'hidden' }} />
  </div>;
}
export function buildNatalHTML(row: Record<string, any>, css: string): string {
  const markup = renderToStaticMarkup(<StaticRouter location="/"><PureNatalChart row={row} /></StaticRouter>);
  // CSS is a trusted build artifact, never request-provided. React escapes every customer field.
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:; img-src data:; script-src 'none'; connect-src 'none'"><style>${css}</style><style>
    html,body{margin:0!important;padding:0!important;width:1280px!important;height:960px!important;background:#fff!important;overflow:hidden!important}
    .consultation-natal-chart,.consultation-natal-chart *{font-family:'Noto Sans TC',sans-serif!important;animation:none!important;transition:none!important}
    .consultation-natal-chart button:not([data-sihua-badge]),.consultation-natal-chart [data-chart-controls],.consultation-natal-chart .no-screenshot{display:none!important}
    .consultation-natal-chart [data-chart-time]{justify-content:center!important}
    .consultation-natal-chart .truncate{white-space:normal!important;overflow:visible!important;text-overflow:clip!important;overflow-wrap:anywhere}
    .consultation-natal-chart>div{box-shadow:none!important}
  </style></head><body>${markup}</body></html>`;
}
