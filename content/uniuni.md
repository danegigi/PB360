# UniUni on Shipping360

> Read [Shipping360 Basics](00-basics.html) first — auth, headers, rating, label creation, cancel, and manifest are identical across carriers. This page covers only what is **UniUni-specific**.

UniUni is a technology-driven last-mile e-commerce delivery carrier, **added to Shipping360 in release v1.0.52 (Aug 27, 2026)** alongside HP Driver. It focuses on high-volume final-mile delivery for e-commerce across the US and Canada.

> **UniUni's PB documentation is sparse and appears to contain boilerplate copied from other carriers** (it references "CA domestic" and even "integrate with Purolator"). Where the page conflicts with UniUni's own profile, trust the release notes + UniUni's site and verify everything against runtime metadata and the Carrier Catalog. Uncertain items are flagged below.

---

## Table of Contents

1. [At a Glance](#at-a-glance)
2. [Geography](#geography)
3. [Capabilities](#capabilities)
4. [Service / Parcel / Special-Service Codes](#service--parcel--special-service-codes)
5. [Label Formats & Sizes](#label-formats--sizes)
6. [Connecting a UniUni Account](#connecting-a-uniuni-account)
7. [Rate Cards / No-Rate Behavior](#rate-cards--no-rate-behavior)
8. [Gotchas](#gotchas)
9. [Further Reading](#further-reading)

---

## At a Glance

| | |
|---|---|
| `carrier` / `carrierID` value | `UNIUNI` |
| Best for | High-volume last-mile e-commerce delivery |
| Rate model | **Bring your own UniUni account** (merchant-negotiated); likely No-Rate |
| Account onboarding | **Client portal** (4 credentials) |
| Region | US + Canada last-mile (added v1.0.52, Aug 2026) |

---

## Geography

US + Canada last-mile. UniUni's own site cites 100K+ drivers and ~65% US / ~80% Canada coverage with 100+ North American warehouses.

> The PB capability text mentioning CA-only / Purolator is almost certainly boilerplate — treat US+CA last-mile as authoritative.

---

## Capabilities

Per the PB page: rating (see caveat below), void/cancel, future-dated shipments, tracking, domestic labels/documents, and customs for domestic. **Not supported:** rate shopping, multipiece, returns, pickup, manifest, customs document generation/upload, postpay, invoice logo/signature, QR/barcode labels.

---

## Service / Parcel / Special-Service Codes

> **Not published** — the UniUni page's Metadata section states "Metadata information not available." No service, parcel-type, or special-service codes are documented. Fetch them at runtime via `GET /getservices` / `GET /getparceltypes`. **The data is genuinely absent — do not invent codes.**

---

## Label Formats & Sizes

Not specified on the UniUni page — only "domestic labels and documents." Platform-wide formats are `PDF` / `PNG` / `GIF` / `ZPL2`; treat UniUni-specific sizes as unknown until confirmed via the API / portal. QR / barcode labels are explicitly **not** supported.

---

## Connecting a UniUni Account

Onboarding uses four credentials, currently via the **client portal**:

- `CUSTOMER_NAME`
- `ACCOUNT_NUMBER`
- `USER_ID`
- `USER_PASSWORD`

Steps:
1. Obtain a UniUni shipper account (via [uniuni.com](https://www.uniuni.com) → Get a Quote / sales; self-serve API signup for the four credentials is not confirmed).
2. In the PB client/developer portal, add a UniUni carrier account with the four fields above.
3. Verify via `GET /api/v1/carrierAccounts`; use the returned `carrierAccountId` in Shipment/Rate calls.

---

## Rate Cards / No-Rate Behavior

Requires the merchant's **own UniUni account + credentials** (merchant-negotiated rates). The PB page says "Rate supported," but v1.0.52 also shipped **"Multipiece Label Splitting Support for No-Rate Carriers,"** consistent with UniUni behaving as/near a **No-Rate** carrier where rates come from the merchant's contract rather than PB.

> Whether UniUni is formally classified as No-Rate is **unconfirmed** — verify in the Carrier Catalog.

---

## Gotchas

- PB capability text appears to be boilerplate (Purolator / CA references) — verify each feature.
- Metadata and label sizes are absent — pull live via API / Carrier Catalog.
- No rate shopping, multipiece, returns, pickup, or manifest.
- No QR/barcode labels; no invoice logo/signature.
- Newest carrier (Aug 2026) — expect docs to fill in over time.

---

## Further Reading

- UniUni Carrier Guide: https://docs.shipping360.pitneybowes.com/docs/shipping/carriers/overview/uniuni
- Release Notes (v1.0.52): https://docs.shipping360.pitneybowes.com/docs/releases
- Carrier Accounts API: https://docs.shipping360.pitneybowes.com/openapi/carrieraccounts
- UniUni: https://www.uniuni.com
