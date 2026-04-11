<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;

Route::get('/', function () {
    return view('welcome');
});
Route::get('/api/customers', [CustomerController::class, 'index']);
Route::get('/api/products', [ProductController::class, 'index']);
Route::get('/api/orders', [OrderController::class, 'index']);