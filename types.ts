
export enum VerificationStatus {
  IDLE = 'IDLE',
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID = 'INVALID',
}

export enum ProviderProtocol {
  GOOGLE = 'GOOGLE',
  OPENAI = 'OPENAI',
}

export interface VerificationResult {
  id: string;
  keyMasked: string;
  keyFull: string;
  status: VerificationStatus;
  latency: number;
  model: string;
  error?: string;
  timestamp: number;
}

export interface Stats {
  total: number;
  tested: number;
  valid: number;
  invalid: number;
  avgLatency: number;
}

export interface TestConfig {
  protocol: ProviderProtocol;
  baseUrl: string;
  model: string;
  apiKeysText: string;
}

export interface TestTarget {
  id: string;
  name: string;
  config: TestConfig;
  results: VerificationResult[];
  isProcessing: boolean;
  progress: number;
  lastRunTimestamp?: number;
}

export const MODEL_PRESETS = {
  "Google Gemini": [
    { label: "Gemini 2.0 Flash Exp", value: "gemini-2.0-flash-exp" },
    { label: "Gemini 1.5 Pro", value: "gemini-1.5-pro" },
    { label: "Gemini 1.5 Flash", value: "gemini-1.5-flash" },
    { label: "Gemini 1.5 Flash 8B", value: "gemini-1.5-flash-8b" },
    { label: "Gemini 2.5 Flash (Preview)", value: "gemini-2.5-flash" },
  ],
  "OpenAI": [
    { label: "GPT-4o", value: "gpt-4o" },
    { label: "GPT-4o Mini", value: "gpt-4o-mini" },
    { label: "o1 Preview", value: "o1-preview" },
    { label: "o1 Mini", value: "o1-mini" },
    { label: "GPT-4 Turbo", value: "gpt-4-turbo" },
    { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
  ],
  "Anthropic": [
    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet-latest" },
    { label: "Claude 3.5 Haiku", value: "claude-3-5-haiku-latest" },
    { label: "Claude 3 Opus", value: "claude-3-opus-latest" },
  ],
  "DeepSeek / Open Source": [
    { label: "DeepSeek Chat (V3)", value: "deepseek-chat" },
    { label: "DeepSeek Reasoner (R1)", value: "deepseek-reasoner" },
    { label: "Llama 3.1 70B", value: "llama-3.1-70b-instruct" },
    { label: "Llama 3.1 8B", value: "llama-3.1-8b-instruct" },
  ],
};

// Keep enum for backwards compatibility if needed, though simpler to use strings now
export enum ModelTarget {
  GEMINI_1_5_FLASH = 'gemini-1.5-flash',
  GPT_4O = 'gpt-4o',
}
