# Canpar on Shipping360

> Read [Shipping360 Basics](00-basics.html) first — auth, headers, rating, label creation, cancel, and manifest are identical across carriers. This page covers only what is **Canpar-specific**. Canpar is a Canadian carrier — use the **Canada infrastructure** base URLs.

Canpar Express (a TFI International company) is a Canadian small-parcel carrier. Shipping360 supports rate, create label, reprint, void, and tracking.

---

## Table of Contents

1. [At a Glance](#at-a-glance)
2. [Geography](#geography)
3. [Service / Parcel / Special-Service Codes](#service--parcel--special-service-codes)
4. [Label Formats & Sizes](#label-formats--sizes)
5. [Connecting a Canpar Account](#connecting-a-canpar-account)
6. [Rate Cards / Own-Account Requirements](#rate-cards--own-account-requirements)
7. [Gotchas](#gotchas)
8. [Further Reading](#further-reading)

---

## At a Glance

| | |
|---|---|
| `carrier` / `carrierID` value | `CANPAR` |
| Best for | Canada domestic small parcels |
| Rate model | **Bring your own Canpar account** (negotiated rates) |
| Account onboarding | Carrier Accounts API (`carrierID: "CANPAR"`) |
| Region | **Canada infrastructure** |

---

## Geography

Primary: Canada domestic parcel. Canpar also offers Canada→US and Canada→International in its own network.

> PB360's Canpar page describes it as a Canadian courier; US/International support **in PB360 specifically** is not confirmed — verify via metadata.

---

## Service / Parcel / Special-Service Codes

> **Not published** — the Canpar overview page shows "Metadata information not available." Retrieve at runtime via the metadata APIs. **Do not hard-code.** Canpar service **names** (corroborated by Canpar's service guide): Ground, Select, SelectLetter, SelectPak, Overnight, OvernightLetter, OvernightPak, USA, USALetter, USAPak, Select USA, International.

- **Parcel types:** no predefined package presets — treat as custom-dimension parcels.
- **Special services:** Canpar offers Collect (bill 3rd party), Saturday delivery, COD, Signature, Dangerous Goods — confirm the PB codes via `GET /getspecialservices`; do not invent.

---

## Label Formats & Sizes

Not stated on the PB Canpar page. Independent reference indicates PNG and PDF at 4x6 — verify against the PB Print API before relying on it.

---

## Connecting a Canpar Account

Bring-your-own-account, via the Carrier Accounts API:

```text
POST {caShippingUrl}/api/v1/carrierAccounts
```

```json
{
  "carrierID": "CANPAR",
  "accountNumber": "YOUR_CANPAR_ACCOUNT",
  "carrierAccountType": "Shipping",
  "provisioningType": "API",
  "parameters": {
    "username": "YOUR_CANPAR_USERNAME",
    "password": "YOUR_CANPAR_PASSWORD"
  }
}
```

- Prerequisites: your Canpar (TFI/Canpar Express) **account number**, **username**, **password**.
- Success returns a `carrierAccountID` (type `Shipping`, provisioning `API`).
- Sample values like `accountNumber: "99999992"` / `DEMO@PB.COM` are demo-only.

**Getting a Canpar account:** apply via Canpar sales at [Become a Customer](https://www.canpar.com/en/contact/become_customer.htm). Production credentials come from Canpar's IT Service Desk after sandbox testing.

---

## Rate Cards / Own-Account Requirements

Yes — the merchant must bring their **own Canpar account number + credentials**; Canpar is live-rated against that account's negotiated rate card. There is no PB-managed Canpar rate card.

---

## Gotchas

- PB publishes **no** Canpar metadata — fetch service/parcel/special codes dynamically; never hard-code.
- **Void support is questionable** — PB lists a cancel op, but third-party references say Canpar label voids are not supported. Verify.
- Sandbox vs production credentials/account numbers differ.
- `carrierAccountId` must match the location resolved by `X-PB-LocationId`.

---

## Further Reading

- Canpar Carrier Guide: https://docs.shipping360.pitneybowes.com/docs/shipping/carriers/overview/canpar
- Carrier Accounts API: https://docs.shipping360.pitneybowes.com/openapi/carrieraccounts
- Canpar — Become a Customer: https://www.canpar.com/en/contact/become_customer.htm
