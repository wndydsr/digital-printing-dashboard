<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
// Menggunakan Model yang sesuai dengan tabel di SQL kamu
use App\Models\Product; 
use App\Models\Order;

class ChatBotController extends Controller
{
    public function handleChat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
        ]);

        $userMessage = $request->input('message');
        $apiKey = env('GEMINI_API_KEY');

        if (!$apiKey) {
            return response()->json([
                'reply' => 'Error: GEMINI_API_KEY tidak ditemukan di file .env Laravel!'
            ], 500);
        }

        // =========================================================================
        // 1. DYNAMIC KNOWLEDGE: MEMBACA DAFTAR PRODUK DAN HARGA DARI DATABASE
        // =========================================================================
        try {
            // Mengambil kolom yang benar-benar ada di tabel `products` kamu
            $products = Product::where('status', 1)->get(['name', 'price', 'description']);
            
            $contextHarga = "DAFTAR HARGA & PRODUK AKTIF DI PERCETAKAN:\n";
            foreach ($products as $product) {
                $hargaTeks = ($product->price == 0) ? "Harga Custom / Tergantung Bahan & Ukuran" : "Rp " . number_format($product->price, 0, ',', '.');
                $deskripsiTeks = $product->description ? " (Ket: {$product->description})" : "";
                
                $contextHarga .= "- {$product->name}: {$hargaTeks}{$deskripsiTeks}\n";
            }
        } catch (\Exception $e) {
            // Fallback aman jika model belum di-setup dengan benar agar tidak langsung 500
            $contextHarga = "DAFTAR HARGA & PRODUK UTAMA:\n- Banner Flexy: Rp 50.000\n- Kartu Nama: Rp 30.000\n- Kaos Sablon: Rp 80.000\n";
        }

        // =========================================================================
        // 2. DYNAMIC KNOWLEDGE: DETEKSI OTOMATIS DAN CEK STATUS PESANAN (ORDERS)
        // =========================================================================
        $contextOrder = "";
        // Regex ini mendeteksi pola kode order kamu, seperti ORD-0043 atau ORD-0115
        if (preg_match('/ORD-\d+/i', $userMessage, $matches)) {
            $orderCode = strtoupper($matches[0]); // Ambil kode ordernya (ex: ORD-0043)
            
            try {
                // Relasikan ke tahapan order (tabel order_stages) menggunakan Eloquent jika sudah di-setup
                // Jika belum setup relasi, kita ambil data order dasarnya dulu
                $order = Order::where('order_code', $orderCode)->first();
                
                if ($order) {
                    // Ambil status stage manual berdasarkan ID jika belum set relasi di Model
                    $stageName = "Dalam Proses";
                    if ($order->current_stage_id) {
                        $stage = \DB::table('order_stages')->where('id', $order->current_stage_id)->first();
                        $stageName = $stage ? $stage->name : "Diproses";
                    }

                    $contextOrder = "\n[DATA PESANAN PELANGGAN DITEMUKAN]:\n"
                        . "- Kode Order: {$order->order_code}\n"
                        . "- Total Biaya: Rp " . number_format($order->total_price, 0, ',', '.') . "\n"
                        . "- Tahapan Proses Saat Ini: {$stageName}\n"
                        . "- Tanggal Masuk: {$order->order_date}\n";
                } else {
                    $contextOrder = "\n[DATA PESANAN]: Pelanggan mencari order dengan kode '{$orderCode}', tetapi sistem menyatakan kode tersebut TIDAK DITEMUKAN di database. Informasikan pelanggan dengan sopan.";
                }
            } catch (\Exception $e) {
                $contextOrder = ""; // Abaikan jika terjadi kendala query order
            }
        }

        // =========================================================================
        // 3. ENHANCED PROMPT (Nora dibuat makin expert & kontekstual)
        // =========================================================================
        $fullPrompt = "Konteks Utama:\n"
            . "Kamu adalah Nora, asisten AI profesional, sangat ramah, dan ahli di bidang Digital Printing & Percetakan.\n"
            . "Gunakan data internal riil dari database percetakan di bawah ini untuk menjawab pertanyaan pelanggan. JANGAN mengarang data!\n\n"
            
            . "{$contextHarga}\n"
            . "{$contextOrder}\n"
            
            . "Aturan Kerja Nora:\n"
            . "1. Selalu gunakan bahasa Indonesia yang sopan, santun, hangat, dan komunikatif.\n"
            . "2. Rumus Spanduk/Banner jika ditanya simulasi hitungan: (Panjang cm x Lebar cm) / 10.000 = Luas m2. Lalu dikalikan harga per m2.\n"
            . "3. Jika pelanggan menanyakan status pesanan, bacakan detail tahapan proses (seperti 'Butuh Desain', 'Siap Cetak', 'Cetak', atau 'Selesai') sesuai data '[DATA PESANAN PELANGGAN DITEMUKAN]' di atas dengan jelas.\n"
            . "4. Jika produk atau informasi tidak tertera pada data di atas, katakan dengan jujur dan tawarkan bantuan untuk disambungkan ke customer service manusia.\n\n"
            
            . "Pertanyaan Pelanggan: \"" . $userMessage . "\"\n"
            . "Jawaban Nora:";

        try {
            // Eksekusi ke Google Gemini API
            $response = Http::withoutVerifying()
                ->withHeaders([
                    'Content-Type' => 'application/json',
                ])
                ->post("https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key={$apiKey}", [
                    'contents' => [
                        [
                            'parts' => [
                                ['text' => $fullPrompt]
                            ]
                        ]
                    ]
                ]);

            if ($response->successful()) {
                $data = $response->json();
                $aiReply = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'Maaf, Nora saat ini sedang mengalami gangguan teknis. Bisa diulang kembali?';
                return response()->json(['reply' => $aiReply]);
            }

            return response()->json([
                'reply' => 'Google API Menolak (Status: ' . $response->status() . '). Pesan Asli: ' . $response->body()
            ], 500);

        } catch (\Exception $e) {
            return response()->json([
                'reply' => 'Laravel Exception Crash! Pesan: ' . $e->getMessage()
            ], 500);
        }
    }
}