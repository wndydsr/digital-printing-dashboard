<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    protected $fillable = [
        'name',
        'price',
        'estimated_duration',
        'description',
        'photo',
        'status',
        'fields',
    ];

    protected $casts = [
        'fields' => 'array',
    ];
}