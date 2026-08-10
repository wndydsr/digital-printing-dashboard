"use client";

import { useState, useEffect, useRef } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State tambahan untuk alur MFA, Loading & reCAPTCHA
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // State untuk Captcha
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const recaptchaRef = useRef<ReCAPTCHA>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    // Validasi Captcha hanya pada tahap awal login (sebelum masuk tahap OTP)
    if (!isMfaStep && !captchaToken) {
      toast.error("Silakan selesaikan verifikasi CAPTCHA terlebih dahulu!");
      return;
    }

    setIsLoading(true);

    try {
      if (!isMfaStep) {
        // TAHAP 1: Kirim Email, Password, & captcha_token
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            captcha_token: captchaToken,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.message || "Gagal masuk, periksa kembali email dan password.");
          // Reset captcha jika gagal agar user bisa coba lagi
          recaptchaRef.current?.reset();
          setCaptchaToken(null);
          setIsLoading(false);
          return;
        }

        // Jika backend meminta MFA, alihkan tampilan ke form input OTP
        if (data.mfa_required) {
          setIsMfaStep(true);
          setCountdown(60);
          toast.success("Kode OTP telah dikirim ke email Anda.");
        }
      } else {
        // TAHAP 2: Verifikasi Kode OTP
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/verify-mfa`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            otp_code: otpCode,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.message || "Kode OTP salah atau kedaluwarsa.");
          setIsLoading(false);
          return;
        }

        if (rememberMe) {
          localStorage.setItem("remember_email", email);
          localStorage.setItem("remember_password", password); 
          localStorage.setItem("remember_check", "true");
        } else {
          localStorage.removeItem("remember_email");
          localStorage.removeItem("remember_password");
          localStorage.removeItem("remember_check");
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.user.role);
        localStorage.setItem("user_name", data.user.name); 
        localStorage.setItem("user_email", data.user.email);

        toast.success(`Selamat datang kembali, ${data.user.name}!`);

        setTimeout(() => {
          if (data.user.role === "admin") {
            window.location.href = "/admin";
          } else if (data.user.role === "desainer") {
            window.location.href = "/desainer";
          } else if (data.user.role === "operator") {
            window.location.href = "/operator";
          } else if (data.user.role === "kurir") {
            window.location.href = "/kurir";
          }
        }, 500);
      }

    } catch (error) {
      console.error(error);
      toast.error("Terjadi kesalahan pada sistem, silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || isLoading) return;
    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          captcha_token: "bypass_resend",
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Kode OTP baru telah dikirim ulang ke email Anda.");
        setCountdown(60);
      } else {
        toast.error(data.message || "Gagal mengirim ulang OTP.");
      }
    } catch (err) {
      toast.error("Terjadi kesalahan koneksi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 via-blue-400 to-indigo-500 py-10">
      <form onSubmit={handleLogin} className="bg-white w-[380px] rounded-2xl shadow-xl p-8">
        <h2 className="text-center text-xl font-semibold">
          {isMfaStep ? "Verifikasi Keamanan" : "Welcome Back!"}
        </h2>
        <p className="text-center text-sm text-gray-500 mb-6">
          {isMfaStep ? "Masukkan 6 digit kode OTP dari email" : "Login ke sistem digital printing kamu"}
        </p>

        {!isMfaStep ? (
          <>
            {/* Email */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full mt-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-800"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  className="w-full p-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm text-gray-800"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center text-sm mb-4">
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

            {/* Google reCAPTCHA Widget */}
            <div className="mb-4 flex justify-center scale-95 origin-center">
              <ReCAPTCHA
                ref={recaptchaRef}
                sitekey="6LdGO38tAAAAAJCX0YRlckd_pczbbZSdjbDci7pL"
                onChange={(token: string | null) => setCaptchaToken(token)}
              />
            </div>
          </>
        ) : (
          /* Input OTP */
          <div className="mb-6">
            <label className="text-sm font-bold text-gray-700 block mb-2 text-center">Kode OTP (6 Digit)</label>
            <input
              type="text"
              maxLength={6}
              placeholder="123456"
              className="w-full p-3 border rounded-lg text-center text-xl font-bold tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-800"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
            />

            {/* Tombol Resend OTP dengan Countdown */}
            <div className="text-center mt-3 text-sm">
              <span className="text-gray-500">Tidak menerima kode? </span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={countdown > 0 || isLoading}
                className={`font-medium ${countdown > 0 ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:underline"}`}
              >
                {countdown > 0 ? `Kirim ulang dalam ${countdown}s` : "Kirim Ulang OTP"}
              </button>
            </div>
          </div>
        )}

        {/* Button Submit dengan Indikator Loading */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full flex justify-center font-medium text-white py-2.5 rounded-lg transition text-sm shadow-sm ${
            isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isLoading 
            ? "Memproses..." 
            : isMfaStep 
            ? "Verifikasi OTP" 
            : "Sign in"}
        </button>
      </form>
    </div>
  );
}