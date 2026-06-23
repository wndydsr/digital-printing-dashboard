<?php

use App\Models\Order;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Log;

Broadcast::channel('chat.{orderId}', function ($user, $orderId) {
Log::info("DEBUG - Channel Auth:", ['user_id' => $user->id, 'orderId' => $orderId]);    
    
    $order = Order::find($orderId);
    if (!$order) {
        Log::info("DEBUG - Order tidak ditemukan:", ['orderId' => $orderId]);
        return false;
    }

    // Pastikan user ada
    if (!$user) return false;

    return (int) $user->id === (int) $order->customer_id || 
           (int) $user->id === (int) $order->designer_id;
           
}, ['guards' => ['sanctum']]);