<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use App\Models\Customer;

class OrderController extends Controller
{
    public function index()
    {
        $orders = Order::with(['customer', 'stage.status', 'product'])
         ->orderBy('created_at', 'desc')
        ->get();

    return response()->json($orders);
    }

    public function store(Request $request)
    {
            try {
            // 🔥 tentukan customer
            if (!$request->customer_id && $request->customer_name) {
                $customer = Customer::create([
                    'name' => $request->customer_name
                ]);
                $customerId = $customer->id;
            } else {
                $customerId = $request->customer_id;
            }

            $order = Order::create([
                'product_id' => $request->product_id,
                'customer_id' => $customerId,
                'order_date' => now(),
                'total_price' => $request->total_price ?? 0,
                'notes' => $request->notes,
                'created_by' => 1,
                'current_stage_id' => 1,
            ]);

            return response()->json($order);
            } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'line' => $e->getLine(),
        ], 500);

    }
}
}