import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../config/env.js';

export interface LLMCompletionResult {
  provider: 'openai' | 'anthropic';
  model: string;
  content: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  requestId?: string;
}

export class LLMRouter {
  private openai: OpenAI | null;
  private anthropic: Anthropic | null;

  constructor(env: Env) {
    this.openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
    this.anthropic = env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) : null;
  }

  resolveModel(tier: string, layerKey: string, routing: Record<string, string>): string {
    return routing[layerKey] ?? routing.default ?? 'gpt-4o-mini';
  }

  async complete(model: string, system: string, user: string): Promise<LLMCompletionResult> {
    const start = Date.now();
    if (model.startsWith('claude')) {
      if (!this.anthropic) throw new Error('Anthropic API key not configured');
      const res = await this.anthropic.messages.create({
        model,
        max_tokens: 2048,
        system,
        messages: [{ role: 'user', content: user }],
      });
      const text = res.content.find((c) => c.type === 'text');
      const content = text && 'text' in text ? text.text : '{}';
      return {
        provider: 'anthropic',
        model,
        content: extractJson(content),
        promptTokens: res.usage.input_tokens,
        completionTokens: res.usage.output_tokens,
        latencyMs: Date.now() - start,
      };
    }

    if (!this.openai) throw new Error('OpenAI API key not configured');
    const res = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.4,
    });
    const content = res.choices[0]?.message?.content ?? '{}';
    return {
      provider: 'openai',
      model,
      content: extractJson(content),
      promptTokens: res.usage?.prompt_tokens ?? 0,
      completionTokens: res.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
      requestId: res.id,
    };
  }
}

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match ? match[0] : '{}';
}
