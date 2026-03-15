/**
 * Relay API HTTP client
 *
 * Thin wrapper around fetch for calling the Relay REST API.
 * All tools share this client instance.
 */

export interface RelayClientConfig {
  apiUrl: string;
  apiKey: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta?: {
    current_page?: number;
    total_pages?: number;
    total_count?: number;
  };
}

export class RelayApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Relay API error ${status}: ${body}`);
    this.name = "RelayApiError";
  }
}

export class RelayClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: RelayClientConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, "");
    this.apiKey  = config.apiKey;
  }

  async get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });

    const text = await res.text();

    if (!res.ok) {
      throw new RelayApiError(res.status, text);
    }

    return JSON.parse(text) as T;
  }
}
