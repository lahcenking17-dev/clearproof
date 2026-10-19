# Research and differentiation

Research date: 18–19 October 2026. This is a researched prototype, not a claim of invention, patent novelty, validated market fit or guaranteed prize eligibility.

## Problem

Independent service work can leave scope, delivery messages, client feedback and payment references scattered across tools. PayPal documents the need to retain service-delivery records when responding to certain disputes. ClearProof narrows its focus to an inspectable handover record before checkout; it does not adjudicate disputes or automate a legal response.

- PayPal's evidence guidance: https://developer.paypal.com/disputes/reasons-evidence/
- PayPal's unauthorized-transaction guidance: https://www.paypal.com/us/cshelp/article/how-do-i-respond-to-unauthorized-transaction-disputes-help1289
- Upwork's dispute explanation also discusses delivery dates, messages, version history and acceptance notes: https://www.upwork.com/resources/upwork-dispute-process

## Existing solutions

AI dispute automation already exists. Chargeflow assembles and submits dispute responses: https://www.chargeflow.io/integrations/paypal and https://docs.chargeflow.io/docs/reference/concepts/dispute-automation .

Milestone approval and tamper-evident evidence products also exist, including https://milestoneapproval.com/ , https://www.bespea.com/ and https://handfast.app/ . Their existence prevents any honest claim that this project is the first milestone/evidence/payment tool.

## What this prototype demonstrates

1. Every AI retrieval result remains attached to an exact original sentence and its ID.
2. A high-similarity statement saying a deliverable is **not** complete is highlighted for clarification, rather than treated as positive delivery evidence.
3. Explicit human acceptance is bound to the current evidence revision.
4. A PayPal Sandbox order binds that revision, acceptance, selection and server-derived amount; edits block stale checkout.
5. A portable evidence pack and independent verifier expose how the recorded version and event trail can be checked, including the limits of those checks.
6. A local open model permits runtime AI without a paid inference key or sending case text to a model provider.

These are the project's implemented design choices. Whether they provide sufficient novelty or impact is for judges and future user validation to determine. We have not interviewed customers, deployed this in a real client dispute, measured recovery rates or claimed fraud prevention.

## Competition fit

The official rules require a working PayPal + AI project, public open-source code, English materials and a public YouTube demo under three minutes. A hosted URL is optional if clear repository instructions allow judges to run the project. Final submission must accurately describe actual verification, including any untested Sandbox behavior.

Rules: https://paypalaihackathon.devpost.com/rules

AG Grid Community is used as an actual searchable/filterable source ledger. This is a real use of the sponsor's tool, without enterprise-only features. Sponsor prize selection remains subject to the organizer's rules.
