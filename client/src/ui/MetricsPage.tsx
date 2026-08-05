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

function Bars({ rows, labelKey, valueKey, suffix }: { rows: any[]; labelKey: string; valueKey: string; suffix?: string }) {
  if (!rows || rows.length === 0) return <p className="m-empty">No data.</p>;
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 0) || 1;
  return (
    <div className="m-bars">
      {rows.map((r, i) => {
        const v = Number(r[valueKey]) || 0;
        return (
          <div className="m-bar-row" key={i}>
            <span className="m-bar-label">{fmt(r[labelKey])}</span>
            <span className="m-bar-track"><span className="m-bar-fill" style={{ width: `${(v / max) * 100}%` }} /></span>
            <span className="m-bar-val">{fmt(v)}{suffix || ''}</span>
          </div>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return <section className="m-section"><h2>{title}</h2>{children}</section>;
}

export default function MetricsPage() {
  useEffect(() => { document.title = 'SB Metrics'; }, []);
  const secret = useParams().secret || '';
  const [days, setDays] = useState<number>(() => Number(localStorage.getItem('sb:metricsDays')) || 30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    const d = Math.max(1, Math.min(365, Math.floor(Number(days) || 30)));
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

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  return (
    <div className="metrics-page">
      <h1>Swordbattle metrics</h1>

      <div className="m-controls">
        <label>Days <input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} /></label>
        <button onClick={load} disabled={loading}>{loading ? 'Loading…' : 'Reload'}</button>
        {data && <span className="m-meta">last {data.days}d · generated {new Date(data.generatedAt).toLocaleString()}</span>}
      </div>

      {error && <p className="m-error">{error}</p>}

      {data && (
        <>
          <Section title="Summary (last N days)"><KeyVals obj={data.kpi} /></Section>
          <Section title="Visit funnel"><KeyVals obj={data.funnel} /></Section>

          <Section title="Daily activity"><DataTable rows={data.daily} /></Section>
          <Section title="Gameplay conversion % over time (of Play-clickers, % reaching 1min)">
            <Bars rows={data.daily} labelKey="day" valueKey="conversion_pct" suffix="%" />
          </Section>

          <Section title="Why runs end">
            <DataTable rows={data.whyRunsEnd} />
            <Bars rows={data.whyRunsEnd} labelKey="end_reason" valueKey="runs" />
          </Section>

          <Section title="Time to press Play (seconds)"><KeyVals obj={data.timeToPlay} /></Section>

          <Section title="New players — first-visit conversion"><DataTable rows={data.newPlayerConversion} /></Section>
          <Section title="New players — lifetime (per-player, de-skewed)"><KeyVals obj={data.newPlayerLifetime} /></Section>
          <Section title="Retention — D1 / D7 by join day"><DataTable rows={data.retention} /></Section>

          <Section title="Playtime avg: per-session vs per-visitor (skew check)"><KeyVals obj={data.deSkew} /></Section>
          <Section title="Playtime concentration (top players' share of playtime)"><KeyVals obj={data.concentration} /></Section>

          <Section title="A/B — death_preroll variant"><DataTable rows={data.abTest} /></Section>

          <Section title="Estimated ad revenue (daily, USD)">
            <DataTable rows={data.adDaily} />
            <Bars rows={data.adDaily} labelKey="day" valueKey="est_usd" suffix=" $" />
          </Section>
          <Section title="Revenue by placement / format"><DataTable rows={data.adByPlacement} /></Section>
          <Section title="Rewarded 2× gems funnel"><DataTable rows={data.rewardedFunnel} /></Section>
          <Section title="Adblock rate (daily %)"><DataTable rows={data.adblockDaily} /></Section>

          <Section title="Device split"><DataTable rows={data.deviceSplit} /></Section>
          <Section title="Top countries"><DataTable rows={data.topCountries} /></Section>
        </>
      )}
    </div>
  );
}
