#!/data/data/com.termux/files/usr/bin/bash
set -eu
cd "$(dirname "$0")"
if ! command -v python >/dev/null 2>&1; then
  echo "Installing Python in Termux..."
  pkg install -y python
fi
exec python start.py
