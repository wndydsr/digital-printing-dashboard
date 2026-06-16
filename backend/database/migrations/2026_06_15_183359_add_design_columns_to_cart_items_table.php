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
        Schema::table('cart_items', function (Blueprint $table) {
            $table->boolean('need_design')->default(false);
            $table->string('tahapan_order')->nullable();
            $table->string('design_file')->nullable();
            $table->text('reference_files')->nullable();
        });
    }

    public function down()
    {
        Schema::table('cart_items', function (Blueprint $table) {
            $table->dropColumn(['need_design', 'tahapan_order', 'design_file', 'reference_files']);
        });
    }
};
