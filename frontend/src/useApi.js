import { usePrivy } from "@privy-io/react-auth";

const API = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function useApi() {
  const { getAccessToken } = usePrivy();

  async function request(method, path, body) {
    const token = await getAccessToken();
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || res.statusText);
    }
    return res.json();
  }

  return {
    get:    (path)        => request("GET",   path),
    post:   (path, body)  => request("POST",  path, body),
    patch:  (path, body)  => request("PATCH", path, body),
  };
}