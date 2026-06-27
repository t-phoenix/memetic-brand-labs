export class VariableResolver {
  resolve(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
  }

  buildInputVars(input: {
    building: string;
    audience: string;
    challenge: string;
    differentiation: string;
    website?: string;
  }): Record<string, string> {
    return {
      product_description: input.building,
      target_user: input.audience,
      problem: input.challenge,
      differentiation: input.differentiation,
      website_url: input.website ?? '',
      building: input.building,
      audience: input.audience,
      challenge: input.challenge,
    };
  }

  layerOutputToVars(output: Record<string, unknown>): Record<string, string> {
    return {
      structured_output: JSON.stringify(output, null, 2),
      patterns: '',
    };
  }
}
