<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PushSubscription;
use Illuminate\Http\Request;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class PushSubscriptionController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        $customerStr = $request->header('X-Customer-Id') ?? $request->input('customer_id');
        
        $userId = null;
        if ($request->user()) {
            $userId = $request->user()->id;
        } elseif ($customerStr) {
            $userId = $customerStr;
        } else {
            return response()->json(['error' => 'Unauthorized or missing identifier'], 401);
        }

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
                PushSubscription::where('endpoint', $endpoint)->delete();
            }
        }

        return response()->json(['message' => 'Notifications sent']);
    }

    public function publicKey()
    {
        return response(config('services.vapid.public_key'));
    }
}