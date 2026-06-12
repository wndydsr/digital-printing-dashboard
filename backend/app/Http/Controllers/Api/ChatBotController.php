<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

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
                'reply' => 'Eror: GEMINI_API_KEY tidak ditemukan di file .env Laravel!'
            ], 500);
        }

        $fullPrompt = "Konteks & Instruksi Tugasmu:\n"
            . "Kamu adalah Ayu, asisten virtual yang ramah, profesional, dan cerdas dari usaha Digital Printing. "
            . "Tugasmu membantu customer menjawab pertanyaan seputar produk cetak seperti spanduk/banner, stiker, kartu nama, brosur, kalender, dan kemasan. "
            . "Jika customer bertanya tentang perhitungan harga spanduk/banner, ingatkan mereka bahwa rumusnya adalah (Panjang x Lebar dalam cm) / 10000 untuk mendapatkan Luas Meter Persegi, lalu dikalikan harga per meter ditambah biaya atribut finishing. "
            . "Selalu gunakan bahasa Indonesia yang sopan dan ramah.\n\n"
            . "Pertanyaan Customer saat ini: " . $userMessage;

        try {
            // 🔥 KOMBINASI FIX: Menggunakan Jalur v1 dan Model Aktif gemini-2.0-flash
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
                $aiReply = $data['candidates'][0]['content']['parts'][0]['text'] ?? 'Maaf, Ayu tidak menangkap maksud Anda.';
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