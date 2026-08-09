import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AnalyticsSession } from './analyticsSession.entity';
import { AnalyticsRun } from './analyticsRun.entity';
import { AnalyticsAdEvent } from './analyticsAd.entity';
import { SessionDTO, RunDTO, AdEventDTO } from './analytics.dto';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(AnalyticsSession) private readonly sessionRepo: Repository<AnalyticsSession>,
    @InjectRepository(AnalyticsRun) private readonly runRepo: Repository<AnalyticsRun>,
    @InjectRepository(AnalyticsAdEvent) private readonly adRepo: Repository<AnalyticsAdEvent>,
  ) {}

  private static readonly ECPM = {
    banner: 0.35,
    preroll: 6.0,
    rewarded: 9.0,
  };

  private static readonly geoTier: Record<string, number> = {
    US: 1.0, CA: 1.0, GB: 1.0, AU: 1.0, NZ: 1.0, IE: 1.0,
    DE: 0.75, FR: 0.75, NL: 0.75, SE: 0.75, NO: 0.75, DK: 0.75, CH: 0.75, BE: 0.75, AT: 0.75, FI: 0.75,
    ES: 0.5, IT: 0.5, JP: 0.5, KR: 0.5, PL: 0.5, PT: 0.5,
  };
  private static readonly geoDefault = 0.3;

  private static readonly botRe = /bot|crawl|spider|slurp|headless|phantom|lighthouse|inspectiontool|googlebot|bingbot|bingpreview|adsbot|mediapartners|facebookexternalhit|twitterbot|slackbot|discordbot|telegrambot|whatsapp|prerender|preview|monitor|pingdom|uptimerobot|gtmetrix|python-requests|axios|node-fetch|okhttp|java\/|curl|wget|go-http/i;

  private isBotUa(ua: string | null): boolean {
    if (!ua) return false;
    return AnalyticsService.botRe.test(ua);
  }

  private estimateRevenue(eventType: string, adFormat: string | null, country: string | null): { revenue: number; ecpm: number | null } {
    const billable = eventType === 'display_viewable' || eventType === 'video_complete' || eventType === 'rewarded_complete';
    if (!billable) return { revenue: 0, ecpm: null };

    const base = adFormat === 'rewarded' || eventType === 'rewarded_complete'
      ? AnalyticsService.ECPM.rewarded
      : adFormat === 'preroll' || eventType === 'video_complete'
        ? AnalyticsService.ECPM.preroll
        : AnalyticsService.ECPM.banner;

    const geo = country ? (AnalyticsService.geoTier[country] ?? AnalyticsService.geoDefault) : AnalyticsService.geoDefault;
    const ecpm = base * geo;
    return { revenue: ecpm / 1000, ecpm };
  }

  async upsertSession(dto: SessionDTO, country: string | null, ua: string | null): Promise<void> {
    if (!dto.session_id) return;

    const existing = await this.sessionRepo.findOne({ where: { session_id: dto.session_id } });
    const row = existing ?? this.sessionRepo.create({ session_id: dto.session_id });

    const set = (k: keyof AnalyticsSession, v: any) => { if (v !== undefined && v !== null) (row as any)[k] = v; };
    const max = (k: keyof AnalyticsSession, v: any) => { if (typeof v === 'number') (row as any)[k] = Math.max(((row as any)[k] as number) || 0, v); };
    const orTrue = (k: keyof AnalyticsSession, v: any) => { if (v === true) (row as any)[k] = true; };

    set('visitor_id', dto.visitor_id);
    set('account_id', dto.account_id);
    set('username', dto.username);
    if (dto.client_started_at) row.client_started_at = new Date(dto.client_started_at);
    if (dto.ended_at) row.ended_at = new Date(dto.ended_at);
    set('end_reason', dto.end_reason);
    set('duration_ms', dto.duration_ms);

    orTrue('clicked_play', dto.clicked_play);
    if (dto.time_to_first_play_ms != null && row.time_to_first_play_ms == null) row.time_to_first_play_ms = dto.time_to_first_play_ms;
    max('play_count', dto.play_count);
    max('death_count', dto.death_count);
    max('total_playtime_ms', dto.total_playtime_ms);
    max('max_run_playtime_ms', dto.max_run_playtime_ms);
    orTrue('reached_1min', dto.reached_1min);
    orTrue('reached_5min', dto.reached_5min);

    orTrue('is_first_visit', dto.is_first_visit);
    orTrue('is_returning', dto.is_returning);
    set('is_logged_in', dto.is_logged_in);
    set('is_embedded', dto.is_embedded);
    set('is_mobile', dto.is_mobile);
    set('device_type', dto.device_type);
    set('screen_w', dto.screen_w);
    set('screen_h', dto.screen_h);
    set('browser', dto.browser);
    set('os', dto.os);
    set('language', dto.language);
    set('timezone', dto.timezone);
    set('referrer', dto.referrer);
    set('landing_query', dto.landing_query);

    set('ad_provider', dto.ad_provider);
    set('adblock', dto.adblock);
    max('ad_impressions', dto.ad_impressions);
    max('video_ads_watched', dto.video_ads_watched);
    max('rewarded_ads_watched', dto.rewarded_ads_watched);

    set('ab_variants', dto.ab_variants);
    set('app_version', dto.app_version);

    if (country && !row.country) row.country = country;
    if (!existing) row.is_bot = this.isBotUa(ua);

    await this.sessionRepo.save(row);
  }

  async insertRun(dto: RunDTO): Promise<void> {
    if (!dto.run_id) return;
    const existing = await this.runRepo.findOne({ where: { run_id: dto.run_id } });
    const row = existing ?? this.runRepo.create({ run_id: dto.run_id, end_reason: 'active' });
    const set = (key: keyof AnalyticsRun, value: any) => { if (value !== undefined && value !== null) (row as any)[key] = value; };
    set('session_id', dto.session_id);
    set('visitor_id', dto.visitor_id);
    set('account_id', dto.account_id);
    if (dto.started_at && !row.started_at) row.started_at = new Date(dto.started_at);
    if (dto.ended_at) row.ended_at = new Date(dto.ended_at);
    set('playtime_ms', dto.playtime_ms);
    set('end_reason', dto.end_reason);
    set('killer_name', dto.killer_name);
    set('coins', dto.coins);
    set('kills', dto.kills);
    set('run_index', dto.run_index);
    set('is_first_run', dto.is_first_run);
    set('is_logged_in', dto.is_logged_in);
    set('is_mobile', dto.is_mobile);
    set('device_type', dto.device_type);
    set('preroll_variant', dto.preroll_variant);
    set('preroll_shown', dto.preroll_shown);
    set('ab_variants', dto.ab_variants);
    await this.runRepo.save(row);
  }

  async insertAd(dto: AdEventDTO, country: string | null): Promise<void> {
    if (!dto.event_type) return;
    const { revenue, ecpm } = this.estimateRevenue(dto.event_type, dto.ad_format ?? null, country);

    const row = this.adRepo.create({
      session_id: dto.session_id ?? null,
      visitor_id: dto.visitor_id ?? null,
      account_id: dto.account_id ?? null,
      event_type: dto.event_type,
      ad_provider: dto.ad_provider ?? null,
      ad_format: dto.ad_format ?? null,
      ad_size: dto.ad_size ?? null,
      placement: dto.placement ?? null,
      visible_ms: dto.visible_ms ?? null,
      viewability: dto.viewability ?? null,
      is_mobile: dto.is_mobile ?? false,
      country: country ?? null,
      ab_variants: dto.ab_variants ?? null,
      estimated_revenue_usd: revenue.toFixed(6),
      ecpm_used: ecpm != null ? ecpm.toFixed(4) : null,
    });
    await this.adRepo.save(row);
  }

  async getDashboard(days: number) {
    const d = Math.max(1, Math.min(365, Math.floor(Number(days) || 30)));
    const iv = `interval '${d} days'`;
    const human = `is_bot = false`;
    const run = (sql: string): Promise<any[]> =>
      this.sessionRepo.query(sql).catch((e) => { console.error('[analytics/metrics]', e?.message); return []; });

    const [
      kpi, daily, funnel, whyRunsEnd, timeToPlay, retention, newPlayerConversion,
      newPlayerLifetime, deSkew, concentration, abTest, adDaily, adByPlacement,
      rewardedFunnel, adblockDaily, topCountries, deviceSplit,
      playCtr, playtime, engagement, mobileSplit, stickiness, sessionDepth,
      firstRun, adPerDau, d1Overall, adBySize,
    ] = await Promise.all([
      run(`SELECT COUNT(*)::int AS sessions, COUNT(DISTINCT visitor_id)::int AS unique_visitors,
            COUNT(*) FILTER (WHERE clicked_play)::int AS play_clicks,
            ROUND(AVG(total_playtime_ms) FILTER (WHERE play_count>0)/60000.0,2)::float AS avg_playing_min,
            ROUND(100.0*COUNT(*) FILTER (WHERE reached_1min AND clicked_play)/NULLIF(COUNT(*) FILTER (WHERE clicked_play),0),1)::float AS conversion_1min_pct,
            ROUND(100.0*AVG((adblock)::int) FILTER (WHERE adblock IS NOT NULL),1)::float AS adblock_pct
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv}`),
      run(`SELECT created_at::date::text AS day, COUNT(*)::int AS visits, COUNT(DISTINCT visitor_id)::int AS uniques,
            ROUND(100.0*COUNT(*) FILTER (WHERE reached_1min AND clicked_play)/NULLIF(COUNT(*) FILTER (WHERE clicked_play),0),1)::float AS conversion_pct,
            ROUND(AVG(total_playtime_ms) FILTER (WHERE play_count>0)/60000.0,2)::float AS avg_min
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1`),
      run(`SELECT COUNT(*)::int AS visits, COUNT(*) FILTER (WHERE clicked_play)::int AS clicked_play,
            COUNT(*) FILTER (WHERE play_count>=1)::int AS started_run,
            COUNT(*) FILTER (WHERE reached_1min)::int AS reached_1min,
            COUNT(*) FILTER (WHERE reached_5min)::int AS reached_5min
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv}`),
      run(`SELECT COALESCE(end_reason,'unknown') AS end_reason, COUNT(*)::int AS runs,
            ROUND(100.0*COUNT(*)/NULLIF(SUM(COUNT(*)) OVER (),0),1)::float AS pct,
            ROUND(AVG(playtime_ms)/1000.0,1)::float AS avg_run_s
           FROM analytics_runs WHERE created_at >= now() - ${iv} GROUP BY 1 ORDER BY runs DESC`),
      run(`SELECT ROUND(AVG(time_to_first_play_ms)/1000.0,1)::float AS avg_s,
            ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY time_to_first_play_ms)/1000.0,1)::float AS median_s,
            ROUND(percentile_cont(0.9) WITHIN GROUP (ORDER BY time_to_first_play_ms)/1000.0,1)::float AS p90_s
           FROM analytics_sessions WHERE ${human} AND clicked_play AND time_to_first_play_ms IS NOT NULL AND created_at >= now() - ${iv}`),
      run(`WITH firsts AS (SELECT visitor_id, MIN(created_at::date) AS first_day FROM analytics_sessions WHERE ${human} AND visitor_id IS NOT NULL GROUP BY visitor_id),
            activity AS (SELECT DISTINCT visitor_id, created_at::date AS day FROM analytics_sessions WHERE ${human})
            SELECT f.first_day::text AS joined, COUNT(DISTINCT f.visitor_id)::int AS new_players,
              CASE WHEN f.first_day <= now()::date - 1
                   THEN ROUND(100.0*COUNT(DISTINCT a1.visitor_id)/NULLIF(COUNT(DISTINCT f.visitor_id),0),1) END::float AS d1_pct,
              CASE WHEN f.first_day <= now()::date - 7
                   THEN ROUND(100.0*COUNT(DISTINCT a7.visitor_id)/NULLIF(COUNT(DISTINCT f.visitor_id),0),1) END::float AS d7_pct
            FROM firsts f
            LEFT JOIN activity a1 ON a1.visitor_id=f.visitor_id AND a1.day=f.first_day+1
            LEFT JOIN activity a7 ON a7.visitor_id=f.visitor_id AND a7.day=f.first_day+7
            WHERE f.first_day >= now()::date - ${d} GROUP BY f.first_day ORDER BY 1 DESC`),
      run(`SELECT created_at::date::text AS joined, COUNT(*)::int AS new_players,
            ROUND(100.0*COUNT(*) FILTER (WHERE clicked_play)/NULLIF(COUNT(*),0),1)::float AS pct_clicked,
            ROUND(100.0*COUNT(*) FILTER (WHERE reached_1min AND clicked_play)/NULLIF(COUNT(*) FILTER (WHERE clicked_play),0),1)::float AS conv_1min_pct
           FROM analytics_sessions WHERE ${human} AND is_first_visit=true AND created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1 DESC`),
      run(`WITH new_visitors AS (SELECT visitor_id FROM analytics_sessions WHERE ${human} AND visitor_id IS NOT NULL GROUP BY visitor_id HAVING MIN(created_at::date) >= now()::date - ${d}),
            per AS (SELECT s.visitor_id, COUNT(*) AS sessions, SUM(s.total_playtime_ms)/60000.0 AS total_min, bool_or(s.reached_1min) AS ever_1min, COUNT(DISTINCT s.created_at::date)>1 AS returned FROM analytics_sessions s JOIN new_visitors nv ON nv.visitor_id=s.visitor_id WHERE s.${human} GROUP BY s.visitor_id)
            SELECT COUNT(*)::int AS new_players, ROUND(AVG(sessions),2)::float AS avg_sessions, ROUND(AVG(total_min),2)::float AS avg_total_min,
              ROUND(100.0*AVG((ever_1min)::int),1)::float AS pct_ever_1min, ROUND(100.0*AVG((returned)::int),1)::float AS pct_returned FROM per`),
      run(`SELECT (SELECT ROUND(AVG(total_playtime_ms)/60000.0,2)::float FROM analytics_sessions WHERE ${human} AND play_count>0 AND created_at >= now() - ${iv}) AS per_session_avg_min,
            (SELECT ROUND(AVG(v.min),2)::float FROM (SELECT visitor_id, SUM(total_playtime_ms)/60000.0 AS min FROM analytics_sessions WHERE ${human} AND play_count>0 AND created_at >= now() - ${iv} AND visitor_id IS NOT NULL GROUP BY visitor_id) v) AS per_visitor_avg_min`),
      run(`WITH per AS (SELECT visitor_id, SUM(total_playtime_ms) AS ms FROM analytics_sessions WHERE ${human} AND play_count>0 AND created_at >= now() - ${iv} AND visitor_id IS NOT NULL GROUP BY visitor_id),
            ranked AS (SELECT ms, ntile(100) OVER (ORDER BY ms DESC) AS pct FROM per)
            SELECT CASE WHEN (SELECT COUNT(*) FROM per) >= 100 THEN ROUND(100.0*SUM(ms) FILTER (WHERE pct=1)/NULLIF(SUM(ms),0),1) END::float AS top_1pct_share,
              CASE WHEN (SELECT COUNT(*) FROM per) >= 30 THEN ROUND(100.0*SUM(ms) FILTER (WHERE pct<=10)/NULLIF(SUM(ms),0),1) END::float AS top_10pct_share FROM ranked`),
      run(`SELECT COALESCE(ab_variants->>'death_preroll','(none)') AS variant, COUNT(*)::int AS sessions,
            ROUND(AVG(total_playtime_ms)/60000.0,2)::float AS avg_session_min, ROUND(AVG(play_count),2)::float AS avg_runs,
            ROUND(100.0*AVG((reached_1min)::int),1)::float AS pct_1min
           FROM analytics_sessions WHERE ab_variants->>'death_preroll' IS NOT NULL AND adblock = false AND ${human} AND created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1`),
      run(`SELECT a.created_at::date::text AS day, SUM(a.estimated_revenue_usd)::float AS est_usd,
            COUNT(*) FILTER (WHERE a.event_type='display_request')::int AS banner_requests,
            COUNT(*) FILTER (WHERE a.event_type='display_filled')::int AS banner_fills,
            COUNT(*) FILTER (WHERE a.event_type='display_viewable')::int AS banner_impr,
            COUNT(*) FILTER (WHERE a.event_type='video_complete')::int AS video_views,
            COUNT(*) FILTER (WHERE a.event_type='rewarded_complete')::int AS rewarded_views
           FROM analytics_ad_events a JOIN analytics_sessions s ON s.session_id=a.session_id
           WHERE s.${human} AND a.created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1`),
      run(`SELECT COALESCE(a.placement,'(none)') AS placement, COALESCE(a.ad_format,'(other)') AS format, COUNT(*)::int AS events,
            SUM(a.estimated_revenue_usd)::float AS est_usd
           FROM analytics_ad_events a JOIN analytics_sessions s ON s.session_id=a.session_id
           WHERE s.${human} AND a.created_at >= now() - ${iv} GROUP BY 1,2 ORDER BY est_usd DESC NULLS LAST`),
      run(`SELECT a.created_at::date::text AS day,
            COUNT(*) FILTER (WHERE a.event_type='video_request' AND a.placement='reward_2x')::int AS started,
            COUNT(*) FILTER (WHERE a.event_type='rewarded_complete' AND a.placement='reward_2x')::int AS watched,
            COUNT(*) FILTER (WHERE a.event_type='rewarded_claimed' AND a.placement='reward_2x')::int AS claimed
           FROM analytics_ad_events a JOIN analytics_sessions s ON s.session_id=a.session_id
           WHERE s.${human} AND a.created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1 DESC`),
      run(`SELECT created_at::date::text AS day, COUNT(*) FILTER (WHERE adblock IS NOT NULL)::int AS measured,
            ROUND(100.0*AVG((adblock)::int) FILTER (WHERE adblock IS NOT NULL),1)::float AS adblock_pct
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1 DESC`),
      run(`SELECT COALESCE(country,'??') AS country, COUNT(*)::int AS sessions, ROUND(AVG(total_playtime_ms) FILTER (WHERE play_count>0)/60000.0,2)::float AS avg_min
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv} GROUP BY 1 ORDER BY sessions DESC LIMIT 20`),
      run(`SELECT COALESCE(device_type,'unknown') AS device, COUNT(*)::int AS sessions,
            ROUND(100.0*COUNT(*) FILTER (WHERE reached_1min AND clicked_play)/NULLIF(COUNT(*) FILTER (WHERE clicked_play),0),1)::float AS conversion_pct,
            ROUND(AVG(total_playtime_ms) FILTER (WHERE play_count>0)/60000.0,2)::float AS avg_min
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv} GROUP BY 1 ORDER BY sessions DESC`),
      run(`SELECT ROUND(100.0*AVG((clicked_play)::int),1)::float AS pct_clicked,
            ROUND(100.0*AVG((play_count>0)::int),1)::float AS pct_played,
            ROUND(100.0*AVG((play_count>0)::int) FILTER (WHERE is_mobile),1)::float AS pct_played_mobile,
            ROUND(100.0*AVG((play_count>0)::int) FILTER (WHERE NOT is_mobile),1)::float AS pct_played_desktop
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv}`),
      run(`SELECT ROUND(AVG(total_playtime_ms) FILTER (WHERE play_count>0)/60000.0,2)::float AS avg_playing_min,
            ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY total_playtime_ms) FILTER (WHERE play_count>0)/60000.0,2)::float AS median_playing_min,
            ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY max_run_playtime_ms) FILTER (WHERE play_count>0)/60000.0,2)::float AS median_best_life_min
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv}`),
      run(`SELECT ROUND(100.0*AVG((reached_1min)::int) FILTER (WHERE play_count>0),1)::float AS pct_reached_1min,
            ROUND(100.0*AVG((clicked_play AND NOT reached_1min)::int),1)::float AS bounce_pct,
            ROUND(100.0*AVG((reached_5min)::int) FILTER (WHERE play_count>0),1)::float AS pct_reached_5min,
            ROUND(100.0*SUM((reached_5min)::int)/NULLIF(SUM((reached_1min)::int),0),1)::float AS survival_1to5_pct
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv}`),
      run(`SELECT ROUND(100.0*AVG((is_mobile)::int),1)::float AS mobile_share_pct,
            ROUND(AVG(total_playtime_ms) FILTER (WHERE play_count>0 AND is_mobile)/60000.0,2)::float AS mobile_avg_min,
            ROUND(AVG(total_playtime_ms) FILTER (WHERE play_count>0 AND NOT is_mobile)/60000.0,2)::float AS desktop_avg_min
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv}`),
      run(`WITH daily AS (SELECT created_at::date AS day, COUNT(DISTINCT visitor_id) AS dau FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv} GROUP BY 1)
            SELECT ROUND(AVG(dau)::numeric,1)::float AS avg_dau,
              (SELECT COUNT(DISTINCT visitor_id)::int FROM analytics_sessions WHERE ${human} AND created_at >= now() - interval '30 days') AS mau,
              ROUND(100.0*AVG(dau)/NULLIF((SELECT COUNT(DISTINCT visitor_id) FROM analytics_sessions WHERE ${human} AND created_at >= now() - interval '30 days'),0),1)::float AS stickiness_pct
            FROM daily`),
      run(`SELECT ROUND(AVG(play_count) FILTER (WHERE play_count>0),2)::float AS avg_runs_per_playing,
            ROUND(AVG(death_count),2)::float AS avg_deaths,
            ROUND(100.0*AVG((play_count=1)::int) FILTER (WHERE play_count>0),1)::float AS one_and_done_pct
           FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv}`),
      run(`SELECT CASE WHEN is_first_run THEN 'first run' ELSE 'later runs' END AS run_type,
            ROUND(AVG(playtime_ms)/1000.0,1)::float AS avg_s, ROUND(AVG(kills),2)::float AS avg_kills,
            ROUND(AVG(coins),0)::float AS avg_coins,
            ROUND(100.0*AVG((playtime_ms<20000 AND kills=0)::int),1)::float AS quick_deathless_pct
           FROM analytics_runs WHERE created_at >= now() - ${iv} GROUP BY is_first_run ORDER BY is_first_run DESC`),
      run(`SELECT ROUND(v.imp::numeric/NULLIF(v.person_days,0),2)::float AS impr_per_dau,
            ROUND(v.vid::numeric/NULLIF(v.person_days,0),2)::float AS video_per_dau
           FROM (SELECT
             (SELECT COUNT(*) FROM analytics_ad_events a JOIN analytics_sessions s ON s.session_id=a.session_id WHERE s.${human} AND a.event_type='display_viewable' AND a.created_at >= now() - ${iv}) AS imp,
             (SELECT COUNT(*) FROM analytics_ad_events a JOIN analytics_sessions s ON s.session_id=a.session_id WHERE s.${human} AND a.event_type IN ('video_complete','rewarded_complete') AND a.created_at >= now() - ${iv}) AS vid,
             (SELECT COALESCE(SUM(dd),0) FROM (SELECT COUNT(DISTINCT visitor_id) AS dd FROM analytics_sessions WHERE ${human} AND created_at >= now() - ${iv} GROUP BY created_at::date) t) AS person_days) v`),
      run(`WITH firsts AS (SELECT visitor_id, MIN(created_at::date) AS fd FROM analytics_sessions WHERE ${human} AND visitor_id IS NOT NULL GROUP BY 1
              HAVING MIN(created_at::date) <= now()::date - 1 AND MIN(created_at::date) >= now()::date - ${d}),
            act AS (SELECT DISTINCT visitor_id, created_at::date AS day FROM analytics_sessions WHERE ${human})
            SELECT ROUND(100.0*COUNT(DISTINCT a.visitor_id)/NULLIF(COUNT(DISTINCT f.visitor_id),0),1)::float AS d1_pct
            FROM firsts f LEFT JOIN act a ON a.visitor_id=f.visitor_id AND a.day=f.fd+1`),
      run(`SELECT COALESCE(a.ad_size,'(none)') AS size, COALESCE(a.placement,'(none)') AS placement,
            COUNT(*) FILTER (WHERE a.event_type='display_request')::int AS requests,
            COUNT(*) FILTER (WHERE a.event_type='display_filled')::int AS fills,
            COUNT(*) FILTER (WHERE a.event_type='display_no_fill')::int AS no_fills,
            COUNT(*) FILTER (WHERE a.event_type='display_viewable')::int AS viewable,
            ROUND(100.0*COUNT(*) FILTER (WHERE a.event_type='display_filled')/NULLIF(COUNT(*) FILTER (WHERE a.event_type='display_request'),0),1)::float AS fill_pct
           FROM analytics_ad_events a JOIN analytics_sessions s ON s.session_id=a.session_id
           WHERE s.${human} AND a.ad_format='banner' AND a.created_at >= now() - ${iv} GROUP BY 1,2 ORDER BY requests DESC`),
    ]);

    const round2 = (rows: any[]) => rows.map((r) => ({ ...r, est_usd: r.est_usd == null ? 0 : Math.round(Number(r.est_usd) * 100) / 100 }));

    const readiness = this.computeReadiness(playCtr[0], playtime[0], mobileSplit[0], engagement[0], d1Overall[0]);

    return {
      days: d,
      generatedAt: new Date().toISOString(),
      kpi: kpi[0] || {},
      daily,
      funnel: funnel[0] || {},
      whyRunsEnd,
      timeToPlay: timeToPlay[0] || {},
      retention,
      newPlayerConversion,
      newPlayerLifetime: newPlayerLifetime[0] || {},
      deSkew: deSkew[0] || {},
      concentration: concentration[0] || {},
      abTest,
      adDaily: round2(adDaily),
      adByPlacement: round2(adByPlacement),
      adBySize,
      rewardedFunnel,
      adblockDaily,
      topCountries,
      deviceSplit,
      playCtr: playCtr[0] || {},
      playtime: playtime[0] || {},
      engagement: engagement[0] || {},
      mobileSplit: mobileSplit[0] || {},
      stickiness: stickiness[0] || {},
      sessionDepth: sessionDepth[0] || {},
      firstRun,
      adPerDau: adPerDau[0] || {},
      readiness,
    };
  }

  async getDailyDigest(dateStr?: string) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateStr || '')
      ? dateStr
      : new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const run = (sql: string): Promise<any[]> =>
      this.sessionRepo.query(sql, [date]).catch((e) => { console.error('[analytics/daily-digest]', e?.message); return []; });

    const identityCte = `WITH visitor_accounts AS (
              SELECT visitor_id, MAX(account_id) AS account_id FROM analytics_sessions
              WHERE is_bot = false AND visitor_id IS NOT NULL AND account_id IS NOT NULL GROUP BY visitor_id
              HAVING COUNT(DISTINCT account_id) = 1
            ), base AS (
              SELECT s.*, COALESCE('a:' || COALESCE(s.account_id, va.account_id)::text, 'v:' || s.visitor_id) AS person_id,
                COALESCE(s.client_started_at, s.created_at) AS session_at,
                (COALESCE(s.client_started_at, s.created_at) AT TIME ZONE 'UTC')::date AS session_day
              FROM analytics_sessions s LEFT JOIN visitor_accounts va ON va.visitor_id = s.visitor_id
              WHERE s.is_bot = false
            )`;

    const [core, players, games, retention, newPlayer, ads] = await Promise.all([
      run(`${identityCte}
           SELECT COUNT(*)::int AS visits, COUNT(DISTINCT person_id)::int AS dau,
            COUNT(*) FILTER (WHERE play_count>0)::int AS played_sessions,
            ROUND(100.0*COUNT(*) FILTER (WHERE play_count>0)/NULLIF(COUNT(*),0),1)::float AS conversion_pct,
            ROUND(AVG(total_playtime_ms) FILTER (WHERE play_count>0)/60000.0,2)::float AS avg_playtime_min,
            ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY total_playtime_ms) FILTER (WHERE play_count>0))::numeric/60000.0,2)::float AS median_playtime_min,
            COUNT(*) FILTER (WHERE adblock IS NOT NULL)::int AS adblock_measured_sessions,
            ROUND(100.0*AVG((adblock)::int) FILTER (WHERE adblock IS NOT NULL),1)::float AS adblock_pct
           FROM base WHERE session_day = $1::date`),
      run(`${identityCte}, firsts AS (SELECT person_id, MIN(session_day) AS first_day FROM base WHERE person_id IS NOT NULL GROUP BY person_id),
            today AS (SELECT DISTINCT person_id FROM base WHERE person_id IS NOT NULL AND session_day = $1::date)
            SELECT COUNT(*) FILTER (WHERE f.first_day = $1::date)::int AS new_players,
              COUNT(*) FILTER (WHERE f.first_day < $1::date)::int AS returning_players
            FROM today t JOIN firsts f ON f.person_id = t.person_id`),
      run(`SELECT COUNT(*)::int AS games_played FROM analytics_runs r
           JOIN analytics_sessions s ON s.session_id = r.session_id
           WHERE s.is_bot = false AND (COALESCE(r.started_at, r.created_at) AT TIME ZONE 'UTC')::date = $1::date`),
      run(`${identityCte}, firsts AS (
              SELECT person_id, MIN(session_day) AS first_day FROM base WHERE person_id IS NOT NULL GROUP BY person_id
              HAVING MIN(session_day) IN ($1::date - 1, $1::date - 7)
            ), act AS (SELECT DISTINCT person_id FROM base WHERE session_day = $1::date)
            SELECT COUNT(f.person_id) FILTER (WHERE f.first_day = $1::date - 1)::int AS d1_cohort,
              ROUND(100.0*COUNT(a.person_id) FILTER (WHERE f.first_day = $1::date - 1)/NULLIF(COUNT(f.person_id) FILTER (WHERE f.first_day = $1::date - 1),0),1)::float AS d1_pct,
              COUNT(f.person_id) FILTER (WHERE f.first_day = $1::date - 7)::int AS d7_cohort,
              ROUND(100.0*COUNT(a.person_id) FILTER (WHERE f.first_day = $1::date - 7)/NULLIF(COUNT(f.person_id) FILTER (WHERE f.first_day = $1::date - 7),0),1)::float AS d7_pct
            FROM firsts f LEFT JOIN act a ON a.person_id = f.person_id`),
      run(`${identityCte}, firsts AS (SELECT person_id, MIN(session_day) AS first_day FROM base WHERE person_id IS NOT NULL GROUP BY person_id),
            per_player AS (
              SELECT b.person_id, SUM(b.total_playtime_ms) AS playtime_ms FROM base b JOIN firsts f ON f.person_id = b.person_id
              WHERE f.first_day = $1::date AND b.session_day = $1::date AND b.play_count > 0 GROUP BY b.person_id
            ) SELECT ROUND(AVG(playtime_ms)/60000.0,2)::float AS new_player_avg_playtime_min FROM per_player`),
      run(`SELECT COALESCE(SUM(a.estimated_revenue_usd),0)::float AS ad_revenue_usd,
            COUNT(*) FILTER (WHERE a.event_type='display_viewable')::int AS ad_impressions,
            COUNT(*) FILTER (WHERE a.event_type IN ('video_complete','rewarded_complete'))::int AS video_ads
           FROM analytics_ad_events a JOIN analytics_sessions s ON s.session_id = a.session_id
           WHERE s.is_bot = false AND (a.created_at AT TIME ZONE 'UTC')::date = $1::date`),
    ]);

    const c = core[0] || {};
    const p = players[0] || {};
    const g = games[0] || {};
    const r = retention[0] || {};
    const np = newPlayer[0] || {};
    const a = ads[0] || {};
    return {
      date,
      generatedAt: new Date().toISOString(),
      visits: c.visits ?? 0,
      dau: c.dau ?? 0,
      newPlayers: p.new_players ?? 0,
      returningPlayers: p.returning_players ?? 0,
      gamesPlayed: g.games_played ?? 0,
      playedSessions: c.played_sessions ?? 0,
      conversionPct: c.conversion_pct ?? null,
      avgPlaytimeMin: c.avg_playtime_min ?? null,
      medianPlaytimeMin: c.median_playtime_min ?? null,
      d1Cohort: r.d1_cohort ?? 0,
      d1Pct: r.d1_pct ?? null,
      d7Cohort: r.d7_cohort ?? 0,
      d7Pct: r.d7_pct ?? null,
      newPlayerAvgPlaytimeMin: np.new_player_avg_playtime_min ?? null,
      adRevenueUsd: a.ad_revenue_usd != null ? Math.round(Number(a.ad_revenue_usd) * 100) / 100 : 0,
      adImpressions: a.ad_impressions ?? 0,
      videoAds: a.video_ads ?? 0,
      adblockPct: c.adblock_pct ?? null,
      adblockMeasuredSessions: c.adblock_measured_sessions ?? 0,
    };
  }

  private computeReadiness(playCtr: any, playtime: any, mobileSplit: any, engagement: any, d1: any) {
    const ctr = (playCtr?.pct_played ?? 0) / 100;
    const avgMin = playtime?.avg_playing_min ?? 0;
    const d1Rate = (d1?.d1_pct ?? 0) / 100;
    const desktopMin = mobileSplit?.desktop_avg_min ?? 0;
    const mobileMin = mobileSplit?.mobile_avg_min ?? 0;
    const mobileRatio = desktopMin > 0 ? Math.min(mobileMin / desktopMin, 1) : (mobileMin > 0 ? 1 : 0);
    const depth5 = (engagement?.pct_reached_5min ?? 0) / 100;

    const clamp = (n: number) => Math.max(0, Math.min(n, 1));
    const ctrTerm = clamp(ctr / 0.8);
    const playtimeTerm = clamp(avgMin / 10);
    const d1Term = clamp(d1Rate / 0.12);
    const depthTerm = clamp(depth5 / 0.4);

    const score = 25 * ctrTerm + 25 * playtimeTerm + 25 * d1Term + 15 * mobileRatio + 10 * depthTerm;
    const band = score < 40 ? 'not ready' : score <= 70 ? 'borderline' : 'strong';

    return {
      score: Math.round(score * 10) / 10,
      band,
      play_ctr_pct: Math.round(ctr * 1000) / 10,
      avg_playing_min: avgMin,
      d1_pct: Math.round(d1Rate * 1000) / 10,
      mobile_quality_pct: Math.round(mobileRatio * 1000) / 10,
      depth_5min_pct: Math.round(depth5 * 1000) / 10,
    };
  }
}
