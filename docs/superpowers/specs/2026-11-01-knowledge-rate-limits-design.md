# Knowledge endpoint rate limits

## Goal and scope

Protect the three knowledge endpoints against excessive requests using the approved local, per-instance IP-based limit. This change does not authorize deployment or merge and does not address authorization on other routes.

## Design

Use a Fastify-compatible rate-limit plugin with a limit of 60 requests per minute per client IP per endpoint. Run the check before authentication, authorization, and knowledge service work. Return HTTP 429 when a limit is exceeded. Retain the plugin's local in-memory storage; do not introduce external infrastructure.

The Fastify server must not blindly trust client-provided proxy headers. A deployment behind proxies requires an explicitly configured trusted-proxy boundary. Multiple instances do not share limits; deployment across replicas requires a shared rate-limit store and independent security review. IP-based limits can affect users behind the same NAT and are not a substitute for identity-based or distributed abuse controls.

## Verification

First add route-level tests that fail without the limiter and cover all three endpoints, including proof that rejected requests do not reach authentication or the service. Verify independent endpoints and client IPs as appropriate, then run the focused tests and repository verification. Document the threshold and deployment limitations in the knowledge authorization ADR. Inspect the draft PR's CodeQL results without suppressing findings.
