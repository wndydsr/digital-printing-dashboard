<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index()
    {
        // Mengambil semua data pesanan dari database XAMPP kamu
        $orders = Order::with('customer')->get();

        // Mengirimkan data dalam format JSON agar bisa dibaca Next.js
        return response()->json($orders);
    }
}