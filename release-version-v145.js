(() => {
  "use strict";
  if (window.__aldusReleaseVersionV145) return;
  window.__aldusReleaseVersionV145 = true;
  window.__aldusReleaseVersionV144 = true;
  globalThis.__ALDUS_APP_RELEASE__?.apply?.();
})();
