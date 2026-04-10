#!/bin/bash

# Start Xvfb (Virtual Frame Buffer) in the background
# This provides a virtual display for Chromium to run in a headless environment
echo "Starting Xvfb on display :99..."
rm -f /tmp/.X99-lock
Xvfb :99 -ac -screen 0 1920x1080x24 > /dev/null 2>&1 &

# Wait a moment for Xvfb to start
sleep 2

# Export DISPLAY environment variable
export DISPLAY=:99

# Execute the main command (starts NestJS)
echo "Starting application with command: $@"
exec "$@"
