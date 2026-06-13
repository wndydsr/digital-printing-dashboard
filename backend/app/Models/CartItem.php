<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CartItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'cart_id', 
        'product_id', 
        'quantity', 
        'panjang', 
        'lebar', 
        'catatan', 
        'selected_options'
    ];

    // Cast kolom JSON menjadi array otomatis di Laravel
    protected $casts = [
        'selected_options' => 'array',
    ];

    // Relasi balik ke tabel produk untuk mengambil nama & harga dasar produk
    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }
}