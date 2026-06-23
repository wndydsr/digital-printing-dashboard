<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
{
    Schema::create('messages', function (Blueprint $table) {
        $table->id();
        $table->string('order_id'); // Atau gunakan $table->unsignedBigInteger('order_id'); jika sudah ada tabel orders
        $table->string('sender');
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
