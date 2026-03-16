/**
 * Relay API HTTP client
 *
 * Wraps fetch for calling the Relay REST API.
 * Provides single-page `get()` and auto-paginating `getAll()`.
 */

export type QueryParams = Record<string, string | number | undefined>;

export class RelayApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: string,
  ) {
    super(`Relay API error ${status}: ${body}`);
    this.name = "RelayApiError";
  }
}

export interface RelayClientConfig {
  apiUrl: string;
  apiKey: string;
}

export class RelayClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(config: RelayClientConfig) {
    this.baseUrl = config.apiUrl.replace(/\/$/, "");
    this.apiKey  = config.apiKey;
  }

  /** Single request. Returns the parsed JSON body. */
  async get<T>(path: string, params: QueryParams = {}): Promise<T> {
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
      },
    });

    const text = await res.text();
    if (!res.ok) throw new RelayApiError(res.status, text);

    return JSON.parse(text) as T;
  }

  /**
   * Auto-paginating list fetch.
   *
   * Iterates through all pages and returns a single merged array.
   * Stops when the response has fewer items than `per_page`, or when
   * `meta.current_page >= meta.total_pages`, or after `maxPages` pages
   * (safety cap, default 20 → up to 5 000 records at 250/page).
   *
   * Pass `perPage` to control page size (default 250, API max).
   * Callers can override with a smaller `per_page` to limit results.
   */
  async getAll<T>(
    path: string,
    params: QueryParams = {},
    options: { perPage?: number; maxPages?: number } = {},
  ): Promise<{ data: T[]; meta: { total_pages: number; total_count: number } }> {
    const perPage  = options.perPage  ?? 250;
    const maxPages = options.maxPages ?? 20;

    let page    = 1;
    let allData: T[] = [];
    let lastMeta: { current_page: number; total_pages: number; total_count: number } | undefined;

    while (page <= maxPages) {
      const response = await this.get<{
        data: T[];
        meta?: { current_page?: number; total_pages?: number; total_count?: number };
      }>(path, { ...params, page, per_page: perPage });

      // Support both envelope `{ data, meta }` and bare arrays
      const items: T[] = Array.isArray(response)
        ? (response as unknown as T[])
        : (response.data ?? []);

      allData = allData.concat(items);

      const meta = Array.isArray(response) ? undefined : response.meta;
      if (meta) {
        lastMeta = {
          current_page: meta.current_page ?? page,
          total_pages:  meta.total_pages  ?? page,
          total_count:  meta.total_count  ?? allData.length,
        };
      }

      // Stop if we've fetched all pages or got a partial page
      const totalPages = lastMeta?.total_pages ?? 1;
      if (page >= totalPages || items.length < perPage) break;

      page++;
    }

    return {
      data: allData,
      meta: lastMeta ?? { total_pages: page, total_count: allData.length },
    };
  }
}
