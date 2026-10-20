# Observed verification

This record separates actual local checks from external services that still require account access. It must be updated with evidence before final competition submission.

## Observed locally

- Node.js 24.19.0.
- The pinned quantized MiniLM model downloaded successfully (ONNX weights: 22,972,370 bytes).
- Actual CPU inference on the synthetic case returned relevant support for M1 and clarification gaps for M2 and M3. Every displayed quote originates from a source sentence.
- The original nine core/API tests passed on 19 October 2026, including CSRF, session ownership, exact capture verification, source mutation and idempotent capture.
- All 13 core, API, concurrency and actual local-model tests passed with zero skips after upgrading Transformers.js to 4.3.1.
- Browser workflow passed with zero page errors: real inference, M1 acceptance and $150 subset, disabled unconfigured checkout, AG Grid filtering, export verification, evidence mutation invalidation and mobile layout without horizontal overflow.
- npm audit reported zero known vulnerabilities after the runtime upgrade.
- A final 75-second English-captioned demo was recorded from the actual interface on 19 October 2026, including real local model inference, Sandbox buyer approval and a completed Sandbox capture. Test-login entry and loading were omitted; approval and capture footage are from the observed run. Its exported evidence pack passed the independent verifier. The final video remains pending upload to YouTube.

## External service status

- **PayPal Sandbox create/approve/capture:** verified on 19 October 2026 through the real Sandbox API and browser approval, using generated test accounts. Order `8VE88637HU647994W`; capture `35H25683RD4006735`; status COMPLETED; $150.00 USD for M1. The application verified the order ID, custom evidence binding, capture status, exact amount and currency before showing its receipt. No real funds moved. Credentials remain in untracked/private files; judges supply their own Sandbox accounts. Mock-adapter tests separately exercise failure cases.
- **Public GitHub repository:** published at https://github.com/lahcenking17-dev/clearproof . Source commit `8636a1cba01bbabefe81342cf33557de3ca40109` includes the working source, MIT license, dependency lockfile, setup/run instructions and CI. GitHub Actions run `39232851889` completed successfully.
- **Public YouTube demo:** not yet uploaded.
- **Devpost final submission:** not yet submitted. The account is registered, and project draft `1246487` has its overview, story, technology tags and public source URL saved. Additional information, media and final submission remain pending.

Until these external steps are complete, the project must not be described as a submitted or fully verified competition entry.
