<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    use HasFactory;

    protected $fillable = ['customer_id'];

    // Relasi: Satu keranjang memiliki banyak item produk
    public function items()
    {
        return $this->hasMany(CartItem::class, 'cart_id');
    }
}