<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;


class OrderItem extends Model
{
    protected $fillable = [
        'order_id',
        'product_id',
        'quantity',
        'price',
        'subtotal',
        'catatan',
        'need_design',
      'order_stage_id',
        'details',

    ];

    protected $casts = [
        'details' => 'array',
    ];

    public function design()
    {
        return $this->hasOne(OrderItemDesign::class, 'order_item_id', 'id');
    }
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
    // public function stage()
    // {
    //     return $this->belongsTo(Stage::class, 'current_stage_id');
    // }
}