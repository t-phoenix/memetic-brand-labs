import { randomUUID } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';
import { GraphicRenderer } from './GraphicRenderer.js';

export class ShareService {
  private readonly graphics: GraphicRenderer;

  constructor(
    private readonly db: SupabaseClient,
    env: Env,
  ) {
    this.graphics = new GraphicRenderer(env);
  }

  async createForRun(runId: string, title: string, description: string) {
    const shareId = randomUUID();
    const { data: cards } = await this.db
      .from('run_outputs')
      .select('card_key, card_label, content, card_meta')
      .eq('run_id', runId);

    if (!cards?.length) {
      throw new Error('Cannot create share asset before run_outputs exist');
    }

    // Idempotent: replace any prior share row for this run.
    await this.db.from('share_assets').delete().eq('run_id', runId);

    try {
      const png = await this.graphics.render(cards, title);
      const ogPath = `share-graphics/${shareId}-og.png`;
      await this.graphics.upload(ogPath, png);

      await this.db.from('share_assets').insert({
        run_id: runId,
        share_id: shareId,
        is_public: true,
        og_title: title.slice(0, 120),
        og_description: description.slice(0, 200),
        og_image_path: ogPath,
        graphic_path_square: ogPath,
        graphic_generated_at: new Date().toISOString(),
      });
    } catch (err) {
      // Still persist a public share row without graphic so results URLs work.
      const message = err instanceof Error ? err.message : 'graphic render/upload failed';
      console.error(`[share] graphic failed for run ${runId}, inserting share without image:`, message);
      await this.db.from('share_assets').delete().eq('run_id', runId);
      await this.db.from('share_assets').insert({
        run_id: runId,
        share_id: shareId,
        is_public: true,
        og_title: title.slice(0, 120),
        og_description: description.slice(0, 200),
        og_image_path: null,
        graphic_path_square: null,
        graphic_generated_at: null,
      });
      // Re-throw so finalize can record share_error while still completing the run.
      throw Object.assign(new Error(message), { shareId, graphicFailed: true });
    }

    return shareId;
  }

  async getPublic(shareId: string) {
    const { data } = await this.db.from('v_public_share').select('*').eq('share_id', shareId).maybeSingle();
    return data;
  }

  async trackEvent(shareId: string, eventType: string, referrer?: string, userAgent?: string) {
    await this.db.from('share_analytics_events').insert({
      share_id: shareId,
      event_type: eventType,
      referrer,
      user_agent: userAgent,
    });
  }
}
