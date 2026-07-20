<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Tambahkan dulu Status ID 4 (Dibatalkan) ke tabel statuses
        DB::table('statuses')->insertOrIgnore([
            'id'         => 4,
            'name'       => 'Dibatalkan',
            'code'       => 'CANCELLED',
            'created_at' => now(),
        ]);

        // 2. Menyuntikkan Stage 7 dan Stage 8 ke tabel order_stages
        DB::table('order_stages')->insertOrIgnore([
            [
                'id'        => 7,
                'name'      => 'Menunggu Pembayaran',
                'status_id' => 1, // Status 'Pending'
            ],
            [
                'id'        => 8,
                'name'      => 'Dibatalkan',
                'status_id' => 4, // 🌟 Diarahkan ke Status ID 4 (Bukan 3 / Selesai)
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('order_stages')->whereIn('id', [7, 8])->delete();
        DB::table('statuses')->where('id', 4)->delete();
    }
};