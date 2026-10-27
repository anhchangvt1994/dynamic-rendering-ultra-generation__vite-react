#!/bin/sh
# NOTE - Resource sampler of the VPS lab, runs inside the VPS container.
# Every 500ms appends one line to $1:
#   <epoch ms> <cgroup anon MB> <cgroup total MB> <cpu usage usec> <oom kills>
#   <node RSS MB> <browser RSS MB> <browser processes> <redis / valkey RSS MB>
OUT="$1"
CG=/sys/fs/cgroup

while :; do
  anon=$(awk '$1 == "anon" { printf "%.1f", $2 / 1048576 }' "$CG/memory.stat")
  total=$(awk '{ printf "%.1f", $1 / 1048576 }' "$CG/memory.current")
  cpu=$(awk '$1 == "usage_usec" { print $2 }' "$CG/cpu.stat")
  oom=$(awk '$1 == "oom_kill" { print $2 }' "$CG/memory.events")
  procs=$(ps -eo rss=,nlwp=,args= | awk '
    $3 ~ /(^|\/)(node|npm)$/ || $3 == "web-scraping" || $3 == "PM2" { node += $1; nodeProcs++; threads += $2 }
    $3 ~ /chrom|headless_shell|lightpanda/ { browser += $1; count++ }
    $3 ~ /(redis|valkey)-server/ { redis += $1 }
    END { printf "%.1f %.1f %d %.1f %d %d", node / 1024, browser / 1024, count, redis / 1024, nodeProcs, threads }')
  cpuPressure=$(awk '/^some / { split($2, x, "="); print x[2] }' "$CG/cpu.pressure")
  memoryPressure=$(awk '/^some / { split($2, x, "="); print x[2] }' "$CG/memory.pressure")
  echo "$(date +%s%3N) $anon $total $cpu $oom $procs $cpuPressure $memoryPressure" >> "$OUT"
  sleep 0.5
done
