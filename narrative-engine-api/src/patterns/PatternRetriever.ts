import type { SupabaseClient } from '@supabase/supabase-js';

export interface PatternEntry {
  id: string;
  slug: string;
  title: string;
  body: Record<string, unknown>;
  pattern_type: string;
}

export class PatternRetriever {
  constructor(private readonly db: SupabaseClient) {}

  async retrieve(params: {
    market?: string;
    category?: string;
    messaging_problem?: string;
    limit?: number;
  }): Promise<PatternEntry[]> {
    let query = this.db.from('pattern_entries').select('id, slug, title, body, pattern_type').eq('is_active', true);

    if (params.market) {
      query = query.contains('markets', [params.market]);
    }
    if (params.category) {
      query = query.contains('categories', [params.category]);
    }
    if (params.messaging_problem) {
      query = query.contains('tags', [params.messaging_problem]);
    }

    const { data } = await query.limit(params.limit ?? 8);
    return (data ?? []) as PatternEntry[];
  }

  formatForPrompt(patterns: PatternEntry[]): string {
    if (!patterns.length) return 'No specific patterns matched.';
    return patterns
      .map((p, i) => `${i + 1}. [${p.pattern_type}] ${p.title}: ${JSON.stringify(p.body)}`)
      .join('\n');
  }
}
