<?php

namespace App\Http\Controllers\Api; 

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Midtrans\Snap;
use Midtrans\Config;
use Midtrans\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Support\Facades\DB;

class PaymentController extends Controller
{
    // 🌟 KONSTANTA STAGE
    const STAGE_PENDING_PAYMENT = 7; // Menunggu Pembayaran
    const STAGE_SIAP_CETAK      = 2; // Siap Cetak
    const STAGE_ANTREAN_DESAIN  = 6; // Antrean Desain
    const STAGE_BATAL           = 8; // Selesai / Batal

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
                'current_stage_id'   => self::STAGE_PENDING_PAYMENT, // 👈 Terkunci di Stage 7
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
                    'order_stage_id' => self::STAGE_PENDING_PAYMENT, // 👈 Item dikunci di Stage 7
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

                if (!$designFile && !empty($item['dummy_file_name'])) {
                    $designFile = $item['dummy_file_name'];
                }

                if ($designFile || count($referenceFiles) > 0) {
                    \App\Models\OrderItemDesign::create([
                        'order_item_id'   => $orderItem->id,
                        'design_file'     => $designFile,
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

    public function notificationHandler(Request $request)
    {
        Config::$serverKey = config('services.midtrans.server_key');
        Config::$isProduction = (bool) config('services.midtrans.is_production', false);

        try {
            $notif = new Notification();
            $transactionStatus = $notif->transaction_status;
            $orderId = $notif->order_id;

            $order = Order::with('items')->find($orderId);

            if ($order) {
                if ($transactionStatus == 'settlement') {
                    // 🌟 PEMBAYARAN LUNAS: Baru alokasikan stage asli masing-masing item
                    $anyNeedDesign = false;
                    foreach ($order->items as $item) {
                        $itemStage = ($item->need_design == 1) ? self::STAGE_ANTREAN_DESAIN : self::STAGE_SIAP_CETAK;
                        $item->update(['order_stage_id' => $itemStage]);
                        
                        if ($item->need_design == 1) {
                            $anyNeedDesign = true;
                        }
                    }

                    // Update stage utama order pembungkus
                    $globalStage = $anyNeedDesign ? self::STAGE_ANTREAN_DESAIN : self::STAGE_SIAP_CETAK;
                    $order->update(['current_stage_id' => $globalStage]);

                } else if (in_array($transactionStatus, ['deny', 'expire', 'cancel'])) {
                    $order->update(['current_stage_id' => self::STAGE_BATAL]);
                    OrderItem::where('order_id', $order->id)->update(['order_stage_id' => self::STAGE_BATAL]);
                }
            }

            return response()->json(['message' => 'Notification handled successfully']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}