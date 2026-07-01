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
    public function index()
    {
        $orders = Order::with([
            'customer:id,name',
            'items.product:id,name',
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
        $orders = Order::with([
            'customer:id,name',
            'order_items.product:id,name,price,photo',
            'stage:id,name,status_id',
            'stage.status:id,name',
            'designer:id,name'
        ])
        ->where('customer_id', $customer_id) // 🔥 Filter berdasarkan customer_id
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json(['data' => $orders]);
    }

    public function designerOrders(Request $request)
    {
        $user = $request->user();

        // Ambil orders yang didelegasikan ke ID desainer yang sedang login
        $orders = Order::with([
            'customer:id,name',
            'items.product:id,name',
            'items.design:id,order_item_id,design_file,reference_files,design_notes',
            'stage:id,name,status_id',
            'stage.status:id,name',
            'designer'
        ])
        ->where('designer_id', $user->id) // Mengunci data hanya milik desainer ini
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($orders);
    }

    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            // 1. TENTUKAN ATAU BUAT CUSTOMER
            if (!$request->customer_id && $request->customer_name) {
                $customer   = Customer::create(['name' => $request->customer_name]);
                $customerId = $customer->id;
            } else {
                $customerId = $request->customer_id;
            }

            // 2. TENTUKAN STAGE AWAL (Bisa dari request, default ke 6)
            $defaultStageId = (int) $request->input('current_stage_id', 6);
            if ($request->input('design_method') === 'ready-to-print' || $defaultStageId === 2) {
                $defaultStageId = 2; // Otomatis menjadi 2 jika ready-to-print
            }

            // 3. CREATE ORDER (Menyimpan shipping_method, cost, koordinat, dll)
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
            ]);

            $totalPrice = 0;

            // 4. CREATE ITEMS LOOP & PERHITUNGAN HARGA
            foreach ($request->items as $index => $item) {
                $product = Product::findOrFail($item['product_id'] ?? $item['id']);
                $qty = (int) $item['quantity'];
                
                $panjang = (float) ($item['panjang'] ?? 0);
                $lebar = (float) ($item['lebar'] ?? 0);
                $luasM2 = ($panjang * $lebar) / 10000;
                $hargaPerMeter = (float) $product->price;

                // Hitung atribut produk jika ada tambahan harga
                if (!empty($item['attributes'])) {
                    $attributeValues = \App\Models\ProductAttributeValue::whereIn('id', $item['attributes'])->get();
                    foreach ($attributeValues as $value) {
                        $hargaPerMeter += (float) $value->additional_price;
                    }
                }

                $hargaPerItem = ($product->is_custom && $luasM2 > 0) ? ($luasM2 * $hargaPerMeter) : $hargaPerMeter;
                $subtotal = $hargaPerItem * $qty;
                $totalPrice += $subtotal;

                $orderItem = OrderItem::create([
                    'order_id'       => $order->id,
                    'product_id'     => $product->id,
                    'quantity'       => $qty,
                    'panjang'        => $panjang,
                    'lebar'          => $lebar,
                    'price'          => $hargaPerItem,
                    'subtotal'       => $subtotal,
                    'catatan'        => $item['catatan'] ?? null,
                    'need_design'    => $item['need_design'] ?? false,
                    'order_stage_id' => $defaultStageId,
                    'details'        => $item['fields'] ?? '{}',
                ]);

                $designFile = null;
                $referenceFiles = [];

                // Jalur A: Upload File Langsung (Pengecekan Array Lebih Aman)
                if ($request->hasFile("items.$index.design_file")) {
                    $files = $request->file("items.$index.design_file");
                    $fileToStore = is_array($files) ? $files[0] : $files;
                    $designFile = $fileToStore->store('designs', 'public');
                }
                
                if ($request->hasFile("items.$index.reference_files")) {
                    $refFiles = $request->file("items.$index.reference_files");
                    $refFilesArray = is_array($refFiles) ? $refFiles : [$refFiles];
                    foreach ($refFilesArray as $file) {
                        $referenceFiles[] = $file->store('references', 'public');
                    }
                }

                // Jalur B: Fallback dari keranjang jika Jalur A kosong
                if (!$designFile && empty($referenceFiles)) {
                    $cartItem = \App\Models\CartItem::whereHas('cart', function ($q) use ($customerId) {
                        $q->where('customer_id', $customerId);
                    })->where('product_id', $product->id)->first();

                    if ($cartItem) {
                        $designFile = $cartItem->design_file;
                        $referenceFiles = $cartItem->reference_files ? json_decode($cartItem->reference_files, true) : [];
                    }
                }

                // Jalur C: Dummy teks jika berkas fisik tidak terdeteksi namun stage bernilai 2
                if (!$designFile && $defaultStageId === 2) {
                    $designFile = $item['dummy_file_name'] ?? 'design_beli_langsung_customer.pdf';
                }

                // Simpan ke database order_item_designs
                if ($designFile || count($referenceFiles) > 0) {
                    OrderItemDesign::create([
                        'order_item_id'   => $orderItem->id,
                        'design_file'     => $designFile,
                        'reference_files' => json_encode($referenceFiles),
                        'design_notes'    => $item['design_notes'] ?? $request->notes ?? null,
                        'design_status'   => 'pending',
                    ]);
                }
            } // End Foreach

            // 5. VALIDASI PERLINDUNGAN AKHIR STAGE ORDER (Menggunakan whereHas yang efisien)
            $hasReadyPrintFile = OrderItemDesign::whereHas('orderItem', function($q) use ($order) {
                    $q->where('order_id', $order->id);
                })
                ->whereNotNull('design_file')
                ->exists();

            if ($hasReadyPrintFile || $defaultStageId === 2) {
                $order->update(['current_stage_id' => 2]);
                OrderItem::where('order_id', $order->id)->update(['order_stage_id' => 2]);
            }

            // 6. UPDATE TOTAL HARGA AKHIR
            $order->update(['total_price' => $totalPrice]);

            // 7. BERSIHKAN KERANJANG
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

            // 🔥 UPDATE STAGE
            if ($request->stage) {
                $stage = Stage::whereRaw(
                    'LOWER(name) = ?',
                    [strtolower($request->stage)]
                )->first();

                if (!$stage) {
                    return response()->json([
                        'message' => 'Stage tidak ditemukan'
                    ], 404);
                }

                $order->current_stage_id = $stage->id;
            }

            $order->save();

            return response()->json([
                'message' => 'Order updated successfully',
                'data' => $order
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

            // hapus design tiap item
            foreach ($order->items as $item) {
                if ($item->design) {
                    $item->design->delete();
                }
                $item->delete();
            }

            // hapus order
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
        $path = storage_path('app/public/' . $filename);

        if (!File::exists($path)) {
            return response()->json(['message' => 'File tidak ditemukan'], 404);
        }

        return response()->download($path);
    }

    public function assignDesigner(Request $request, $id)
    {
        $request->validate([
            'designer_id' => 'required|exists:users,id'
        ]);

        $order = Order::find($id);

        if (!$order) {
            return response()->json(['message' => 'Pesanan tidak ditemukan'], 404);
        }

        $order->designer_id = $request->designer_id;

        // 🔥 Logika otomatis: Jika sebelumnya di 'Antrean Desain' (misal ID 6), 
        // ubah menjadi 'Butuh Desain' (misal ID 1) setelah ditugaskan
        if ($order->current_stage_id == 6) {
            $order->current_stage_id = 1;
        }

        $order->save();

        return response()->json([
            'message' => 'Desainer berhasil ditugaskan',
            'data' => $order
        ]);
    }
}