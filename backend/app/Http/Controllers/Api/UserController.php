<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index()
    {
        // Ambil semua user kecuali admin.
        // Kita TIDAK membatasi get() agar kolom role dan created_at ikut terbawa.
        $karyawan = User::where('role', '!=', 'admin')->get();
        
        return response()->json([
            'status' => 'success',
            'data' => $karyawan
        ]);
    }

    public function store(Request $request)
    {
        // 1. Validasi input dari React
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|in:operator,desainer', // Pastikan role sesuai
        ]);

        // 2. Simpan ke database
        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password), // 🔥 Password dienkripsi dengan Hash::make()
            'role' => $request->role,
        ]);

        // 3. Berikan response sukses ke React
        return response()->json([
            'status' => 'success',
            'message' => 'Karyawan berhasil ditambahkan',
            'data' => $user
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Karyawan tidak ditemukan'], 404);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            // Email unique mengabaikan ID user yang sedang diupdate
            'email' => 'required|string|email|max:255|unique:users,email,' . $id,
            'role' => 'required|in:operator,desainer',
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
        ]);

        return response()->json(['message' => 'Data karyawan berhasil diupdate']);
    }

    public function destroy($id)
    {
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'Data tidak ditemukan'], 404);
        }

        if ($user->role === 'admin') {
            return response()->json(['message' => 'Admin tidak dapat dihapus'], 403);
        }

        $user->delete();

        return response()->json(['message' => 'Karyawan berhasil dihapus']);
    }
}