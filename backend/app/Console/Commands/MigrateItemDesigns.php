<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\OrderItem;
use App\Models\OrderItemDesign;

class MigrateItemDesigns extends Command
{
    protected $signature = 'items:migrate-designs';

    protected $description = 'Move design data from order_items to order_item_designs';

    public function handle()
    {
        $items = OrderItem::whereNotNull('design_url')
            ->orWhereNotNull('reference_file')
            ->get();

        foreach ($items as $item) {

            OrderItemDesign::create([
                'order_item_id' => $item->id,

                'design_file' => $item->design_url,

                'reference_files' => is_array($item->reference_file)
                    ? json_encode($item->reference_file)
                    : $item->reference_file,

                'design_notes' => $item->catatan,

                'design_status' => $item->design_url
                    ? 'approved'
                    : 'pending',
            ]);
        }

        $this->info('Design migration completed!');
    }
}