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

        // =========================================================================
        // 1. MEMBACA DAFTAR PRODUK DAN ATRIBUT DARI DATABASE
        // =========================================================================
        try {
            $products = Product::with('attributes.values')
                ->where('status', 1)
                ->get();
            
            $contextHarga = "DAFTAR PRODUK & BAHAN TERSEDIA DI DATABASE PERCETAKAN:\n";
            foreach ($products as $product) {
                $contextHarga .= "ID Produk: {$product->id} | Nama: {$product->name}\n";
                $contextHarga .= "- Harga Dasar: Rp " . number_format($product->price, 0, ",", ".") . "\n";
                $contextHarga .= "- Jenis: " . ($product->is_custom ? "Custom Ukuran (dihitung per meter persegi / m2)" : "Satuan Fixed") . "\n";

                if ($product->description) {
                    $contextHarga .= "- Deskripsi: {$product->description}\n";
                }

                if ($product->attributes->count() > 0) {
                    $contextHarga .= "- Opsi Atribut/Bahan:\n";
                    foreach ($product->attributes as $attribute) {
                        foreach ($attribute->values as $value) {
                            $contextHarga .= "  * [ID Atribut: {$value->id}] {$attribute->name} - {$value->name} (+Rp " . number_format($value->additional_price, 0, ",", ".") . ")\n";
                        }
                    }
                }
                $contextHarga .= "-----------------------------\n";
            }
        } catch (\Exception $e) {
            $contextHarga = "Sistem gagal membaca database produk.";
            $products = collect();
        }

        // =========================================================================
        // 2. DETEKSI CEK STATUS PESANAN (KODE ORDER)
        // =========================================================================
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
                    $contextOrder = "\n[DATA PESANAN]: Pelanggan menanyakan '{$orderCode}', namun TIDAK DITEMUKAN di database.";
                }
            } catch (\Exception $e) {
                $contextOrder = "";
            }
        }

        // =========================================================================
        // 3. PROMPT SYSTEM INSTRUCTION (INTERAKSI BERTATAP & BERTAHAP)
        // =========================================================================
        $systemInstruction = "Kamu adalah Nora, AI Assistant Percetakan Digital yang ramah, sopan, dan responsive.\n\n"
            . "DATA PRODUK TERSEDIA:\n{$contextHarga}\n"
            . "{$contextOrder}\n\n"
            . "ATURAN UTAMA PENJUALAN:\n"
            . "1. DILARANG menghitung harga manual di teks! Jika user beri ukuran (panjang x lebar) / pilihan bahan, PANGGIL fungsi `get_price_quote`.\n"
            . "2. JANGAN PERNAH panggil `create_order_summary` jika informasi berikut BELUM DIJAWAB OLEH USER:\n"
            . "   - Ukuran (panjang x lebar)\n"
            . "   - Bahan / Atribut yang dipilih\n"
            . "   - Jumlah (qty)\n"
            . "   - Tanggal Deadline / Kapan dibutuhkan\n"
            . "   - Status Desain (sudah punya file atau butuh dibuatkan)\n"
            . "3. Jika user baru bilang 'mau pesen banner' atau 'belum', TANYAKAN dulu ukurannya berapa & mau pakai bahan apa secara ramah. JANGAN LANGSUNG CHECKOUT!\n"
            . "4. Jika semua data (1-5) sudah dijawab user dan user bilang 'ya / setuju / mau checkout', BARU panggil function `create_order_summary`.";

        // =========================================================================
        // 4. DEFINISI TOOLS GEMINI
        // =========================================================================
        $tools = [[
            'function_declarations' => [
                [
                    'name' => 'get_price_quote',
                    'description' => 'Gunakan untuk menghitung estimasi harga dari sistem saat spesifikasi ukuran/bahan diketahui.',
                    'parameters' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'product_id' => ['type' => 'INTEGER'],
                            'quantity' => ['type' => 'INTEGER'],
                            'panjang_cm' => ['type' => 'NUMBER', 'description' => 'Panjang dalam cm.'],
                            'lebar_cm' => ['type' => 'NUMBER', 'description' => 'Lebar dalam cm.'],
                            'attribute_value_ids' => ['type' => 'ARRAY', 'items' => ['type' => 'INTEGER']],
                        ],
                        'required' => ['product_id', 'quantity'],
                    ],
                ],
                [
                    'name' => 'create_order_summary',
                    'description' => 'HANYA dipanggil jika ukuran, bahan, qty, deadline, DAN butuh_desain SUDAH DIJAWAB SEMUA oleh pelanggan.',
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

        // =========================================================================
        // 5. RIWAYAT PERCAKAPAN
        // =========================================================================
        $contents = [];
        foreach ($history as $h) {
            $contents[] = [
                'role' => (($h['role'] ?? 'user') === 'ai') ? 'model' : 'user',
                'parts' => [['text' => $h['text'] ?? '']],
            ];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $userMessage]]];

        // =========================================================================
        // 6. EKSEKUSI GEMINI API
        // =========================================================================
        try {
            $orderSummary = null;
            $finalText = null;

            $apiKeys = array_filter([
                env('GEMINI_API_KEY'),
                env('GEMINI_API_KEY_2'),
                env('GEMINI_API_KEY_3'),
            ]);

            if (empty($apiKeys)) {
                return response()->json(['reply' => 'GEMINI_API_KEY belum diset di .env'], 500);
            }

            $response = null;

            foreach ($apiKeys as $apiKey) {
                for ($i = 0; $i < 5; $i++) {
                    $response = Http::withoutVerifying()
                        ->withHeaders(['Content-Type' => 'application/json'])
                        ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={$apiKey}", [
                            'system_instruction' => [
                                'parts' => [['text' => $systemInstruction]]
                            ],
                            'contents' => $contents,
                            'tools' => $tools,
                        ]);

                    if ($response->status() === 429) break;

                    if (!$response->successful()) {
                        Log::error('Gemini API Error', ['status' => $response->status(), 'body' => $response->body()]);
                        break;
                    }

                    $data = $response->json();
                    $candidateContent = $data['candidates'][0]['content'] ?? null;
                    $parts = $candidateContent['parts'] ?? [];

                    $functionCallPart = collect($parts)->firstWhere('functionCall');

                    // Jika respon balasan teks biasa
                    if (!$functionCallPart) {
                        $finalText = collect($parts)->pluck('text')->filter()->implode("\n");
                        break 2;
                    }

                    // Jika AI panggil function
                    $fnName = $functionCallPart['functionCall']['name'];
                    $fnArgs = $functionCallPart['functionCall']['args'] ?? [];
                    $fnResult = $this->executeFunction($fnName, $fnArgs, $products);

                    if ($fnName === 'create_order_summary' && ($fnResult['success'] ?? false)) {
                        $orderSummary = $fnResult['data'];
                    }

                    $contents[] = $candidateContent;
                    $contents[] = [
                        'role' => 'function',
                        'parts' => [[
                            'functionResponse' => [
                                'name' => $fnName,
                                'response' => $fnResult,
                            ],
                        ]],
                    ];
                }

                if ($response && $response->status() !== 429) {
                    break;
                }
            }

            return response()->json([
                'reply' => $finalText ?: "Ada yang bisa Nora bantu lagi terkait cetakanmu?",
                'ready_checkout' => !is_null($orderSummary),
                'order_summary' => $orderSummary,
            ]);

        } catch (\Exception $e) {
            return response()->json(['reply' => 'Server Error: ' . $e->getMessage()], 500);
        }
    }

    private function executeFunction(string $name, array $args, $products): array
    {
        if (!in_array($name, ['get_price_quote', 'create_order_summary'])) {
            return ['success' => false, 'error' => 'Fungsi tidak valid.'];
        }

        $product = $products->firstWhere('id', $args['product_id'] ?? null);
        if (!$product) {
            return ['success' => false, 'error' => 'Produk tidak ditemukan di database.'];
        }

        $quantity = max(1, (int) ($args['quantity'] ?? 1));
        $panjang = (float) ($args['panjang_cm'] ?? 0);
        $lebar = (float) ($args['lebar_cm'] ?? 0);
        $attributeValueIds = $args['attribute_value_ids'] ?? [];

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

        $totalHargaPerUnit = $hargaDasarPerMeter + $tambahanPerMeter;

        if ($product->is_custom && $panjang > 0 && $lebar > 0) {
            $luas = ($panjang * $lebar) / 10000;
            $hargaSatuan = $luas * $totalHargaPerUnit;
        } else {
            $hargaSatuan = $totalHargaPerUnit;
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