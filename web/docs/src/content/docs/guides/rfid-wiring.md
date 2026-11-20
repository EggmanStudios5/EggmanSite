---
title: RFID Split-Node Wiring & Zero Trust Bridge
description: Separate exterior reader hardware from interior door strike relays with TLS and HMAC authentication.
---

1. **Mount Nodes on Separate Sides of the Door:** Install the MFRC522 reader module outside the room and mount the ESP32 strike controller strictly inside the locked room.
2. **Wire the 12V Electric Strike Safely Inside:** Connect the strike through the opto-isolated relay inside the room with a `1N4007` flyback diode across the strike terminals (cathode stripe on `+12V`).
3. **Provision Device TLS & HMAC Credentials:** Never trust unauthenticated hallway wires or IP addresses. Provision each interior ESP32 node with the Eggman Internal CA certificate (`ca.crt`) and a unique per-device `HMAC-SHA256` key synced with `Eggman.IoT.Bridge` (`:8443` on the IoT VLAN).
4. **Enroll Hashed Badge Identifiers:** Only `SHA-256` salted badge digests are transmitted to `/api/v1/devices/rfid/verify` and logged to the private RabbitMQ `/private-iot` audit queue.
