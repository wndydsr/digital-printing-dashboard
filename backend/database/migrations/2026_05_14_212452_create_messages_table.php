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
        Schema::create('messages', function (Blueprint $table) {
        $table->id();

        $table->foreignId('order_id')->constrained()->onDelete('cascade');

        $table->enum('sender', ['customer', 'desainer']);

        $table->text('message')->nullable();

        $table->string('file')->nullable();

        $table->boolean('is_design')->default(false);

        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};
