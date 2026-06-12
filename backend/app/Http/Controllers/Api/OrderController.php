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
            // =========================
            // CUSTOMER
            // =========================
            if (!$request->customer_id && $request->customer_name) {
                $customer = Customer::create([
                    'name' => $request->customer_name
                ]);
                $customerId = $customer->id;
            } else {
                $customerId = $request->customer_id;
            }

            // =========================
            // CREATE ORDER
            // =========================
            $defaultStageId = 6;

            $order = Order::create([
                'customer_id' => $customerId,
                'order_date' => now(),
                'total_price' => 0,
                'notes' => $request->notes,
                'created_by' => 1,
                'current_stage_id' => $defaultStageId,
            ]);

            // =========================
            // CREATE ITEMS
            // =========================
            $totalPrice = 0;

            foreach ($request->items as $index => $item) {
                $product = Product::findOrFail($item['product_id']);
                $qty = (int) $item['quantity'];

                // Inputan dalam centimeter (cm)
                $panjang = (float) ($item['panjang'] ?? 0); 
                $lebar = (float) ($item['lebar'] ?? 0);
                
                // Konversi luas
                $luasCm2 = $panjang * $lebar;
                $luasM2 = $luasCm2 / 10000;

                // 1. Hitung Harga Per Meter
                $hargaPerMeter = (float) $product->price;

                // Optimasi Atribut (Mengurangi beban query database)
                $attributeIds = $item['attributes'] ?? [];
                if (!empty($attributeIds)) {
                    $attributeValues = \App\Models\ProductAttributeValue::whereIn('id', $attributeIds)->get();
                    foreach ($attributeValues as $value) {
                        $hargaPerMeter += (float) $value->additional_price;
                    }
                }

                // 2. Hitung Harga Per Item 
                // 👇 SEKARANG DIKUNCI OLEH is_custom. Hanya dikali luas jika produk bertipe kustom/meteran
                $hargaPerItem = ($product->is_custom && $luasM2 > 0) ? ($luasM2 * $hargaPerMeter) : $hargaPerMeter;

                \Illuminate\Support\Facades\Log::info('Debug Hitung Harga', [
                    'nama_produk' => $product->name,
                    'is_custom' => $product->is_custom,
                    'panjang' => $panjang,
                    'lebar' => $lebar,
                    'luas_m2' => $luasM2,
                    'harga_per_item' => $hargaPerItem,
                    'qty' => $qty
                ]);

                // 3. Total Subtotal
                $subtotal = $hargaPerItem * $qty;
                $totalPrice += $subtotal;

                // Simpan data item, termasuk panjang dan lebar ke masing-masing kolomnya
                $orderItem = OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $product->id,
                    'quantity' => $qty,
                    'panjang' => $panjang, 
                    'lebar' => $lebar,     
                    'price' => $hargaPerItem, 
                    'subtotal' => $subtotal,
                    'catatan' => $item['catatan'] ?? null,
                    'need_design' => $item['need_design'] ?? false,
                    'order_stage_id' => $defaultStageId,
                    'details' => $item['fields'] ?? '{}',
                ]);

                // =========================
                // DESIGN
                // =========================
                $designFile = null;

                if ($request->hasFile("items.$index.design_file")) {
                    $designFiles = $request->file("items.$index.design_file");
                    if (is_array($designFiles) && count($designFiles) > 0) {
                        $designFile = $designFiles[0]->store('designs', 'public');
                    }
                }

                $referenceFiles = [];

                if ($request->hasFile("items.$index.reference_files")){
                    $files = $request->file("items.$index.reference_files");
                    foreach ($files as $file) {
                        $referenceFiles[] = $file->store('references', 'public');
                    }
                }

                // simpan kalau ada salah satu file
                if ($designFile || count($referenceFiles) > 0) {
                    OrderItemDesign::create([
                        'order_item_id' => $orderItem->id,
                        'design_file' => $designFile,
                        'reference_files' => $referenceFiles,
                        'design_notes' => $item['design_notes'] ?? null,
                        'design_status' => 'pending',
                    ]);

                    if ($designFile) {
                        $readyStage = Stage::whereRaw(
                            'LOWER(name) = ?',
                            ['siap cetak']
                        )->first();

                        if ($readyStage) {
                            $order->update([
                                'current_stage_id' => $readyStage->id
                            ]);
                        }
                    }
                }
            } 

            // Update Total Price untuk keseluruhan pesanan
            $order->update([
                'total_price' => $totalPrice
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Order berhasil dibuat',
                'data' => $order->load('items')
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'error' => $e->getMessage(),
                'line' => $e->getLine()
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