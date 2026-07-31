<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class PushSubscriptionController extends Controller
{
    // Simpan subscription baru dari frontend
    public function store(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        $userId = $request->user()->id;

        PushSubscription::updateOrCreate(
            [
                'user_id' => $userId,
                'endpoint' => $request->endpoint
            ],
            [
                'public_key' => $request->input('keys.p256dh'),
                'auth_token' => $request->input('keys.auth'),
            ]
        );

        return response()->json(['message' => 'Subscribed successfully'], 201);
    }

    // Kirim notif test / manual (nanti bisa dipanggil dari Smart Deadline Alert)
    public function sendTest(Request $request)
    {
        $webPush = new WebPush([
            'VAPID' => [
                'subject' => config('services.vapid.subject'),
                'publicKey' => config('services.vapid.public_key'),
                'privateKey' => config('services.vapid.private_key'),
            ],
        ]);

        $subscriptions = PushSubscription::all();

        foreach ($subscriptions as $sub) {
            $subscription = Subscription::create([
                'endpoint' => $sub->endpoint,
                'publicKey' => $sub->public_key,
                'authToken' => $sub->auth_token,
            ]);

            $webPush->queueNotification(
                $subscription,
                json_encode([
                    'title' => '⚠️ Peringatan Deadline Kritis!',
                    'body' => 'Pesanan #042 mendekati batas waktu pengerjaan!',
                ])
            );
        }

        foreach ($webPush->flush() as $report) {
            $endpoint = $report->getRequest()->getUri()->__toString();

            if (!$report->isSuccess()) {
                // Kalau gagal & subscription expired, hapus dari DB
                PushSubscription::where('endpoint', $endpoint)->delete();
            }
        }

        return response()->json(['message' => 'Notifications sent']);
    }

    // Endpoint buat kasih public key ke frontend (opsional, kalau gak pakai .env NEXT_PUBLIC)
    public function publicKey()
    {
        return response(config('services.vapid.public_key'));
    }
}