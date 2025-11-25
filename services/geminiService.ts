import { GoogleGenAI } from "@google/genai";
import { VerificationResult, VerificationStatus, ProviderProtocol } from "../types";

// Helper to mask keys for display
export const maskKey = (key: string): string => {
  if (key.length <= 8) return '****';
  return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
};

export const verifyApiKey = async (
  key: string, 
  modelId: string, 
  id: string,
  baseUrl: string,
  protocol: ProviderProtocol
): Promise<VerificationResult> => {
  const startTime = performance.now();
  
  try {
    // Protocol: Google GenAI
    if (protocol === ProviderProtocol.GOOGLE) {
      // If a custom Base URL is provided, we use raw fetch to ensure compatibility with Relays
      // that might not perfectly mimic the official SDK's discovery mechanisms.
      if (baseUrl && baseUrl.trim()) {
        const cleanBase = baseUrl.replace(/\/+$/, '');
        // Heuristic: if URL doesn't end in version, assume standard v1beta structure unless specific
        let urlBase = cleanBase;
        if (!urlBase.includes('/v1') && !urlBase.includes('/v1beta')) {
             urlBase = `${cleanBase}/v1beta`;
        }

        const url = `${urlBase}/models/${modelId}:generateContent?key=${key}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "ping" }] }],
            generationConfig: { maxOutputTokens: 1 }
          })
        });

        if (!response.ok) {
          const errText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errText.slice(0, 100)}`);
        }
        await response.json();

      } else {
        // Official SDK usage for standard Google Endpoints
        const ai = new GoogleGenAI({ apiKey: key });
        await ai.models.generateContent({
          model: modelId,
          contents: "ping",
          config: {
            maxOutputTokens: 1, 
          }
        });
      }
    } 
    // Protocol: OpenAI Compatible
    else if (protocol === ProviderProtocol.OPENAI) {
      const cleanBase = baseUrl.replace(/\/+$/, '') || 'https://api.openai.com/v1';
      const url = `${cleanBase}/chat/completions`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1
        })
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errText.slice(0, 100)}`);
      }
      await response.json();
    }

    const endTime = performance.now();
    
    return {
      id,
      keyFull: key,
      keyMasked: maskKey(key),
      status: VerificationStatus.VALID,
      latency: Math.round(endTime - startTime),
      model: modelId,
      timestamp: Date.now(),
    };

  } catch (error: any) {
    const endTime = performance.now();
    let errorMessage = "Unknown error";
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    return {
      id,
      keyFull: key,
      keyMasked: maskKey(key),
      status: VerificationStatus.INVALID,
      latency: Math.round(endTime - startTime),
      model: modelId,
      error: errorMessage,
      timestamp: Date.now(),
    };
  }
};