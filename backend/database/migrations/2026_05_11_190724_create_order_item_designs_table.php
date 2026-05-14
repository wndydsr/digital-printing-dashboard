<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_item_designs', function (Blueprint $table) {

            $table->id();

            $table->foreignId('order_item_id')
                ->constrained('order_items')
                ->onDelete('cascade');

            $table->string('design_file')
                ->nullable();

            $table->text('reference_files')
                ->nullable();

            $table->text('design_notes')
                ->nullable();

            $table->enum('design_status', [
                'pending',
                'in_progress',
                'revision',
                'approved',
                'done'
            ])->default('pending');

            $table->timestamps();

        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_item_designs');
    }
};