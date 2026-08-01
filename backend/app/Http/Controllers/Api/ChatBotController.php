<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
// Menggunakan Model yang sesuai dengan tabel di SQL kamu
use App\Models\Product; 
use App\Models\Order;

class ChatBotController extends Controller
{
    public function handleChat(Request $request)
    {
        $request->validate([
            'message' => 'required|string',
            'history' => 'nullable|array', // 🔥 riwayat chat dari FE, [{role:'user'|'ai', text:'...'}]
        ]);

        $userMessage = $request->input('message');
        $history = $request->input('history', []);
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
            $products = Product::with('attributes.values')
                ->where('status',1)
                ->get();
            
            $contextHarga = "DAFTAR HARGA & PRODUK AKTIF DI PERCETAKAN:\n";
           foreach ($products as $product) {

            $contextHarga .= "Produk : {$product->name}\n";
            $contextHarga .= "Harga Dasar : Rp " . number_format($product->price,0,",",".") . "\n";
            $contextHarga .= "Custom : " . ($product->is_custom ? "Ya" : "Tidak") . "\n";

            if($product->description){
                $contextHarga .= "Deskripsi : {$product->description}\n";
            }

            foreach($product->attributes as $attribute){

                $contextHarga .= $attribute->name . " :\n";

                foreach($attribute->values as $value){

                    $contextHarga .= "- {$value->name} (+Rp " .
                    number_format($value->additional_price,0,",",".") .
                    ")\n";

                }

            }

            $contextHarga .= "\n-----------------------------\n";
        }
        } catch (\Exception $e) {
            // Fallback aman jika model belum di-setup dengan benar agar tidak langsung 500
            $contextHarga = "DAFTAR HARGA & PRODUK UTAMA:\n- Banner Flexy: Rp 50.000\n- Kartu Nama: Rp 30.000\n- Kaos Sablon: Rp 80.000\n";
            $products = collect(); // biar variabel $products tetap ada untuk dipakai di executeFunction
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
                        $stage = DB::table('order_stages')->where('id', $order->current_stage_id)->first();
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
        // 3. DAFTAR PRODUK DALAM FORMAT JSON UNTUK FUNCTION CALLING
        //    (contextHarga tetap dipakai sebagai bacaan umum, ini khusus biar Gemini
        //     tahu product_id & attribute_value_id yang VALID untuk dipanggil di tools)
        // =========================================================================
        $daftarProdukJson = $products->map(function ($p) {
            return [
                'id' => $p->id,
                'nama' => $p->name,
                'harga_dasar' => (float) $p->price,
                'is_custom' => (bool) $p->is_custom, // true = dihitung per luas (banner dll), rumus (panjang x lebar)/10000
                'atribut' => $p->attributes->map(function ($a) {
                    return [
                        'nama' => $a->name,
                        'pilihan' => $a->values->map(function ($v) {
                            return [
                                'id' => $v->id,
                                'nama' => $v->name,
                                'tambahan_harga' => (float) $v->additional_price,
                            ];
                        }),
                    ];
                }),
            ];
        })->toJson();

        // =========================================================================
        // 4. ENHANCED PROMPT (Nora dibuat makin expert & kontekstual)
        // =========================================================================
        $fullPrompt = "Konteks Utama:\n"
           . "Kamu adalah Nora, asisten AI profesional, sangat ramah, dan ahli di bidang Digital Printing & Percetakan.\n"
            . "Gunakan data internal riil dari database percetakan di bawah ini untuk menjawab pertanyaan pelanggan. JANGAN mengarang data!\n\n"
            
            . "{$contextHarga}\n"
            . "{$contextOrder}\n"
            
            ."Aturan Kerja Nora:\n"
            ."1. JANGAN PERNAH menghitung atau menebak harga sendiri di dalam teks balasan!\n"
            ."2. SETIAP KALI pelanggan menyebutkan ukuran (panjang/lebar) atau memilih bahan/atribut, ANDA WAJIB memanggil function `get_price_quote` terlebih dahulu untuk mendapatkan harga resmi dari sistem.\n"
            ."3. Jika pelanggan bertanya harga banner berdasarkan ukuran, kirim product_id, quantity, panjang_cm dan lebar_cm ke get_price_quote.\n"
            ."4. Jika pelanggan memilih bahan tertentu, sertakan attribute_value_ids sesuai id pada DAFTAR PRODUK JSON ke function `get_price_quote`.\n"
            ."5. Tunggu hasil balasan function, lalu gunakan harga dari sistem tersebut untuk menjawab pelanggan secara ramah.\n"
            ."6. Jika pelanggan ingin memesan (mengatakan 'ya' atau setuju), JANGAN langsung panggil function create_order_summary jika data belum lengkap. Cek dulu apakah **deadline** dan **kebutuhan desain** sudah diketahui.\n"
            ."7. Informasi yang harus dikumpulkan lengkap meliputi:\n"
            ."- Produk, Ukuran, Jumlah, Bahan\n"
            ."- Kapan deadline / tanggal jadinya?\n"
            ."- Apakah sudah memiliki desain sendiri atau butuh dibuatkan?\n"
            ."8. Jika user bilang 'ya' tapi deadline atau status desain belum ada, tanyakan informasi tersebut terlebih dahulu secara ramah (jangan borongan).\n"
            ."9. Setelah semua informasi lengkap (termasuk deadline & desain) DAN pelanggan setuju, WAJIB panggil function create_order_summary untuk memunculkan ringkasan.\n"
            ."10. Jika pelanggan mengecek status order gunakan DATA ORDER.\n\n"

            . "DAFTAR PRODUK JSON (untuk referensi id produk & id bahan saat memanggil function):\n"
            . "{$daftarProdukJson}\n\n"

            . "Pertanyaan Pelanggan: \"" . $userMessage . "\"\n"
            . "Jawaban Nora:";

        // =========================================================================
        // 5. DEFINISI TOOLS UNTUK GEMINI FUNCTION CALLING
        // =========================================================================
        $tools = [[
            'function_declarations' => [
                [
                    'name' => 'get_price_quote',
                    'description' => 'Menghitung estimasi harga secara akurat dari data resmi toko. WAJIB dipakai setiap ada pertanyaan harga, jangan hitung manual di teks.',
                    'parameters' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'product_id' => ['type' => 'INTEGER'],
                            'quantity' => ['type' => 'INTEGER'],
                            'panjang_cm' => ['type' => 'NUMBER', 'description' => 'isi 0 jika bukan produk custom'],
                            'lebar_cm' => ['type' => 'NUMBER', 'description' => 'isi 0 jika bukan produk custom'],
                            'attribute_value_ids' => ['type' => 'ARRAY', 'items' => ['type' => 'INTEGER']],
                        ],
                        'required' => ['product_id', 'quantity'],
                    ],
                ],
                [
                    'name' => 'create_order_summary',
                    'description' => 'Panggil jika pelanggan ingin memesan dan data sudah terkumpul.',
                    'parameters' => [
                        'type' => 'OBJECT',
                        'properties' => [
                            'product_id' => ['type' => 'INTEGER'],
                            'quantity' => ['type' => 'INTEGER'],
                            'panjang_cm' => ['type' => 'NUMBER'],
                            'lebar_cm' => ['type' => 'NUMBER'],
                            'attribute_value_ids' => ['type' => 'ARRAY', 'items' => ['type' => 'INTEGER']],
                            'deadline' => ['type' => 'STRING', 'description' => 'Isi perkiraan jika user belum sebutkan (misal: Segera / Normal)'],
                            'need_design' => ['type' => 'BOOLEAN', 'description' => 'false jika tidak disebut'],
                            'catatan' => ['type' => 'STRING'],
                        ],
                        'required' => ['product_id', 'quantity', 'need_design'],
                    ],
                ],
            ],
        ]];

        // =========================================================================
        // 6. SUSUN "contents" DARI HISTORY + PESAN BARU
        // =========================================================================
        $contents = [];
        foreach ($history as $h) {
            $contents[] = [
                'role' => (($h['role'] ?? 'user') === 'ai') ? 'model' : 'user',
                'parts' => [['text' => $h['text'] ?? '']],
            ];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $fullPrompt]]];

        try {
                    $orderSummary = null;
                    $finalText = null;

                    // Mengambil semua kunci cadangan dari file .env secara otomatis
                    $apiKeys = array_filter([
                        env('GEMINI_API_KEY'),
                        env('GEMINI_API_KEY_2'),
                        env('GEMINI_API_KEY_3'),
                    ]);

                    if (empty($apiKeys)) {
                        return response()->json([
                            'reply' => 'Error: Tidak ada GEMINI_API_KEY yang ditemukan di file .env Laravel!'
                        ], 500);
                    }

                    $response = null;

                    // Perulangan untuk mencoba key satu persatu jika key sebelumnya terkena limit 429
foreach ($apiKeys as $apiKey) {
                        for ($i = 0; $i < 5; $i++) {
                            $response = Http::withoutVerifying()
                                ->withHeaders([
                                    'Content-Type' => 'application/json',
                                ])
                                ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={$apiKey}", [
                                    'contents' => $contents,
                                    'tools' => $tools,
                                ]);

                            if ($response->status() === 429) {
                                break; 
                            }

                            if (!$response->successful()) {
                                // 🔍 TAMBAHKAN INI
                                \Illuminate\Support\Facades\Log::error('Gemini API gagal', [
                                    'status' => $response->status(),
                                    'body' => $response->body(),
                                ]);
                                break;
                            }

                            $data = $response->json();
                            $candidateContent = $data['candidates'][0]['content'] ?? null;
                            $parts = $candidateContent['parts'] ?? [];

                            // 🔍 TAMBAHKAN INI: log setiap iterasi biar ketahuan dia lagi ngapain
                            \Illuminate\Support\Facades\Log::info("Gemini iterasi ke-{$i}", [
                                'finishReason' => $data['candidates'][0]['finishReason'] ?? null,
                                'hasFunctionCall' => (bool) collect($parts)->firstWhere('functionCall'),
                                'functionCallName' => collect($parts)->firstWhere('functionCall')['functionCall']['name'] ?? null,
                                'textPart' => collect($parts)->pluck('text')->filter()->implode(' | '),
                            ]);

                            $functionCallPart = collect($parts)->firstWhere('functionCall');

                            if (!$functionCallPart) {
                                $finalText = collect($parts)->pluck('text')->filter()->implode("\n");
                                if (!$finalText) {
                                    $finalText = 'Maaf, Nora saat ini sedang mengalami gangguan teknis. Bisa diulang kembali?';
                                }
                                break 2;
                            }

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

                        // 🔍 TAMBAHKAN INI: ketahuan kalau loop habis tanpa pernah dapat teks final
                        if (is_null($finalText)) {
                            \Illuminate\Support\Facades\Log::warning('Loop 5x habis TANPA finalText! Kemungkinan Gemini terus manggil function.');
                        }

                        if ($response && $response->status() !== 429) {
                            break;
                        }
                    }

                    // Jika semua API Key di .env ternyata sudah habis kuotanya
                    if ($response && $response->status() === 429) {
                        return response()->json([
                            'reply' => '⚠️ Semua kuota API Key cadangan (1, 2, dan 3) telah habis untuk hari ini. Silakan coba lagi besok atau gunakan akun baru.'
                        ], 500);
                    }

                    return response()->json([
                        'reply' => $finalText ?: 'Berikut ringkasan pesanan kamu, silakan cek dan checkout jika sudah sesuai.',
                        'ready_checkout' => !is_null($orderSummary),
                        'order_summary' => $orderSummary,
                    ]);

                } catch (\Exception $e) {
                    return response()->json([
                        'reply' => 'Laravel Exception Crash! Pesan: ' . $e->getMessage()
                    ], 500);
                }
            }

    /**
     * Eksekusi function yang diminta Gemini.
     * Semua perhitungan harga dilakukan di PHP (akurat), bukan oleh AI.
     */
    private function executeFunction(string $name, array $args, $products): array
    {
        if (!in_array($name, ['get_price_quote', 'create_order_summary'])) {
            return ['success' => false, 'error' => 'Fungsi tidak dikenal'];
        }

        $product = $products->firstWhere('id', $args['product_id'] ?? null);
        if (!$product) {
            return ['success' => false, 'error' => 'Produk tidak ditemukan, minta pelanggan pilih ulang dari daftar produk yang ada.'];
        }

        $quantity = max(1, (int) ($args['quantity'] ?? 1));
        $panjang = (float) ($args['panjang_cm'] ?? 0);
        $lebar = (float) ($args['lebar_cm'] ?? 0);
        $attributeValueIds = $args['attribute_value_ids'] ?? [];

        // 🌟 PERBAIKAN LOGIKA HARGA: Hitung total harga dasar + tambahan per meter dulu, baru dikalikan luas
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
            $luas = ($panjang * $lebar) / 10000; // Rumus luas meter persegi (cm ke m2)
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

        // create_order_summary
        return ['success' => true, 'data' => array_merge($priceData, [
            'deadline' => $args['deadline'] ?? null,
            'need_design' => (bool) ($args['need_design'] ?? false),
            'catatan' => $args['catatan'] ?? null,
        ])];
    }
}