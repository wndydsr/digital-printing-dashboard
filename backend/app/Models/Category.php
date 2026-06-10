<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasFactory;

    // Menentukan nama tabel di database
    protected $table = 'categories';

    // Kolom yang boleh diisi secara massal
    protected $fillable = ['name', 'slug'];

    /**
     * Relasi One-to-Many
     * Satu kategori bisa dipakai oleh banyak produk
     */
    public function products()
    {
        return $this->hasMany(Product::class, 'category_id');
    }
}