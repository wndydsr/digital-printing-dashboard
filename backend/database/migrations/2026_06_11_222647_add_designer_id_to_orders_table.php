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
        Schema::table('orders', function (Blueprint $table) {
            // Menambahkan kolom designer_id setelah kolom customer_id (atau sesuaikan yang ada)
            // nullable() digunakan karena orderan e-commerce awalnya kosong desainer
            $table->unsignedBigInteger('designer_id')->nullable()->after('customer_id');

            // Opsional: Buat foreign key ke tabel users agar datanya konsisten
            $table->foreign('designer_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Hapus foreign key dan kolom jika migration di-rollback
            $table->dropForeign(['designer_id']);
            $table->dropColumn('designer_id');
        });
    }
};