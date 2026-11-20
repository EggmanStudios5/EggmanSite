---
title: Macro Pad Python Setup
description: Install Python 3, pyserial, and program onboard EEPROM key bindings across Windows, Linux, and macOS.
---

Configure your 3×3 USB Macro Pad once—shortcuts are stored directly on the microcontroller's onboard EEPROM.

## Windows 10 / 11

1. Install Python 3 with PATH enabled:
   ```powershell
   winget install -e --id Python.Python.3.12
   ```
2. Clone the official Eggman Studios repository and install pinned dependencies:
   ```powershell
   git clone https://github.com/EggmanStudios5/Macro.git
   cd Macro
   python -m pip install pyserial==3.5 keyboard==0.13.5
   ```
3. Plug in the Macro Pad over USB and launch `python macro_pad_config.py`.

## Linux (Ubuntu / Debian / Fedora / Arch)

1. Install Python 3 and Tkinter:
   ```bash
   sudo apt update && sudo apt install -y python3 python3-pip python3-tk python3-venv git
   ```
2. Grant your user serial port access (`dialout` on Debian/Fedora, `uucp` on Arch), then log out and back in:
   ```bash
   sudo usermod -a -G dialout "$USER"
   ```
3. Create an isolated virtual environment and install pinned packages:
   ```bash
   git clone https://github.com/EggmanStudios5/Macro.git
   cd Macro
   python3 -m venv .venv
   source .venv/bin/activate
   pip install pyserial==3.5 keyboard==0.13.5
   ```
4. Note that the `keyboard` hook API listens to `/dev/input` devices on Linux; run inside an X11 session with appropriate input group permissions or send `SET key1|...|key9` directly over serial (`9600` baud).

## macOS

1. Install Python with Tkinter support:
   ```bash
   brew install python python-tk git
   ```
2. Clone and run in a virtual environment:
   ```bash
   git clone https://github.com/EggmanStudios5/Macro.git
   cd Macro
   python3 -m venv .venv
   source .venv/bin/activate
   pip install pyserial==3.5 keyboard==0.13.5
   python macro_pad_config.py
   ```
