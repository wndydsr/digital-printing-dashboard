<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            // drop foreign key manual
            DB::statement('ALTER TABLE orders DROP FOREIGN KEY fk_orders_product');

            // drop column lama
            $table->dropColumn([
                'product_id',
                'design_url',
                'qty',
                'catatan',
                'reference_file'
            ]);

        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {

            $table->foreignId('product_id')
                ->nullable();

            $table->string('design_url')
                ->nullable();

            $table->integer('qty')
                ->default(1);

            $table->text('catatan')
                ->nullable();

            $table->text('reference_file')
                ->nullable();

        });
    }
};