<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\ProductAttribute;
use App\Models\ProductAttributeValue;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{

    public function index()
    {
        return Product::with([
            'attributes.values', 'category'
        ])->get();
    }

   public function store(Request $request)
{
    $request->validate([
        'name'        => 'required|string|max:255',
        'price'       => 'required',
        'category_id' => 'required|exists:categories,id', 
    ]);

    DB::beginTransaction();

    try {
        // 1. Ambil data yang dibutuhkan
        $data = $request->only([
            'name',
            'price',
            'estimated_duration',
            'status',
            'description',
            'category_id',
            // ❌ SEBELUMNYA 'is_custom' TIDAK ADA DI SINI
        ]);

        // 2. Ambil nilai is_custom dan ubah string "1"/"0" menjadi boolean asli
        $data['is_custom'] = $request->boolean('is_custom');

        $data['fields'] = $request->input('fields');

        if ($request->hasFile('photo')) {
            $path = $request->file('photo')->store('products', 'public');
            $data['photo'] = $path;
        }

        // Sekarang is_custom sudah ikut masuk ke dalam method create
        $product = Product::create($data);

        $attributes = json_decode(
            $request->input('attributes', '[]'),
            true
        );

        foreach ($attributes as $attributeData) {
            $attribute = ProductAttribute::create([
                'product_id' => $product->id,
                'name' => $attributeData['name']
            ]);

            foreach ($attributeData['values'] ?? [] as $valueData) {
                ProductAttributeValue::create([
                    'product_attribute_id' => $attribute->id,
                    'name' => $valueData['name'],
                    'additional_price' => $valueData['additional_price'] ?? 0,
                    'status' => true,
                ]);
            }
        }

        DB::commit();

        return response()->json($product);

    } catch (\Throwable $e) {
        DB::rollBack();

        return response()->json([
            'error' => $e->getMessage(),
            'line' => $e->getLine()
        ], 500);
    }
}

  public function update(Request $request, $id)
    {
        DB::beginTransaction();

        try {
            $product = Product::findOrFail($id);

            $product->update([
                'name'               => $request->name,
                'price'              => $request->price,
                'estimated_duration' => $request->estimated_duration,
                'description'        => $request->description,
                'status'             => $request->status,
                'fields'             => $request->fields,
                'category_id'        => $request->category_id,
                'is_custom'         => $request->boolean('is_custom'), // Pastikan ini di-cast ke boolean
            ]);

            if ($request->hasFile('photo')) {
                $path = $request->file('photo')->store('products', 'public');
                $product->photo = $path;
                $product->save();
            }

            // ambil attributes dari frontend
            $attributes = json_decode(
                $request->input('attributes', '[]'),
                true
            );

            // hapus value lama
            ProductAttributeValue::whereIn(
                'product_attribute_id',
                ProductAttribute::where('product_id', $product->id)->pluck('id')
            )->delete();

            // hapus attribute lama
            ProductAttribute::where(
                'product_id',
                $product->id
            )->delete();

            // simpan ulang attribute
            foreach ($attributes as $attributeData) {

                $attribute = ProductAttribute::create([
                    'product_id' => $product->id,
                    'name' => $attributeData['name']
                ]);

                foreach ($attributeData['values'] ?? [] as $valueData) {

                    ProductAttributeValue::create([
                        'product_attribute_id' => $attribute->id,
                        'name' => $valueData['name'],
                        'additional_price' => $valueData['additional_price'] ?? 0,
                        'status' => true,
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Product updated successfully',
                // 🔥 2. MUAT RELASI KATEGORI BERSAMA ATTRIBUTES SUPAYA DI NEXT.JS JALAN REALTIME
                'data' => $product->load(['attributes.values', 'category']) 
            ]);

        } catch (\Throwable $e) {

            DB::rollBack();

            return response()->json([
                'error' => $e->getMessage(),
                'line' => $e->getLine()
            ], 500);
        }
    }


        public function active()
        {
            $products = Product::with([
                'attributes.values'
            ])
            ->where('status', 1)
            ->get();

            return response()->json($products);
        }

       public function show($id)
        {
            return Product::with([
                'attributes.values'
            ])->findOrFail($id);
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