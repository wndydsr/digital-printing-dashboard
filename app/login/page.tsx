"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/login", {
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

      localStorage.setItem("token", data.token);

      window.location.href = "/admin";

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
          <label className="text-sm">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* Password */}
        <div className="mb-2">
          <label className="text-sm">Password</label>
          <input
            type="password"
            placeholder="Enter password"
            className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {/* Remember + Forgot */}
        <div className="flex justify-between items-center text-sm mb-5">
          <label className="flex items-center gap-2">
            <input type="checkbox" />
            Remember me
          </label>
          <a href="#" className="text-blue-600">Forgot password?</a>
        </div>

        {/* Button */}
        <button
          onClick={handleLogin}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition"
        >
          Sign in
        </button>

        {/* Google */}
        <button className="w-full mt-3 border py-2 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50">
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            className="w-5 h-5"
          />
          Sign in with Google
        </button>

        <p className="text-center text-sm mt-4 text-gray-500">
          Don’t have an account?{" "}
          <a href="#" className="text-blue-600">Sign up</a>
        </p>
      </div>
    </div>
  );
}