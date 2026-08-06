<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/version', function () {
    return response()->json(collect(config('version'))->except('git_head_path'));
})->name('version');
