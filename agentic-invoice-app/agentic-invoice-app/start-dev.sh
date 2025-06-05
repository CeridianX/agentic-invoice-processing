#!/bin/bash

# Remove the problematic cache directory if we can
rm -rf .vite-cache 2>/dev/null || true

# Try to remove the old vite cache
rm -rf node_modules/.vite 2>/dev/null || true

# Run vite with npx
npx vite --force