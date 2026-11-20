---
title: AltStore & Release Verification
description: Subscribe to the Eggman Studios AltStore source and verify SHA-256 checksums for games and firmware.
---

## AltStore / SideStore Source

Add the official Eggman Studios source URL inside AltStore or SideStore:

```text
https://releases.eggmanstudios.me/api/v1/altstore/source.json
```

## Verifying Game & Firmware Downloads

Every binary served from `Eggman.ReleaseHub` includes an `X-Checksum-Sha256` response header and matching manifest digest (`/api/v1/games`, `/api/v1/firmware`).

Verify any downloaded build (`Sluníčka`, `Protikód`, or hardware firmware) before executing or flashing:

```bash
sha256sum slunicka-1.0.0-linux-x64.tar.gz
```

Confirm the printed hex digest matches the published ReleaseHub manifest exactly.
