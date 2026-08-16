#!/bin/zsh
# ML Quest launcher — double-click me.
# Starts a tiny local web server and opens the course in your default browser.
cd "$(dirname "$0")"

for PORT in 8877 8878 8879 8880 8881; do
  # if something on this port already serves ML Quest, just open it
  if /usr/sbin/lsof -i tcp:$PORT >/dev/null 2>&1; then
    if curl -s "http://localhost:$PORT/index.html" 2>/dev/null | grep -q "ML Quest"; then
      open "http://localhost:$PORT"
      echo "ML Quest already running at http://localhost:$PORT"
      exit 0
    fi
    continue  # busy with something else — try next port
  fi
  nohup /usr/bin/python3 -m http.server $PORT >/dev/null 2>&1 &
  disown 2>/dev/null
  sleep 0.5
  open "http://localhost:$PORT"
  echo "ML Quest is running at http://localhost:$PORT — you can close this window."
  exit 0
done
echo "No free port found (8877-8881). Close something and retry."
