/**
 * Lightweight hook that provides a stable refresh trigger for list and grid components.
 * Incrementing a tick counter causes dependent components (e.g. DataGrid) to reload
 * their data without requiring a full page re-render.
 */
import { useCallback, useState } from "react";

/**
 * Lightweight hook that provides a stable refresh trigger for components like `DataGrid`
 * that reload their data when a dependency value changes.
 *
 * Pattern: pass `refreshTick` as a prop or dependency; call `triggerRefresh()` after a
 * mutation (create, update, delete) to cause the consumer to re-fetch without a full
 * page reload.
 *
 * `triggerRefresh` is stable across renders (wrapped in `useCallback`) so it can be
 * safely included in dependency arrays.
 *
 * @returns
 *  - `refreshTick`    — A monotonically incrementing counter. Increment triggers consumers.
 *  - `triggerRefresh` — Increments `refreshTick` by 1.
 */
export function useListRefresh(): { refreshTick: number; triggerRefresh: () => void } {
  const [refreshTick, setRefreshTick] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTick((previousTick) => previousTick + 1);
  }, []);

  return { refreshTick, triggerRefresh };
}