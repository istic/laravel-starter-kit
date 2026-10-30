<?php

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

use function Pest\Laravel\get;

beforeEach(function () {
    Cache::flush();
});

it('does not render the matomo tracker when matomo is not configured', function () {
    config([
        'services.matomo.url' => null,
        'services.matomo.auth_token' => null,
    ]);

    get('/')
        ->assertOk()
        ->assertDontSee('matomo.js', false)
        ->assertDontSee('_paq', false);
});

it('renders the matomo tracker with site id and goals when configured', function () {
    config([
        'services.matomo.url' => 'https://stat.istic.net',
        'services.matomo.auth_token' => 'test-token',
        'services.matomo.goals' => ['registration' => 'Registration complete'],
        'app.url' => 'https://app.example.com',
    ]);

    Http::fake([
        'stat.istic.net/*' => function ($request) {
            $method = $request->data()['method'] ?? '';

            if ($method === 'SitesManager.getAllSites') {
                return Http::response([['idsite' => '3', 'main_url' => 'https://app.example.com']]);
            }

            if ($method === 'Goals.getGoals') {
                return Http::response([['idgoal' => '1', 'name' => 'Registration complete']]);
            }

            return Http::response([], 200);
        },
    ]);

    get('/')
        ->assertOk()
        ->assertSee('<script async src="https://stat.istic.net/matomo.js"></script>', false)
        ->assertSee("window._paq.push(['setSiteId', \"3\"]);", false)
        ->assertSee('window.matomoGoals = {"registration":1};', false);
});
