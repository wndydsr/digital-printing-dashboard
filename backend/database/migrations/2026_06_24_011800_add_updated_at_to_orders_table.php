<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 🌟 TAMBAHKAN PROTEKSI: Cek apakah tabel orders ada dan kolom updated_at BELUM ada
        if (Schema::hasTable('orders') && !Schema::hasColumn('orders', 'updated_at')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->timestamp('updated_at')->nullable()->after('created_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('orders') && Schema::hasColumn('orders', 'updated_at')) {
            Schema::table('orders', function (Blueprint $table) {
                $table->dropColumn('updated_at');
            });
        }
    }
};