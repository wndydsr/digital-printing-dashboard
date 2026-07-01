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
        // 1. CUSTOMER
        if (!$request->customer_id && $request->customer_name) {
            $customer   = Customer::create(['name' => $request->customer_name]);
            $customerId = $customer->id;
        } else {
            $customerId = $request->customer_id;
        }

        // 2. TENTUKAN STAGE
        $defaultStageId = (int) $request->input('current_stage_id', 6);
        if ($request->input('design_method') === 'ready-to-print' || $defaultStageId === 2) {
            $defaultStageId = 2; // Paksa ke "Siap Cetak" di awal
        }

        // ... 4. CREATE ITEMS LOOP
        foreach ($request->items as $index => $item) {
            // ... (Kalkulasi harga item tetap sama)

            $orderItem = OrderItem::create([
                // parameter data item tetep sama ...
                'order_stage_id' => $defaultStageId,
            ]);

            $designFile = null;
            $referenceFiles = [];

            // 🔥 JALUR A: Upload langsung (Diperbaiki agar mampu membaca struktur array multi-part Next.js)
            if ($request->hasFile("items.$index.design_file")) {
                $files = $request->file("items.$index.design_file");
                // Ambil file pertama jika dikirim dalam bentuk array upload
                $fileToStore = is_array($files) ? $files[0] : $files;
                $designFile = $fileToStore->store('designs', 'public');
            }
            
            if ($request->hasFile("items.$index.reference_files")) {
                foreach ($request->file("items.$index.reference_files") as $file) {
                    $referenceFiles[] = $file->store('references', 'public');
                }
            }

            // JALUR B: Fallback dari keranjang jika Jalur A kosong
            if (!$designFile && empty($referenceFiles)) {
                $cartItem = \App\Models\CartItem::whereHas('cart', function ($q) use ($customerId) {
                    $q->where('customer_id', $customerId);
                })->where('product_id', $item['product_id'])->first();

                if ($cartItem) {
                    $designFile = $cartItem->design_file;
                    $referenceFiles = $cartItem->reference_files ? json_decode($cartItem->reference_files, true) : [];
                }
            }

            // JALUR C: Dummy teks jika berkas fisik benar-benar tidak terdeteksi namun stage bernilai 2
            if (!$designFile && $defaultStageId === 2) {
                $designFile = $item['dummy_file_name'] ?? 'design_beli_langsung_customer.pdf';
            }

            // Simpan ke database order_item_designs
            if ($designFile || count($referenceFiles) > 0) {
                OrderItemDesign::create([
                    'order_item_id'   => $orderItem->id,
                    'design_file'     => $designFile,
                    'reference_files' => json_encode($referenceFiles),
                    'design_notes'    => $request->notes ?? null,
                    'design_status'   => 'pending',
                ]);
            }
        } // end foreach

        // 6. ✅ VALIDASI PERLINDUNGAN AKHIR STAGE ORDER
        // Jika salah satu item memiliki file cetak master asli, kunci status pesanan ke stage 2 (Siap Cetak)
        $hasReadyPrintFile = OrderItemDesign::whereIn('order_item_id', $order->items->pluck('id'))
            ->whereNotNull('design_file')
            ->exists();

        if ($hasReadyPrintFile || $defaultStageId === 2) {
            $order->update(['current_stage_id' => 2]);
            OrderItem::where('order_id', $order->id)->update(['order_stage_id' => 2]);
        }
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