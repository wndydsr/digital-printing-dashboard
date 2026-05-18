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
        dd($request->user());
        $filePath = null;

        if ($request->hasFile('file')) {

            $filePath = $request->file('file')
                ->store('chat-designs', 'public');
        }

        $message = Message::create([
            'order_id' => $orderId,
            'sender' => $request->sender,
            'message' => $request->message,
            'file' => $filePath,
            'is_design' => $request->hasFile('file'),
        ]);

        return response()->json($message);
    }
}