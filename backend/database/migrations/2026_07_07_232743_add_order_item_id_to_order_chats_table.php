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
        // 🔥 UBAH KE 'messages'
        Schema::table('messages', function (Blueprint $table) {
            // Tambahkan kolom order_item_id setelah order_id
            $table->unsignedBigInteger('order_item_id')->nullable()->after('order_id');

            // Daftarkan foreign key constraint ke tabel order_items
            $table->foreign('order_item_id')
                  ->references('id')
                  ->on('order_items')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 🔥 UBAH KE 'messages'
        Schema::table('messages', function (Blueprint $table) {
            $table->dropForeign(['order_item_id']);
            $table->dropColumn('order_item_id');
        });
    }
};