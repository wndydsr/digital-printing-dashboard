const BASE_URL = "http://127.0.0.1:8000/api"

export async function apiFetch(endpoint: string, options: any = {}) {
  const token = localStorage.getItem("token")

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  console.log("TOKEN DIKIRIM:", token)

  if (!res.ok) {
    throw new Error("API error")
  }

  return res.json()
}