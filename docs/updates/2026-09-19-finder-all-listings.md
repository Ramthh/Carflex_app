# Carflex Finder in All Listings — 19 September 2026

All Listings now includes a Carflex Finder source option. With no source boxes selected, the page includes both the existing listings and the active page of Finder cars. Selecting only Carflex Finder shows its inventory in the saved filter's order. The source controls also work on smaller screens.

Finder and All Listings share the selected saved filter for the signed-in user in this browser, including changes from another open tab. Explicit filter links take priority on initial navigation. A deleted or unavailable selected filter shows an error rather than silently widening the inventory. The ad-hoc Finder search remains on the Finder page.

The mixed view orders available rows by discovery/arrival time. Finder retains its own count and previous/next controls so every matching page remains accessible; the existing feed is still its latest-listings window. Source selection happens before canonical Facebook item deduplication. If both feeds contain the same Facebook ad, the Finder card is preferred and carries its Carflex logo beside Facebook.

Finder cards reuse the same live estimates, descriptions, mileage, posting time and discovery time as Finder. They open the source ad; the legacy database-specific send/take/edit actions remain attached to legacy rows. This avoids submitting remote Finder IDs to unrelated database tables.

Finder continues to use its authenticated snapshot and event-stream APIs. Selecting only other sources disconnects its feed. No listing records are copied or rewritten by this display integration.

Validation: 51 Finder and combined-feed tests passed, including canonical URL deduplication, source isolation, saved selection precedence, unavailable selections, user-scoped preferences, pagination/controller cancellation, and live updates. TypeScript and the production webpack build passed. Independent review covered filter initialization and account-change cleanup.
