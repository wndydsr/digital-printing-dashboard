<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = [
        'order_id',
        'sender',
        'message',
        'file',
        'is_design',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}