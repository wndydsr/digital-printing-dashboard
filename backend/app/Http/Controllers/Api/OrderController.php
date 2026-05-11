<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Stage;

class OrderController extends Controller
{
    public function index()
    {
        $orders = Order::with([
            'customer:id,name',
            'product:id,name',
            'stage:id,name,status_id',
            'stage.status:id,name'
        ])
        ->select('id','order_code','customer_id','product_id','total_price','order_date','current_stage_id', 'design_url', 'catatan', 'reference_file')
        ->orderBy('created_at', 'desc')
        ->get();

    return response()->json($orders);
    }


    public function store(Request $request)
    {
        try {
            if (!$request->customer_id && $request->customer_name) {
                $customer = Customer::create([
                    'name' => $request->customer_name
                ]);
                $customerId = $customer->id;
            } else {
                $customerId = $request->customer_id;
            }

            // 🔥 HANDLE UPLOAD
            $designPath = null;

            if ($request->hasFile('design')) {
                $file = $request->file('design');
                $designPath = $file->store('designs', 'public');
            }

            // 🔥 HANDLE FILE PENDUKUNG
           $referenceFiles = [];

            if ($request->hasFile('reference_files')) {

                foreach ($request->file('reference_files') as $file) {

                    $path = $file->store('references', 'public');

                    $referenceFiles[] = $path;
                }
            }

            // 🔥 AUTO STAGE
            if ($request->design_type === 'sudah_punya') {
                $stage = Stage::find(2); // Siap Cetak
            } else {
                $stage = Stage::find(1); // Butuh Desain
            }

            $order = Order::create([
                'product_id' => $request->product_id,
                'customer_id' => $customerId,
                'order_date' => now(),
                'total_price' => $request->total_price ?? 0,
                'notes' => $request->notes,
                'catatan' => $request->catatan,
                'created_by' => 1,
                'current_stage_id' => $stage->id, // 🔥 AUTO
                'qty' => $request->qty,
                'design_url' => $designPath,
                'reference_file' => $referenceFiles,
            ]);

            return response()->json($order);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage(),
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
            'product:id,name',
            'stage:id,name,status_id',
            'stage.status:id,name'
        ])->findOrFail($id);

        return response()->json($order);
    }

    public function destroy($id)
    {
        $order = Order::find($id);

        if (!$order) {
            return response()->json(['message' => 'Not found'], 404);
        }

        $order->delete();

        return response()->json(['message' => 'Deleted']);
    }
}