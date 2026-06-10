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
        Schema::table('order_items', function (Blueprint $table) {
            // Menggunakan decimal agar mendukung angka koma (misal: panjang 100.5 cm)
            $table->decimal('panjang', 8, 2)->nullable()->after('quantity');
            $table->decimal('lebar', 8, 2)->nullable()->after('panjang');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['panjang', 'lebar']);
        });
    }
};
