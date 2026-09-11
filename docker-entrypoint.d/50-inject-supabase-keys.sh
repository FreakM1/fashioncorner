#!/bin/sh
set -eu

sed -i "s|__SUPABASE_URL__|${SUPABASE_URL:-}|g; s|__SUPABASE_ANON_KEY__|${SUPABASE_ANON_KEY:-}|g" /usr/share/nginx/html/assets/supabase-config.js
