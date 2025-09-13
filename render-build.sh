#!/usr/bin/env bash
set -o errexit

# Install system dependencies needed by dlib
apt-get update
apt-get install -y build-essential cmake python3-dev

# Install Python deps
pip install -r requirements.txt
