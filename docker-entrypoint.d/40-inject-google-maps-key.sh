#!/bin/sh
set -eu

sed -i "s|__GOOGLE_MAPS_API_KEY__|${GOOGLE_MAPS_API_KEY:-}|g" /usr/share/nginx/html/assets/shared.js
