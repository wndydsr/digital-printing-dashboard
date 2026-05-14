<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class LaporanController extends Controller
{
    public function index()
{
    $tahunIni = now()->year;

    $totalPendapatan = Order::whereHas('stage.status', function ($q) {
        $q->whereRaw('LOWER(name) = ?', ['selesai']);
    })->sum('total_price');

    $totalPesanan = Order::whereHas('stage')->count();  

    $pesananSelesai = Order::whereHas('stage.status', function ($q) {
        $q->whereRaw('LOWER(name) = ?', ['selesai']);
    })->count();

    $pesananPending = Order::whereHas('stage.status', function ($q) {
    $q->whereRaw('LOWER(name) = ?', ['pending']);
})->count();

    $pendapatanPerBulan = Order::selectRaw('MONTH(created_at) as bulan, SUM(total_price) as total')
        ->whereYear('created_at', $tahunIni)
        ->groupBy('bulan')
        ->orderBy('bulan')
        ->get();

    $pesananPerBulan = Order::selectRaw('MONTH(created_at) as bulan, COUNT(*) as total')
        ->whereYear('created_at', $tahunIni)
        ->groupBy('bulan')
        ->orderBy('bulan')
        ->get();

    $transactions = Order::with([
        'customer',
        'items.product',
        'stage.status'
    ])
    ->whereHas('stage.status', function ($q) {
        $q->whereRaw('LOWER(name) = ?', ['selesai']);
    })
    ->latest()
    ->take(10)
    ->get()
    ->map(function ($o) {

        return [
            'id' => $o->id,

            'invoice' => $o->order_code ?? 'INV-' . $o->id,

            'customer' => [
                'name' => optional($o->customer)->name,
                'phone' => optional($o->customer)->phone,
                'address' => optional($o->customer)->address,
            ],

            'products' => $o->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_name' => optional($item->product)->name,
                    'quantity' => $item->quantity,
                    'price' => $item->price,
                ];
            }),

            'status' => $o->stage?->status?->name ?? '-',

            'total' => $o->total_price ?? 0,

            'date' => optional($o->created_at)
                ->format('Y-m-d'),
        ];
    });

    return response()->json([
        'pendapatan_chart' => $pendapatanPerBulan,
        'pesanan_chart'    => $pesananPerBulan,
        'total_pendapatan' => $totalPendapatan,
        'total_pesanan'    => $totalPesanan,
        'pesanan_selesai'  => $pesananSelesai,
        'pesanan_pending'  => $pesananPending,
        'transactions'     => $transactions,
    ]);
}
}