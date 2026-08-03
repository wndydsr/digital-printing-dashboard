<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use App\Models\Customer;
use App\Models\Stage;
use App\Models\OrderItem;
use App\Models\OrderItemDesign;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;
use App\Models\PushSubscription;

class OrderController extends Controller
{
    const STAGE_BUTUH_DESAIN     = 1; 
    const STAGE_SIAP_CETAK       = 2; 
    const STAGE_DESAIN           = 3; 
    const STAGE_CETAK            = 4; 
    const STAGE_SELESAI          = 5; 
    const STAGE_ANTREAN_DESAIN   = 6; 
    const STAGE_MENUNGGU_PEMBAYARAN = 7; 
    const STAGE_DIBATALKAN       = 8; 

    public function index()
    {
        $orders = Order::with([
            'customer:id,name',
            'items.product:id,name',
            'items.stage:id,name',
            'items.design:id,order_item_id,design_file,reference_files,design_notes',
            'stage:id,name,status_id',
            'stage.status:id,name',
            'designer'
        ])
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($orders);
    }

    public function getCustomerOrders($customer_id)
    {
        Order::where('customer_id', $customer_id)
        ->where('current_stage_id', self::STAGE_MENUNGGU_PEMBAYARAN)
        ->where('created_at', '<=', now()->subMinutes(30))
        ->update([
            'current_stage_id' => self::STAGE_DIBATALKAN
        ]);

        $orders = Order::with([
            'customer:id,name',
            'order_items.product:id,name,price,photo',
            'stage:id,name,status_id',
            'stage.status:id,name',
            'designer:id,name'
        ])
        ->where('customer_id', $customer_id) 
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json(['data' => $orders]);
    }

    public function designerOrders(Request $request)
    {
        $user = $request->user();
        $isHistory = $request->query('status') === 'history';

        $allowedStages = $isHistory
            ? [self::STAGE_SIAP_CETAK, self::STAGE_CETAK, self::STAGE_SELESAI]
            : [self::STAGE_BUTUH_DESAIN, self::STAGE_DESAIN];

        $orders = Order::with([
            'customer:id,name',
            'items' => function ($query) use ($allowedStages) {
                $query->whereIn('order_stage_id', $allowedStages); 
            },
            'items.product:id,name',
            'items.stage:id,name,status_id',
            'items.design:id,order_item_id,design_file,reference_files,design_notes',
            'stage:id,name,status_id',
            'stage.status:id,name',
            'designer'
        ])
        ->where('designer_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->get()
        ->filter(function ($order) {
            return $order->items->count() > 0;
        })
        ->values(); 

        return response()->json($orders);
    }

    public function store(Request $request)
    {
        DB::beginTransaction();

        try {
            if (!$request->customer_id && $request->customer_name) {
                $customer   = Customer::create(['name' => $request->customer_name]);
                $customerId = $customer->id;
            } else {
                $customerId = $request->customer_id;
            }

            $defaultStageId = self::STAGE_MENUNGGU_PEMBAYARAN;

            $needsDesign = false;
            if ($request->has('items') && is_array($request->items)) {
                foreach ($request->items as $item) {
                    if (isset($item['need_design']) && filter_var($item['need_design'], FILTER_VALIDATE_BOOLEAN)) {
                        $needsDesign = true;
                        break;
                    }
                }
            }

            $itemDefaultStageId = self::STAGE_SIAP_CETAK;
            if ($needsDesign) {
                $hasDesigner = false;
                foreach ($request->items as $item) {
                    if (!empty($item['designer_id'])) {
                        $hasDesigner = true;
                        break;
                    }
                }
                $itemDefaultStageId = $hasDesigner ? self::STAGE_BUTUH_DESAIN : self::STAGE_ANTREAN_DESAIN;
            } else if ($request->input('design_method') === 'ready-to-print') {
                $itemDefaultStageId = self::STAGE_SIAP_CETAK;
            }

            $order = Order::create([
                'customer_id'       => $customerId,
                'order_date'        => now(),
                'total_price'       => 0,
                'notes'             => $request->notes,
                'created_by'        => 1,
                'current_stage_id'  => $defaultStageId,
                'shipping_method'   => $request->input('shipping_method', 'pickup'),
                'shipping_cost'     => $request->input('shipping_cost', 0),
                'shipping_latitude' => $request->input('shipping_latitude'),
                'shipping_longitude'=> $request->input('shipping_longitude'),
                'designer_id'       => null,
            ]);

            $totalPrice = 0;

            foreach ($request->items as $index => $item) {
                $product = Product::findOrFail($item['product_id'] ?? $item['id']);
                $qty = (int) $item['quantity'];
                
                $panjang = (float) ($item['panjang'] ?? 0);
                $lebar = (float) ($item['lebar'] ?? 0);
                $luasM2 = ($panjang * $lebar) / 10000;
                $hargaPerMeter = (float) $product->price;

                if (!empty($item['attributes'])) {
                    $attributeValues = \App\Models\ProductAttributeValue::whereIn('id', $item['attributes'])->get();
                    foreach ($attributeValues as $value) {
                        $hargaPerMeter += (float) $value->additional_price;
                    }
                }

                $product_is_custom = $product->is_custom == 1 || $product->is_custom === true;
                $hargaPerItem = ($product_is_custom && $luasM2 > 0) ? ($luasM2 * $hargaPerMeter) : $hargaPerMeter;
                $subtotal = $hargaPerItem * $qty;
                $totalPrice += $subtotal;

                $itemStageId = $itemDefaultStageId;
                if (isset($item['need_design']) && filter_var($item['need_design'], FILTER_VALIDATE_BOOLEAN)) {
                    $itemStageId = (!empty($item['designer_id'])) ? self::STAGE_BUTUH_DESAIN : self::STAGE_ANTREAN_DESAIN;
                } else if ($request->input('design_method') === 'ready-to-print') {
                    $itemStageId = self::STAGE_SIAP_CETAK;
                } else {
                    $itemStageId = (int) $request->input('current_stage_id', self::STAGE_SIAP_CETAK);
                }

                $textCatatan = $item['catatan'] ?? null;

                $cartItem = \App\Models\CartItem::whereHas('cart', function ($q) use ($customerId) {
                    $q->where('customer_id', $customerId);
                })->where('product_id', $product->id)->first();

                if ($cartItem && empty($textCatatan)) {
                    $textCatatan = $cartItem->catatan;
                }
                
                $orderItem = OrderItem::create([
                    'order_id'       => $order->id,
                    'product_id'     => $product->id,
                    'quantity'       => $qty,
                    'panjang'        => $panjang,
                    'lebar'          => $lebar,
                    'price'          => $hargaPerItem,
                    'subtotal'       => $subtotal,
                    'catatan'        => $textCatatan,
                    'need_design'    => $item['need_design'] ?? false,
                    'order_stage_id' => $itemStageId, 
                    'details'        => $item['fields'] ?? '{}', 
                ]);

                $designFile = null;
                $referenceFiles = [];

                if ($request->hasFile("items.$index.design_file")) {
                    $files = $request->file("items.$index.design_file");
                    $fileToStore = is_array($files) ? $files[0] : $files;
                    $designFile = $fileToStore->store('designs', 'public');
                } else if (!empty($item['design_file']) && is_string($item['design_file'])) {
                    $designFile = $item['design_file'];
                }

                if ($request->hasFile("items.$index.reference_files")) {
                    $refFiles = $request->file("items.$index.reference_files");
                    $refFilesArray = is_array($refFiles) ? $refFiles : [$refFiles];
                    foreach ($refFilesArray as $file) {
                        $referenceFiles[] = $file->store('references', 'public');
                    }
                } else if (!empty($item['reference_files'])) {
                    $referenceFiles = is_array($item['reference_files']) 
                        ? $item['reference_files'] 
                        : json_decode($item['reference_files'], true) ?? [];
                }

                if (!$designFile && empty($referenceFiles)) {
                    $cartItem = \App\Models\CartItem::whereHas('cart', function ($q) use ($customerId) {
                        $q->where('customer_id', $customerId);
                    })->where('product_id', $product->id)->first();

                    if ($cartItem) {
                        $designFile = $cartItem->design_file;
                        $referenceFiles = $cartItem->reference_files ? json_decode($cartItem->reference_files, true) : [];
                    }
                }

                if (!$designFile && $itemStageId === self::STAGE_SIAP_CETAK) {
                    $rawName = $item['dummy_file_name'] ?? 'design_beli_langsung_customer.pdf';
                    $designFile = str_starts_with($rawName, 'designs/') ? $rawName : 'designs/' . $rawName;
                }

                if ($designFile || count($referenceFiles) > 0) {
                    OrderItemDesign::create([
                        'order_item_id'   => $orderItem->id,
                        'design_file'     => $designFile,
                        'reference_files' => json_encode($referenceFiles),
                        'design_notes'    => $item['design_notes'] ?? $request->notes ?? null,
                        'design_status'   => 'pending',
                    ]);
                }
            } 

            $order->update(['total_price' => $totalPrice]);

            if (!$request->input('is_direct', false)) {
                \App\Models\CartItem::whereHas('cart', function ($q) use ($customerId) {
                    $q->where('customer_id', $customerId);
                })->delete();
            }

            DB::commit();

            try {
                $auth = [
                    'VAPID' => [
                        'subject' => config('services.vapid.subject', 'mailto:prinoramystore@gmail.com'),
                        'publicKey' => config('services.vapid.public_key'),
                        'privateKey' => config('services.vapid.private_key'),
                    ],
                ];

                $webPush = new WebPush($auth);
                
                $adminSubscriptions = PushSubscription::whereHas('user', function($q) {
                    $q->where('role', 'admin');
                })->get();

                foreach ($adminSubscriptions as $sub) {
                    $subscription = Subscription::create([
                        'endpoint' => $sub->endpoint,
                        'publicKey' => $sub->public_key,
                        'authToken' => $sub->auth_token,
                    ]);

                    $webPush->queueNotification(
                        $subscription,
                        json_encode([
                            'title' => '🔔 Pesanan Baru Masuk!',
                            'body' => 'Ada pesanan baru dengan ID #' . $order->id . ' yang perlu segera diproses.',
                            'url' => 'https://admin.prinora.store/admin/pesanan'
                        ])
                    );
                }

                foreach ($webPush->flush() as $report) {
                    $endpoint = $report->getRequest()->getUri()->__toString();
                    if (!$report->isSuccess()) {
                        PushSubscription::where('endpoint', $endpoint)->delete();
                    }
                }
            } catch (\Exception $e) {
                Log::error('Gagal mengirim push notification pesanan baru ke admin: ' . $e->getMessage());
            }

            return response()->json([
                'message' => 'Order berhasil dibuat',
                'data'    => $order->load('items.design'),
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'error' => $e->getMessage(),
                'line'  => $e->getLine(),
            ], 500);
        }
    }
    
    public function update(Request $request, $id)
    {
        try {
            $order = Order::findOrFail($id);

            if ($request->stage) {
                $stageStr = strtolower($request->stage);
                $stageId = null;

                if ($stageStr === 'desain' || $stageStr === 'diproses') {
                    $stageId = self::STAGE_DESAIN; 
                    if (empty($order->designer_id) && $request->user()) {
                        $order->designer_id = $request->user()->id;
                    }
                } elseif ($stageStr === 'butuh desain') {
                    $stageId = self::STAGE_BUTUH_DESAIN; 
                } elseif ($stageStr === 'antrean desain') {
                    $stageId = self::STAGE_ANTREAN_DESAIN; 
                } else {
                    $stage = Stage::whereRaw(
                        'LOWER(name) = ?',
                        [$stageStr]
                    )->first();
                    $stageId = $stage ? $stage->id : null;
                }

                if ($stageId) {
                    $order->current_stage_id = $stageId;

                    if ($request->filled('order_item_id')) {
                        OrderItem::where('id', $request->order_item_id)
                            ->update([
                                'order_stage_id' => $stageId
                            ]);
                    } else {
                        OrderItem::where('order_id', $order->id)
                            ->update([
                                'order_stage_id' => $stageId
                            ]);
                    }
                }
            }

            $order->save();

            return response()->json([
                'message' => 'Order updated successfully',
                'data' => $order->load(['items.stage.status', 'stage.status', 'designer']) 
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
            'items.product:id,name',
            'items.stage:id,name', 
            'items.design:id,order_item_id,design_file,reference_files,design_notes',
            'stage:id,name,status_id',
            'stage.status:id,name'
        ])->findOrFail($id);

        return response()->json($order);
    }

    public function destroy($id)
    {
        DB::beginTransaction();

        try {
            $order = Order::with('items.design')->find($id);

            if (!$order) {
                return response()->json([
                    'message' => 'Not found'
                ], 404);
            }

            foreach ($order->items as $item) {
                if ($item->design) {
                    $item->design->delete();
                }
                $item->delete();
            }

            $order->delete();

            DB::commit();

            return response()->json([
                'message' => 'Deleted'
            ]);

        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function downloadDesign($filename)
    {
        $decodedFilename = urldecode($filename);

        $pathRoot = storage_path('app/public/' . $decodedFilename);
        $pathDesigns = storage_path('app/public/designs/' . $decodedFilename);
        $pathChat = storage_path('app/public/chat-designs/' . $decodedFilename);

        if (File::exists($pathRoot)) {
            return response()->download($pathRoot);
        } elseif (File::exists($pathDesigns)) {
            return response()->download($pathDesigns);
        } elseif (File::exists($pathChat)) {
            return response()->download($pathChat);
        }

        return response()->json([
            'message' => 'File tidak ditemukan di path storage mana pun.',
            'filename' => $decodedFilename
        ], 404);
    }

    public function assignDesigner(Request $request, $id)
    {
        $request->validate([
            'designer_id' => 'required|exists:users,id'
        ]);

        $order = Order::findOrFail($id);
        $order->designer_id = $request->designer_id;

        if ($order->current_stage_id == self::STAGE_ANTREAN_DESAIN) {
            $order->current_stage_id = self::STAGE_BUTUH_DESAIN;
        }

        $order->save();

        OrderItem::where('order_id', $order->id)
            ->where('order_stage_id', self::STAGE_ANTREAN_DESAIN)
            ->update([
                'order_stage_id' => self::STAGE_BUTUH_DESAIN
            ]);

        try {
            $webPush = new WebPush([
                'VAPID' => [
                    'subject' => config('services.vapid.subject', 'mailto:prinoramystore@gmail.com'),
                    'publicKey' => config('services.vapid.public_key'),
                    'privateKey' => config('services.vapid.private_key'),
                ],
            ]);

            $subscriptions = PushSubscription::where('user_id', $request->designer_id)->get();

            foreach ($subscriptions as $sub) {
                $subscription = Subscription::create([
                    'endpoint' => $sub->endpoint,
                    'publicKey' => $sub->public_key,
                    'authToken' => $sub->auth_token,
                ]);

                $webPush->queueNotification(
                    $subscription,
                    json_encode([
                        'title' => '🎨 Tugas Desain Baru Masuk! (#' . $order->id . ')',
                        'body' => 'Anda telah ditugaskan pada pesanan #' . $order->id . '. Status: Butuh Desain. Segera kerjakan!',
                        'url' => 'https://admin.prinora.store/desainer/antrian'
                    ])
                );
            }

            foreach ($webPush->flush() as $report) {
                $endpoint = $report->getRequest()->getUri()->__toString();
                if (!$report->isSuccess()) {
                    $statusCode = $report->getResponse() ? $report->getResponse()->getStatusCode() : null;
                    if (in_array($statusCode, [404, 410])) {
                        PushSubscription::where('endpoint', $endpoint)->delete();
                    }
                }
            }
        } catch (\Exception $e) {
            Log::error('Gagal mengirim push notification ke desainer: ' . $e->getMessage());
        }

        return response()->json([
            'message' => 'Desainer berhasil ditugaskan dan notifikasi terkirim',
            'data' => $order->load('designer', 'stage')
        ]);
    }

    public function getKurirOrders(Request $request)
    {
        $orders = Order::with([
            'customer:id,name,phone,address',
            'items.product:id,name',
            'stage:id,name'
        ])
        ->where('shipping_method', 'delivery')
        ->whereIn('current_stage_id', [self::STAGE_CETAK, self::STAGE_SELESAI])
        ->orderBy('created_at', 'desc')
        ->get();

        return response()->json($orders);
    }

    public function updateStage(Request $request, $id)
    {
        try {
            $order = Order::findOrFail($id);
            $oldStageId = $order->current_stage_id;

            if ($request->has('current_stage_id')) {
                $order->current_stage_id = $request->current_stage_id;
                
                OrderItem::where('order_id', $order->id)->update([
                    'order_stage_id' => $request->current_stage_id
                ]);
            }

            $order->save();

            // 🌟 KIRIM PUSH NOTIFIKASI KE CUSTOMER JIKA BERUBAH KE TAHAP SELESAI (STAGE 5)
            if ($oldStageId != self::STAGE_SELESAI && $order->current_stage_id == self::STAGE_SELESAI) {
                try {
                    $webPush = new WebPush([
                        'VAPID' => [
                            'subject' => config('services.vapid.subject', 'mailto:prinoramystore@gmail.com'),
                            'publicKey' => config('services.vapid.public_key'),
                            'privateKey' => config('services.vapid.private_key'),
                        ],
                    ]);

                    $customerSubscriptions = PushSubscription::where('user_id', $order->customer_id)->get();

                    foreach ($customerSubscriptions as $sub) {
                        $subscription = Subscription::create([
                            'endpoint' => $sub->endpoint,
                            'publicKey' => $sub->public_key,
                            'authToken' => $sub->auth_token,
                        ]);

                        $webPush->queueNotification(
                            $subscription,
                            json_encode([
                                'title' => '🎉 Pesanan Selesai!',
                                'body' => 'Pesanan #' . ($order->order_code ?? $order->id) . ' telah selesai dikerjakan.',
                                'url' => 'https://prinora.store/my-account?tab=orders'
                            ])
                        );
                    }

                    foreach ($webPush->flush() as $report) {
                        $endpoint = $report->getRequest()->getUri()->__toString();
                        if (!$report->isSuccess()) {
                            $statusCode = $report->getResponse() ? $report->getResponse()->getStatusCode() : null;
                            if (in_array($statusCode, [404, 410])) {
                                PushSubscription::where('endpoint', $endpoint)->delete();
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::error('Gagal mengirim push notification ke customer via updateStage: ' . $e->getMessage());
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Tahapan order berhasil diperbarui di database percetakan',
                'data' => $order->load('stage')
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateItemStage(Request $request, $id)
    {
        try {
            $item = \App\Models\OrderItem::findOrFail($id);
            $oldStageId = $item->order_stage_id;

            if ($request->has('current_stage_id')) {
                $item->order_stage_id = $request->current_stage_id;
                $item->save();
            }

            $orderId = $item->order_id;
            $order = Order::findOrFail($orderId);
            $oldOrderStage = $order->current_stage_id;
            $totalItems = \App\Models\OrderItem::where('order_id', $orderId)->count();
            
            $finishedItems = \App\Models\OrderItem::where('order_id', $orderId)
                ->where('order_stage_id', self::STAGE_SELESAI)
                ->count();

            if ($totalItems === $finishedItems) {
                Order::where('id', $orderId)->update(['current_stage_id' => self::STAGE_SELESAI]);
                $order->current_stage_id = self::STAGE_SELESAI;
            } else {
                Order::where('id', $orderId)->update(['current_stage_id' => $item->order_stage_id]);
                $order->current_stage_id = $item->order_stage_id;
            }

            // 🌟 KIRIM PUSH NOTIFIKASI KE CUSTOMER KETIKA STATUS TOTAL ORDER BERUBAH MENJADI SELESAI
            if ($oldOrderStage != self::STAGE_SELESAI && $order->current_stage_id == self::STAGE_SELESAI) {
                try {
                    $webPush = new WebPush([
                        'VAPID' => [
                            'subject' => config('services.vapid.subject', 'mailto:prinoramystore@gmail.com'),
                            'publicKey' => config('services.vapid.public_key'),
                            'privateKey' => config('services.vapid.private_key'),
                        ],
                    ]);

                    $customerSubscriptions = PushSubscription::where('user_id', $order->customer_id)->get();

                    foreach ($customerSubscriptions as $sub) {
                        $subscription = Subscription::create([
                            'endpoint' => $sub->endpoint,
                            'publicKey' => $sub->public_key,
                            'authToken' => $sub->auth_token,
                        ]);

                        $webPush->queueNotification(
                            $subscription,
                            json_encode([
                                'title' => '🎉 Pesanan Selesai!',
                                'body' => 'Pesanan #' . ($order->order_code ?? $order->id) . ' telah selesai dikerjakan.',
                                'url' => 'https://prinora.store/my-account?tab=orders'
                            ])
                        );
                    }

                    foreach ($webPush->flush() as $report) {
                        $endpoint = $report->getRequest()->getUri()->__toString();
                        if (!$report->isSuccess()) {
                            $statusCode = $report->getResponse() ? $report->getResponse()->getStatusCode() : null;
                            if (in_array($statusCode, [404, 410])) {
                                PushSubscription::where('endpoint', $endpoint)->delete();
                            }
                        }
                    }
                } catch (\Exception $e) {
                    Log::error('Gagal mengirim push notification ke customer via updateItemStage: ' . $e->getMessage());
                }
            }

            if ($oldStageId != $item->order_stage_id && in_array($item->order_stage_id, [self::STAGE_CETAK, self::STAGE_SELESAI]) && $order->shipping_method === 'delivery') {
                try {
                    $webPush = new WebPush([
                        'VAPID' => [
                            'subject' => config('services.vapid.subject', 'mailto:prinoramystore@gmail.com'),
                            'publicKey' => config('services.vapid.public_key'),
                            'privateKey' => config('services.vapid.private_key'),
                        ],
                    ]);

                    $kurirSubscriptions = PushSubscription::whereHas('user', function($q) {
                        $q->where('role', 'kurir');
                    })->get();

                    foreach ($kurirSubscriptions as $sub) {
                        $subscription = Subscription::create([
                            'endpoint' => $sub->endpoint,
                            'publicKey' => $sub->public_key,
                            'authToken' => $sub->auth_token,
                        ]);

                        $webPush->queueNotification(
                            $subscription,
                            json_encode([
                                'title' => '📦 Paket Siap Dikirim! (#' . $order->id . ')',
                                'body' => 'Pesanan #' . $order->id . ' dengan pengiriman kurir sudah masuk tahap cetak/selesai dan siap untuk dikirim.',
                                'url' => 'https://admin.prinora.store/kurir'
                            ])
                        );
                    }
                        
                    foreach ($webPush->flush() as $report) {
                        $endpoint = $report->getRequest()->getUri()->__toString();
                        if (!$report->isSuccess()) {
                            PushSubscription::where('endpoint', $endpoint)->delete();
                        }
                    }
                } catch (\Exception $e) {
                    Log::error('Gagal mengirim push notification ke kurir: ' . $e->getMessage());
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Tahapan item produk berhasil diperbarui secara mandiri.',
                'data' => $item->load('product')
            ]);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => 'Gagal memperbarui status item: ' . $e->getMessage()
            ], 500);
        }
    }

    public function cancelOrder($id)
    {
        DB::beginTransaction();
        try {
            $order = Order::findOrFail($id);

            if ($order->current_stage_id != self::STAGE_MENUNGGU_PEMBAYARAN) {
                return response()->json([
                    'message' => 'Pesanan tidak dapat dibatalkan karena sudah diproses.'
                ], 400);
            }

            $order->current_stage_id = self::STAGE_DIBATALKAN;
            $order->save();

            OrderItem::where('order_id', $order->id)->update([
                'order_stage_id' => self::STAGE_DIBATALKAN
            ]);

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Pesanan berhasil dibatalkan.'
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}