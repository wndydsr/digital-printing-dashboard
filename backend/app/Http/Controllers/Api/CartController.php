<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Http\Request;

class CartController extends Controller
{
    // 1. Mengambil isi keranjang milik customer tertentu
    public function index($customer_id)
    {
        // Cari keranjang berdasarkan customer_id, jika belum ada otomatis dibuatkan (firstOrCreate)
        $cart = Cart::firstOrCreate(['customer_id' => $customer_id]);

        // Ambil item-item di dalamnya beserta data detail produknya
        // Pastikan relasi 'product' ada di model CartItem Anda
        $cart->load('items.product');

        return response()->json([
            'status' => 'success',
            'data' => $cart
        ]);
    }

    // 2. Menambahkan barang ke dalam keranjang
    public function store(Request $request)
    {
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            // Validasi opsional
            'panjang' => 'nullable|numeric',
            'lebar' => 'nullable|numeric',
            'selected_options' => 'nullable|array'
        ]);

        // Cari atau buat keranjang untuk customer ini
        $cart = Cart::firstOrCreate(['customer_id' => $request->customer_id]);

        /* * Opsional: Anda bisa membuat logika untuk mengecek apakah produk dengan ukuran 
         * dan atribut yang SAMA PERSIS sudah ada di keranjang. Jika ada, tinggal update quantity.
         * Namun untuk percetakan digital (karena banyak custom), lebih aman membuat baris baru 
         * untuk setiap kali klik "Add to Cart". 
         */

        // Tambahkan item baru ke keranjang
        $cartItem = CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $request->product_id,
            'quantity' => $request->quantity,
            'panjang' => $request->panjang ?? 0,
            'lebar' => $request->lebar ?? 0,
            'catatan' => $request->catatan ?? '',
            'selected_options' => $request->selected_options ?? null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Produk berhasil ditambahkan ke keranjang',
            'data' => $cartItem
        ], 201);
    }

    // 3. Mengupdate Quantity item di keranjang (Opsional, jika ada tombol + / - di halaman Cart)
    public function update(Request $request, $id)
    {
        $item = CartItem::find($id);

        if (!$item) {
            return response()->json(['message' => 'Item tidak ditemukan'], 404);
        }

        $request->validate(['quantity' => 'required|integer|min:1']);
        
        $item->update(['quantity' => $request->quantity]);

        return response()->json(['message' => 'Quantity berhasil diupdate']);
    }

    // 4. Menghapus satu barang dari keranjang
    public function destroy($id)
    {
        $item = CartItem::find($id);

        if (!$item) {
            return response()->json(['message' => 'Item tidak ditemukan'], 404);
        }

        $item->delete();

        return response()->json(['message' => 'Produk dihapus dari keranjang']);
    }

    // 5. Mengosongkan keranjang (Dipanggil setelah proses Checkout berhasil)
    public function clear($customer_id)
    {
        $cart = Cart::where('customer_id', $customer_id)->first();

        if ($cart) {
            // Menghapus semua isi item di dalamnya
            $cart->items()->delete();
        }

        return response()->json(['message' => 'Keranjang telah dikosongkan']);
    }
}