<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use App\Mail\SendOtpMail;
use Carbon\Carbon;

class AuthController extends Controller
{
    // 1. Modifikasi fungsi login utama (Mengirim OTP, belum mengeluarkan token)
    public function login(Request $request)
    {
        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Email atau password salah'
            ], 401);
        }

        // Generate 6 digit angka OTP acak
        $otp = rand(100000, 999999);
        
        // Simpan ke database & set masa aktif 5 menit ke depan
        $user->otp_code = $otp;
        $user->otp_expires_at = Carbon::now()->addMinutes(5);
        $user->save();

        // Kirim email OTP
        Mail::to($user->email)->send(new SendOtpMail($otp));

        return response()->json([
            'mfa_required' => true,
            'message' => 'Kode OTP telah dikirim ke email Anda.'
        ]);
    }

    // 2. Buat fungsi baru untuk verifikasi OTP (Token diterbitkan di sini)
    public function verifyMfa(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp_code' => 'required|string|size:6'
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || $user->otp_code !== $request->otp_code) {
            return response()->json([
                'message' => 'Kode OTP salah.'
            ], 400);
        }

        if (Carbon::now()->isAfter($user->otp_expires_at)) {
            return response()->json([
                'message' => 'Kode OTP sudah kedaluwarsa.'
            ], 400);
        }

        // Jika valid, hapus data OTP sementara & buat token Sanctum
        $user->otp_code = null;
        $user->otp_expires_at = null;
        $user->save();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'user' => $user,
            'token' => $token
        ]);
    }

    public function registerCustomer(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'phone' => 'required|unique:customers',
            'email' => 'required|email|unique:customers',
            'password' => 'required|min:6',
            'address' => 'nullable'
        ]);

        $customer = Customer::create([
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
            'password' => Hash::make($request->password),
        ]);

        $token = $customer->createToken('customer_token')->plainTextToken;

        return response()->json([
            'message' => 'Register berhasil',
            'customer' => $customer,
            'token' => $token
        ]);
    }

    public function loginCustomer(Request $request)
    {
        $customer = Customer::where('email', $request->email)->first();

        if (!$customer || !Hash::check($request->password, $customer->password)) {
            return response()->json([
                'message' => 'Email atau password salah'
            ], 401);
        }

        // Generate 6 digit OTP
        $otp = rand(100000, 999999);
        $customer->otp_code = $otp;
        $customer->otp_expires_at = Carbon::now()->addMinutes(5);
        $customer->save();

        // Kirim email OTP
        Mail::to($customer->email)->send(new SendOtpMail($otp));

        return response()->json([
            'mfa_required' => true,
            'message' => 'Kode OTP telah dikirim ke email Anda.'
        ]);
    }

    public function verifyCustomerMfa(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'otp_code' => 'required|string|size:6'
        ]);

        $customer = Customer::where('email', $request->email)->first();

        if (!$customer || $customer->otp_code !== $request->otp_code) {
            return response()->json([
                'message' => 'Kode OTP salah.'
            ], 400);
        }

        if (Carbon::now()->isAfter($customer->otp_expires_at)) {
            return response()->json([
                'message' => 'Kode OTP sudah kedaluwarsa.'
            ], 400);
        }

        $customer->otp_code = null;
        $customer->otp_expires_at = null;
        $customer->save();

        $token = $customer->createToken('customer_token')->plainTextToken;

        return response()->json([
            'message' => 'Login berhasil',
            'customer' => $customer,
            'token' => $token
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout berhasil'
        ]);
    }

    public function getDesigners(Request $request)
    {
        $designers = User::where('role', 'desainer')->get(['id', 'name', 'email']);

        return response()->json([
            'status' => 'success',
            'data' => $designers
        ]);
    }
}