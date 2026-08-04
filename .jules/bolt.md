## 2026-08-04 - Schedule Grid Rendering Complexity
**Learning:** Found an `O(R * D * S)` array scanning operation inside a nested rendering loop (`getCell` filtering shifts per route/day) that triggers on every grid render. React component updates were bound by grid dimensions and data length.
**Action:** Always check loop bodies inside JSX iterators for linear time `Array.prototype.filter` or `find` calls. Precompute these using `useMemo` and map-based O(1) lookups.
