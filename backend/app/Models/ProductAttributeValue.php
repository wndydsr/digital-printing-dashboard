<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductAttributeValue extends Model
{
    protected $fillable = [
        'product_attribute_id',
        'name',
        'additional_price',
        'status'
    ];

    public function attribute()
    {
        return $this->belongsTo(ProductAttribute::class);
    }
}