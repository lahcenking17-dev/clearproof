# ClearProof — evidence-first handover

**Submission status: draft, not entered.** Public repository creation and a final public YouTube video remain required. Actual PayPal Sandbox create/approve/capture has been verified. This file is prepared for the account holder's Devpost entry; it is not a claim of successful submission.

## Elevator pitch

Connect scoped work, source-cited local AI review and human acceptance to a PayPal Sandbox receipt bound to the reviewed evidence version.

## Inspiration

I am a private-law graduate in Morocco exploring practical AI tools for independent workers. A payment disagreement often begins with a simpler problem: people do not share a clear record of what was promised, what was delivered and which version the client accepted.

ClearProof starts at that handover. Its aim is to make the original words and the decision boundaries inspectable. It does not replace a lawyer, authenticate a person or decide a PayPal dispute.

## What it does

The working prototype contains a synthetic three-milestone website handover. It can also import an English-language JSON case. A local MiniLM sentence-transformer retrieves original source sentences for each acceptance criterion. Explicit incompleteness rules highlight relevant statements such as "repository access has not been delivered" instead of treating their high semantic similarity as positive delivery evidence.

A client-role reviewer inspects the quoted records, selects the sources they relied on and records a self-attested acceptance of the current evidence revision. The server derives the payable amount from accepted milestones. AI suggestions cannot authorize a payment.

The PayPal Sandbox Orders v2 integration binds the selected scope, evidence revision, acceptance and amount in `custom_id`. Before capture, the server checks that the accepted version remains current. It verifies the returned order, completed status, capture, binding, amount and currency. Updating evidence clears acceptance and prevents stale checkout from being captured by the application.

An AG Grid Community ledger provides searchable, sortable source inspection. The exported JSON evidence pack includes the original records, acceptances, Sandbox references and a hash-linked event sequence. An independent verifier checks its digest against the original export. Hashes describe recorded bytes; they do not establish truth, authorship or an independently trusted timestamp.

**External verification:** on 19 October 2026, an actual PayPal Sandbox buyer approved a $150.00 USD M1 order. PayPal returned a COMPLETED capture; the application checked the order, evidence binding, amount and currency before displaying the receipt. Order `8VE88637HU647994W`, capture `35H25683RD4006735`. These are test-only references: no real funds moved. Automated mock-adapter tests separately exercise error cases.

## How I built it

Node.js 24 serves the application and session-scoped in-memory records. The client uses vanilla JavaScript, HTML and CSS. AG Grid Community powers the evidence ledger. Transformers.js 4.3.1 and ONNX Runtime 1.30.0 execute a pinned quantized MiniLM model on the CPU without a paid inference key or an external inference API.

The decision boundaries are deliberately separate: model retrieval, source inspection, human acceptance, deterministic quote generation, Sandbox approval and capture verification. The server rejects browser-supplied amounts, foreign-session orders, stale acceptances and overlapping capture attempts.

I used ChatGPT/Codex extensively for research, design, implementation, documentation, testing and preparing the demonstration. This assistance is disclosed. I am not presenting myself as a professional software developer. Open-source packages and the downloaded model retain their respective licenses.

## Challenges

Semantic similarity alone cannot tell whether a statement supports completion. In the synthetic case, an explicit source-code non-delivery statement is semantically close to the source-handover requirement. The prototype retains exact quotes and adds narrow explicit-gap rules rather than allowing a fluent generated narrative to overstate the sources.

Another challenge is evidence changing after acceptance. Binding the source revision, acceptance and amount to the Sandbox order makes that stale-state problem testable. This is still a prototype, with local-memory sessions and self-attested client-role review; production identity, durable storage and webhook reconciliation require further work.

## Accomplishments

- Actual local model inference with exact source citations, including relevant incomplete statements.
- Thirteen passing core, API, model and concurrency tests, with zero skips in the observed local run.
- Browser verification of review, accepted-subset pricing, disabled unconfigured checkout, AG Grid filtering, export verification, acceptance invalidation and a mobile layout with no horizontal overflow.
- Zero known vulnerabilities reported by npm audit after updating the runtime dependencies, as of the observed verification date.
- A public-ready MIT source package and reproducible judging setup, prepared for publication.

These are engineering checks, not evidence of commercial adoption, legal validity, successful dispute recovery or competition success.

## What I learned

An inspectable workflow matters more than a confident-sounding conclusion. A useful AI result can be a carefully cited "this still needs clarification." A reviewer should be able to follow that statement back to its exact source and understand what authorizes the next action.

## What's next

Authenticated, isolated client review links; durable encrypted records; version-aware chronology; multilingual evaluation; and webhook-based payment reconciliation. Any deployment involving real customer records or real payments would need an independent security and privacy review and a clear legal basis for processing.

## Built with

JavaScript, Node.js, HTML, CSS, PayPal Sandbox Orders v2, Transformers.js, ONNX Runtime, MiniLM, AG Grid Community, SHA-256.

## Judging instructions

Follow README.md to install Node dependencies and download the pinned model. The review, ledger and export work without an inference key. To exercise PayPal, configure your own free Sandbox REST app and a separate sandbox buyer. Do not use real payment credentials. The default example records are synthetic and can be reset.

The project must not be marked finally submitted until the public source URL, final YouTube demo and all mandatory Devpost fields are present and verified.
