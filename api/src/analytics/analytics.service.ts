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

  private estimateRevenue(eventType: string, adFormat: string | null, country: string | null): { revenue: number; ecpm: number | null } {
    const billable = eventType === 'display_impression' || eventType === 'video_complete' || eventType === 'rewarded_complete';
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

  async upsertSession(dto: SessionDTO, country: string | null): Promise<void> {
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

    await this.sessionRepo.save(row);
  }

  async insertRun(dto: RunDTO): Promise<void> {
    if (!dto.run_id) return;
    const existing = await this.runRepo.findOne({ where: { run_id: dto.run_id } });
    if (existing) return;

    const row = this.runRepo.create({
      run_id: dto.run_id,
      session_id: dto.session_id ?? null,
      visitor_id: dto.visitor_id ?? null,
      account_id: dto.account_id ?? null,
      started_at: dto.started_at ? new Date(dto.started_at) : null,
      ended_at: dto.ended_at ? new Date(dto.ended_at) : null,
      playtime_ms: dto.playtime_ms ?? null,
      end_reason: dto.end_reason ?? 'unknown',
      killer_name: dto.killer_name ?? null,
      coins: dto.coins ?? 0,
      kills: dto.kills ?? 0,
      run_index: dto.run_index ?? 0,
      is_first_run: dto.is_first_run ?? false,
      is_logged_in: dto.is_logged_in ?? false,
      is_mobile: dto.is_mobile ?? false,
      device_type: dto.device_type ?? null,
      preroll_variant: dto.preroll_variant ?? null,
      preroll_shown: dto.preroll_shown ?? false,
      ab_variants: dto.ab_variants ?? null,
    });
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
    const run = (sql: string): Promise<any[]> =>
      this.sessionRepo.query(sql).catch((e) => { console.error('[analytics/metrics]', e?.message); return []; });

    const [
      kpi, daily, funnel, whyRunsEnd, timeToPlay, retention, newPlayerConversion,
      newPlayerLifetime, deSkew, concentration, abTest, adDaily, adByPlacement,
      rewardedFunnel, adblockDaily, topCountries, deviceSplit,
    ] = await Promise.all([
      run(`SELECT COUNT(*)::int AS sessions, COUNT(DISTINCT visitor_id)::int AS unique_visitors,
            COUNT(*) FILTER (WHERE clicked_play)::int AS play_clicks,
            ROUND(AVG(total_playtime_ms)/60000.0,2)::float AS avg_session_min,
            ROUND(100.0*COUNT(*) FILTER (WHERE reached_1min)/NULLIF(COUNT(*) FILTER (WHERE clicked_play),0),1)::float AS conversion_1min_pct,
            ROUND(100.0*AVG((adblock)::int) FILTER (WHERE adblock IS NOT NULL),1)::float AS adblock_pct
           FROM analytics_sessions WHERE created_at >= now() - ${iv}`),
      run(`SELECT created_at::date::text AS day, COUNT(*)::int AS visits, COUNT(DISTINCT visitor_id)::int AS uniques,
            ROUND(100.0*COUNT(*) FILTER (WHERE reached_1min)/NULLIF(COUNT(*) FILTER (WHERE clicked_play),0),1)::float AS conversion_pct,
            ROUND(AVG(total_playtime_ms)/60000.0,2)::float AS avg_min
           FROM analytics_sessions WHERE created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1`),
      run(`SELECT COUNT(*)::int AS visits, COUNT(*) FILTER (WHERE clicked_play)::int AS clicked_play,
            COUNT(*) FILTER (WHERE play_count>=1)::int AS started_run,
            COUNT(*) FILTER (WHERE reached_1min)::int AS reached_1min,
            COUNT(*) FILTER (WHERE reached_5min)::int AS reached_5min
           FROM analytics_sessions WHERE created_at >= now() - ${iv}`),
      run(`SELECT COALESCE(end_reason,'unknown') AS end_reason, COUNT(*)::int AS runs,
            ROUND(100.0*COUNT(*)/NULLIF(SUM(COUNT(*)) OVER (),0),1)::float AS pct,
            ROUND(AVG(playtime_ms)/1000.0,1)::float AS avg_run_s
           FROM analytics_runs WHERE created_at >= now() - ${iv} GROUP BY 1 ORDER BY runs DESC`),
      run(`SELECT ROUND(AVG(time_to_first_play_ms)/1000.0,1)::float AS avg_s,
            ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY time_to_first_play_ms)/1000.0,1)::float AS median_s,
            ROUND(percentile_cont(0.9) WITHIN GROUP (ORDER BY time_to_first_play_ms)/1000.0,1)::float AS p90_s
           FROM analytics_sessions WHERE clicked_play AND time_to_first_play_ms IS NOT NULL AND created_at >= now() - ${iv}`),
      run(`WITH firsts AS (SELECT visitor_id, MIN(created_at::date) AS first_day FROM analytics_sessions WHERE visitor_id IS NOT NULL GROUP BY visitor_id),
            activity AS (SELECT DISTINCT visitor_id, created_at::date AS day FROM analytics_sessions)
            SELECT f.first_day::text AS joined, COUNT(DISTINCT f.visitor_id)::int AS new_players,
              ROUND(100.0*COUNT(DISTINCT a1.visitor_id)/NULLIF(COUNT(DISTINCT f.visitor_id),0),1)::float AS d1_pct,
              ROUND(100.0*COUNT(DISTINCT a7.visitor_id)/NULLIF(COUNT(DISTINCT f.visitor_id),0),1)::float AS d7_pct
            FROM firsts f
            LEFT JOIN activity a1 ON a1.visitor_id=f.visitor_id AND a1.day=f.first_day+1
            LEFT JOIN activity a7 ON a7.visitor_id=f.visitor_id AND a7.day=f.first_day+7
            WHERE f.first_day >= now()::date - ${d} GROUP BY 1 ORDER BY 1 DESC`),
      run(`SELECT created_at::date::text AS joined, COUNT(*)::int AS new_players,
            ROUND(100.0*COUNT(*) FILTER (WHERE clicked_play)/NULLIF(COUNT(*),0),1)::float AS pct_clicked,
            ROUND(100.0*COUNT(*) FILTER (WHERE reached_1min)/NULLIF(COUNT(*) FILTER (WHERE clicked_play),0),1)::float AS conv_1min_pct
           FROM analytics_sessions WHERE is_first_visit=true AND created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1 DESC`),
      run(`WITH new_visitors AS (SELECT visitor_id FROM analytics_sessions WHERE visitor_id IS NOT NULL GROUP BY visitor_id HAVING MIN(created_at::date) >= now()::date - ${d}),
            per AS (SELECT s.visitor_id, COUNT(*) AS sessions, SUM(s.total_playtime_ms)/60000.0 AS total_min, bool_or(s.reached_1min) AS ever_1min, COUNT(DISTINCT s.created_at::date)>1 AS returned FROM analytics_sessions s JOIN new_visitors nv ON nv.visitor_id=s.visitor_id GROUP BY s.visitor_id)
            SELECT COUNT(*)::int AS new_players, ROUND(AVG(sessions),2)::float AS avg_sessions, ROUND(AVG(total_min),2)::float AS avg_total_min,
              ROUND(100.0*AVG((ever_1min)::int),1)::float AS pct_ever_1min, ROUND(100.0*AVG((returned)::int),1)::float AS pct_returned FROM per`),
      run(`SELECT (SELECT ROUND(AVG(total_playtime_ms)/60000.0,2)::float FROM analytics_sessions WHERE play_count>0 AND created_at >= now() - ${iv}) AS per_session_avg_min,
            (SELECT ROUND(AVG(v.min),2)::float FROM (SELECT visitor_id, SUM(total_playtime_ms)/60000.0 AS min FROM analytics_sessions WHERE play_count>0 AND created_at >= now() - ${iv} AND visitor_id IS NOT NULL GROUP BY visitor_id) v) AS per_visitor_avg_min`),
      run(`WITH per AS (SELECT visitor_id, SUM(total_playtime_ms) AS ms FROM analytics_sessions WHERE created_at >= now() - ${iv} AND visitor_id IS NOT NULL GROUP BY visitor_id),
            ranked AS (SELECT ms, ntile(100) OVER (ORDER BY ms DESC) AS pct FROM per)
            SELECT ROUND(100.0*SUM(ms) FILTER (WHERE pct=1)/NULLIF(SUM(ms),0),1)::float AS top_1pct_share,
              ROUND(100.0*SUM(ms) FILTER (WHERE pct<=10)/NULLIF(SUM(ms),0),1)::float AS top_10pct_share FROM ranked`),
      run(`SELECT COALESCE(ab_variants->>'death_preroll','(none)') AS variant, COUNT(*)::int AS sessions,
            ROUND(AVG(total_playtime_ms)/60000.0,2)::float AS avg_session_min, ROUND(AVG(play_count),2)::float AS avg_runs,
            ROUND(100.0*AVG((reached_1min)::int),1)::float AS pct_1min
           FROM analytics_sessions WHERE ab_variants->>'death_preroll' IS NOT NULL AND created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1`),
      run(`SELECT created_at::date::text AS day, ROUND(SUM(estimated_revenue_usd)::numeric,4)::float AS est_usd,
            COUNT(*) FILTER (WHERE event_type='display_impression')::int AS banner_impr,
            COUNT(*) FILTER (WHERE event_type='video_complete')::int AS video_views,
            COUNT(*) FILTER (WHERE event_type='rewarded_complete')::int AS rewarded_views
           FROM analytics_ad_events WHERE created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1`),
      run(`SELECT COALESCE(placement,'(none)') AS placement, COALESCE(ad_format,'(other)') AS format, COUNT(*)::int AS events,
            ROUND(SUM(estimated_revenue_usd)::numeric,4)::float AS est_usd
           FROM analytics_ad_events WHERE created_at >= now() - ${iv} GROUP BY 1,2 ORDER BY est_usd DESC NULLS LAST`),
      run(`SELECT created_at::date::text AS day,
            COUNT(*) FILTER (WHERE event_type='video_request' AND placement='reward_2x')::int AS started,
            COUNT(*) FILTER (WHERE event_type='rewarded_complete')::int AS watched,
            COUNT(*) FILTER (WHERE event_type='rewarded_claimed')::int AS claimed
           FROM analytics_ad_events WHERE created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1 DESC`),
      run(`SELECT created_at::date::text AS day, COUNT(*) FILTER (WHERE adblock IS NOT NULL)::int AS measured,
            ROUND(100.0*AVG((adblock)::int) FILTER (WHERE adblock IS NOT NULL),1)::float AS adblock_pct
           FROM analytics_sessions WHERE created_at >= now() - ${iv} GROUP BY 1 ORDER BY 1 DESC`),
      run(`SELECT COALESCE(country,'??') AS country, COUNT(*)::int AS sessions, ROUND(AVG(total_playtime_ms)/60000.0,2)::float AS avg_min
           FROM analytics_sessions WHERE created_at >= now() - ${iv} GROUP BY 1 ORDER BY sessions DESC LIMIT 20`),
      run(`SELECT COALESCE(device_type,'unknown') AS device, COUNT(*)::int AS sessions,
            ROUND(100.0*COUNT(*) FILTER (WHERE reached_1min)/NULLIF(COUNT(*) FILTER (WHERE clicked_play),0),1)::float AS conversion_pct,
            ROUND(AVG(total_playtime_ms)/60000.0,2)::float AS avg_min
           FROM analytics_sessions WHERE created_at >= now() - ${iv} GROUP BY 1 ORDER BY sessions DESC`),
    ]);

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
      adDaily,
      adByPlacement,
      rewardedFunnel,
      adblockDaily,
      topCountries,
      deviceSplit,
    };
  }
}
