<?php

use function Pest\Laravel\getJson;

it('exposes app version info as json', function () {
    config([
        'version.version' => '1.2.3',
        'version.pr_number' => '42',
        'version.branch' => 'main',
    ]);

    getJson('/version')
        ->assertOk()
        ->assertJson([
            'version' => '1.2.3',
            'pr_number' => '42',
            'branch' => 'main',
        ])
        ->assertJsonMissingPath('git_head_path');
});
