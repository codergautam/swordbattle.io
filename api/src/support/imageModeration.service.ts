import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { config } from '../config';

export type ModerationVerdict = { blocked: boolean; reason: string };

const cats = ['c2V4dWFs', 'c2V4dWFsL21pbm9ycw=='].map((s) => Buffer.from(s, 'base64').toString('utf8'));

@Injectable()
export class ImageModerationService {
  private readonly log = new Logger('ImageModeration');
  private client: OpenAI | null = null;

  private getClient(): OpenAI | null {
    if (!config.openaiApiKey) return null;
    if (!this.client) {
      this.client = new OpenAI({ apiKey: config.openaiApiKey, timeout: 8000, maxRetries: 1 });
    }
    return this.client;
  }

  async check(images: string[]): Promise<ModerationVerdict> {
    const client = this.getClient();
    if (!client || !images || !images.length) return { blocked: false, reason: '' };

    try {
      const res = await client.moderations.create({
        model: 'omni-moderation-latest',
        input: images.map((url) => ({ type: 'image_url' as const, image_url: { url } })),
      });

      for (const r of res.results || []) {
        const scores = (r.category_scores as unknown as Record<string, number>) || {};
        const severe = scores[cats[1]] ?? 0;
        const restricted = scores[cats[0]] ?? 0;
        if (severe >= config.mod.severeThreshold) return { blocked: true, reason: `c2=${severe.toFixed(2)}` };
        if (restricted >= config.mod.restrictedThreshold) return { blocked: true, reason: `c1=${restricted.toFixed(2)}` };
      }
      return { blocked: false, reason: '' };
    } catch (e: any) {
      this.log.warn(`moderation call failed, allowing image through: ${e?.message || e}`);
      return { blocked: false, reason: '' };
    }
  }
}
