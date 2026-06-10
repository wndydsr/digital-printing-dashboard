<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name',
        'price',
        'is_custom',
        'estimated_duration',
        'description',
        'photo',
        'status',
        'fields',
        'category_id'
    ];

    protected $casts = [
        'fields' => 'array',
    ];

     public function attributes()
    {
        return $this->hasMany(ProductAttribute::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class, 'category_id');
    }
        
}