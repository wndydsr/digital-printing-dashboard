<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle($request, Closure $next, $role)
    {
        if (auth()->user()->role !== $role) {
            return response()->json([
                'message' => 'Forbidden - role tidak sesuai'
            ], 403);
        }

        return $next($request);
    }
}
