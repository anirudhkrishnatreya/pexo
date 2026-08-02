import * as SecureStore from "expo-secure-store"

/**
 * Minimal typed API client with automatic bearer auth and one-shot refresh
 * on 401 (rotating refresh tokens — matches the backend contract).
 */
const DEFAULT_BASE_URL = "https://pexo-api-production.up.railway.app/api/v1"

export const config = {
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL,
}

const ACCESS_KEY = "pexo.accessToken"
const REFRESH_KEY = "pexo.refreshToken"

export async function saveTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_KEY, accessToken)
  await SecureStore.setItemAsync(REFRESH_KEY, refreshToken)
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_KEY)
  await SecureStore.deleteItemAsync(REFRESH_KEY)
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_KEY)
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY)
  if (!refreshToken) return false
  const res = await fetch(`${config.baseUrl}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) {
    await clearTokens()
    return false
  }
  const data = await res.json()
  await saveTokens(data.accessToken, data.refreshToken)
  return true
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; retry?: boolean } = {},
): Promise<T> {
  const { method = "GET", body, retry = true } = options
  const token = await getAccessToken()

  const res = await fetch(`${config.baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh()
    if (refreshed) return api<T>(path, { method, body, retry: false })
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(res.status, Array.isArray(err.message) ? err.message.join(", ") : err.message)
  }

  return res.json() as Promise<T>
}
