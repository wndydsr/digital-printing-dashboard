"use client";

import { useState, useEffect } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  // Efek untuk mengecek apakah data "Remember Me" tersimpan di browser
  useEffect(() => {
    const savedEmail = localStorage.getItem("remember_email");
    const savedPassword = localStorage.getItem("remember_password");
    const savedCheck = localStorage.getItem("remember_check");

    if (savedCheck === "true" && savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message);
        return;
      }

      // Logika Penanganan "Remember Me" setelah login sukses
      if (rememberMe) {
        localStorage.setItem("remember_email", email);
        localStorage.setItem("remember_password", password); // Simpan lokal untuk kemudahan pengisian form otomatis
        localStorage.setItem("remember_check", "true");
      } else {
        localStorage.removeItem("remember_email");
        localStorage.removeItem("remember_password");
        localStorage.removeItem("remember_check");
      }

      // Menyimpan data sesi autentikasi pengguna
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.user.role);
      localStorage.setItem("user_name", data.user.name); // Disimpan agar sinkron dengan ProfilePage & DashboardLayout
      localStorage.setItem("user_email", data.user.email);

      if (data.user.role === "admin") {
        window.location.href = "/admin";
      } else if (data.user.role === "desainer") {
        window.location.href = "/desainer";
      } else if (data.user.role === "operator") {
        window.location.href = "/operator";
      } else if (data.user.role === "kurir") {
        window.location.href = "/kurir";
      }

    } catch (error) {
      console.error(error);
      alert("Terjadi error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-blue-400 to-indigo-500">
      <div className="bg-white w-[380px] rounded-2xl shadow-xl p-8">
        <h2 className="text-center text-xl font-semibold">Welcome Back!</h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          Login ke sistem digital printing kamu
        </p>

        {/* Email */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-800"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">Password</label>
          <input
            type="password"
            placeholder="Enter password"
            className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-800"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Remember Me Only */}
        <div className="flex items-center text-sm mb-6">
          <label className="flex items-center gap-2 cursor-pointer text-gray-600 select-none">
            <input 
              type="checkbox" 
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-400"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>
        </div>

        {/* Button Sign In */}
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg transition font-medium text-sm shadow-sm"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}