#!/usr/bin/env bash
set -o errexit

# Install dependencies required for dlib
apt-get update
apt-get install -y build-essential cmake python3-dev

# Now install Python dependencies
pip install -r requirements.txt
