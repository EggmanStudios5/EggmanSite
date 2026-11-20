---
title: DIY Macro Pad Assembly
description: Assemble switches, solder the 3x3 matrix, flash firmware, and verify checksums.
---

1. **Snap Switches into Plate:** Seat mechanical switches firmly into the top plate with pins straight, then press PBT keycaps onto the stems.
2. **Solder the 3×3 Switch Grid:** Wire the 3 rows to pins `9`, `8`, `7` and the 3 columns to pins `6`, `5`, `4` on the ATmega32U4 Pro Micro / Arduino Leonardo.
3. **Upload Signed Firmware:** Download verified firmware from `https://releases.eggmanstudios.me/api/v1/firmware`, verify the `X-Checksum-Sha256` digest, and flash with Arduino IDE (`Arduino Leonardo` board target, `Keypad` library installed).
4. **Assemble Enclosure & Bind Keys:** Tighten the 4 corner screws and configure your 9 shortcuts once using the Python utility.
