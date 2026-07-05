<?php

namespace App\Http\Controllers\Api; // Sesuaikan jika kamu menaruhnya di dalam folder Api

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Midtrans\Snap;
use Midtrans\Config;
use Midtrans\Notification;

class PaymentController extends Controller
{
    public function checkout(Request $request)
    {
        // 1. Ambil data user yang sedang login via Sanctum
        $user = $request->user();

        // 2. Set konfigurasi Midtrans
        Config::$serverKey = env('MIDTRANS_SERVER_KEY');
        Config::$isProduction = false; 
        Config::$isSanitized = true;
        Config::$is3ds = true;

        // 3. Tangkap data dari Next.js (cukup orderId dan totalHarga)
        $orderId = $request->input('orderId') ?? 'PRINT-' . time();
        $totalHarga = $request->input('totalHarga');

        // 4. Susun parameter transaksi menggunakan data user dari token auth
        $params = [
            'transaction_details' => [
                'order_id' => $orderId,
                'gross_amount' => (int) $totalHarga,
            ],
            'customer_details' => [
                'first_name' => $user->name ?? 'Pelanggan',
                'email' => $user->email ?? 'pelanggan@mail.com',
            ],
        ];

        try {
            $snapToken = Snap::getSnapToken($params);
            
            return response()->json([
                'success' => true,
                'token' => $snapToken
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function notificationHandler(Request $request)
    {
        // 1. Inisialisasi konfigurasi Midtrans
        Config::$serverKey = env('MIDTRANS_SERVER_KEY');
        Config::$isProduction = false;

        try {
            // 2. Tangkap data notifikasi dari Midtrans
            $notif = new Notification();

            $transactionStatus = $notif->transaction_status;
            $orderId = $notif->order_id;
            $paymentType = $notif->payment_type;

            // 3. Cari data pesanan di database kamu berdasarkan $orderId
            // Contoh: $order = Order::where('invoice_number', $orderId)->first();

            if ($transactionStatus == 'settlement') {
                // 🔥 KODE KAMU DI SINI: Ubah status pesanan di databasemu menjadi "Lunas" / "Diproses"
                // Contoh: $order->update(['status' => 'paid']);
                
            } else if ($transactionStatus == 'pending') {
                // Ubah status menjadi "Menunggu Pembayaran"
                // Contoh: $order->update(['status' => 'pending']);
                
            } else if (in_array($transactionStatus, ['deny', 'expire', 'cancel'])) {
                // Ubah status menjadi "Gagal / Kedaluwarsa"
                // Contoh: $order->update(['status' => 'failed']);
            }

            return response()->json(['message' => 'Notification handled successfully']);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}