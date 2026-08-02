<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class MessageController extends Controller
{
   public function index(Request $request, $orderId)
    {
        try {
            // 🔥 AMBIL DATA FILTER BERDASARKAN QUERY PARAMETER ?item_id=
            $itemId = $request->query('item_id');

            // Cast $orderId menjadi integer untuk keamanan query
            $query = Message::where('order_id', (int)$orderId);

            // Validasi jika itemId ada dan merupakan angka valid sebelum di-query
            if ($itemId && is_numeric($itemId)) {
                $query->where('order_item_id', (int)$itemId);
            }

            $messages = $query->latest()->get();

            // 🌟 Pastikan mengembalikan data berformat JSON Array murni
            return response()->json($messages, 200);

        } catch (\Exception $e) {
            // Catat error sistem ke storage/logs/laravel.log agar bisa kamu pelajari detailnya
            Log::error("Gagal memuat pesan chat Order #{$orderId}: " . $e->getMessage());

            // Kembalikan array kosong dengan status 200 sebagai penangkal crash .reverse() di frontend
            return response()->json([], 200);
        }
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

        // Tangkap order_item_id yang dikirim dari FormData frontend
        $orderItemId = $request->input('order_item_id');

        $message = Message::create([
            'order_id' => (int)$orderId,
            'order_item_id' => $orderItemId ? (int)$orderItemId : null, // 🔥 SIMPAN IDENTITAS ITEM
            'sender' => $request->sender ?? 'desainer',
            'message' => $request->message,
            'file' => $filePath,
            'is_design' => $request->hasFile('file') || $request->input('is_design') == '1',
        ]);

        $message->refresh();

        broadcast(new \App\Events\MessageSent($message));

        return response()->json($message);
    }

    /**
     * Fitur menyetujui desain KHUSUS per item produk tertentu
     */
    public function approveDesign(Request $request, $orderId)
    {
        if (!is_numeric($orderId)) {
            return response()->json(['message' => 'ID Pesanan tidak valid.'], 400);
        }

        $orderItemId = $request->input('order_item_id');
        if (!$orderItemId) {
            return response()->json(['message' => 'ID Item produk wajib disertakan.'], 400);
        }

        try {
            // 1. Ambil spesifik item yang ingin diapprove
            $item = OrderItem::where('order_id', $orderId)->where('id', $orderItemId)->first();
            if (!$item) {
                return response()->json(['message' => 'Item produk tidak ditemukan.'], 404);
            }

            $oldStageId = $item->order_stage_id;

            // Update status item tersebut menjadi 2 (Siap Cetak) secara mandiri
            $item->update([
                'order_stage_id' => 2
            ]);

            // 2. CARI FILE DESAIN TERAKHIR SPESIFIK MILIK ITEM INI
            $lastDesignMessage = Message::where('order_id', $orderId)
                ->where('order_item_id', $orderItemId)
                ->where('sender', 'desainer')
                ->whereNotNull('file')
                ->latest()
                ->first();

            // 3. MASUKKAN PATH FILE KE RELASI OPERATOR (order_item_designs)
            if ($lastDesignMessage) {
                DB::table('order_item_designs')->updateOrInsert(
                    ['order_item_id' => $item->id],
                    [
                        'design_file' => $lastDesignMessage->file,
                        'design_status' => 'approved',
                        'updated_at' => now(),
                        'created_at' => now()
                    ]
                );
            }

            // Cek jika SEMUA item di order ini sudah di-approve (stage == 2), baru ubah stage induknya ke 2
            $totalItems = OrderItem::where('order_id', $orderId)->count();
            $approvedItems = OrderItem::where('order_id', $orderId)->where('order_stage_id', 2)->count();
            
            $order = Order::findOrFail($orderId);
            if ($totalItems === $approvedItems) {
                $order->update(['current_stage_id' => 2]);
            } else {
                $order->update(['current_stage_id' => 2]); // atau sesuaikan stage induk
            }

            // 🔔 TAMBAHAN: Kirim Notifikasi ke Operator karena desain disetujui & masuk Siap Cetak
            try {
                $webPush = new \Minishlink\WebPush\WebPush([
                    'VAPID' => [
                        'subject' => config('services.vapid.subject', 'mailto:prinoramystore@gmail.com'),
                        'publicKey' => config('services.vapid.public_key'),
                        'privateKey' => config('services.vapid.private_key'),
                    ],
                ]);

                $operatorSubscriptions = \App\Models\PushSubscription::whereHas('user', function($q) {
                    $q->where('role', 'operator');
                })->get();

                foreach ($operatorSubscriptions as $sub) {
                    $subscription = \Minishlink\WebPush\Subscription::create([
                        'endpoint' => $sub->endpoint,
                        'publicKey' => $sub->public_key,
                        'authToken' => $sub->auth_token,
                    ]);

                    $webPush->queueNotification(
                        $subscription,
                        json_encode([
                            'title' => '🖨️ Desain Selesai & Siap Cetak! (#' . $order->id . ')',
                            'body' => 'Desain untuk pesanan #' . $order->id . ' telah disetujui dan siap dicetak.',
                            'url' => 'https://admin.prinora.store/operator/antrian'
                        ])
                    );
                }

                foreach ($webPush->flush() as $report) {
                    $endpoint = $report->getRequest()->getUri()->__toString();
                    if (!$report->isSuccess()) {
                        \App\Models\PushSubscription::where('endpoint', $endpoint)->delete();
                    }
                }
            } catch (\Exception $e) {
                Log::error('Gagal mengirim push notification ke operator dari approveDesign: ' . $e->getMessage());
            }

            // 4. Buat log pesan otomatis di dalam room chat item tersebut
            $systemMessage = Message::create([
                'order_id' => (int)$orderId,
                'order_item_id' => (int)$orderItemId,
                'sender' => 'customer',
                'message' => '✔️ [SISTEM]: Customer telah menyetujui desain untuk item ini. Pesanan diteruskan ke bagian Cetak.',
                'file' => null,
                'is_design' => false,
            ]);

            $systemMessage->refresh();

            broadcast(new \App\Events\MessageSent($systemMessage));

            return response()->json([
                'status' => 'success',
                'message' => 'Desain item ini disetujui, dan berhasil diteruskan ke Operator.',
                'chat' => $systemMessage
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Terjadi kesalahan: ' . $e->getMessage()
            ], 500);
        }
    }}