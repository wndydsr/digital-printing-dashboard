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
        ->select('id','order_code','customer_id','product_id','total_price','order_date','current_stage_id', 'design_url')
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

            // 🔥 AUTO STAGE
            $stage = Stage::find(1); // Butuh Desain

            if ($designPath) {
                $stage = Stage::find(2); // Siap Cetak
            }

            $order = Order::create([
                'product_id' => $request->product_id,
                'customer_id' => $customerId,
                'order_date' => now(),
                'total_price' => $request->total_price ?? 0,
                'notes' => $request->notes,
                'created_by' => 1,
                'current_stage_id' => $stage->id, // 🔥 AUTO
                'qty' => $request->qty,
                'design_url' => $designPath
            ]);

            return response()->json($order);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage(),
            ], 500);
        }
    }


    protected $appends = ['design_full_url'];

    public function getDesignFullUrlAttribute()
    {
        return $this->design_url
            ? asset('storage/' . $this->design_url)
            : null;
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