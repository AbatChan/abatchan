# Published Nika releases

WordPress package URLs are immutable release artifacts. Do not delete or
replace a published `nika-site-guide-x.y.z.zip`: WordPress and intermediary
caches may continue using a manifest that points to that exact URL after a
newer release goes live.

The catalog and update manifest should point to the latest release, while
previously published WordPress ZIPs remain available for compatibility.

Universal ZIPs are direct-download artifacts rather than WordPress updater
targets. Keep the latest Universal ZIP unless an issued customer download link
still references an older file.
