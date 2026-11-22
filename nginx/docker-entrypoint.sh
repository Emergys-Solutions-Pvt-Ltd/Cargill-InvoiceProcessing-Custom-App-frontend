#!/bin/sh
# Renders the server block with the API upstream, checks the configuration, then starts nginx.
#   API_UPSTREAM  where /api/ is proxied (default http://backend:4000), e.g. http://api:4000
set -eu

: "${API_UPSTREAM:=http://backend:4000}"
case "$API_UPSTREAM" in
  http://*|https://*) ;;
  *) echo "API_UPSTREAM must start with http:// or https:// (got: $API_UPSTREAM)" >&2; exit 1 ;;
esac
case "$API_UPSTREAM" in
  *[!A-Za-z0-9:/._-]*) echo "API_UPSTREAM contains unsupported characters" >&2; exit 1 ;;
esac

mkdir -p /tmp/nginx/conf.d
# Only ${API_UPSTREAM} is replaced; nginx's own $variables in the template stay untouched
sed "s#\${API_UPSTREAM}#${API_UPSTREAM}#g" /etc/nginx/templates/default.conf.template > /tmp/nginx/conf.d/default.conf
nginx -t -q

exec "$@"
