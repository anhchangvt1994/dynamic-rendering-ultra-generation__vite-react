#!/usr/bin/env bash
# Return the per-socket TCP autotuning ceiling based on available VPS memory.
# For cgroup-limited lab containers, use the limit instead of host MemTotal.
vps_network_buffer_max_bytes() {
  local ram_kib=${1:-} cgroup_limit

  if [[ -z $ram_kib ]]; then
    if [[ -r /sys/fs/cgroup/memory.max ]]; then
      read -r cgroup_limit </sys/fs/cgroup/memory.max
      if [[ $cgroup_limit =~ ^[0-9]+$ ]]; then
        ram_kib=$((cgroup_limit / 1024))
      fi
    fi
  fi
  if [[ -z $ram_kib ]]; then
    ram_kib=$(awk '/MemTotal/ { print $2; exit }' /proc/meminfo)
  fi
  [[ $ram_kib =~ ^[0-9]+$ ]] && ((ram_kib > 0)) || {
    echo 'Cannot determine available RAM for TCP buffer profile' >&2
    return 1
  }

  local max_bytes=$((ram_kib * 1024 / 128))
  ((max_bytes < 4 * 1024 * 1024)) && max_bytes=$((4 * 1024 * 1024))
  ((max_bytes > 32 * 1024 * 1024)) && max_bytes=$((32 * 1024 * 1024))
  printf '%s\n' "$max_bytes"
}

if [[ ${BASH_SOURCE[0]} == "$0" ]]; then
  vps_network_buffer_max_bytes "${1:-}"
fi
