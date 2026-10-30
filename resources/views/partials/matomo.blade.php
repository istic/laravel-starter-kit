@php($matomo = app(\App\Services\MatomoService::class)->getConfig())
@if ($matomo)
    <script>
        window.matomoGoals = @json((object) $matomo['goals']);
        window._paq = window._paq || [];
        window._paq.push(['setTrackerUrl', @json($matomo['tracker_url'].'/matomo.php')]);
        window._paq.push(['setSiteId', @json((string) $matomo['site_id'])]);
        window._paq.push(['enableLinkTracking']);
        window._paq.push(['trackPageView']);
    </script>
    <script async src="{{ $matomo['tracker_url'] }}/matomo.js"></script>
@endif
