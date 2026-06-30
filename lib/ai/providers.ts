export type AiAuditProvider = "openai" | "anthropic";

export const AI_AUDIT_PROVIDERS: Record<
  AiAuditProvider,
  {
    label: string;
    model: string;
    estimatedInputCostCentsPer1k: number;
    estimatedOutputCostCentsPer1k: number;
  }
> = {
  openai: {
    label: "OpenAI",
    model: "openai/gpt-5.4",
    estimatedInputCostCentsPer1k: 1,
    estimatedOutputCostCentsPer1k: 4,
  },
  anthropic: {
    label: "Claude / Anthropic",
    model: "anthropic/claude-sonnet-4.6",
    estimatedInputCostCentsPer1k: 2,
    estimatedOutputCostCentsPer1k: 8,
  },
};

export function isAiAuditProvider(value: unknown): value is AiAuditProvider {
  return value === "openai" || value === "anthropic";
}

export function getAiAuditProvider(provider: AiAuditProvider) {
  return AI_AUDIT_PROVIDERS[provider];
}
