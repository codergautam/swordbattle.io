import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import './MetricsPage.scss';

function fmt(v: any): string {
  if (v === null || v === undefined) return '–';
  if (typeof v === 'number') {
    return Number.isInteger(v) ? v.toLocaleString() : v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(v);
}

const humanKey = (k: string) => k.replace(/_/g, ' ');

function sortAsc(rows: any[], key: string): any[] {
  return [...(rows || [])].sort((a, b) => String(a[key]).localeCompare(String(b[key])));
}

function DataTable({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) return <p className="m-empty">No data.</p>;
  const cols = Object.keys(rows[0]);
  return (
    <table className="m-table">
      <thead><tr>{cols.map((c) => <th key={c}>{humanKey(c)}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{fmt(r[c])}</td>)}</tr>)}
      </tbody>
    </table>
  );
}

function KeyVals({ obj }: { obj: any }) {
  const keys = Object.keys(obj || {});
  if (keys.length === 0) return <p className="m-empty">No data.</p>;
  return (
    <table className="m-table m-kv">
      <tbody>{keys.map((k) => <tr key={k}><th>{humanKey(k)}</th><td>{fmt(obj[k])}</td></tr>)}</tbody>
    </table>
  );
}

function DistBars({ rows, labelKey, valueKey, suffix, pctOfTotal }: { rows: any[]; labelKey: string; valueKey: string; suffix?: string; pctOfTotal?: boolean }) {
  if (!rows || rows.length === 0) return <p className="m-empty">No data.</p>;
  const nums = rows.map((r) => Number(r[valueKey]) || 0);
  const max = Math.max(...nums, 0) || 1;
  const total = nums.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="m-bars">
      {rows.map((r, i) => {
        const v = Number(r[valueKey]) || 0;
        return (
          <div className="m-bar-row" key={i}>
            <span className="m-bar-label">{fmt(r[labelKey])}</span>
            <span className="m-bar-track"><span className="m-bar-fill" style={{ width: `${(v / max) * 100}%` }} /></span>
            <span className="m-bar-val">{fmt(v)}{suffix || ''}{pctOfTotal ? <span className="m-bar-pct"> {Math.round((100 * v) / total)}%</span> : null}</span>
          </div>
        );
      })}
    </div>
  );
}

function Sparkline({ values, width = 90, height = 24, color = '#5a7d9a', fillArea = true }: { values: number[]; width?: number; height?: number; color?: string; fillArea?: boolean }) {
  const vals = (values || []).filter((v) => typeof v === 'number' && !isNaN(v));
  if (vals.length < 2) return null;
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const pts = vals.map((v, i) => [(i / (vals.length - 1)) * width, height - ((v - min) / span) * (height - 4) - 2]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {fillArea && <path d={area} fill={color} opacity={0.15} />}
      <path d={line} fill="none" stroke={color} strokeWidth={1.5} />
      <circle cx={last[0]} cy={last[1]} r={2} fill={color} />
    </svg>
  );
}

function TimeSeries({ data, xKey, series, height = 170, yMax, valueSuffix }:
  { data: any[]; xKey: string; series: { key: string; label: string; color: string; area?: boolean }[]; height?: number; yMax?: number; valueSuffix?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const rows = sortAsc(data, xKey);
  if (rows.length === 0) return <p className="m-empty">No data.</p>;
  const W = 720;
  const H = height;
  const padL = 8;
  const padR = 46;
  const padT = 10;
  const padB = 20;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const n = rows.length;
  const isNum = (v: any) => v !== null && v !== undefined && !isNaN(Number(v));
  const allVals = series.flatMap((s) => rows.filter((r) => isNum(r[s.key])).map((r) => Number(r[s.key])));
  const m = allVals.length ? Math.max(...allVals) : 1;
  const top = yMax != null ? yMax : (m || 1) * 1.1;
  const x = (i: number) => (n === 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW);
  const y = (v: number) => padT + innerH - (Math.max(0, Math.min(v, top)) / top) * innerH;

  const grid = [0, 0.5, 1].map((f) => ({ v: top * f, yy: padT + innerH - f * innerH }));
  const maxTicks = Math.min(6, n);
  const xticks: number[] = [];
  for (let t = 0; t < maxTicks; t++) xticks.push(maxTicks === 1 ? 0 : Math.round((t * (n - 1)) / (maxTicks - 1)));

  const onMove = (e: any) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((rx - padL) / (innerW || 1)) * (n - 1)))));
  };

  return (
    <div className="m-chart m-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {grid.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.yy} x2={padL + innerW} y2={g.yy} stroke="#eee" />
            <text x={padL + innerW + 4} y={g.yy + 3} fontSize="10" fill="#999">{fmt(Math.round(g.v * 10) / 10)}</text>
          </g>
        ))}
        {xticks.map((i, k) => (
          <text key={k} x={x(i)} y={H - 6} fontSize="10" fill="#999" textAnchor="middle">{String(rows[i][xKey]).slice(5)}</text>
        ))}
        {series.map((s) => {
          const valid = rows.map((r, i) => ({ i, v: r[s.key] })).filter((p) => isNum(p.v));
          if (valid.length === 0) return null;
          const segs: { i: number; v: number }[][] = [];
          let cur: { i: number; v: number }[] = [];
          valid.forEach((p) => {
            if (cur.length && p.i !== cur[cur.length - 1].i + 1) { segs.push(cur); cur = []; }
            cur.push({ i: p.i, v: Number(p.v) });
          });
          if (cur.length) segs.push(cur);
          const lastPt = valid[valid.length - 1];
          return (
            <g key={s.key}>
              {segs.map((seg, si) => {
                const pts = seg.map((p) => [x(p.i), y(p.v)]);
                const line = pts.map((p, k) => `${k ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
                const area = pts.length > 1 ? `${line} L${pts[pts.length - 1][0].toFixed(1)},${padT + innerH} L${pts[0][0].toFixed(1)},${padT + innerH} Z` : '';
                return (
                  <g key={si}>
                    {s.area && area && <path d={area} fill={s.color} opacity={0.13} />}
                    <path d={line} fill="none" stroke={s.color} strokeWidth={2} />
                    {pts.length === 1 && <circle cx={pts[0][0]} cy={pts[0][1]} r={2} fill={s.color} />}
                  </g>
                );
              })}
              <circle cx={x(lastPt.i)} cy={y(Number(lastPt.v))} r={2.5} fill={s.color} />
            </g>
          );
        })}
        {hover != null && <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + innerH} stroke="#bbb" strokeDasharray="3 3" />}
        {hover != null && series.map((s) => (isNum(rows[hover][s.key]) ? <circle key={s.key} cx={x(hover)} cy={y(Number(rows[hover][s.key]))} r={3} fill={s.color} /> : null))}
      </svg>
      {series.length > 1 && (
        <div className="m-chart-legend">{series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}</div>
      )}
      {hover != null && (
        <div className="m-chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: 0 }}>
          <div>{String(rows[hover][xKey])}</div>
          {series.map((s) => <div key={s.key}>{s.label}: {fmt(rows[hover][s.key])}{valueSuffix || ''}</div>)}
        </div>
      )}
    </div>
  );
}

function Funnel({ steps }: { steps: { label: string; value: number }[] }) {
  const valid = steps.filter((s) => typeof s.value === 'number');
  if (valid.length === 0) return <p className="m-empty">No data.</p>;
  const top = valid[0].value || 1;
  return (
    <div className="m-funnel">
      {valid.map((s, i) => {
        const w = Math.max((s.value / top) * 100, 1);
        const prev = i ? valid[i - 1].value : s.value;
        const stepPct = i ? (prev ? Math.round((100 * s.value) / prev) : 0) : 100;
        return (
          <div className="m-funnel-row" key={i}>
            <span className="m-funnel-label">{s.label}</span>
            <span className="m-funnel-track">
              <span className="m-funnel-bar" style={{ width: `${w}%` }}>{fmt(s.value)}</span>
              <span className="m-funnel-pct">{Math.round((100 * s.value) / top)}% overall{i ? ` · ${stepPct}% of prev` : ''}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StatTiles({ tiles }: { tiles: { label: string; value: any; suffix?: string; spark?: number[]; sparkColor?: string }[] }) {
  return (
    <div className="m-tiles">
      {tiles.map((t, i) => (
        <div className="m-tile" key={i}>
          <div className="m-tile-val">{fmt(t.value)}{t.value == null ? '' : (t.suffix || '')}</div>
          <div className="m-tile-label">{t.label}</div>
          {t.spark && t.spark.length > 1 && <div className="m-tile-spark"><Sparkline values={t.spark} color={t.sparkColor} /></div>}
        </div>
      ))}
    </div>
  );
}

function ScoreTile({ readiness }: { readiness: any }) {
  if (!readiness || readiness.score == null) return <p className="m-empty">No data.</p>;
  const band = readiness.band === 'not ready' ? 'not-ready' : readiness.band === 'borderline' ? 'borderline' : 'strong';
  return (
    <div className="m-tiles">
      <div className={`m-tile m-tile-score ${band}`}>
        <div className="m-tile-val">{fmt(readiness.score)}</div>
        <div className="m-tile-band">{readiness.band}</div>
        <div className="m-tile-label">CrazyGames readiness /100</div>
      </div>
      <div className="m-tile"><div className="m-tile-val">{fmt(readiness.play_ctr_pct)}%</div><div className="m-tile-label">Play-CTR (t. 80%)</div></div>
      <div className="m-tile"><div className="m-tile-val">{fmt(readiness.avg_playing_min)} min</div><div className="m-tile-label">Avg session (t. 10)</div></div>
      <div className="m-tile"><div className="m-tile-val">{fmt(readiness.d1_pct)}%</div><div className="m-tile-label">D1 retention (t. 12%)</div></div>
      <div className="m-tile"><div className="m-tile-val">{fmt(readiness.mobile_quality_pct)}%</div><div className="m-tile-label">Mobile quality</div></div>
      <div className="m-tile"><div className="m-tile-val">{fmt(readiness.depth_5min_pct)}%</div><div className="m-tile-label">5-min depth</div></div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return <section className="m-section"><h2>{title}</h2>{children}</section>;
}

export default function MetricsPage() {
  const secret = useParams().secret || '';
  const [days, setDays] = useState<number>(() => Number(localStorage.getItem('sb:metricsDays')) || 30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWith = (dRaw: number) => {
    const d = Math.max(1, Math.min(365, Math.floor(Number(dRaw) || 30)));
    setDays(d);
    setLoading(true); setError(null);
    try { localStorage.setItem('sb:metricsDays', String(d)); } catch {}
    fetch(`${api.endpoint}/analytics/metrics?days=${d}`, { headers: { Authorization: `Bearer ${secret}` } })
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Unauthorized — wrong secret in the URL' : `HTTP ${r.status}`);
        return r.json();
      })
      .then((d2) => { setData(d2); setLoading(false); })
      .catch((e) => { setError(String(e.message || e)); setLoading(false); });
  };

  useEffect(() => { loadWith(days); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const rewardedTotals = (rows: any[]) => {
    const sum = (k: string) => (rows || []).reduce((a, r) => a + (Number(r[k]) || 0), 0);
    return [
      { label: 'Ad requested', value: sum('started') },
      { label: 'Ad watched', value: sum('watched') },
      { label: 'Reward claimed', value: sum('claimed') },
    ];
  };

  return (
    <div className="metrics-page">
      <h1>Swordbattle metrics</h1>

      <div className="m-controls">
        <span className="m-presets">
          {[7, 30, 90, 365].map((n) => (
            <button key={n} className={days === n ? 'active' : ''} onClick={() => loadWith(n)} disabled={loading}>{n}d</button>
          ))}
        </span>
        <label>Days <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
        <button onClick={() => loadWith(days)} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</button>
        {data && <span className="m-meta">last {data.days}d · generated {new Date(data.generatedAt).toLocaleString()}</span>}
      </div>

      {error && <p className="m-error">{error}</p>}

      {data && (
        <>
          <Section title="CrazyGames-readiness scorecard"><ScoreTile readiness={data.readiness} /></Section>

          <Section title="Summary (last N days, humans only)">
            <StatTiles tiles={[
              { label: 'sessions', value: data.kpi.sessions, spark: sortAsc(data.daily, 'day').map((r) => r.visits) },
              { label: 'unique browser IDs', value: data.kpi.unique_visitors, spark: sortAsc(data.daily, 'day').map((r) => r.uniques) },
              { label: 'play clicks', value: data.kpi.play_clicks },
              { label: 'avg playing min', value: data.kpi.avg_playing_min, spark: sortAsc(data.daily, 'day').map((r) => r.avg_min) },
              { label: '1-min conversion', value: data.kpi.conversion_1min_pct, suffix: '%', spark: sortAsc(data.daily, 'day').map((r) => r.conversion_pct) },
              { label: 'adblock', value: data.kpi.adblock_pct, suffix: '%' },
            ]} />
          </Section>

          <Section title="Visit funnel">
            <Funnel steps={[
              { label: 'Visits', value: data.funnel.visits },
              { label: 'Clicked play', value: data.funnel.clicked_play },
              { label: 'Started run', value: data.funnel.started_run },
              { label: 'Reached 1 min', value: data.funnel.reached_1min },
              { label: 'Reached 5 min', value: data.funnel.reached_5min },
            ]} />
            <KeyVals obj={data.funnel} />
          </Section>

          <Section title="Daily activity">
            <TimeSeries data={data.daily} xKey="day" series={[
              { key: 'visits', label: 'visits', color: '#2f6f9f', area: true },
              { key: 'uniques', label: 'uniques', color: '#d98a3d' },
            ]} />
            <DataTable rows={data.daily} />
          </Section>

          <Section title="Gameplay conversion % over time (of Play-clickers, % reaching 1min)">
            <TimeSeries data={data.daily} xKey="day" yMax={100} valueSuffix="%" series={[
              { key: 'conversion_pct', label: 'conversion %', color: '#2f6f9f', area: true },
            ]} />
          </Section>

          <Section title="Play-CTR & first-impression"><KeyVals obj={data.playCtr} /></Section>
          <Section title="Engagement (bounce / 1-min hook / 5-min depth)"><KeyVals obj={data.engagement} /></Section>
          <Section title="Session depth"><KeyVals obj={data.sessionDepth} /></Section>
          <Section title="Mobile share & quality"><KeyVals obj={data.mobileSplit} /></Section>
          <Section title="DAU / MAU stickiness"><KeyVals obj={data.stickiness} /></Section>

          <Section title="Why runs end">
            <DistBars rows={data.whyRunsEnd} labelKey="end_reason" valueKey="runs" pctOfTotal />
            <DataTable rows={data.whyRunsEnd} />
          </Section>

          <Section title="First-run vs later runs (new-player experience)"><DataTable rows={data.firstRun} /></Section>

          <Section title="Time to press Play (seconds)"><KeyVals obj={data.timeToPlay} /></Section>

          <Section title="First-observed browser IDs: first-visit conversion">
            <TimeSeries data={data.newPlayerConversion} xKey="joined" yMax={100} valueSuffix="%" series={[
              { key: 'pct_clicked', label: '% clicked', color: '#2f6f9f' },
              { key: 'conv_1min_pct', label: '% to 1 min', color: '#d98a3d' },
            ]} />
            <DataTable rows={data.newPlayerConversion} />
          </Section>
          <Section title="Recently first-observed browser IDs: recorded lifetime"><KeyVals obj={data.newPlayerLifetime} /></Section>
          <Section title="Browser-ID retention: exact-day D1 / D7 (blank = not yet elapsed)">
            <TimeSeries data={data.retention} xKey="joined" yMax={100} valueSuffix="%" series={[
              { key: 'd1_pct', label: 'D1 %', color: '#2f6f9f' },
              { key: 'd7_pct', label: 'D7 %', color: '#d98a3d' },
            ]} />
            <DataTable rows={data.retention} />
          </Section>

          <Section title="Playtime avg: per-session vs per-visitor (skew check)"><KeyVals obj={data.deSkew} /></Section>
          <Section title="Playtime concentration (top players' share of playtime)"><KeyVals obj={data.concentration} /></Section>

          <Section title="A/B — death_preroll variant (adblock excluded)"><DataTable rows={data.abTest} /></Section>

          <Section title="Modeled value of tracked ads (not provider revenue)">
            <TimeSeries data={data.adDaily} xKey="day" valueSuffix=" $" series={[
              { key: 'est_usd', label: 'est USD', color: '#2f7d4f', area: true },
            ]} />
            <DataTable rows={data.adDaily} />
          </Section>
          <Section title="Ad exposure per DAU"><KeyVals obj={data.adPerDau} /></Section>
          <Section title="Modeled tracked-ad value by placement / format"><DistBars rows={data.adByPlacement} labelKey="placement" valueKey="est_usd" suffix=" $" /><DataTable rows={data.adByPlacement} /></Section>
          <Section title="Banner fill by size / placement (0% fill = slot not configured at AdinPlay)"><DataTable rows={data.adBySize} /></Section>
          <Section title="Rewarded 2× gems funnel">
            <Funnel steps={rewardedTotals(data.rewardedFunnel)} />
            <DataTable rows={data.rewardedFunnel} />
          </Section>
          <Section title="Measured adblock rate (CrazyGames excluded)">
            <TimeSeries data={data.adblockDaily} xKey="day" yMax={100} valueSuffix="%" series={[
              { key: 'adblock_pct', label: 'adblock %', color: '#b7791f', area: true },
            ]} />
            <DataTable rows={data.adblockDaily} />
          </Section>

          <Section title="Device split"><DistBars rows={data.deviceSplit} labelKey="device" valueKey="sessions" pctOfTotal /><DataTable rows={data.deviceSplit} /></Section>
          <Section title="Top countries"><DistBars rows={data.topCountries} labelKey="country" valueKey="sessions" pctOfTotal /><DataTable rows={data.topCountries} /></Section>
        </>
      )}
    </div>
  );
}
