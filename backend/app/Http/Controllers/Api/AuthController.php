<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
public function login(Request $request)
{
    $user = User::where('email', $request->email)->first();

    if (!$user || !Hash::check($request->password, $user->password)) {
        return response()->json([
            'message' => 'Email atau password salah'
        ], 401);
    }

    $token = $user->createToken('auth_token')->plainTextToken;

    return response()->json([
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
    $customer = Customer::where(
        'email',
        $request->email
    )->first();

    if (
        !$customer ||
        !Hash::check(
            $request->password,
            $customer->password
        )
    ) {
        return response()->json([
            'message' => 'Email atau password salah'
        ], 401);
    }

    $token = $customer
        ->createToken('customer_token')
        ->plainTextToken;

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

}