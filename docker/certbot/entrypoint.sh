#!/bin/sh
# Long-running renew loop. Certificates are issued out-of-band (see README)
# with a one-shot `certbot certonly` command the first time the stack is
# deployed; this entrypoint just keeps them refreshed afterwards.
trap exit TERM

while true; do
  certbot renew --webroot -w /var/www/certbot --quiet
  sleep 12h &
  wait $!
done
