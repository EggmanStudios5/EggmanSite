/**
 * ============================================================================
 * EGGMAN STUDIOS — COMMUNITY FORUM DATA (`forum.html`)
 * ============================================================================
 * Grounded in real hardware/firmware questions from our 3 repositories.
 * Includes both Solved threads and Open Problems waiting for community replies.
 */

export const FORUM_CATEGORIES = [
  { id: 'all', label: 'All Discussions' },
  { id: 'macro-python', label: 'Macro Pads & Python' },
  { id: 'weather-stations', label: 'Mateo Weather Stations' },
  { id: 'rfid-access', label: 'RFID Door Locks' },
  { id: 'show-and-tell', label: 'Show & Tell / Builds' }
];

export const FORUM_THREADS = [
  {
    id: 'thread-open-bme280-addr',
    category: 'weather-stations',
    categoryLabel: 'Mateo Weather Stations',
    title: 'BME280 returning -999 on ESP32-C6 Urban build (GPIO 6 / GPIO 7) — I2C address 0x76 vs 0x77?',
    author: 'tomas_brno',
    timeAgo: '3 hours ago',
    solved: false,
    upvotes: 6,
    question:
      'I soldered the DIY Mateo Solar Weather Sensor Bundle onto an ESP32-C6 following the pinout table (`SDA -> GPIO 6`, `SCL -> GPIO 7` with 4.7k pull-ups to 3.3V). The TP5000 LiFePO4 charger works great, but serial logs show `-999` for temperature. Did anyone else have to bridge the SDO pad on the Bosch BME280 breakout to switch from `0x76` to `0x77`?',
    replies: [
      {
        author: 'mateo_hw',
        role: 'Contributor',
        isSolution: false,
        text: 'Check the three tiny solder pads next to the BME280 chip on your breakout! Purple/GY-BME280 boards default to `0x76`, whereas Adafruit-style breakouts pull SDO high to `0x77`. Try running an `i2c_scanner` sketch on `Wire.begin(6, 7)` and post what address shows up.'
      }
    ]
  },
  {
    id: 'thread-open-macro-standalone-boot',
    category: 'macro-python',
    categoryLabel: 'Macro Pads & Python',
    title: 'Fixed: Why `while (!Serial);` in `simple.ino` made my DIY Pro Micro wait after reboot',
    author: 'kuba_dev',
    timeAgo: '1 day ago',
    solved: true,
    upvotes: 14,
    question:
      'When I flashed an older copy of `3x3/simple/usb/simple.ino` onto my ATmega32U4 Pro Micro, the 9 keys wouldn\'t fire after plugging into a laptop until I opened Serial Monitor or `macro_pad_config.py` once. Also `CTRL+C` was acting like `CTRL+SHIFT+C` in my terminal!',
    replies: [
      {
        author: 'Filip (Eggman Studios)',
        role: 'Maintainer',
        isSolution: true,
        text: 'Great catch! Two things were happening in the original `simple.ino`:\n1) Line 126 had `while (!Serial);` which blocks forever on ATmega32U4 until a CDC serial terminal opens. We updated the repo to wait at most 2500ms (`while (!Serial && millis() - startWait < 2500)`).\n2) Arduino `Keyboard.press(\'C\')` automatically holds `SHIFT` for uppercase ASCII letters! We wrapped `mainKey` in `tolower()` in `simple.ino` so `CTRL+C` sends pure `KEY_LEFT_CTRL + \'c\'`. Pull the latest `Macro` repo and re-flash!'
      },
      {
        author: 'kuba_dev',
        role: 'OP',
        isSolution: false,
        text: 'Just pulled the updated `simple.ino` and flashed it—boots instantly on cold plug and `CTRL+C` works cleanly without injecting Shift!'
      }
    ]
  },
  {
    id: 'thread-linux-ttyacm',
    category: 'macro-python',
    categoryLabel: 'Macro Pads & Python',
    title: 'Linux Ubuntu 24.04 / Wayland — Permission denied on /dev/ttyACM0 & keyboard hook tip',
    author: 'eliska_linux',
    timeAgo: '2 days ago',
    solved: true,
    upvotes: 11,
    question:
      'I got my Macro producer (9 keys + 3 rotary encoders) and ran `macro_pad_config.py` on Ubuntu 24.04 (Wayland). When I pick `/dev/ttyACM0` and click Connect, it says `PermissionError: [Errno 13] Permission denied`. Also how do I set shortcuts on Wayland without running the whole GUI as root?',
    replies: [
      {
        author: 'Filip (Eggman Studios)',
        role: 'Maintainer',
        isSolution: true,
        text: 'Two quick steps for Linux:\n1) For `/dev/ttyACM0`, add your user to the `dialout` group (`sudo usermod -a -G dialout $USER`) and log out/in.\n2) We just updated `macro_pad_config.py` in the repo with a manual text Entry box inside the key assignment popup! That means on Wayland you can run `./.venv/bin/python macro_pad_config.py` as your normal user and simply type `CTRL+C` or `ALT+TAB` into the box without needing `sudo` for `/dev/input`.'
      }
    ]
  },
  {
    id: 'thread-rfid-uart-link',
    category: 'rfid-access',
    categoryLabel: 'RFID Door Locks',
    title: 'Wiring `InputNode.ino` to `OutputNode.ino` through a thick brick classroom wall + 1N4007 diode',
    author: 'honza_lab',
    timeAgo: '4 days ago',
    solved: false,
    upvotes: 9,
    question:
      'We are installing the `RFID-student-acces-system` on our school robotics lab door. The hallway `InputNode.ino` (`MFRC522` on pins 10/9) talks to the interior `OutputNode.ino` (`RELAY_PIN 4`) at `115200` baud over a 1.5m CAT5e cable through the wall. What is the maximum cable length before we should drop the UART baud rate or use RS-485, and where exactly does the `1N4007` diode go?',
    replies: [
      {
        author: 'Filip (Eggman Studios)',
        role: 'Maintainer',
        isSolution: false,
        text: 'Through a standard doorway (under 3 meters of twisted-pair CAT5e with common `GND`), 3.3V UART at `115200` baud works reliably. If you run longer than 4 meters, drop `Serial.begin(9600)` in both `InputNode.ino` and `OutputNode.ino`. Put the `1N4007` flyback diode directly across the two screw terminals of the 12V electric door strike (silver cathode stripe pointing to the `+12V` wire).'
      }
    ]
  },
  {
    id: 'thread-mateo-winter-solar',
    category: 'weather-stations',
    categoryLabel: 'Mateo Weather Stations',
    title: 'Winter solar angle & MOSFET heater gating (`GPIO 15`) on Pre-Built Mateo Stations',
    author: 'marek_orchard',
    timeAgo: '6 days ago',
    solved: true,
    upvotes: 15,
    question:
      'We mounted the Pre-Built Mateo Long-Range Field Mast + Indoor Home Deck in our apple orchard. How does the station keep the `MQ-135` air quality heater (150mA) from draining the `LiFePO4` pack during 2 weeks of winter fog?',
    replies: [
      {
        author: 'mateo_hw',
        role: 'Contributor',
        isSolution: true,
        text: 'On all Mateo boards, the `MQ-135` heater ground pin is switched by a `2N7002` N-Channel MOSFET (`GPIO 15` on ESP32-C6 / `GPIO 18` on ESP32-S3), while the 5V solar rail is monitored via a `100k/10k` divider on `ADC1`. When solar input drops or battery voltage falls below `3.20V`, the firmware leaves the MOSFET gate LOW so the station only samples the ultra-low-power `BME280` (`7 µA` sleep)!'
      }
    ]
  }
];
