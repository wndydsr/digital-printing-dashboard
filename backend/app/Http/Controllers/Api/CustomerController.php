<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Customer;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query();

        if ($request->phone) {
            $query->where('phone', $request->phone);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required',
            'phone' => 'required|unique:customers,phone',
            'email' => 'nullable|email',
            'address' => 'nullable',
        ]);

        $customer = Customer::create([
            'name' => $request->name,
            'phone' => $request->phone,
            'email' => $request->email,
            'address' => $request->address,
        ]);

        return response()->json($customer);
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $request->validate([
            'name' => 'required',
            'phone' => 'required|unique:customers,phone,' . $id,
            'email' => 'nullable|email',
            'address' => 'nullable',
        ]);


    $customer->update([
        'name' => $request->name,
        'phone' => $request->phone,
        'email' => $request->email,
        'address' => $request->address,
    ]);

    return response()->json($customer);
}

public function findOrCreate(Request $request)
{
    $request->validate([
        'name' => 'required',
        'phone' => 'required',
        'email' => 'nullable|email',
        'address' => 'nullable',
    ]);

    // 🔍 cek berdasarkan phone
    $customer = Customer::where('phone', $request->phone)->first();

    if ($customer) {
        // ✅ kalau sudah ada → return existing
        return response()->json($customer);
    }

    // ❌ kalau belum → create baru
    $customer = Customer::create([
        'name' => $request->name,
        'phone' => $request->phone,
        'email' => $request->email,
        'address' => $request->address,
    ]);

    return response()->json($customer);
}

 public function destroy($id)
    {
        $customer = Customer::find($id);

        if (!$customer) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $customer->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function updateProfile(Request $request)
    {
        $customer = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
        ]);

        $customer->update([
            'name' => $request->name,
            'phone' => $request->phone,
            'address' => $request->address,
        ]);

        return response()->json([
            'message' => 'Profile berhasil diperbarui',
            'customer' => $customer->fresh()
        ]);
    }
}
