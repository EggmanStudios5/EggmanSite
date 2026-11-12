/**
 * ============================================================================
 * EGGMAN STUDIOS — SIMPLE INSTALL, CONNECT, ASSEMBLE & SETUP TUTORIALS
 * ============================================================================
 * Straightforward, practical step-by-step guides for installing the software,
 * connecting your device, assembling DIY kits, and mounting weather stations.
 */

export const PYTHON_OS_GUIDES = [
  {
    id: 'windows',
    label: 'Windows 10 / 11',
    badge: 'Windows Setup',
    summary:
      'Install Python, download the Macro Pad app, connect your pad over USB, and program your buttons.',
    steps: [
      {
        title: '1. Install Python 3',
        description:
          'Download Python from python.org (or run the command below). When the installer opens, check the box at the bottom that says "Add python.exe to PATH" and click Install Now.',
        code: 'winget install -e --id Python.Python.3.12'
      },
      {
        title: '2. Download the App & Install the 2 Required Libraries',
        description:
          'Open Command Prompt or PowerShell, download the Macro folder, and install `pyserial` (for USB communication) and `keyboard` (for recording key presses):',
        code: `git clone https://github.com/FilipVastl005/Macro.git
cd Macro
python -m pip install pyserial keyboard`
      },
      {
        title: '3. Plug In Your Pad & Open the App',
        description:
          'Plug your Macro Pad into a USB port, then start the app:',
        code: 'python macro_pad_config.py'
      },
      {
        title: '4. Connect & Assign Your Keys',
        description:
          'In the app window: click "🔄 Refresh", choose your COM port (like COM3 or COM4) from the dropdown, and click "✔️ Connect". Click "📝 Program Buttons", assign each key, and hit "💾 Save to Device". Once it says updated, you can close the app—your shortcuts are saved inside the pad.'
      }
    ],
    tip: 'Not sure which COM port is your pad? Unplug the USB cable, click Refresh to see which port disappears, then plug it back in and click Refresh again.'
  },
  {
    id: 'linux',
    label: 'Linux (Ubuntu / Debian / Fedora / Arch)',
    badge: 'Linux Setup',
    summary:
      'Install Python + Tkinter, give your user permission to use USB ports, and run the Macro Pad app.',
    steps: [
      {
        title: '1. Install Python 3 & Tkinter',
        description:
          'On Linux, the window library (`tkinter`) is a separate package. Install it with your package manager:',
        code: `# Ubuntu / Debian / Mint:
sudo apt update && sudo apt install -y python3 python3-pip python3-tk python3-venv git

# Fedora:
sudo dnf install -y python3 python3-pip python3-tkinter git

# Arch Linux:
sudo pacman -S --needed python python-pip tk git`
      },
      {
        title: '2. Allow USB Port Access (One-Time Step)',
        description:
          'Add your user account to the serial port group so you can connect to `/dev/ttyACM0` without permission errors. Log out and log back in once after running this:',
        code: `# Ubuntu / Debian / Fedora:
sudo usermod -a -G dialout $USER

# Arch Linux:
sudo usermod -a -G uucp $USER`
      },
      {
        title: '3. Download the App & Install Libraries',
        description:
          'Download the Macro folder, create a small virtual environment, and install `pyserial` and `keyboard`:',
        code: `git clone https://github.com/FilipVastl005/Macro.git
cd Macro
python3 -m venv .venv
source .venv/bin/activate
pip install pyserial keyboard`
      },
      {
        title: '4. Open the App & Save Your Keys',
        description:
          'Plug in your Macro Pad, launch the app, select `/dev/ttyACM0`, click "✔️ Connect", set your shortcuts, and click "💾 Save to Device":',
        code: './.venv/bin/python macro_pad_config.py'
      }
    ],
    tip: 'In the key assignment popup, you can either press a shortcut on your keyboard or simply type it into the text box (e.g. CTRL+C or ALT+TAB) and click OK.'
  },
  {
    id: 'macos',
    label: 'macOS',
    badge: 'Mac Setup',
    summary:
      'Install Python with Tkinter, plug in your Macro Pad via USB, and assign your shortcuts.',
    steps: [
      {
        title: '1. Install Python 3 & Tkinter',
        description:
          'Install Python and `python-tk` using Homebrew (or download the universal macOS installer from python.org):',
        code: 'brew install python python-tk git'
      },
      {
        title: '2. Download the App & Install Libraries',
        description:
          'Open Terminal, download the Macro folder, and install `pyserial` and `keyboard`:',
        code: `git clone https://github.com/FilipVastl005/Macro.git
cd Macro
python3 -m venv .venv
source .venv/bin/activate
pip install pyserial keyboard`
      },
      {
        title: '3. Plug In Your Pad & Run the App',
        description:
          'Connect your Macro Pad via USB and start the app:',
        code: './.venv/bin/python macro_pad_config.py'
      },
      {
        title: '4. Select USB Port & Save Keys',
        description:
          'Pick the `/dev/cu.usbmodem...` port from the dropdown, click "✔️ Connect", then click "📝 Program Buttons". Assign your 9 keys and click "💾 Save to Device".'
      }
    ],
    tip: 'If macOS asks for "Input Monitoring" permission when capturing key presses, you can either allow Terminal in System Settings -> Privacy & Security, or just type your shortcut (like CTRL+C) into the popup box.'
  }
];

export const SETUP_GUIDES = [
  {
    id: 'setup-macro-diy',
    badge: 'Guide 02 · DIY Macro Pad Kit',
    title: 'How to Assemble & Flash a DIY Macro Pad',
    subtitle: 'Bought bare switches and a microcontroller from the shop? Follow these 4 steps to put it together.',
    steps: [
      {
        stepNumber: '1',
        title: 'Snap Switches into the Plate',
        text: 'Push your mechanical switches firmly into the top plate until they click, making sure the metal pins on the bottom aren\'t bent. Push your keycaps onto the stems.'
      },
      {
        stepNumber: '2',
        title: 'Solder the 3×3 Switch Grid to the Board',
        text: 'Wire the 3 horizontal switch rows to pins 9, 8, and 7 on your Arduino Pro Micro / Leonardo. Wire the 3 vertical switch columns to pins 6, 5, and 4.'
      },
      {
        stepNumber: '3',
        title: 'Upload the Firmware (Skip if Pre-Flashed)',
        text: 'If you bought our Pre-Flashed Microcontroller from the shop, skip this step! Otherwise, open Arduino IDE, install the "Keypad" library from Library Manager, open `3x3/simple/usb/simple.ino`, select "Arduino Leonardo" under Tools -> Board, and click Upload.'
      },
      {
        stepNumber: '4',
        title: 'Screw the Case Together & Set Your Keys',
        text: 'Place the board into the bottom case, tighten the 4 corner screws, plug in the USB cable, and follow the Python guide above to set your shortcuts.'
      }
    ]
  },
  {
    id: 'setup-weather-station',
    badge: 'Guide 03 · Pre-Built & DIY Mateo Weather Stations',
    title: 'How to Mount & Connect Your Mateo Weather Station',
    subtitle: 'Where to place your station outdoors, how to turn on the solar battery, and how to connect it to Wi-Fi or your indoor display.',
    steps: [
      {
        stepNumber: '1',
        title: 'Turn On the Internal Battery Switch',
        text: 'Unscrew the weatherproof cap on the bottom of the white louvered housing and flip the internal battery switch to ON. The small status light will blink twice to show the battery and sensors are awake.'
      },
      {
        stepNumber: '2',
        title: 'Connect to Wi-Fi (or Plug In Your Indoor Display Hub)',
        text: 'For Urban Wi-Fi stations: hold the Setup button for 3 seconds, connect your phone or laptop to the "Mateo-Setup" Wi-Fi network, and enter your home Wi-Fi password at 192.168.4.1. For Long-Range LoRa stations: simply plug the indoor receiver screen into a USB power adapter inside your house—it is already paired to the outdoor mast.'
      },
      {
        stepNumber: '3',
        title: 'Pick a Good Outdoor Spot (1.5m–2m High)',
        text: 'Mount the white radiation shield on a pole, fence post, or balcony rail about 1.5 to 2 meters off the ground where wind can blow freely through the vents. Avoid mounting it directly over black asphalt or right next to an air-conditioning exhaust.'
      },
      {
        stepNumber: '4',
        title: 'Aim the Solar Panel South',
        text: 'Point the solar panel facing South (at roughly a 45° tilt) so it catches winter sun and sheds rain or snow. Give the air-quality sensor 24 hours outdoors to settle into a clean baseline reading.'
      }
    ]
  },
  {
    id: 'setup-rfid-door',
    badge: 'Guide 04 · RFID Classroom & Workshop Door Kit',
    title: 'How to Install & Wire the RFID Door Access Kit',
    subtitle: 'How to mount the reader in the hallway, keep the lock switch safe inside the room, and add student cards.',
    steps: [
      {
        stepNumber: '1',
        title: 'Mount the Reader Outside & Controller Inside',
        text: 'Screw the card reader box to the wall outside the classroom door, and mount the main controller box inside the locked room. Run a 4-wire cable (TX, RX, 5V, GND) through the doorframe to connect the two boxes.'
      },
      {
        stepNumber: '2',
        title: 'Wire the Electric Door Strike (Inside the Room)',
        text: 'Connect your 12V electric door strike to the green relay screw terminals inside the room (Pin 4 on the inside board). Attach the included 1N4007 diode across the two door lock wires (silver stripe on the +12V wire) so the lock doesn\'t cause power spikes.'
      },
      {
        stepNumber: '3',
        title: 'Flash the Two Boards (If Building from Scratch)',
        text: 'If you are using your own ESP boards instead of a pre-flashed kit, upload `esp/InputNode.ino` to the outside reader board (MFRC522 on pins 10 and 9) and `esp/OutputNode.ino` to the inside relay board.'
      },
      {
        stepNumber: '4',
        title: 'Add Student Cards & Test the Door',
        text: 'Power on the inside controller and open the local room dashboard in your browser on the building Wi-Fi. Tap a new student card on the outside reader—it will show up in the log so you can approve it and test that the door unlocks for 3 seconds.'
      }
    ]
  }
];
