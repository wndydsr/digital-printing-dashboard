<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    public function index($orderId)
    {
        return Message::where('order_id', $orderId)
            ->latest()
            ->get();
    }

   public function store(Request $request, $orderId)
{
    // Tambahkan validasi agar tidak ada nilai 'undefined' masuk ke DB
    if (!is_numeric($orderId)) {
        return response()->json(['message' => 'ID Pesanan tidak valid.'], 400);
    }

    $filePath = null;
    if ($request->hasFile('file')) {
        $filePath = $request->file('file')->store('chat-designs', 'public');
    }

    $message = Message::create([
        'order_id' => (int)$orderId, // Pastikan dikonversi ke integer
        'sender' => $request->sender ?? 'desainer', // Beri nilai default jika kosong
        'message' => $request->message,
        'file' => $filePath,
        'is_design' => $request->hasFile('file'),
    ]);

    broadcast(new \App\Events\MessageSent($message));

    return response()->json($message);
}
}