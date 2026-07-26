(() => {
  "use strict";
  if (window.__aldusReleaseVersionV144) return;
  window.__aldusReleaseVersionV144 = true;
  globalThis.__ALDUS_APP_RELEASE__?.apply?.();
})();
