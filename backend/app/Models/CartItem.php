<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'cart_id', 'product_id', 'quantity', 'panjang', 'lebar', 'catatan', 
        'need_design', 'tahapan_order', 'design_file', 'reference_files', 'selected_options'
    ];

    protected $casts = [
        'selected_options' => 'array',
    ];

    // 🔥 TAMBAHKAN INI:
    public function cart()
    {
        return $this->belongsTo(Cart::class, 'cart_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}