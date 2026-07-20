<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use App\Models\CartItem;
use Illuminate\Http\Request;

class CartController extends Controller
{


    public function index($customer_id)
    {
        $cart = Cart::where('customer_id', $customer_id)->first();
        
        if (!$cart) {
            return response()->json([], 200); // Harus kembalikan array kosong agar frontend tidak error
        }

        // Pastikan with('product') mengambil data relasi dengan benar
        $cartItems = CartItem::where('cart_id', $cart->id)
            ->with(['product.attributes.values']) 
            ->get();

        return response()->json($cartItems);
    }
        
   public function store(Request $request)
    {
        // 1. Validasi
        $request->validate([
            'customer_id' => 'required',
            'product_id' => 'required',
            'need_design' => 'required',
            'design_file' => 'nullable|file|mimes:pdf,ai,cdr,psd,jpg,jpeg,png,zip,rar|max:51200',
            'reference_files' => 'nullable|array',
        ]);

        // 2. Ambil Cart (Pastikan $cart tersedia)
        $cart = Cart::firstOrCreate(['customer_id' => $request->customer_id]);
        
        $needDesignField = filter_var($request->need_design, FILTER_VALIDATE_BOOLEAN);

        $designFilePath = null;
        $referenceFilesPaths = [];

        // 3. Proses Single File
        if (!$needDesignField && $request->hasFile('design_file')) {
            $designFilePath = $request->file('design_file')->store('designs', 'public');
        }

        // 4. Proses Multiple Files
        if ($needDesignField && $request->hasFile('reference_files')) {
            foreach ($request->file('reference_files') as $file) {
                $referenceFilesPaths[] = $file->store('references', 'public');
            }
        }

        // 5. Simpan ke Database
        $cartItem = CartItem::create([
            'cart_id' => $cart->id,
            'product_id' => $request->product_id,
            'quantity' => $request->quantity,
            'panjang' => $request->panjang ?? 0,
            'lebar' => $request->lebar ?? 0,
            'catatan' => $request->catatan ?? '',
            'need_design' => $needDesignField,
            'tahapan_order' => $needDesignField ? 6 : 2,
            
            // Gunakan nama variabel yang benar:
            'design_file' => $designFilePath, 
            'reference_files' => !empty($referenceFilesPaths) ? json_encode($referenceFilesPaths) : null,
            
            'selected_options' => is_string($request->selected_options) ? json_decode($request->selected_options, true) : $request->selected_options,
        ]);

        return response()->json(['status' => 'success', 'data' => $cartItem], 201);
    }

public function destroy($id)
{
    // 1. Cari item
    $item = CartItem::find($id);
    
    // 2. Jika tidak ditemukan, return 404
    if (!$item) {
        return response()->json(['message' => 'Item tidak ditemukan di database dengan ID: ' . $id], 404);
    }

    // 3. Hapus item
    try {
        $item->delete();
        return response()->json(['message' => 'Item berhasil dihapus'], 200);
    } catch (\Exception $e) {
        return response()->json(['message' => 'Gagal menghapus: ' . $e->getMessage()], 500);
    }
}

}