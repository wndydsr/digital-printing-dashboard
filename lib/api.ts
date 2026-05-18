const BASE_URL = "http://127.0.0.1:8000/api";

export async function apiFetch(
  endpoint: string,
  options: any = {}
) {
  const token = localStorage.getItem("token");

  console.log("TOKEN DIKIRIM:", token);

  const headers: any = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };

  // kalau bukan FormData baru pakai json
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // gabung custom headers
  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  console.log(
    "AUTH HEADER:",
    headers.Authorization
  );

  const res = await fetch(
    `${BASE_URL}${endpoint}`,
    {
      ...options,
      headers,
    }
  );

  if (!res.ok) {
    const errorText = await res.text();

    console.error(
      "API ERROR DETAIL:",
      errorText
    );

    throw new Error(errorText);
  }

  return res.json();
}