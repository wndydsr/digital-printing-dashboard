<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Product; 
use App\Models\Order;

class ChatBotController extends Controller
{
    public function handleChat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'history' => 'nullable|array',
        ]);

        $userMessage = $request->input('message');
        $history = $request->input('history', []);

        // -------------------------------------------------------------------------
        // 1. DATA PRODUK DARI DATABASE
        // -------------------------------------------------------------------------
        try {
            $products = Product::with('attributes.values')
                ->where('status', 1)
                ->get();
            
            $contextHarga = "DAFTAR HARGA & PRODUK AKTIF DI PERCETAKAN:\n";
            foreach ($products as $product) {
                $contextHarga .= "ID: {$product->id} | Produk: {$product->name}\n";
                $contextHarga .= "Harga Dasar: Rp " . number_format($product->price, 0, ",", ".") . " per m2/unit\n";
                $contextHarga .= "Custom Ukuran: " . ($product->is_custom ? "Ya" : "Tidak") . "\n";

                if ($product->description) {
                    $contextHarga .= "Deskripsi: {$product->description}\n";
                }

                foreach ($product->attributes as $attribute) {
                    $contextHarga .= "{$attribute->name}:\n";
                    foreach ($attribute->values as $value) {
                        $contextHarga .= "- [ID: {$value->id}] {$value->name} (+Rp " . number_format($value->additional_price, 0, ",", ".") . ")\n";
                    }
                }
                $contextHarga .= "\n-----------------------------\n";
            }
        } catch (\Exception $e) {
            $contextHarga = "Sistem gagal mengambil data produk dari database.";
            $products = collect();
        }

        // -------------------------------------------------------------------------
        // 2. CEK DATA ORDER
        // -------------------------------------------------------------------------
        $contextOrder = "";
        if (preg_match('/ORD-\d+/i', $userMessage, $matches)) {
            $orderCode = strtoupper($matches[0]);
            try {
                $order = Order::where('order_code', $orderCode)->first();
                if ($order) {
                    $stageName = "Dalam Proses";
                    if ($order->current_stage_id) {
                        $stage = DB::table('order_stages')->where('id', $order->current_stage_id)->first();
                        $stageName = $stage ? $stage->name : "Diproses";
                    }

                    $contextOrder = "\n[DATA PESANAN TERKINI DITEMUKAN]:\n"
                        . "- Kode Order: {$order->order_code}\n"
                        . "- Total: Rp " . number_format($order->total_price, 0, ',', '.') . "\n"
                        . "- Status Tahapan: {$stageName}\n"
                        . "- Tanggal Order: {$order->order_date}\n";
                } else {
                    $contextOrder = "\n[DATA PESANAN]: Pelanggan mencari order dengan kode '{$orderCode}', tetapi TIDAK DITEMUKAN di database.";
                }
            } catch (\Exception $e) {
                $contextOrder = "";
            }
        }

        // -------------------------------------------------------------------------
        // 3. SYSTEM INSTRUCTION (Pisahkan dari user prompt agar AI tidak bingung)
        // -------------------------------------------------------------------------
        $systemInstruction = "Kamu adalah Nora, AI Assistant Percetakan Digital yang ramah, sopan, dan terampil.\n\n"
            . "DATA PRODUK TERSEDIA:\n{$contextHarga}\n"
            . "{$contextOrder}\n\n"
            . "ATURAN UTAMA PENJUALAN:\n"
            . "1. DILARANG menghitung harga manual di teks! Jika user beri ukuran (panjang x lebar) atau memilih bahan, PANGGIL fungsi `get_price_quote`.\n"
            . "2. KONVERSI UKURAN: Jika user sebut ukuran dalam METER (misal 2x1m), konversikan ke CM saat panggil fungsi (panjang_cm: 200, lebar_cm: 100).\n"
            . "3. JANGAN PERNAH panggil `create_order_summary` jika Ukuran, Bahan, Qty, Deadline, dan Status Desain BELUM DIJAWAB LENGKAP oleh user.\n"
            . "4. Jawablah selalu menggunakan Bahasa Indonesia yang ramah dan membantu.";

        // -------------------------------------------------------------------------
        // 4. DEFINISI TOOLS GEMINI
        // -------------------------------------------------------------------------
        $tools = [[
            'function_declarations' => [
                [
                    'name' => 'get_price_quote',
                    'description' => 'Kalkulasi harga resmi dari sistem.',
                    'parameters' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'product_id' => ['type' => 'INTEGER'],
                            'quantity' => ['type' => 'INTEGER'],
                            'panjang_cm' => ['type' => 'NUMBER'],
                            'lebar_cm' => ['type' => 'NUMBER'],
                            'attribute_value_ids' => ['type' => 'ARRAY', 'items' => ['type' => 'INTEGER']],
                        ],
                        'required' => ['product_id', 'quantity'],
                    ],
                ],
                [
                    'name' => 'create_order_summary',
                    'description' => 'Dipanggil HANYA jika data (produk, ukuran, bahan, qty, deadline, butuh desain) SUDAH LENGKAP & user setuju checkout.',
                    'parameters' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'product_id' => ['type' => 'INTEGER'],
                            'quantity' => ['type' => 'INTEGER'],
                            'panjang_cm' => ['type' => 'NUMBER'],
                            'lebar_cm' => ['type' => 'NUMBER'],
                            'attribute_value_ids' => ['type' => 'ARRAY', 'items' => ['type' => 'INTEGER']],
                            'deadline' => ['type' => 'STRING'],
                            'need_design' => ['type' => 'BOOLEAN'],
                            'catatan' => ['type' => 'STRING'],
                        ],
                        'required' => ['product_id', 'quantity', 'deadline', 'need_design'],
                    ],
                ],
            ],
        ]];

        // -------------------------------------------------------------------------
        // 5. RIWAYAT PERCAKAPAN (CONTENTS)
        // -------------------------------------------------------------------------
        $contents = [];
        foreach ($history as $h) {
            $contents[] = [
                'role' => (($h['role'] ?? 'user') === 'ai') ? 'model' : 'user',
                'parts' => [['text' => $h['text'] ?? '']],
            ];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $userMessage]]];

        // -------------------------------------------------------------------------
        // 6. MULTI-KEY GEMINI EXECUTION LOOP (FIXED LOGIC)
        // -------------------------------------------------------------------------
        $apiKeys = array_filter([
            env('GEMINI_API_KEY'),
            env('GEMINI_API_KEY_2'),
            env('GEMINI_API_KEY_3'),
        ]);

        if (empty($apiKeys)) {
            return response()->json([
                'reply' => 'Error: Kunci GEMINI_API_KEY tidak ditemukan di file .env!'
            ], 500);
        }

        $orderSummary = null;
        $finalText = null;
        $isSuccess = false;

        // Loop mencoba setiap API Key satu per satu jika terjadi limit / error
        foreach ($apiKeys as $apiKey) {
            $currentContents = $contents; // Reset konteks percakapan untuk key baru jika me-retry

            for ($i = 0; $i < 5; $i++) {
                try {
                    $response = Http::withoutVerifying()
                        ->withHeaders(['Content-Type' => 'application/json'])
                        ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={$apiKey}", [
                            'system_instruction' => [
                                'parts' => [['text' => $systemInstruction]]
                            ],
                            'contents' => $currentContents,
                            'tools' => $tools,
                        ]);

                    // Jika Key ini Kena Limit (429) atau Error API, hentikan loop internal dan coba API Key berikutnya!
                    if ($response->status() === 429 || !$response->successful()) {
                        Log::warning("Gemini API Key gagal/limit. Status: {$response->status()}", ['body' => $response->body()]);
                        break 1; // Pindah ke API Key berikutnya di foreach
                    }

                    $data = $response->json();
                    $candidateContent = $data['candidates'][0]['content'] ?? null;
                    $parts = $candidateContent['parts'] ?? [];

                    $functionCallPart = collect($parts)->firstWhere('functionCall');

                    // 1. Jika AI memberikan respon TEKS (tanpa minta panggil fungsi)
                    if (!$functionCallPart) {
                        $finalText = collect($parts)->pluck('text')->filter()->implode("\n");
                        $isSuccess = true;
                        break 2; // BERHASIL TOTAL! Keluar dari loop for DAN foreach
                    }

                    // 2. Jika AI minta eksekusi Fungsi (Function Calling)
                    $fnName = $functionCallPart['functionCall']['name'];
                    $fnArgs = $functionCallPart['functionCall']['args'] ?? [];
                    $fnResult = $this->executeFunction($fnName, $fnArgs, $products);

                    if ($fnName === 'create_order_summary' && ($fnResult['success'] ?? false)) {
                        $orderSummary = $fnResult['data'];
                    }

                    // Masukkan riwayat panggilan fungsi agar Gemini membaca hasilnya di siklus berikutnya
                    $currentContents[] = $candidateContent;
                    $currentContents[] = [
                        'role' => 'function',
                        'parts' => [[
                            'functionResponse' => [
                                'name' => $fnName,
                                'response' => $fnResult,
                            ],
                        ]],
                    ];

                } catch (\Exception $e) {
                    Log::error('Exception saat memanggil Gemini API: ' . $e->getMessage());
                    break 1; // Jika koneksi crash, coba API Key berikutnya
                }
            }

            if ($isSuccess) {
                break; // Hentikan foreach jika pesan berhasil diproses
            }
        }

        // Jika semua API Key di .env habis/gagal
        if (!$isSuccess && is_null($finalText)) {
            return response()->json([
                'reply' => '⚠️ Semua kuota API Key cadangan sedang sibuk/habis. Silakan coba beberapa saat lagi.'
            ], 500);
        }

        return response()->json([
            'reply' => $finalText ?: "Ada yang bisa Nora bantu lagi terkait cetakanmu?",
            'ready_checkout' => !is_null($orderSummary),
            'order_summary' => $orderSummary,
        ]);
    }

    /**
     * Eksekusi Perhitungan Harga Resmi di Backend (PHP)
     */
    private function executeFunction(string $name, array $args, $products): array
    {
        if (!in_array($name, ['get_price_quote', 'create_order_summary'])) {
            return ['success' => false, 'error' => 'Fungsi tidak dikenal'];
        }

        $productId = $args['product_id'] ?? null;
        $product = $products->firstWhere('id', $productId) ?: $products->first();

        if (!$product) {
            return ['success' => false, 'error' => 'Produk tidak ditemukan di database.'];
        }

        $quantity = max(1, (int) ($args['quantity'] ?? 1));
        $panjang = (float) ($args['panjang_cm'] ?? 0);
        $lebar = (float) ($args['lebar_cm'] ?? 0);
        $attributeValueIds = is_array($args['attribute_value_ids'] ?? null) ? $args['attribute_value_ids'] : [];

        $hargaDasarPerMeter = (float) $product->price;
        $tambahanPerMeter = 0;
        $namaAtribut = [];

        foreach ($product->attributes as $attr) {
            foreach ($attr->values as $val) {
                if (in_array($val->id, $attributeValueIds)) {
                    $tambahanPerMeter += (float) $val->additional_price;
                    $namaAtribut[] = $val->name;
                }
            }
        }

        $totalHargaPerMeter = $hargaDasarPerMeter + $tambahanPerMeter;

        if ($product->is_custom && $panjang > 0 && $lebar > 0) {
            $luas = ($panjang * $lebar) / 10000; // cm2 ke m2
            $hargaSatuan = $luas * $totalHargaPerMeter;
        } else {
            $hargaSatuan = $totalHargaPerMeter;
        }

        $subtotal = $hargaSatuan * $quantity;

        $priceData = [
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => $quantity,
            'panjang_cm' => $panjang,
            'lebar_cm' => $lebar,
            'attribute_value_ids' => $attributeValueIds,
            'attribute_names' => $namaAtribut,
            'harga_satuan' => round($hargaSatuan),
            'subtotal' => round($subtotal),
        ];

        if ($name === 'get_price_quote') {
            return ['success' => true, 'data' => $priceData];
        }

        return ['success' => true, 'data' => array_merge($priceData, [
            'deadline' => $args['deadline'] ?? 'Standard',
            'need_design' => (bool) ($args['need_design'] ?? false),
            'catatan' => $args['catatan'] ?? '',
        ])];
    }
}