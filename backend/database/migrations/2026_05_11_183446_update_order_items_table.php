<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {

            $table->boolean('need_design')
                ->default(false);

            $table->string('design_url')
                ->nullable();

            $table->text('reference_file')
                ->nullable();

            $table->text('catatan')
                ->nullable();

            $table->enum('production_status', [
                'need_design',
                'design_ready',
                'process',
                'done'
            ])->default('process');

        });
    }

    public function down(): void
    {
        Schema::table('order_items', function (Blueprint $table) {

            $table->dropColumn([
                'need_design',
                'design_url',
                'reference_file',
                'catatan',
                'production_status'
            ]);

        });
    }
};