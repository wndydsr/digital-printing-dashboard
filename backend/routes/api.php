<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\OrderController;

Route::get('/', function () {
    return view('welcome');
});
Route::get('/customers', [CustomerController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/orders', [OrderController::class, 'index']); 
Route::post('/orders', [OrderController::class, 'store']);
Route::get('/products', [ProductController::class, 'index']);
