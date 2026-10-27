# VPS load control

Source: https://chatgpt.com/share/6adf8ae6-3fec-83ec-9536-e445d01b1abf

## Evidence

- Two `web-scraping` processes use 2,806,784 and 2,635,540 KiB RSS.
- CPU pressure avg10 is 12.04%; one vmstat sample has zero idle CPU.
- Memory pressure avg10/60/300 is zero; occupied swap alone does not prove ongoing thrashing.
- TCP listen overflows are zero. BBR is enabled. Setting the default qdisc did not replace the existing interface qdisc.
- The fq trial transferred only 15,894 bytes in 60 seconds; it does not establish a speed improvement.
- The API timing test used `api.example.com`; its DNS failure says nothing about the real upstream.

## Verified code problems

1. Two fixed PM2 instances each start two HTTP workers. Each HTTP worker eagerly starts up to CPU x 2 render threads. The concurrency setting is multiplied by these layers.
2. Crawl counters are reset after 20 seconds even though a render may still run for 52 seconds. Waiting URLs have no size or age limit.
3. Upstream timeouts resolve the caller but do not abort fetch; the timer is cleared before the body is consumed.
4. Response caches limit entry count but not bytes, and expired unused entries remain allocated.

## Changes and validation

- Derive a CPU/RAM budget, distribute it across configured instances, and share render permits across HTTP workers. Keep API I/O outside render admission.
- Bound queue size/age, release render permits on completion/failure, and keep reusable render pools small.
- Abort timed-out upstream requests including stalled response bodies; reuse a bounded connection pool and keep authenticated requests isolated.
- Bound hot-cache bytes and remove expired entries.
- Extend the existing lab to run the real PM2 worker command against a Git baseline and current sources in the same dependency image, using seeded traffic and recording failures.
- Run targeted concurrency/timeout/cache tests, existing setup checks, and a before/after load comparison. Local Docker VM has 6 GiB and 4 CPUs, so use a 4 GiB / 2 CPU VPS rather than pretending to reproduce the physical 8 GiB VPS.

The patch changes this repository. Applying it on the actual VPS requires rebuilding/restarting the app there. It does not infer mobile rendering performance or upstream IPv4/IPv6 quality from server-side load measurements.
