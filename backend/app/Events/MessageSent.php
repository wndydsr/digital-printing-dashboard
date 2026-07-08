<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;

class MessageSent implements ShouldBroadcastNow
{

    use Dispatchable, SerializesModels;

    public $message;

    public function __construct($message) {
        $this->message = $message;
    }

   public function broadcastOn() {
        // Ganti room_id menjadi order_id sesuai dengan model Message kamu
        return new PrivateChannel('chat.' . $this->message->order_id);
    }

    public function broadcastAs(): string
    {
        return 'MessageSent'; // Ini membuat nama event di frontend cukup '.MessageSent'
    }

public function broadcastWith(): array
{
    return [
        'message' => [
            'id' => $this->message->id,
            'order_id' => $this->message->order_id,
            'order_item_id' => $this->message->order_item_id, // 🔥 TAMBAHKAN INI AGAR REALTIME WORK
            'sender' => $this->message->sender,
            'message' => $this->message->message,
            'file' => $this->message->file,
            'is_design' => $this->message->is_design, 
            'created_at' => $this->message->created_at,
        ]
    ];
}

}