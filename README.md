# JWT Hardening — Secure Software Development (Assignment 2)
**Student:** Hossam Ahmed  
**Course:** Secure Software Development — Fall 2025

> This repository contains my submission for *Assignment 2 — JWT Hardening*.
> It includes the modified Node.js + Express demo (hardened), small frontend edits (if required), attack demo scripts, and documentation showing how to reproduce the vulnerable behavior and how the hardened server protects against it.

---

## Table of contents
- [Project overview](#project-overview)  
- [What I changed (summary)](#what-i-changed-summary)  
- [Requirements implemented](#requirements-implemented)  
- [Repo layout](#repo-layout)  
- [Prerequisites](#prerequisites)  
- [Setup & run (quick start)](#setup--run-quick-start)  
- [`.env.example`](#envexample)  
- [How I generated secrets](#how-i-generated-secrets)  
- [How to reproduce the vulnerable demo (step-by-step)](#how-to-reproduce-the-vulnerable-demo-step-by-step)  
- [How to reproduce the hardened demo (step-by-step)](#how-to-reproduce-the-hardened-demo-step-by-step)  
- [Attack scenarios demonstrated](#attack-scenarios-demonstrated)  
- [Wireshark capture instructions & filters](#wireshark-capture-instructions--filters)  
- [Notes, assumptions & limitations](#notes-assumptions--limitations)  
- [Extra / Bonus (optional) features](#extra--bonus-optional-features)  
- [Deliverables included](#deliverables-included)  
- [Contact / Author](#contact--author)

---

## Project overview
This project starts from the supplied vulnerable Node.js + Express JWT demo and hardens it to follow secure authentication practices:
- Move secrets & configuration into `.env`.
- Remove hard-coded secrets.
- Enforce `iss` (issuer) and `aud` (audience) claims.
- Validate algorithm (`alg`) during verification.
- Shorten access token lifetime and implement a refresh-token flow (rotation).
- Demonstrate at least two attacks against the vulnerable server, and show they fail against the hardened server.
- Capture traffic with Wireshark to show token visibility on HTTP (and optionally confidentiality on HTTPS).

---

## What I changed (summary)
- Moved all configuration/secrets to environment variables (see `.env.example`).
- Replaced weak/hard-coded secrets with `process.env` values.
- Tokens are issued with `iss` and `aud` claims and validated during verification.
- Access tokens now have a short lifetime (default: **10 minutes**).
- Separate refresh tokens (different secret) and refresh rotation implemented.
- Small front-end edits to support secure refresh flow or credential options (no UI rebuild).
- Added demo scripts:
  - `scripts/forge-token.js` — shows how a token can be forged against the vulnerable server.
  - `postman/collection.json` — Postman collection with the request steps for both vulnerable and hardened flows.
- README includes reproduction steps and Wireshark capture guidance.

---

## Requirements implemented
1. **Use environment configuration (.env)** — implemented; `.env.example` included.  
2. **Remove hard-coded / weak secrets** — replaced with env variables.  
3. **Enforce token claims and verification** — `iss`, `aud`, and `alg` checks implemented.  
4. **Implement a refresh strategy** — refresh tokens use a separate secret and rotation strategy (server-side rotation and validation).  
5. **Keep/reuse the existing frontend** — only small, non-invasive edits made (e.g., fetch credentials/cookie handling).  
6. **Demonstrate attacks & protections** — at least two attacks reproduced and re-played; hardened server rejects them.  
7. **Record traffic and show what’s visible** — Wireshark capture instructions & sample capture included.

---

## Repo layout
```
/
├─ server/                      # Node/Express server (vulnerable + hardened code)
│  ├─ index.js                  # main server file (hardened)
│  ├─ vuln-server.js            # vulnerable demo server (kept for repro)
│  ├─ auth/                     # authentication helpers (sign/verify)
│  ├─ scripts/
│  │   ├─ forge-token.js        # forge script to demo weak-secret attack
│  │   └─ gen-secret.js         # helper to generate secure secrets
│  └─ ... 
├─ client/                      # existing frontend (small edits only)
├─ postman/                     # Postman collection to reproduce steps
│  └─ JWT-Hardening.postman_collection.json
├─ .env.example                 # example environment file (no secrets)
├─ README.md
└─ evidence/
   ├─ wireshark_capture_http.pcapng
   └─ wireshark_https_demo.pcapng (if HTTPS bonus done)
```

> NOTE: exact filenames/paths may vary slightly depending on original starter repo; adapt the commands below if necessary.

---

## Prerequisites
- Node.js v18+ and npm  
- SQLite3 (if the demo uses SQLite DB in repo) — or use the provided `npm run init-db`.  
- Postman (for replaying requests)  
- Wireshark (for capturing local traffic)  

---

## Setup & run (quick start)

1. Install dependencies:
```bash
npm install
```

2. Initialize database (if required by the project):
```bash
npm run init-db
```

3. Populate environment:
- Copy `.env.example` to `.env` and fill in values:
```bash
cp .env.example .env
# then edit .env with your editor
```

4. Generate secure secrets (example command):
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# paste output into ACCESS_TOKEN_SECRET in .env
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# paste output into REFRESH_TOKEN_SECRET in .env
```

5. Start the **vulnerable** demo (used to reproduce attacks):
```bash
npm run start:vuln
# or
node server/vuln-server.js
```

6. Start the **hardened** demo (production-like hardened server):
```bash
npm run start
# or
node server/index.js
# If repository provides start:hard script:
# npm run start:hard
```

> If the repo contains only one server file with modes, check `package.json` scripts — `start:vuln` and `start` should be present. If not, run the appropriate file directly (see `server/`).

---

## `.env.example`

> **Do NOT commit your real `.env`.** Use `.env.example` as a template.

```
# .env.example

# Server
PORT=1234

# Access token configuration
ACCESS_TOKEN_SECRET=replace_with_secure_random_hex_32bytes
ACCESS_TOKEN_EXPIRES_IN=10m       # e.g., 10m for 10 minutes
TOKEN_ISSUER=ssd-uni.example
TOKEN_AUDIENCE=ssd-client.example

# Refresh token configuration
REFRESH_TOKEN_SECRET=replace_with_secure_random_hex_64bytes
REFRESH_TOKEN_EXPIRES_IN=7d      # e.g., 7d

# Optional: cookie options (if using httpOnly cookies)
COOKIE_SECURE=false              # true for HTTPS
COOKIE_HTTPONLY=true
COOKIE_SAMESITE=Strict

# DB / other config
DATABASE_URL=./data/sqlite.db
```

---

## How I generated secrets
I generated strong secrets using Node's `crypto` module. Example commands (run locally; do **not** commit outputs):

```bash
# 32 bytes (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 64 bytes (128 hex chars) for refresh token secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

The README in the repo documents this process and recommends storing secrets securely (system environment, not committed to git).

---

## How to reproduce the vulnerable demo (step-by-step)
1. Start the vulnerable server:
```bash
npm run start:vuln
# or: node server/vuln-server.js
```

2. Confirm endpoints exist (defaults):
- `POST /vuln-login` — demo login that issues token with weak/hard-coded secret.
- `GET /protected` — protected endpoint requiring JWT.

3. Use Postman to:
- Send a `POST /vuln-login` with valid credentials (as in the demo).
- Receive the JWT (in response body or Authorization header).
- Call `GET /protected` with `Authorization: Bearer <token>` — you should get a successful response.

4. Attack — **forge token with known weak secret**:
- Use `scripts/forge-token.js` (or manually craft) to produce a token signed with the same weak secret the vuln server uses.
- Send the forged token to `GET /protected` — the vulnerable server accepts it (demonstrates the failure).

5. Attack — **alg: none**:
- Modify an existing token header to `{"alg":"none"}` and remove signature.
- Submit to `GET /protected` — if the vulnerable server incorrectly allows `alg: none`, it will accept the token.

> Postman collection includes exact request bodies used for repro (see `postman/`).

---

## How to reproduce the hardened demo (step-by-step)
1. Ensure `.env` is populated (see `.env.example`) with generated secrets.

2. Start the hardened server:
```bash
npm run start
# or: node server/index.js
```

3. Confirm endpoints:
- `POST /login` — secure login returning short-lived access token (10m) and refresh token.
- `POST /refresh` — issues new access token given a valid refresh token.
- `GET /protected` — protected endpoint verifying token `iss`, `aud`, and `alg`.

4. Attempt the same attacks:
- Send the forged token (from previous step) to `GET /protected` — server returns `401 Unauthorized` or `403 Forbidden`.
- Resubmit an `alg:none` token — server rejects it due to algorithm whitelisting and signature verification.
- Replay stolen token — demonstrate how the refresh rotation or short access TTL mitigates long-term misuse.

> The hardened server validates:
- Signature using `ACCESS_TOKEN_SECRET` (and separate `REFRESH_TOKEN_SECRET` for refresh tokens).
- `iss` === `TOKEN_ISSUER`.
- `aud` === `TOKEN_AUDIENCE`.
- `alg` matches expected (e.g. `HS256`).

---

## Attack scenarios demonstrated
1. **Known weak secret (forge token).**  
   - On vulnerable server: token forgery accepted.  
   - On hardened server: rejected (signature mismatch).
2. **`alg: none` header trick.**  
   - On vulnerable server: accepted if server didn't properly validate alg.  
   - On hardened server: rejected due to explicit algorithm checks.
3. **Token theft + replay from localStorage.**  
   - Show that tokens stored in localStorage can be copied and reused on HTTP traffic. Hardened mitigations: shorter lifetimes; optionally HttpOnly cookies for refresh tokens (not accessible to JS).

All attack replay steps are included in the Postman collection and recorded in the screencast.

---

## Refresh strategy details
- Access tokens: short TTL (default **10 minutes**) — stored by client (e.g., memory or cookie depending on frontend behavior).
- Refresh tokens: longer TTL (default **7 days**) — **signed with a different secret** (`REFRESH_TOKEN_SECRET`).  
- Refresh rotation: when a refresh is used, server issues a new refresh token and invalidates the previous one (server-side store or rotation ID). For full persistence across restarts, a SQLite store is recommended (bonus implemented optionally).
- If a refresh token is stolen, rotation + server-side storage allows revocation.

---

## Wireshark capture instructions & filters
- Capture loopback traffic (on Linux/macOS: `lo`, on Windows use `Npcap`/`Npcap Loopback Adapter`).
- Suggested filters:
  - Show HTTP requests: `http`
  - Show traffic to server port (default 1234): `tcp.port == 1234`
  - Show Authorization header (HTTP only) — capture then inspect HTTP request headers in Wireshark.
- What to look for:
  - On **HTTP**, JWTs are visible in `Authorization` header or request body.
  - On **HTTPS**, payloads are encrypted and not visible (if HTTPS bonus implemented).
- Example capture command (Linux, using tshark):
```bash
sudo tshark -i lo0 -w evidence/wireshark_capture_http.pcapng -f "tcp port 1234"
```

A short note in README explains how captures were performed and filters used.

---

## Notes, assumptions & limitations
- **Do not commit real secrets** — `.env` is excluded from git; `.env.example` is safe to commit.
- The repository uses Node.js `crypto` to create secrets; production systems should use a secure secrets manager.
- Refresh token rotation is implemented; for persistence across restarts, enable the optional SQLite refresh-store (see Bonus).
- If your environment blocks loopback capture, run Wireshark with proper privileges or use a local adapter.
- The scripts and instructions assume default ports; if your environment uses different ports, update `.env` and Postman collection accordingly.

---

## Extra / Bonus (optional) features (if implemented)
- **HTTPS locally** — self-signed cert included with instructions to trust locally and run server over TLS. Wireshark shows TLS encryption in the capture.  
- **Helmet & secure headers** — added `helmet()` and README lists which headers were applied.  
- **Rate limiting** — `express-rate-limit` added to throttle login attempts and protect brute-force.  
- **Persistent refresh-store** — refresh tokens stored in SQLite for rotation/revocation persistence.  
- **Logging & detection** — logs verification failures and provides a small script to scan logs for suspicious activity.

If you implemented any of these, the README contains exact instructions to enable them and describe behavior.

---

## Deliverables included
- Modified project code with no hard-coded secrets (`server/`).
- `.env.example` (variables and short comments).
- Postman collection: `postman/JWT-Hardening.postman_collection.json`.
- Attack scripts: `server/scripts/forge-token.js`.
- Wireshark capture(s): `evidence/wireshark_capture_http.pcapng` (and `wireshark_https_demo.pcapng` if HTTPS bonus implemented).
- `README.md` (this file).
- Short screencast video (≤ 3 minutes) — located in `evidence/screencast.mp4` (if included in ZIP submission).

---

## Helpful commands (summary)
```bash
# Install deps
npm install

# Init DB (if provided)
npm run init-db

# Generate secrets (local)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Start vulnerable server (repro)
npm run start:vuln
# Start hardened server
npm run start

# Run forge script
node server/scripts/forge-token.js

# Capture loopback traffic (example)
sudo tshark -i lo0 -w evidence/wireshark_capture_http.pcapng -f "tcp port 1234"
```

