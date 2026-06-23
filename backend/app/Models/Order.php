<?php

namespace App\Models;

use App\Models\Status;
use App\Models\Stage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Order extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'order_code',
        'customer_id',
        'order_date',
        'total_price',
        'status_id',
        'created_by',
        'notes',
        'current_stage_id',
        'designer_id'
    ];
    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function getDesignFullUrlAttribute()
    {
        return $this->design_url
            ? asset('storage/' . $this->design_url)
            : null;
    }
     public function status(): BelongsTo
    {
        return $this->belongsTo(Status::class, 'status_id');
    }
    public function stage()
    {
        return $this->belongsTo(Stage::class, 'current_stage_id');
    }
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }
    
    protected static function booted()
    {
        static::created(function ($order) {
            $order->update([
                'order_code' => 'ORD-' . str_pad($order->id, 4, '0', STR_PAD_LEFT)
            ]);
        });
    }

    public function designer()
    {
        // Menghubungkan designer_id ke model User
        return $this->belongsTo(User::class, 'designer_id')->select('id', 'name', 'email');
    }

    public function order_items() {
        return $this->hasMany(OrderItem::class);
    }
}
