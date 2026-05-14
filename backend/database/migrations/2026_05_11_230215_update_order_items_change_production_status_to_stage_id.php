<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {

            // hapus enum lama
            $table->dropColumn('production_status');

            // tambah relasi stage
            $table->foreignId('order_stage_id')
                ->nullable()
                ->after('need_design')
                ->constrained('order_stages')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {

            $table->dropConstrainedForeignId('order_stage_id');

            $table->enum('production_status', [
                'need_design',
                'design_ready',
                'process',
                'done'
            ])->default('process');
        });
    }
};
