<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Order;
use App\Models\OrderItem;

class MigrateOldOrdersToItems extends Command
{
    protected $signature = 'orders:migrate-items';

    protected $description = 'Migrate old order data to order_items';

    public function handle()
    {
        $orders = Order::whereNotNull('product_id')->get();

        foreach ($orders as $order) {

            OrderItem::create([
                'order_id' => $order->id,
                'product_id' => $order->product_id,
                'quantity' => $order->qty,
                'price' => $order->total_price,
                'subtotal' => $order->total_price,
                'design_url' => $order->design_url,
                'reference_file' => is_array($order->reference_file)
                ? json_encode($order->reference_file)
                : $order->reference_file,
                'catatan' => $order->catatan,
            ]);

        }

        $this->info('Migration completed!');
    }
}