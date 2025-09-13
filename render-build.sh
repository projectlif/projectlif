#!/usr/bin/env bash
set -e

echo "Installing requirements..."
pip install --upgrade pip
pip install -r requirements.txt
