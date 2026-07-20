<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Stage;
use App\Models\OrderItem;
use App\Models\OrderItemDesign;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class OrderController extends Controller
{
    // 🔥 KONSTANTA STAGE — SESUAI ISI TABEL order_stages DI DATABASE
    const STAGE_BUTUH_DESAIN   = 1; // Sudah di-assign desainer, menunggu dikerjakan (tombol "Kerjakan")
    const STAGE_SIAP_CETAK     = 2; // Desain sudah di-approve customer, siap masuk produksi cetak
    const STAGE_DESAIN         = 3; // Sedang dikerjakan oleh desainer (tombol jadi "Detail")
    const STAGE_CETAK          = 4; // Operator sedang mencetak
    const STAGE_SELESAI        = 5; // Selesai produksi
    const STAGE_ANTREAN_DESAIN = 6; // Order baru, belum ada desainer ditugaskan
    const STAGE_MENUNGGU_PEMBAYARAN = 7; // Sesuaikan dengan ID di tabel order_stages database
    const STAGE_DIBATALKAN     = 8;

    public function index()
    {
        $orders = Order::with([
            'customer:id,name',
            'items.product:id,name',
            'items.stage:id,name',
            'items.design:id,order_item_id,design_file,reference_files,design_notes',
            'stage:id,name,status_id',
            'stage.status:id,name',
            'designer'
        ])
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($orders);
    }

    public function getCustomerOrders($customer_id)
    {
        Order::where('customer_id', $customer_id)
        ->where('current_stage_id', self::STAGE_MENUNGGU_PEMBAYARAN)
        ->where('expired_at', '<=', now())
        ->update([
            'current_stage_id' => self::STAGE_DIBATALKAN
        ]);
        
        $orders = Order::with([
            'customer:id,name',
            'order_items.product:id,name,price,photo',
            'stage:id,name,status_id',
            'stage.status:id,name',
            'designer:id,name'
        ])
        ->where('customer_id', $customer_id) 
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json(['data' => $orders]);
    }

    public function designerOrders(Request $request)
    {
        $user = $request->user();

        // Cek apakah frontend sedang meminta data riwayat/history
        $isHistory = $request->query('status') === 'history';

        // 🔥 PERBAIKAN: mapping stage yang benar sesuai isi tabel order_stages
        // Antrian aktif desainer: Butuh Desain (1) + Desain (3)
        // Riwayat desainer: Siap Cetak (2) + Cetak (4) + Selesai (5)
        $allowedStages = $isHistory
            ? [self::STAGE_SIAP_CETAK, self::STAGE_CETAK, self::STAGE_SELESAI]
            : [self::STAGE_BUTUH_DESAIN, self::STAGE_DESAIN];

        $orders = Order::with([
            'customer:id,name',
            'items' => function ($query) use ($allowedStages) {
                $query->whereIn('order_stage_id', $allowedStages); 
            },
            'items.product:id,name',
            'items.stage:id,name,status_id',
            'items.design:id,order_item_id,design_file,reference_files,design_notes',
            'stage:id,name,status_id',
            'stage.status:id,name',
            'designer'
        ])
        // Hanya ambil orderan yang sudah di-assign Admin ke user (desainer) ini
        ->where('designer_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get()
        ->filter(function ($order) {
            return $order->items->count() > 0;
        })
        ->values(); 

        return response()->json($orders);
    }

    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            if (!$request->customer_id && $request->customer_name) {
                $customer   = Customer::create(['name' => $request->customer_name]);
                $customerId = $customer->id;
            } else {
                $customerId = $request->customer_id;
            }

            // 🔥 Default: order butuh desain tapi belum ada desainer = Antrean Desain (6)
            $defaultStageId = self::STAGE_ANTREAN_DESAIN;

            $needsDesign = false;
            if ($request->has('items') && is_array($request->items)) {
                foreach ($request->items as $item) {
                    if (isset($item['need_design']) && filter_var($item['need_design'], FILTER_VALIDATE_BOOLEAN)) {
                        $needsDesign = true;
                        break;
                    }
                }
            }

            if ($needsDesign) {
                $hasDesigner = false;
                foreach ($request->items as $item) {
                    if (!empty($item['designer_id'])) {
                        $hasDesigner = true;
                        break;
                    }
                }
               
                $defaultStageId = $hasDesigner ? self::STAGE_BUTUH_DESAIN : self::STAGE_ANTREAN_DESAIN;
            } else if ($request->input('design_method') === 'ready-to-print' || $request->input('current_stage_id') == self::STAGE_SIAP_CETAK) {
                $defaultStageId = self::STAGE_SIAP_CETAK; 
            } else {
                $defaultStageId = (int) $request->input('current_stage_id', self::STAGE_SIAP_CETAK);
            }

            $order = Order::create([
                'customer_id'       => $customerId,
                'order_date'        => now(),
                'total_price'       => 0,
                'notes'             => $request->notes,
                'created_by'        => 1,
                'current_stage_id'  => $defaultStageId,
                'shipping_method'   => $request->input('shipping_method', 'pickup'),
                'shipping_cost'     => $request->input('shipping_cost', 0),
                'shipping_latitude' => $request->input('shipping_latitude'),
                'shipping_longitude'=> $request->input('shipping_longitude'),
                'designer_id'       => null,
                'payment_method'    => $request->input('payment_method'),
                'expired_at'        => now()->addMinutes(30),
            ]);

            $totalPrice = 0;

            foreach ($request->items as $index => $item) {
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

                $product_is_custom = $product->is_custom == 1 || $product->is_custom === true;
                $hargaPerItem = ($product_is_custom && $luasM2 > 0) ? ($luasM2 * $hargaPerMeter) : $hargaPerMeter;
                $subtotal = $hargaPerItem * $qty;
                $totalPrice += $subtotal;

                // 🔥 PERBAIKAN: Tentukan stage per item mandiri dengan mapping ID yang benar
                $itemStageId = self::STAGE_SIAP_CETAK; 
                if (isset($item['need_design']) && filter_var($item['need_design'], FILTER_VALIDATE_BOOLEAN)) {
                    $itemStageId = (!empty($item['designer_id']) || $defaultStageId === self::STAGE_BUTUH_DESAIN)
                        ? self::STAGE_BUTUH_DESAIN
                        : self::STAGE_ANTREAN_DESAIN;
                } else if ($request->input('design_method') === 'ready-to-print') {
                    $itemStageId = self::STAGE_SIAP_CETAK;
                } else {
                    $itemStageId = (int) $request->input('current_stage_id', self::STAGE_SIAP_CETAK);
                }

                $textCatatan = $item['catatan'] ?? null;

                $cartItem = \App\Models\CartItem::whereHas('cart', function ($q) use ($customerId) {
                    $q->where('customer_id', $customerId);
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
                    'need_design'    => $item['need_design'] ?? false,
                    'order_stage_id' => $itemStageId, 
                    'details'        => $item['fields'] ?? '{}', 
                ]);

                $designFile = null;
                $referenceFiles = [];

                if ($request->hasFile("items.$index.design_file")) {
                    $files = $request->file("items.$index.design_file");
                    $fileToStore = is_array($files) ? $files[0] : $files;
                    $designFile = $fileToStore->store('designs', 'public');
                } else if (!empty($item['design_file']) && is_string($item['design_file'])) {
                    $designFile = $item['design_file'];
                }

                if ($request->hasFile("items.$index.reference_files")) {
                    $refFiles = $request->file("items.$index.reference_files");
                    $refFilesArray = is_array($refFiles) ? $refFiles : [$refFiles];
                    foreach ($refFilesArray as $file) {
                        $referenceFiles[] = $file->store('references', 'public');
                    }
                } else if (!empty($item['reference_files'])) {
                    $referenceFiles = is_array($item['reference_files']) 
                        ? $item['reference_files'] 
                        : json_decode($item['reference_files'], true) ?? [];
                }

                if (!$designFile && empty($referenceFiles)) {
                    $cartItem = \App\Models\CartItem::whereHas('cart', function ($q) use ($customerId) {
                        $q->where('customer_id', $customerId);
                    })->where('product_id', $product->id)->first();

                    if ($cartItem) {
                        $designFile = $cartItem->design_file;
                        $referenceFiles = $cartItem->reference_files ? json_decode($cartItem->reference_files, true) : [];
                    }
                }

                if (!$designFile && $itemStageId === self::STAGE_SIAP_CETAK) {
                    $designFile = $item['dummy_file_name'] ?? 'design_beli_langsung_customer.pdf';
                }

                if ($designFile || count($referenceFiles) > 0) {
                    OrderItemDesign::create([
                        'order_item_id'   => $orderItem->id,
                        'design_file'     => $designFile,
                        'reference_files' => json_encode($referenceFiles),
                        'design_notes'    => $item['design_notes'] ?? $request->notes ?? null,
                        'design_status'   => 'pending',
                    ]);
                }
            } 

            $order->update(['total_price' => $totalPrice]);

            if (!$request->input('is_direct', false)) {
                \App\Models\CartItem::whereHas('cart', function ($q) use ($customerId) {
                    $q->where('customer_id', $customerId);
                })->delete();
            }

            DB::commit();

            return response()->json([
                'message' => 'Order berhasil dibuat',
                'data'    => $order->load('items.design'),
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => $e->getMessage(),
                'line'  => $e->getLine(),
            ], 500);
        }
    }
    
    public function update(Request $request, $id)
    {
        try {
            $order = Order::findOrFail($id);

            if ($request->stage) {
                $stageStr = strtolower($request->stage);
                $stageId = null;

                // 🔥 PERBAIKAN: mapping nama stage ke ID yang BENAR sesuai tabel order_stages
                if ($stageStr === 'desain' || $stageStr === 'diproses') {
                    $stageId = self::STAGE_DESAIN; // 3 — sedang dikerjakan desainer

                    // Kunci kepemilikan desainer pada pesanan ini (jaga-jaga kalau belum ke-assign)
                    if (empty($order->designer_id) && $request->user()) {
                        $order->designer_id = $request->user()->id;
                    }
                } elseif ($stageStr === 'butuh desain') {
                    $stageId = self::STAGE_BUTUH_DESAIN; // 1
                } elseif ($stageStr === 'antrean desain') {
                    $stageId = self::STAGE_ANTREAN_DESAIN; // 6
                } else {
                    $stage = Stage::whereRaw(
                        'LOWER(name) = ?',
                        [$stageStr]
                    )->first();
                    $stageId = $stage ? $stage->id : null;
                }

                if ($stageId) {
                    $order->current_stage_id = $stageId;

                    if ($request->filled('order_item_id')) {
                        OrderItem::where('id', $request->order_item_id)
                            ->update([
                                'order_stage_id' => $stageId
                            ]);
                    } else {
                        OrderItem::where('order_id', $order->id)
                            ->update([
                                'order_stage_id' => $stageId
                            ]);
                    }
                }
            }

            $order->save();

            // Pastikan memuat struktur data lengkap yang sama seperti indeks antrean desainer
            return response()->json([
                'message' => 'Order updated successfully',
                'data' => $order->load(['items.stage.status', 'stage.status', 'designer']) 
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function show($id)
    {
        $order = Order::with([
            'customer:id,name',
            'items.product:id,name',
            'items.stage:id,name', 
            'items.design:id,order_item_id,design_file,reference_files,design_notes',
            'stage:id,name,status_id',
            'stage.status:id,name'
        ])->findOrFail($id);

        return response()->json($order);
    }

    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $order = Order::with('items.design')->find($id);

            if (!$order) {
                return response()->json([
                    'message' => 'Not found'
                ], 404);
            }

            foreach ($order->items as $item) {
                if ($item->design) {
                    $item->design->delete();
                }
                $item->delete();
            }

            $order->delete();

            DB::commit();

            return response()->json([
                'message' => 'Deleted'
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function downloadDesign($filename)
    {
        $decodedFilename = urldecode($filename);
        $path = storage_path('app/public/' . $decodedFilename);

        if (!File::exists($path)) {
            return response()->json(['message' => 'File tidak ditemukan di path: ' . $path], 404);
        }

        return response()->download($path);
    }

    public function assignDesigner(Request $request, $id)
    {
        $request->validate([
            'designer_id' => 'required|exists:users,id'
        ]);

        $order = Order::findOrFail($id);
        $order->designer_id = $request->designer_id;

        // 🔥 PERBAIKAN: Assign desainer memindahkan stage dari
        // Antrean Desain (6) -> Butuh Desain (1), BUKAN ke "Desain" (3).
        // Stage "Desain" (3) baru terjadi saat desainer klik "Kerjakan".
        if ($order->current_stage_id == self::STAGE_ANTREAN_DESAIN) {
            $order->current_stage_id = self::STAGE_BUTUH_DESAIN;
        }

        $order->save();

        // Hanya update item dengan stage "Antrean Desain" (6) ke "Butuh Desain" (1).
        // Item yang sudah di stage lain (mis. sudah "Desain" atau "Siap Cetak") tidak ikut berubah.
        OrderItem::where('order_id', $order->id)
            ->where('order_stage_id', self::STAGE_ANTREAN_DESAIN)
            ->update([
                'order_stage_id' => self::STAGE_BUTUH_DESAIN
            ]);

        return response()->json([
            'message' => 'Desainer berhasil ditugaskan',
            'data' => $order->load('designer', 'stage')
        ]);
    }

    public function getKurirOrders(Request $request)
    {
        $orders = Order::with([
            'customer:id,name,phone,address',
            'items.product:id,name',
            'stage:id,name'
        ])
        ->where('shipping_method', 'delivery')
        ->whereIn('current_stage_id', [self::STAGE_CETAK, self::STAGE_SELESAI])
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($orders);
    }

    public function updateStage(Request $request, $id)
    {
        try {
            $order = Order::findOrFail($id);

            if ($request->has('current_stage_id')) {
                $order->current_stage_id = $request->current_stage_id;
                
                OrderItem::where('order_id', $order->id)->update([
                    'order_stage_id' => $request->current_stage_id
                ]);
            }

            $order->save();

            return response()->json([
                'success' => true,
                'message' => 'Tahapan order berhasil diperbarui di database percetakan',
                'data' => $order->load('stage')
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateItemStage(Request $request, $id)
    {
        try {
            $item = \App\Models\OrderItem::findOrFail($id);

            if ($request->has('current_stage_id')) {
                $item->order_stage_id = $request->current_stage_id;
                $item->save();
            }

            $orderId = $item->order_id;
            $totalItems = \App\Models\OrderItem::where('order_id', $orderId)->count();
            
            $finishedItems = \App\Models\OrderItem::where('order_id', $orderId)
                ->where('order_stage_id', self::STAGE_SELESAI)
                ->count();

            if ($totalItems === $finishedItems) {
                Order::where('id', $orderId)->update(['current_stage_id' => self::STAGE_SELESAI]);
            } else {
                Order::where('id', $orderId)->update(['current_stage_id' => $item->order_stage_id]);
            }

            return response()->json([
                'success' => true,
                'message' => 'Tahapan item produk berhasil diperbarui secara mandiri.',
                'data' => $item->load('product')
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Gagal memperbarui status item: ' . $e->getMessage()
            ], 500);
        }
    }

    public function cancelOrder($id)
    {
        DB::beginTransaction();
        try {
            $order = Order::findOrFail($id);

            // Validasi: Pesanan hanya boleh dibatalkan jika masih berstatus Menunggu Pembayaran
            if ($order->current_stage_id != self::STAGE_MENUNGGU_PEMBAYARAN) {
                return response()->json([
                    'message' => 'Pesanan tidak dapat dibatalkan karena sudah diproses.'
                ], 400);
            }

            // Ubah status order global dan item-itemnya menjadi Dibatalkan
            $order->current_stage_id = self::STAGE_DIBATALKAN;
            $order->save();

            OrderItem::where('order_id', $order->id)->update([
                'order_stage_id' => self::STAGE_DIBATALKAN
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pesanan berhasil dibatalkan.'
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}