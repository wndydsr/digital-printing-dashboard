<?php

namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class LaporanController extends Controller
{
    public function index()
    {
        $totalPendapatan = Order::whereHas('stage.status', function ($q) {
            $q->where('name', 'selesai');
        })->sum('total_price');

        $totalPesanan = Order::count();

        $pesananSelesai = Order::whereHas('stage.status', function ($q) {
            $q->where('name', 'selesai');
        })->count();

        $pesananPending = Order::whereHas('stage.status', function ($q) {
            $q->where('name', 'pending');
        })->count();
        
        $pendapatanPerBulan = Order::selectRaw('MONTH(created_at) as bulan, SUM(total_price) as total')
            ->groupBy('bulan')
            ->get();

        $pesananPerBulan = Order::selectRaw('MONTH(created_at) as bulan, COUNT(*) as total')
            ->groupBy('bulan')
            ->get();

        return response()->json([
            'pendapatan_chart' => $pendapatanPerBulan,
            'pesanan_chart' => $pesananPerBulan,
            'total_pendapatan' => $totalPendapatan,
            'total_pesanan' => $totalPesanan,
            'pesanan_selesai' => $pesananSelesai,
            'pesanan_pending' => $pesananPending,

            'transactions' => Order::with(['customer', 'stage.status', 'product'])
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($o) {
                return [
                    'id' => $o->id, // ✅ WAJIB
                    'invoice' => $o->invoice_number ?? 'INV-' . $o->id,
                    'customer' => $o->customer->name ?? '-',
                    'product' => $o->product->name ?? '-',
                    'status' => $o->stage->status->name ?? '-',
                    'total' => $o->total_price,
                    'date' => $o->created_at->format('Y-m-d'),
                ];
            }),
        ]);
    }
}