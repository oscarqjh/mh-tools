/** Base HTTP client with standardised error handling and response parsing. */

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly url: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class NetworkError extends Error {
  constructor(
    message: string,
    public readonly url: string,
  ) {
    super(message);
    this.name = "NetworkError";
  }
}

interface RequestOptions {
  params?: Record<string, string>;
  signal?: AbortSignal;
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30_000;

export async function httpGet<T>(
  baseUrl: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, signal, timeout = DEFAULT_TIMEOUT } = options;

  const url = new URL(path, baseUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine external signal with timeout signal
  const combinedSignal = signal
    ? AbortSignal.any([signal, controller.signal])
    : controller.signal;

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      signal: combinedSignal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        url.toString(),
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new NetworkError("Request timed out or was cancelled", url.toString());
    }
    throw new NetworkError(
      error instanceof Error ? error.message : "Unknown network error",
      url.toString(),
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
