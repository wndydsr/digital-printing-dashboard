<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB; // 🔥 Tambahkan Facade DB untuk updateOrInsert

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
        if (!is_numeric($orderId)) {
            return response()->json(['message' => 'ID Pesanan tidak valid.'], 400);
        }

        $filePath = null;
        if ($request->hasFile('file')) {
            $filePath = $request->file('file')->store('chat-designs', 'public');
        }

        $message = Message::create([
            'order_id' => (int)$orderId,
            'order_item_id' => $request->order_item_id,
            'sender' => $request->sender ?? 'desainer',
            'message' => $request->message,
            'file' => $filePath,
            'is_design' => $request->hasFile('file'),
        ]);

        // 🔥 FIX UTAMA: Ambil ulang data segar dari database agar field 'file' 
        // dan tipe data cast 'is_design' terisi penuh sebelum di-broadcast
        $message->refresh();

        broadcast(new \App\Events\MessageSent($message));

        return response()->json($message);
    }

    /**
     * Fitur untuk menyetujui desain, mengubah status menjadi Siap Cetak,
     * dan otomatis meneruskan file desain terakhir ke operator.
     */

   public function approveDesign(Request $request, $orderId)
    {
        if (!is_numeric($orderId)) {
            return response()->json(['message' => 'ID Pesanan tidak valid.'], 400);
        }

        try {
            // 1. Cari Order beserta item di dalamnya
            $order = Order::with('items')->find($orderId);
            if (!$order) {
                return response()->json(['message' => 'Pesanan tidak ditemukan.'], 404);
            }

            // Update status order menjadi 2 (Siap Cetak)
            $order->update([
                'current_stage_id' => 2 
            ]);

            // 2. CARI FILE DESAIN TERAKHIR YANG DIUNGGAH OLEH DESAINER
            $lastDesignMessage = Message::where('order_id', $orderId)
                ->where('sender', 'desainer')
                ->whereNotNull('file')
                ->latest()
                ->first();

            // 3. MASUKKAN PATH FILE KE RELASI OPERATOR (order_item_designs)
            if ($lastDesignMessage && $order->items && count($order->items) > 0) {
                foreach ($order->items as $item) {
                    DB::table('order_item_designs')->updateOrInsert(
                        ['order_item_id' => $item->id], // Cari berdasarkan order_item_id
                        [
                            'design_file' => $lastDesignMessage->file, // Ambil path file dari chat
                            'design_status' => 'approved',
                            'updated_at' => now(),
                            'created_at' => now()
                        ]
                    );
                }
            }

            // 4. Buat sistem log/pesan otomatis di chat
            $systemMessage = Message::create([
                'order_id' => (int)$orderId,
                'sender' => 'customer',
                'message' => '✔️ [SISTEM]: Customer telah menyetujui desain ini. Pesanan diteruskan ke bagian Cetak.',
                'file' => null,
                'is_design' => false,
            ]);

            // Pastikan model disegarkan agar broadcast membawa data yang valid
            $systemMessage->refresh();

            broadcast(new \App\Events\MessageSent($systemMessage));

            return response()->json([
                'status' => 'success',
                'message' => 'Desain disetujui, status pesanan sekarang Siap Cetak dan diteruskan ke Operator.',
                'chat' => $systemMessage
            ]);

        } catch (\Exception $e) {
            // 💡 JIKA ERROR, LARAVEL AKAN MEMBERITAHU NEXT.JS MASALAH ASLINYA APA
            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan internal server: ' . $e->getMessage()
            ], 500);
        }
    }
}