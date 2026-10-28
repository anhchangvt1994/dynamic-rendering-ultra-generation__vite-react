#!/bin/sh
OUT=/tmp/minimum-samples.txt
while :; do
  set -- $(ps -eo rss=,stat=,args= | awk '
    $2 ~ /^Z/ { next }
    $3 ~ /(^|\/)(node|npm)$/ || $3 == "web-scraping" || $3 == "PM2" { n+=$1; nc++ }
    $3 ~ /lightpanda/ { b+=$1; bc++ }
    $3 ~ /(redis|valkey)-server/ { r+=$1 }
    END {print n*1024,b*1024,r*1024,nc,bc}')
  awk -v ts="$(date +%s%3N)" -v nr="$1" -v br="$2" -v rr="$3" -v np="$4" -v bp="$5" '
    FILENAME ~ /memory.current$/ { current=$1; next }
    FILENAME ~ /memory.stat$/ { if($1=="anon"||$1=="shmem")anon+=$2; if($1=="inactive_file")inactive=$2; next }
    FILENAME ~ /cpu.stat$/ && $1=="usage_usec" { cpu=$2 }
    FILENAME ~ /memory.events$/ && $1=="oom_kill" { oom=$2 }
    END {printf "%.0f %.0f %.0f %.0f %.0f %.0f %.0f %.0f %.0f %.0f %.0f\n",ts,current,inactive,anon,cpu,oom,nr,br,rr,np,bp}' \
    /sys/fs/cgroup/memory.current /sys/fs/cgroup/memory.stat /sys/fs/cgroup/cpu.stat /sys/fs/cgroup/memory.events >> "$OUT"
  sleep 0.5
done
