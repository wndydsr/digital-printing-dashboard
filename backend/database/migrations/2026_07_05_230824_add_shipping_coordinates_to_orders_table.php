<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Jalankan migration untuk menambah kolom.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Tambahkan method, cost, dan koordinat sekaligus
            $table->string('shipping_method', 50)->nullable()->default('pickup');
            $table->decimal('shipping_cost', 12, 2)->default(0);
            $table->decimal('shipping_latitude', 10, 8)->nullable();
            $table->decimal('shipping_longitude', 11, 8)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['shipping_method', 'shipping_cost', 'shipping_latitude', 'shipping_longitude']);
        });
    }
};