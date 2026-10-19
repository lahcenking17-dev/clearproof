# ClearProof

**A source behind every statement. A person behind every acceptance.**

ClearProof is an evidence-first handover and PayPal Sandbox checkout prototype for independent service providers and their clients. It connects **agreed scope → original evidence → human acceptance → a version-bound payment receipt**.

Created for the 2026 PayPal AI Hackathon by Lahcen Ali, a private-law graduate in Morocco, with substantial ChatGPT/Codex assistance for research, design, implementation, testing and documentation. The AI contribution is disclosed; the author is not represented as a professional software engineer. The runtime AI feature is an actual locally executed sentence-transformer, not a label applied to a text template.

## What works

- A three-milestone synthetic website-handover case, and import of your own English JSON case.
- Local CPU inference with a pinned, quantized `all-MiniLM-L6-v2` model. Each retrieved statement includes its source ID and an exact sentence quote. Explicit incompleteness rules flag relevant gaps.
- A client-role review records a name, selected sources, a note and the exact revision. Reviewer identity is **self-attested**, not authenticated.
- A server-controlled PayPal Sandbox Orders v2 integration. Only currently accepted milestones are payable. The amount is derived from integer cents on the server.
- An evidence + acceptance + amount binding in PayPal's `purchase_units[].custom_id`. Capture verifies the order, binding, completed status, exact amount and currency.
- Changing evidence clears acceptances and blocks stale orders. Concurrent order creation and overlapping captures are guarded.
- A searchable AG Grid Community source ledger and a JSON evidence pack with a SHA-256 body digest and hash-linked event sequence.
- An independent pack-verification CLI and a browser body-fingerprint check.

This is **not escrow, a qualified electronic signature, legal advice, identity verification, proof of delivery, or a chargeback outcome prediction**. Sandbox money is not real money. The demo case and all of its messages are fictional.

## Quick start — functional judging build

Requirements: **Node.js 24.5+**, npm, a modern browser, about 100 MB of free disk space, and internet access for npm/model downloads. No GPU or paid AI key is required. The downloaded ONNX model is approximately 23 MB.

```bash
git clone https://github.com/lahcenking17-dev/clearproof.git
cd clearproof
ONNXRUNTIME_NODE_INSTALL_CUDA=skip npm ci
npm run model:download
cp .env.example .env
npm start
```

Open **http://127.0.0.1:4173**. On Windows, set `ONNXRUNTIME_NODE_INSTALL_CUDA` to `skip` in your shell before `npm ci`. The checked-in npm configuration also skips the optional CUDA download on current npm versions.

Behind an HTTP proxy with Node 24, download the model with:

```bash
node --use-env-proxy scripts/download-model.mjs
```

After downloading, inference runs from local files and does not call an external model API. Case text is processed in the Node server, not sent to Hugging Face. Hugging Face only serves the initial model files. The page currently uses optional Google Fonts, so loading the page may contact Google for font assets.

The source review, acceptance, grid and exports work without PayPal credentials. The interface explicitly disables checkout until Sandbox is configured. It never fabricates a successful payment when credentials are absent.

## PayPal Sandbox setup

1. Sign in at https://developer.paypal.com/dashboard/ and select **Sandbox**.
2. Create a REST application in **Apps & Credentials**, associated with a sandbox business test account.
3. Put its client ID and secret into your local, untracked `.env`:

```dotenv
PAYPAL_CLIENT_ID=your-sandbox-client-id
PAYPAL_CLIENT_SECRET=your-sandbox-secret
PUBLIC_ORIGIN=http://127.0.0.1:4173
```

4. Restart the server. In PayPal's testing tools, use a separate **sandbox personal buyer** account to approve the payment. Do not use your real PayPal password in the sandbox checkout.
5. Keep the same browser session for review, checkout and the return URL. The session cookie associates the order with its case.

The server fixes the API origin to `https://api-m.sandbox.paypal.com`; there is no live-payment switch. Never commit `.env`, publish a client secret, or include a real person's credentials in the project description. Judges can use their own sandbox application and test buyer. A client ID alone does not enable server-side checkout.

## Reproduce the main demonstration

1. Open the synthetic case and select **Run local AI review**.
2. Inspect M1: the original desktop/mobile messages are retrieved as support. Inspect M2 and M3: the sources explicitly say access/review is unfinished. The model does not call these delivered simply because their wording matches the criterion.
3. Review M1, select E1 and E4, enter `Demo Client`, and record a note after reading the sources. Confirm the self-attested acceptance.
4. Select the accepted $150 milestone for Sandbox checkout. The unaccepted $200 and $100 milestones cannot be paid through this workflow.
5. With Sandbox credentials configured, approve at PayPal and return. The server verifies the capture before displaying its receipt.
6. Export the evidence pack. Open Source Ledger and verify the file, or run:

```bash
npm run verify -- clearproof-pack.json
```

7. Edit a source. Previous acceptances disappear, and capture of an order bound to the previous version is rejected. This check does not cancel the PayPal authorization; it prevents this application from capturing against stale evidence.

## Testing

```bash
npm test
```

Tests cover source revision invalidation, exact amount/currency/binding verification, forged browser amounts, CSRF, session ownership, idempotent capture, concurrent order creation, export tampering and actual local model retrieval/negation behavior. Model integration tests are explicitly skipped if the model has not been downloaded; they must run for a full verification.

Tests inject a fake PayPal adapter to exercise edge cases. A passing adapter test is **not** proof that a real Sandbox transaction occurred. Consult `docs/VALIDATION.md` for the separately observed Sandbox status.

## Optional hosting

The included `render.yaml` describes a single Node web service using the free plan. A deployment still requires an authorized Render account and a public repository. Nothing is automatically deployed by this file. Render provides `RENDER_EXTERNAL_URL`; the server uses it as its origin unless `PUBLIC_ORIGIN` is explicitly set. Set Sandbox credentials as secret environment variables on the hosting service. Keep `HOST=0.0.0.0` there. Hosting terms, free-tier capacity and availability are controlled by Render.

## Architecture and limitations

See [architecture](docs/ARCHITECTURE.md), [verification record](docs/VALIDATION.md), [research and differentiation](docs/RESEARCH.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

- Prototype sessions and records are stored **in server memory**. Restarting loses them. Export before restarting. This is a judging build, not a durable business-record system.
- The client-role interface is a demonstration of a decision boundary, not a secure two-party approval portal. A production release needs authenticated identities, isolated client links, authorization, durable encrypted storage and an independent timestamping design.
- The model is English-only for this prototype. Similarity scores are retrieval measures, not probabilities. The explicit-gap rules are narrow and do not solve arbitrary contradiction, chronology or legal interpretation.
- This prototype cannot decide whose account is true. A forged source can still be forged even when its hash verifies. A person must inspect the substance.
- The export digest detects alteration **relative to an unchanged original digest**. It is not a notarization; someone who rewrites a pack can also recalculate its digest.
- Never use real payment credentials or sensitive client data in a public demo.

## License

Original project code: MIT. Dependencies and the model retain their own licenses. The model revision and downloaded file checksums are saved in `.cache/models/minilm/download-manifest.json`.
