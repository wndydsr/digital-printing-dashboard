<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\LaporanController;
use App\Http\Controllers\Api\AuthController;


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
    Route::put('/products/{id}', [ProductController::class, 'update']);
    Route::delete('/products/{id}', [ProductController::class, 'destroy']);

    Route::get('/laporan', [LaporanController::class, 'index']);

    Route::middleware(['auth:sanctum', 'role:admin'])->get('/admin', fn() => 'Admin');
    Route::middleware(['auth:sanctum', 'role:desainer'])->get('/desainer', fn() => 'Desainer');
    Route::middleware(['auth:sanctum', 'role:operator'])->get('/operator', fn() => 'Operator');

});