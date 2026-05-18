<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\LaporanController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MessageController;

/*
|--------------------------------------------------------------------------
| PUBLIC (tidak perlu login)
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| HARUS LOGIN
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {

    // 🔹 ambil user login
    Route::get('/me', function (Request $request) {
        return $request->user();
    });

    // 🔹 SEMUA ROLE BOLEH
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{id}', [OrderController::class, 'show']);
    Route::post('/orders', [OrderController::class, 'store']);
    Route::put('/orders/{id}', [OrderController::class, 'update']);
    Route::delete('/orders/{id}', [OrderController::class, 'destroy']);

    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::put('/customers/{id}', [CustomerController::class, 'update']);
    Route::delete('/customers/{id}', [CustomerController::class, 'destroy']);

    Route::get('/products', [ProductController::class, 'index']);
    Route::post('/products', [ProductController::class, 'store']);
    Route::get('/products/active', [ProductController::class, 'active']);
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    Route::get('/laporan', [LaporanController::class, 'index']);

    Route::middleware('role:admin')->get('/admin', fn() => 'Admin');
    Route::middleware('role:desainer')->get('/desainer', fn() => 'Desainer');
    Route::middleware('role:operator')->get('/operator', fn() => 'Operator');

    Route::get('/download/design/{filename}', [OrderController::class, 'downloadDesign'])
    ->where('filename', '.*');

    Route::get('/orders/{id}/messages', [MessageController::class, 'index'] );
    Route::post('/orders/{id}/messages', [MessageController::class, 'store'] );

});