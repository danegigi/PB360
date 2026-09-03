# FedEx on Shipping360

> Read [Shipping360 Basics](00-basics.html) first — auth, headers, rating, label creation, cancel, and manifest are identical across carriers. This page covers only what is **FedEx-specific**.

FedEx is a global express and e-commerce carrier. In Shipping360, PB–SendTech integrates specifically with **FedEx Express**: rate, create label, reprint, void/cancel, tracking, pickups, ETD, multipiece, returns (unified UPS/FedEx return flow), and documents-only shipments.

---

## Table of Contents

1. [At a Glance](#at-a-glance)
2. [Geography](#geography)
3. [Service & Special-Service Codes](#service--special-service-codes)
4. [Label Formats & Sizes](#label-formats--sizes)
5. [Connecting a FedEx Account](#connecting-a-fedex-account)
6. [Rate Cards / Who Pays](#rate-cards--who-pays)
7. [ETD & Documents-Only](#etd--documents-only)
8. [Gotchas](#gotchas)
9. [Further Reading](#further-reading)

---

## At a Glance

| | |
|---|---|
| `carrier` value | `FEDEX` |
| Best for | Domestic + international express parcels |
| Rate model | **Bring your own account** OR **FedEx PB Rates** (PB-discounted) |
| Account onboarding | **Client portal, US & CA only** currently |
| Region | US + international; documents-only is US-origin only |

---

## Geography

FedEx carrier accounts can be onboarded **only via the client portal, for US and Canada** currently. `DOCUMENTS_ONLY` shipments are **US-origin only**. Country/service availability comes from metadata.

---

## Service & Special-Service Codes

> **Not published statically** — the FedEx page shows "Metadata information not available." Query `GET /getservices?carrier=FEDEX`, `GET /getparceltypes`, `GET /getspecialservices`. **Do not hard-code FedEx service codes.** FedEx product families (Ground, Home Delivery, Express Saver, 2Day, Priority/Standard Overnight, International Priority/Economy, Ground Economy/SmartPost) exist upstream but the mapped codes are lane-dependent.

FedEx-relevant special services confirmed in the spec:
- `ELECTRONIC_TRADE_DOCUMENTS` (ETD)
- `DOCUMENTS_ONLY`
- `deliveryConfirmation`: FedEx supports `SIGNATURE`, `ADULT_SIGNATURE`, `NO_SIGNATURE`, `DIRECT_SIGNATURE`.
- `handling`: FedEx supports `HOLD_FOR_PICKUP`, `SATURDAY_DELIVERY`, `ADDITIONAL_HANDLING`.
- `insurance`: `INSURANCE`.

---

## Label Formats & Sizes

- **Formats:** `PDF`, `ZPL2`, `PNG`, `GIF`.
- **Sizes:** `DOC_4X6`, `DOC_8X11` (and `DOC_4X8` in some operations). ZPL2 → 4x6 only; PDF → both.

---

## Connecting a FedEx Account

Bring-your-own-account (US/CA), via the Carrier Accounts API:

```text
POST {shippingUrl}/api/v1/carrierAccounts
```

```json
{
  "carrierID": "FEDEX",
  "accountNumber": "YOUR_FEDEX_ACCOUNT",
  "carrierAccountType": "Shipping",
  "provisioningType": "API",
  "parameters": {
    "accountAddress": { "addressLine1": "…", "cityTown": "…", "stateProvince": "…", "postalCode": "…", "countryCode": "US" },
    "contactAddress": { }
  }
}
```

- `parameters.accountAddress` is required; `contactAddress` only if different.
- `parameters.hubID` is required only for **FedEx SmartPost / Ground Economy** — list hubs via `GET /api/v1/hubs`.
- Get a FedEx account at [fedex.com](https://www.fedex.com/) → Open an Account; API access via the FedEx Developer Portal.

---

## Rate Cards / Who Pays

- **Own FedEx account** → your negotiated rates; FedEx bills you.
- **FedEx PB Rates** → PB's pre-negotiated discounted rates; no own FedEx account needed; PB charges your card per label and pays FedEx. This is a UI/plan feature (PitneyShip / ShipAccel) and is **not** exposed as a distinct value in the Carrier Accounts API `carrierID` enum (which lists FEDEX/UPS/DHLEXP/SPEEDEE/NORATE). Since Feb 2026, Standalone Free plan users can use FedEx as a PB-rated carrier.
- `publishedTotalCarrierCharge` shows published vs discounted.

---

## ETD & Documents-Only

- **ETD:** use special service `ELECTRONIC_TRADE_DOCUMENTS`; upload the document (`POST /api/v1/importUrl` → presigned S3 PUT) and reference the `s3FileId` in `customsDocuments`.
- **Documents-only:** a default customs item is auto-filled ("Documents Only", HS `482010`). US-origin only.
- For international FedEx, `soldToAddress` defaults to the recipient's `toAddress` when not provided (aligns with UPS behavior; helps importer info).

---

## Gotchas

- FedEx = **Express** only in this integration; SmartPost/Ground Economy needs `hubID`.
- Codes are dynamic — always fetch, don't hardcode.
- Onboarding is US/CA and portal-only; `DOCUMENTS_ONLY` is US-origin only.
- `carrierAccountId` must match the location resolved by `X-PB-LocationId`.

---

## Further Reading

- FedEx Carrier Guide: https://docs.shipping360.pitneybowes.com/docs/shipping/carriers/overview/fedex
- Carrier Accounts API: https://docs.shipping360.pitneybowes.com/openapi/carrieraccounts
- ETD: https://docs.shipping360.pitneybowes.com/openapi/shipping/electronic-trade-document
