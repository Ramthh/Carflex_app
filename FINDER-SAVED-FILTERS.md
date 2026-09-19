# Finder saved-filter selector

The Finder header now contains a Saved filter selector populated from the main
API provider account. On a first visit it selects the provider's default.
Viewers can choose any available saved filter or All Facebook cars.

The choice is encoded in the page's `finderFilter` URL parameter, including
`finderFilter=all`. Reloading that URL preserves the explicit choice instead of
applying a changed provider default. Choosing a filter resets pagination to
page one, cancels the old request and closes its live stream.

Counts, pages, sort order, discoveries and later detail/estimate updates use the
same selected filter. Cards can enter or leave the results when their data
changes. A short-lived snapshot cache is separated by filter identifier.
Opaque provider revisions prevent old criteria and new events from mixing.

The selector does not edit provider filters or change the provider account's
default. Deleted or unavailable filters display an explicit error and remain
selected until the viewer chooses another option. Private-only filters cannot
be used to broaden public Finder results.

The backend catalog must be deployed before this UI. Existing authentication
and integration credentials are reused; no new secret or database migration is
required. Credentials remain in the server-side proxy.

Automatic full-count refreshes remain bounded. Unrelated off-page updates only
mark the count as pending; they do not start expensive reads on every event.
The last known count remains visible while it is refreshed.

Validation passed 27 focused tests, TypeScript and the production webpack build.
The tests include late responses after a selection switch, revision resets,
stream reconnection, hidden-tab polling, cache separation, ordering, pagination
and high-volume off-page events that must not trigger full-count queries.
