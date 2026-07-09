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
        if (!Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->id();
                $table->foreignId('category_id')->nullable()->constrained('categories')->onDelete('set null'); // Sesuaikan nama tabel kategorimu jika ada
                $table->string('name');
                $table->decimal('price', 12, 2)->default(0);
                $table->boolean('is_custom')->default(0);
                $table->integer('estimated_duration')->nullable();
                $table->string('photo')->nullable();
                $table->string('status')->default('active');
                $table->timestamps();
                $table->text('fields')->nullable();
                $table->text('description')->nullable();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};