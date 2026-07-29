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
            ."1. Gunakan hanya data produk pada bagian DATA PRODUK.\n"
            ."2. JANGAN PERNAH menghitung harga sendiri di teks. Untuk harga, SELALU panggil function get_price_quote dengan product_id yang valid (lihat DAFTAR PRODUK JSON).\n"
            ."3. Jika pelanggan bertanya harga banner berdasarkan ukuran, kirim panjang_cm dan lebar_cm ke get_price_quote (rumus luas (panjang x lebar)/10000 sudah dihitung otomatis oleh sistem).\n"
            ."4. Jika pelanggan memilih bahan tertentu, sertakan attribute_value_ids sesuai id pada DAFTAR PRODUK JSON.\n"
            ."5. Jika pelanggan ingin memesan tetapi datanya belum lengkap, tanyakan informasi yang kurang SATU PER SATU (jangan borongan).\n"
            ."6. Informasi yang harus dikumpulkan meliputi:\n"
            ."- Produk\n"
            ."- Ukuran (jika produk custom)\n"
            ."- Jumlah\n"
            ."- Bahan\n"
            ."- Deadline\n"
            ."- Sudah memiliki desain atau belum\n"
            ."7. Setelah semua informasi lengkap DAN pelanggan sudah setuju dengan estimasi harga, panggil function create_order_summary untuk finalisasi. JANGAN tampilkan ringkasan pesanan sebagai teks biasa, WAJIB lewat function ini.\n"
            ."8. Jika pelanggan mengecek status order gunakan DATA ORDER.\n\n"

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
                    'description' => 'Panggil HANYA jika semua data pesanan sudah lengkap dan harga sudah dikonfirmasi pelanggan.',
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

            // loop supaya AI bisa panggil function lalu lanjut jawab berdasarkan hasilnya
            for ($i = 0; $i < 5; $i++) {
                $response = Http::withoutVerifying()
                    ->withHeaders([
                        'Content-Type' => 'application/json',
                    ])
                    ->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key={$apiKey}", [
                        'contents' => $contents,
                        'tools' => $tools,
                    ]);

                if (!$response->successful()) {
                    return response()->json([
                        'reply' => 'Google API Menolak (Status: ' . $response->status() . '). Pesan Asli: ' . $response->body()
                    ], 500);
                }

                $data = $response->json();
                $candidateContent = $data['candidates'][0]['content'] ?? null;
                $parts = $candidateContent['parts'] ?? [];

                $functionCallPart = collect($parts)->firstWhere('functionCall');

                if (!$functionCallPart) {
                    // Tidak ada pemanggilan function -> ini jawaban teks final
                    $finalText = collect($parts)->pluck('text')->filter()->implode("\n");
                    if (!$finalText) {
                        $finalText = 'Maaf, Nora saat ini sedang mengalami gangguan teknis. Bisa diulang kembali?';
                    }
                    break;
                }

                $fnName = $functionCallPart['functionCall']['name'];
                $fnArgs = $functionCallPart['functionCall']['args'] ?? [];
                $fnResult = $this->executeFunction($fnName, $fnArgs, $products);

                if ($fnName === 'create_order_summary' && ($fnResult['success'] ?? false)) {
                    $orderSummary = $fnResult['data'];
                }

                // Lanjutkan percakapan dengan menyertakan hasil function, biar Gemini merespons berdasarkan itu
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

        if ($product->is_custom && $panjang > 0 && $lebar > 0) {
            $luas = ($panjang * $lebar) / 10000; // rumus asli kamu, tetap dipakai
            $hargaSatuan = $luas * (float) $product->price;
        } else {
            $hargaSatuan = (float) $product->price;
        }

        $tambahan = 0;
        $namaAtribut = [];
        foreach ($product->attributes as $attr) {
            foreach ($attr->values as $val) {
                if (in_array($val->id, $attributeValueIds)) {
                    $tambahan += (float) $val->additional_price;
                    $namaAtribut[] = $val->name;
                }
            }
        }
        $hargaSatuan += $tambahan;
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