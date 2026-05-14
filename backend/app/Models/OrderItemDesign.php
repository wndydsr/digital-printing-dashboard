<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItemDesign extends Model
{
    protected $fillable = [
        'order_item_id',
        'design_file',
        'reference_files',
        'design_notes',
        'design_status',
    ];

    protected $casts = [
    'reference_files' => 'array',
    ];

    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }
}