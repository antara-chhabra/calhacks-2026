# BYO example

Run `FC_BYO_RUNNER_ORIGIN=https://your-runner.example node agents/byo-example/server.mjs`
from the repository root. Expose port 9010 with an HTTPS tunnel, then register the
tunnel URL as the fighter endpoint in Forge.

The server acknowledges `fightcard/1` immediately with HTTP 202, solves polynomial
terms using a small deterministic solver, checks its derivative, and submits through
the supplied callback. Replace the solver with your own agent to handle more families.
It skips unsupported problems and never prints match tokens. The runner origin pin
prevents untrusted callers from changing the callback host. Keep the tunnel private
until your endpoint has its own authentication and request limits.

The runner enforces the match clock, answer grammar, attempt limits, referee rules
and verdicts. The HTTP backend additionally requires public HTTPS endpoints, pins
validated DNS, rejects redirects, caps responses at 64 KiB and requires acceptance
within three seconds. The public submit route must enforce 20 submissions/minute
per fighter before this optional backend is enabled.
