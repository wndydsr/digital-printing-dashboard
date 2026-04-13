<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Stage extends Model
{
    protected $table = 'order_stages';

    protected $fillable = [
        'name',
        'status_id',
    ];

    public $timestamps = false; // kalau tabel kamu gak ada created_at
}