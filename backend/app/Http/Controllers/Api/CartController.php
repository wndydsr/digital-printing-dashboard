<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class CartController extends Controller
{
    // 1. Mengambil isi keranjang milik customer tertentu
    public function index($customer_id)
    {
        $cart = Cart::firstOrCreate(['customer_id' => $customer_id]);

        // Muat relasi item dan data produknya
        $cart->load('items.product');

        return response()->json([
            'status' => 'success',
            'data' => $cart
        ]);
    }

    // 2. Menambahkan barang ke dalam keranjang (+ Proses Upload File Desain)
    public function store(Request $request)
    {
        // Jalankan validasi data termasuk berkas biner
        $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'panjang' => 'nullable|numeric',
            'lebar' => 'nullable|numeric',
            'need_design' => 'nullable', // flag 1 atau 0
            'tahapan_order' => 'nullable|string', // 'siap cetak' atau 'antrean desain'
            'catatan' => 'nullable|string',
            
            // Aturan validasi file (Maksimal 50MB per file)
            'design_file' => 'nullable|file|mimes:pdf,ai,cdr,psd,jpg,jpeg,png,zip,rar|max:51200',
            'reference_files' => 'nullable|array',
            'reference_files.*' => 'file|mimes:pdf,ai,cdr,psd,jpg,jpeg,png,zip,rar|max:51200'
        ]);

        // Cari atau buat keranjang induk untuk customer ini
        $cart = Cart::firstOrCreate(['customer_id' => $request->customer_id]);

        $designFile = null;
        $referenceFiles = [];

        // Evaluasi boolean dari parameter 'need_design'
        $needDesignField = filter_var($request->need_design ?? false, FILTER_VALIDATE_BOOLEAN);

        // --- PROSES UPLOAD FILE ---
        // Opsi A: Jika user sudah punya desain (Metode: Siap Cetak)
        if (!$needDesignField && $request->hasFile('design_file')) {
            $designFile = $request->file('design_file')->store('designs', 'public');
        }

        // Opsi B: Jika user butuh jasa desainer (Metode: Butuh Desain)
        if ($needDesignField && $request->hasFile('reference_files')) {
            foreach ($request->file('reference_files') as $file) {
                $referenceFiles[] = $file->store('references', 'public');
            }
        }

        // Ambil payload selected_options
        // Jika dari FormData dikirim string JSON, decode dulu atau langsung simpan sesuai cast model
        $selectedOptions = $request->selected_options;
        if (is_string($selectedOptions)) {
            $selectedOptions = json_decode($selectedOptions, true);
        }

        // Tambahkan baris custom item baru ke keranjang anak (cart_items)
        $cartItem = CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $request->product_id,
            'quantity' => $request->quantity,
            'panjang' => $request->panjang ?? 0,
            'lebar' => $request->lebar ?? 0,
            'catatan' => $request->catatan ?? '',
            'need_design' => $needDesignField,
            'tahapan_order' => $needDesignField ? 'antrean desain' : 'siap cetak',
            'design_file' => $designFile,
            'reference_files' => !empty($referenceFiles) ? json_encode($referenceFiles) : null,
            'selected_options' => $selectedOptions,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Produk berhasil ditambahkan ke keranjang',
            'data' => $cartItem
        ], 201);
    }

    // 3. Mengupdate Quantity item di keranjang
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
    public function destroy(Request $request, $product_id)
    {
        $user = $request->user(); 

        if (!$user) {
            return response()->json(['message' => 'Unauthorized: User tidak ditemukan'], 401);
        }

        $cart = Cart::where('customer_id', $user->id)->first();

        if (!$cart) {
            return response()->json(['message' => 'Keranjang tidak ditemukan untuk user ini'], 404);
        }

        $deleted = CartItem::where('cart_id', $cart->id)
                            ->where('product_id', $product_id)
                            ->delete();

        if (!$deleted) {
            return response()->json(['message' => 'Item tidak ditemukan di keranjang'], 404);
        }

        return response()->json(['message' => 'Produk dihapus dari keranjang']);
    }

    // 5. Mengosongkan keranjang
    public function clear($customer_id)
    {
        $cart = Cart::where('customer_id', $customer_id)->first();

        if ($cart) {
            $cart->items()->delete();
        }

        return response()->json(['message' => 'Keranjang telah dikosongkan']);
    }
}