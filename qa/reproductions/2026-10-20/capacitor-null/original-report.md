# No-offering placements resolve to undefined instead of null on iOS

**Repository:** RevenueCat/purchases-capacitor, version 13.7.4, commit `4c2567777acf8f9361bd830d25868cc16496ab46`.  
**Verified platform:** iOS 27.1 simulator; Capacitor 8.4.1, PurchasesHybridCommon 19.12.0, RevenueCat iOS 5.95.0.

## Expected and actual

`getCurrentOfferingForPlacement` documents and types its result as `PurchasesOffering | null`. For an explicit **No Offering** placement, the actual iOS bridge resolves to `undefined`. A valid consumer using `offering !== null` then throws when reading `offering.identifier`.

This can interrupt a paywall/navigation flow that handles the documented null case. An unknown placement with a configured fallback still returns the fallback normally; that is a separate passing control.

## Reproduce

1. Run the included `PlacementRepro` app with a fresh synthetic user in **SDK Bug Reporter** (`proj602cc762`), **Test Store** (`app4ca00b430f`). [App dashboard](https://app.revenuecat.com/projects/602cc762/apps/app4ca00b430f).
2. The dedicated [test targeting rule](https://app.revenuecat.com/projects/602cc762/targeting/tvpeenTzcQ) maps `sdk_bug_reporter_none_20261018` to No Offering and preserves `default` for all other placements.
3. Configure Purchases, fetch customer info and offerings, then execute:

```ts
const offering = await Purchases.getCurrentOfferingForPlacement({
  placementIdentifier: 'sdk_bug_reporter_none_20261018',
});
const label = offering !== null ? offering.identifier : 'No offering';
```

Expected: `null`, followed by `"No offering"`. Actual: `undefined`, followed by `TypeError`. The exact consumer passes strict TypeScript checking against the unchanged SDK declarations.

## Tests and suggested solution

Normalize successful `undefined` results to `null` specifically for `getCurrentOfferingForPlacement` in the public JS wrapper. The included minimal patch preserves existing offerings, errors, listener behavior and unrelated void results.

- `npm test -- --runInBand placementNullContract`: **4 pass / 2 fail before; 6 pass after**. These unit tests isolate the real wrapper with mocked native transport.
- `npm test -- --runInBand` with the fix: **23 pass**. Existing native Capacitor XCTest baseline: **2 pass**. Full SDK TypeScript check passes.
- `./node_modules/.bin/tsc -p tsconfig.qa-placement.json`: strict null-guard consumer compiles.
- Actual native app: **4 pass / 2 fail before; 6 pass / 0 fail after**. The app calls the real plugin and Test Store; no transport mocks or injected callback fixtures. Native result logs show `TO JS undefined` before the fix.
- `python3 reproduce.py` builds the unmodified pinned SDK and app; `python3 reproduce.py --fixed` builds the fixed app. `--tests` runs the regression/full JS suite (expected failure without `--fixed`). The runner restores production source in `finally`.

## Introduced in

The current **successful-undefined** behavior was introduced by commit [`8365ed83ea234fb65772d0bd08fb343746cfd382`](https://github.com/RevenueCat/purchases-capacitor/commit/8365ed83ea234fb65772d0bd08fb343746cfd382), [PR #628](https://github.com/RevenueCat/purchases-capacitor/pull/628), **2025-12-17**. First containing stable source release: **11.3.1**, published **2025-12-18**.

Historical execution of its unmodified helper and actual Capacitor 7.0.0 resolve/JSON serialization code produces JavaScript `undefined`; a present-offering control is preserved. Parent `c468cc0085b75a955dd141ea27a62a6abf312823` instead rejects the nil response. **The parent was already wrong, not a passing null baseline.** The earlier feature PR [#222](https://github.com/RevenueCat/purchases-capacitor/pull/222) already declared the nullable contract. PR #628 fixed the rejection while leaving the promised null value incorrect.

Historical runs are macOS boundary executions with unavailable framework declarations supplied by the harness, not full historical mobile apps. Capacitor 7.0.0 satisfies the historical dependency range; there was no committed lockfile establishing its exact resolved version. Current full app evidence uses the pinned versions above.

## Evidence and limits

The source archive includes the report, SDK snapshot, runnable app, patch, tests, historical source/execution results, logs, and `evidence/before.png`, `before.mp4`, `fixed.png`, `fixed.mp4`. Both short videos show the real flow and resulting assertions.

Verified on an iOS simulator only; Android and physical devices were not executed. No purchase or refund was attempted. Only the dedicated Test Store project and synthetic users were used. Production SDK source was restored after validation.

## Latest upstream recheck — 2026-10-20

**still-reproduces** at `59927eeb5e8a8dc2ce904f20c1e6dc7c14308947`. Current native helper plus installed Capacitor 8 serializer produce JavaScript undefined for nil; present offering survives. Actual JS wrapper: 2 failed / 4 passed.

Verification: Local regression revalidation; no new full mobile-app, backend, Android or physical-device execution. Evidence: `revalidation/2026-10-20/capacitor-native/boundary-results.json`.
