<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    /**
     * Mengambil semua daftar kategori
     */
    public function index()
    {
        $categories = Category::all();
        return response()->json($categories, 200);
    }

    /**
     * Menyimpan kategori baru dari modal Next.js
     */
    public function store(Request $request)
    {
        // Validasi input data dari frontend
        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|max:255'
        ]);

        // Buat data kategori baru
        $category = Category::create([
            'name' => $request->name,
            'slug' => $request->slug ?? Str::slug($request->name),
        ]);

        // Kembalikan data kategori yang baru dibuat dalam bentuk JSON
        return response()->json($category, 201);
    }
}