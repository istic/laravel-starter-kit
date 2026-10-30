// Thin wrappers around Matomo's `_paq` queue. All are no-ops when Matomo is not
// configured (resources/views/partials/matomo.blade.php only renders the
// tracker when the MatomoService returns a config).

export function trackPageView() {
    window._paq?.push(['trackPageView']);
}

export function trackEvent(category, action, name) {
    const payload = ['trackEvent', category, action];

    if (name !== undefined) {
        payload.push(name);
    }

    window._paq?.push(payload);
}

// `goal` is a key from config('services.matomo.goals'), e.g. 'registration'.
export function trackGoal(goal) {
    const goalId = window.matomoGoals?.[goal];

    if (goalId !== undefined) {
        window._paq?.push(['trackGoal', goalId]);
    }
}
