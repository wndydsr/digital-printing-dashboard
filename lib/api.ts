const BASE_URL = "http://127.0.0.1:8000/api"

export async function apiFetch(
  endpoint: string,
  options: any = {}
) {
  const token = localStorage.getItem("token")

  // 🔥 cek apakah FormData
  const isFormData =
    options.body instanceof FormData

  const res = await fetch(
    `${BASE_URL}${endpoint}`,
    {
      ...options,

      headers: {
        Accept: "application/json",

        Authorization: `Bearer ${token}`,

        // 🔥 jangan pakai JSON header kalau FormData
        ...(!isFormData && {
          "Content-Type": "application/json",
        }),

        ...(options.headers || {}),
      },
    }
  )

  console.log("TOKEN DIKIRIM:", token)

  if (!res.ok) {

    const errorText = await res.text()

    console.error(
      "API ERROR DETAIL:",
      errorText
    )

    throw new Error(errorText)
  }

  return res.json()
}