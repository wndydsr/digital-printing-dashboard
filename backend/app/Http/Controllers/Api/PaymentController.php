<?php

namespace App\Http\Controllers\Api; 

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Midtrans\Snap;
use Midtrans\Config;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    // 🌟 KONSTANTA STAGE — DISAMAKAN DENGAN DATABASE & ORDER CONTROLLER
    const STAGE_BUTUH_DESAIN        = 1;
    const STAGE_SIAP_CETAK          = 2; // Siap Cetak (Jika tidak butuh desain)
    const STAGE_DESAIN              = 3;
    const STAGE_CETAK               = 4;
    const STAGE_SELESAI             = 5;
    const STAGE_ANTREAN_DESAIN      = 6; // Antrean Desain (Jika butuh desain)
    const STAGE_MENUNGGU_PEMBAYARAN = 7; // Menunggu Pembayaran (Default awal)
    const STAGE_DIBATALKAN          = 8; // Batal / Kedaluwarsa

    public function checkout(Request $request)
    {
        $user = $request->user();
        $totalHarga = $request->input('totalHarga');

        if (!$totalHarga || (int)$totalHarga <= 0) {
            return response()->json(['success' => false, 'error' => 'Total harga tidak valid.'], 400);
        }

        if (!$request->has('items') || !is_array($request->input('items'))) {
            return response()->json(['success' => false, 'error' => 'Item pesanan tidak valid.'], 400);
        }

        DB::beginTransaction();
        try {
            // 1. Buat Order Utama (Set Stage Awal ke 7 / Menunggu Pembayaran)
            $order = Order::create([
                'customer_id'        => $request->input('customer_id') ?? $user->id,
                'order_date'         => now(),
                'total_price'        => $totalHarga,
                'notes'              => $request->notes,
                'created_by'         => 1,
                'current_stage_id'   => self::STAGE_MENUNGGU_PEMBAYARAN, // 👈 Terkunci di Stage 7
                'shipping_method'    => $request->input('shipping_method', 'pickup'),
                'shipping_cost'      => $request->input('shipping_cost', 0),
                'shipping_latitude'  => $request->input('shipping_method') === 'delivery' ? $request->input('shipping_latitude') : null,
                'shipping_longitude' => $request->input('shipping_method') === 'delivery' ? $request->input('shipping_longitude') : null,
                'designer_id'        => null,
            ]);

            // 2. Loop Items & Set Stage Awal Item Ke Stage 7
            foreach ($request->input('items') as $index => $item) {
                $product = Product::findOrFail($item['product_id'] ?? $item['id']);
                $qty = (int) $item['quantity'];
                
                $panjang = (float) ($item['panjang'] ?? 0);
                $lebar = (float) ($item['lebar'] ?? 0);
                $luasM2 = ($panjang * $lebar) / 10000;
                $hargaPerMeter = (float) $product->price;

                if (!empty($item['attributes'])) {
                    $attributeValues = \App\Models\ProductAttributeValue::whereIn('id', $item['attributes'])->get();
                    foreach ($attributeValues as $value) {
                        $hargaPerMeter += (float) $value->additional_price;
                    }
                }

                $hargaPerItem = ($product->is_custom && $luasM2 > 0) ? ($luasM2 * $hargaPerMeter) : $hargaPerMeter;
                $subtotal = $hargaPerItem * $qty;

                $itemNeedDesign = isset($item['need_design']) && filter_var($item['need_design'], FILTER_VALIDATE_BOOLEAN);

                $textCatatan = $item['catatan'] ?? null;

                $cartItem = \App\Models\CartItem::whereHas('cart', function ($q) use ($user) {
                    $q->where('customer_id', $user->id);
                })->where('product_id', $product->id)->first();

                if ($cartItem && empty($textCatatan)) {
                    $textCatatan = $cartItem->catatan;
                }

                $orderItem = OrderItem::create([
                    'order_id'       => $order->id,
                    'product_id'     => $product->id,
                    'quantity'       => $qty,
                    'panjang'        => $panjang,
                    'lebar'          => $lebar,
                    'price'          => $hargaPerItem,
                    'subtotal'       => $subtotal,
                    'catatan'        => $textCatatan,
                    'need_design'    => $itemNeedDesign,
                    'order_stage_id' => self::STAGE_MENUNGGU_PEMBAYARAN, // 👈 Item dikunci di Stage 7
                    'details'        => isset($item['selectedOptions']) ? json_encode($item['selectedOptions']) : '{}',
                ]);

                // Menangkap File Cetak E-Commerce
                $designFile = null;
                $referenceFiles = [];

                if ($request->hasFile("items.$index.design_file")) {
                    $designFile = $request->file("items.$index.design_file")->store('designs', 'public');
                }
                if ($request->hasFile("items.$index.reference_files")) {
                    foreach ($request->file("items.$index.reference_files") as $file) {
                        $referenceFiles[] = $file->store('references', 'public');
                    }
                }

                if (!$designFile && empty($referenceFiles)) {
                    $cartItem = \App\Models\CartItem::whereHas('cart', function ($q) use ($user) {
                        $q->where('customer_id', $user->id);
                    })->where('product_id', $product->id)->first();

                    if ($cartItem) {
                        $designFile = $cartItem->design_file;
                        $referenceFiles = $cartItem->reference_files ? json_decode($cartItem->reference_files, true) : [];
                    }
                }

                // 🌟 PERBAIKAN DI SINI:
                // Menjamin teks nama dummy/asli tetap memiliki jalur 'designs/' agar gambar KELOAD 100%!
                if (!$designFile && !empty($item['dummy_file_name'])) {
                    $rawName = $item['dummy_file_name'];
                    $designFile = str_starts_with($rawName, 'designs/') ? $rawName : 'designs/' . $rawName;
                }

                if ($designFile || count($referenceFiles) > 0) {
                    \App\Models\OrderItemDesign::create([
                        'order_item_id'   => $orderItem->id,
                        'design_file'     => $designFile, // 👈 Tersimpan rapi sebagai 'designs/erdPrinora.png'
                        'reference_files' => json_encode($referenceFiles),
                        'design_notes'    => $item['catatan'] ?? $request->notes ?? null,
                        'design_status'   => 'pending',
                    ]);
                }
            }

            // Bersihkan keranjang belanja
            if (!$request->input('is_direct', false)) {
                \App\Models\CartItem::whereHas('cart', function ($q) use ($user) {
                    $q->where('customer_id', $user->id);
                })->delete();
            }

            // Integrasi Midtrans Snap
            Config::$serverKey = config('services.midtrans.server_key');
            Config::$isProduction = (bool) config('services.midtrans.is_production', false); 
            Config::$isSanitized = true;
            Config::$is3ds = true;

            $platform = $request->input('platform', 'customer');

            $params = [
                'transaction_details' => [
                    'order_id' => (string) $order->id, 
                    'gross_amount' => (int) $totalHarga,
                ],
                'customer_details' => [
                    'first_name' => $user->name ?? 'Pelanggan Prinora',
                    'email' => $user->email ?? 'pelanggan@mail.com',
                ]
            ];

            if ($platform === 'admin') {
                $params['callbacks'] = [
                    'finish'   => 'https://admin.prinora.store/admin/pesanan',
                    'unfinish' => 'https://admin.prinora.store/admin/pesanan',
                    'error'    => 'https://admin.prinora.store/admin/pesanan',
                ];
            } else {
                $params['callbacks'] = [
                    'finish'   => 'https://prinora.store/invoice/' . $order->id,
                    'unfinish' => 'https://prinora.store/invoice/' . $order->id,
                    'error'    => 'https://prinora.store/my-account?tab=orders'
                ];
            }

            $snapToken = Snap::getSnapToken($params);

            // 🌟 DISIMPEN DI DATABASE
            $order->update(['snap_token' => $snapToken]);

            DB::commit();

            return response()->json([
                'success' => true,
                'token' => $snapToken,
                'order_id' => $order->id
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'error' => 'Gagal memproses transaksi: ' . $e->getMessage()
            ], 500);
        }
    }

    // 🌟 FUNGSI AMBIL KEMBALI TOKEN DARI DB UNTUK TOMBOL "BAYAR SEKARANG"
    public function repay($id)
    {
        $order = Order::findOrFail($id);

        if ($order->current_stage_id != self::STAGE_MENUNGGU_PEMBAYARAN) {
            return response()->json(['error' => 'Pesanan ini sudah dibayar atau dibatalkan.'], 400);
        }

        // Jika token sudah tersimpan di database, langsung kembalikan
        if (!empty($order->snap_token)) {
            return response()->json([
                'success' => true,
                'token' => $order->snap_token
            ]);
        }

        // Jaga-jaga jika token di database masih null, buatkan baru
        Config::$serverKey = config('services.midtrans.server_key');
        Config::$isProduction = (bool) config('services.midtrans.is_production', false);
        Config::$isSanitized = true;
        Config::$is3ds = true;

        $params = [
            'transaction_details' => [
                'order_id' => (string) $order->id,
                'gross_amount' => (int) $order->total_price,
            ],
            'customer_details' => [
                'first_name' => $order->customer->name ?? 'Pelanggan Prinora',
            ]
        ];

        try {
            $snapToken = Snap::getSnapToken($params);
            $order->update(['snap_token' => $snapToken]);

            return response()->json([
                'success' => true,
                'token' => $snapToken
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

   public function notificationHandler(Request $request)
    {
        $payload = $request->all();
        $transactionStatus = $payload['transaction_status'] ?? null;
        $fraudStatus = $payload['fraud_status'] ?? null;
        $orderCode = $payload['order_id'] ?? null;

        // Cari order berdasarkan kode atau id
        $order = Order::where('order_code', $orderCode)->orWhere('id', $orderCode)->first();

        if (!$order) {
            return response()->json(['message' => 'Order not found'], 404);
        }

        // Logic jika pembayaran berhasil (Capture Accept atau Settlement)
        if (
            ($transactionStatus == 'capture' && $fraudStatus == 'accept') || 
            $transactionStatus == 'settlement'
        ) {
            $order->payment_status = 'paid';
            
            // 🌟 CEK APAKAH ADA ITEM YANG BUTUH DESAIN
            $hasDesignItem = $order->items()->where('need_design', true)->exists();
            
            // Jika ada yang butuh desain, order utama masuk Antrean Desain (6), jika tidak Siap Cetak (2)
            $order->current_stage_id = $hasDesignItem ? self::STAGE_ANTREAN_DESAIN : self::STAGE_SIAP_CETAK;
            $order->save();

            // 🌟 UPDATE STAGE PER ITEM BERDASARKAN KONDISINYA
            foreach ($order->items as $item) {
                $item->order_stage_id = $item->need_design ? self::STAGE_ANTREAN_DESAIN : self::STAGE_SIAP_CETAK;
                $item->save();
            }
        } 
        else if ($transactionStatus == 'pending') {
            $order->payment_status = 'pending';
            $order->current_stage_id = self::STAGE_MENUNGGU_PEMBAYARAN; // 7
            $order->save();
            $order->items()->update(['order_stage_id' => self::STAGE_MENUNGGU_PEMBAYARAN]);
        } 
        else if (in_array($transactionStatus, ['deny', 'expire', 'cancel'])) {
            $order->payment_status = 'failed';
            $order->current_stage_id = self::STAGE_DIBATALKAN; // 8
            $order->save();
            $order->items()->update(['order_stage_id' => self::STAGE_DIBATALKAN]);
        }

        return response()->json(['message' => 'Notification handled successfully']);
    }
        }