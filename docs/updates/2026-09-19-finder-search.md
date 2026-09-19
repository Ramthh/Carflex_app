# Finder search — 19 September 2026

Finder now has a Search cars field above the estimate explanation. Search matches make, model, year and location text across the full selected inventory, with every typed word required. A saved filter remains active, including any search already saved inside it.

Typing searches after a 350 ms pause; Enter searches immediately and Clear restores the selected filter. Changing the search returns to page one. The URL preserves both the saved filter and the search. Requests, cache entries and live streams include the query, and outdated work is cancelled when it changes.

The provider API applies the same search to snapshots, counts and live changes. It searches public title/location fields only and rejects queries longer than 200 characters. API credentials stay on the server.

Validation: 40 Finder tests, TypeScript check and the production webpack build passed. Backend search tests cover pagination, saved-search intersection, private-field exclusion and separate simultaneous live searches.
