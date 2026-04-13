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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 50)->nullable();
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->dateTime('order_date')->nullable();
            $table->decimal('total_price', 12, 2)->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->string('customer_name')->nullable();

            $table->unsignedBigInteger('status_id')->nullable();
            $table->unsignedBigInteger('current_stage_id')->nullable();

            // relasi (opsional tapi recommended)
            $table->foreign('customer_id')->references('id')->on('customers')->onDelete('set null');
            $table->foreign('status_id')->references('id')->on('statuses')->onDelete('set null');
            $table->foreign('current_stage_id')->references('id')->on('order_stages')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
