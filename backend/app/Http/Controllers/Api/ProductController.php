<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;

class ProductController extends Controller
{

    public function index()
    {
        return Product::all();
    }

    public function store(Request $request)
    {
        try {
            $data = $request->only([
                'name',
                'price',
                'estimated_duration',
                'status',
            ]);

            // ⛔ JANGAN json_decode lagi
            $data['fields'] = $request->input('fields');

            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('products', 'public');
                $data['photo'] = $path;
            }

            return Product::create($data);

        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $product->update([
            'name' => $request->name,
            'price' => $request->price,
            'estimated_duration' => $request->estimated_duration,
            'description' => $request->description,
            'status' => $request->status,
            'fields' => $request->fields,
        ]);

        if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('products', 'public');
                $product->photo = $path;
                $product->save();
            }

            return response()->json([
                'message' => 'Product updated successfully',
                'data' => $product
            ]);
        }

        public function active()
        {
            return Product::where('status', 1)->get();
        }

        public function destroy($id)
        {
            $product = Product::findOrFail($id);
            $product->delete();

            return response()->json([
                'message' => 'Produk berhasil dihapus'
            ]);
        }
}