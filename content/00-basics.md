# Shipping360 Basics — Common Features for Every Carrier

This is the shared foundation for every carrier tutorial in this suite. **Authentication, headers, addresses, rating, label creation, cancelling, tracking, and manifest all work the same way regardless of carrier** — you only change the `carrier`/`service`/`carrierAccountId` values. Read this first, then jump to a carrier page for the carrier-specific codes and account setup.

> **Verified against the live docs on 2026-09-03** (`https://docs.shipping360.pitneybowes.com`, API portal release **v1.0.52**). Enum values and per-carrier codes can change — confirm against the official reference and the [Carrier Catalog](https://docs.shipping360.pitneybowes.com/docs/shipping/carriers/carrier-catalog) before production.

---

## Table of Contents

1. [The Universal Workflow](#the-universal-workflow)
2. [Environment and Base URLs](#environment-and-base-urls)
3. [OAuth / Access Token](#oauth--access-token)
4. [Common Headers](#common-headers)
5. [Address Verification](#address-verification)
6. [Carrier Metadata: Get the Codes at Runtime](#carrier-metadata-get-the-codes-at-runtime)
7. [Connecting a Carrier Account](#connecting-a-carrier-account)
8. [Getting Rates](#getting-rates)
9. [Creating a Label (Create Shipment V2)](#creating-a-label-create-shipment-v2)
10. [International Customs](#international-customs)
11. [Return Labels](#return-labels)
12. [Cancelling / Voiding Labels](#cancelling--voiding-labels)
13. [Manifest / End of Day](#manifest--end-of-day)
14. [Rate-Card Models: Who Pays](#rate-card-models-who-pays)
15. [Official SDKs](#official-sdks)
16. [Database Fields to Save](#database-fields-to-save)

---

## The Universal Workflow

Every carrier follows the same lifecycle. Only the carrier/service codes change.

```text
Get Token (once / cached 4h)
    ↓
Verify Address
    ↓
(Discover carrier codes via metadata APIs)
    ↓
Get Rates  →  Pick a Service
    ↓
Create Shipment V2  →  Save shipmentId, trackingNumber, label
    ↓
Print Label  →  Track  →  Cancel / Return / Manifest as needed
```

- **Before shipping:** validate address, get rate.
- **During shipping:** create label, save the response.
- **After shipping:** track, cancel/void, return, manifest.

Because the endpoints are carrier-agnostic, adding a new carrier to your app is mostly a matter of onboarding the carrier account and swapping the `carrier`/`service` values — the code paths stay the same.

---

## Environment and Base URLs

There are **two base hosts**: `/auth` issues tokens, `/shipping` does everything else. There is also a **separate Canada infrastructure** used for Canadian carriers (Canada Post, Purolator, Canpar).

### US

```text
Sandbox  Auth:     https://api-sandbox.sendpro360.pitneybowes.com/auth
Sandbox  Shipping: https://api-sandbox.sendpro360.pitneybowes.com/shipping
Prod     Auth:     https://api.sendpro360.pitneybowes.com/auth
Prod     Shipping: https://api.sendpro360.pitneybowes.com/shipping
```

### Canada

```text
Sandbox  Auth:     https://api-ppd.shipping360.pitneybowes.com/ca/auth
Sandbox  Shipping: https://api-ppd.shipping360.pitneybowes.com/ca/shipping
Prod     Auth:     https://api.sendpro360.pitneybowes.com/ca/auth
Prod     Shipping: https://api.shipping360.pitneybowes.com/ca/shipping
```

> **Use sandbox first.** Sandbox is rate-limited to ~2 requests/second and ~1000 calls/day per developer.

---

## OAuth / Access Token

The token is generated from the Base64-encoded `Client ID:Secret` using **HTTP Basic Auth**. There is **no** `grant_type` body field.

### Endpoint

```text
POST {authUrl}/api/v1/token
```

### Request

```bash
curl -i -X POST \
  -u 'YOUR_CLIENT_ID:YOUR_CLIENT_SECRET' \
  'https://api-sandbox.sendpro360.pitneybowes.com/auth/api/v1/token' \
  -H 'Content-Type: application/json'
```

### Response

```json
{
  "access_token": "eyJhbGciOi...",
  "token_type": "Bearer",
  "expires_in": 14400,
  "scope": "psapi"
}
```

The token lasts **4 hours** (`expires_in: 14400`). Cache it; do not fetch a new one per call.

```text
If no token exists            → request token
If token expires in < 5 min   → request new token
Otherwise                     → reuse existing token
```

Get your Client ID / Secret from the [Developer Portal](https://sendpro360.pitneybowes.com/developer-signup) → Shipping API → API Keys (up to 5 key sets per account; Sandbox and Production are separate).

---

## Common Headers

```http
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
Accept: application/json
```

| Header | Required? | Description |
|---|---:|---|
| `Authorization` | Yes | Bearer token from OAuth. |
| `Content-Type` | Yes | `application/json`. |
| `X-PB-Developer-Partner-Id` | Sometimes | Required when your developer account manages multiple partners. |
| `X-PB-LocationId` | Sometimes | Enterprise/division/location for processing and billing. **Required** when the shipment origin country differs from your enterprise default country; otherwise defaults to the enterprise location. Also drives carrier-account resolution. |
| `X-PB-TransactionId` | Optional | Your own unique ID for correlating/debugging. |

---

## Address Verification

```text
POST {shippingUrl}/api/v1/address/verify
```

```bash
curl --location 'https://api-sandbox.sendpro360.pitneybowes.com/shipping/api/v1/address/verify' \
  --header 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "name": "John Smith",
    "addressLine1": "1001 Bridgeport AA",
    "cityTown": "Shelton",
    "countryCode": "US",
    "postalCode": "06484"
  }'
```

Response returns a normalized address and a `status` (`VALIDATED_AND_NOT_CHANGED`, `VALIDATED_CHANGED`, etc.) plus a `residential` flag that can affect rates.

> Do not do strict schema validation on responses — PB advises tolerating new fields so future additions don't break your integration. An **International Address Validation** API also exists.

---

## Carrier Metadata: Get the Codes at Runtime

This is the single most important thing to understand about Shipping360, and it applies to **every** carrier:

> **PB does not publish a static, per-carrier table of service codes, parcel types, and special-service codes.** The Carrier Catalog cards and the per-carrier overview pages render "Metadata information not available." The authoritative, current values are returned **dynamically per origin/destination** by the metadata APIs. **Do not hard-code carrier codes from blog posts or old integrations — query them at runtime.**

| API | Purpose |
|---|---|
| `GET .../getcarriers` | Carriers available to your account. |
| `GET .../getservices?carrier=USPS` | Valid `service` codes for a carrier + lane. |
| `GET .../getparceltypes` | Valid `parcelType` codes. |
| `GET .../getspecialservices` | Valid special-service codes + input params. |
| `GET .../getcountries` | Supported destination countries. |

The per-carrier pages in this suite list the codes we could **verify** from PB examples and each carrier's own service guide, but the runtime metadata call is always the source of truth.

- Get Services: https://docs.shipping360.pitneybowes.com/openapi/shipping/shipment/getservices
- Get Parcel Types: https://docs.shipping360.pitneybowes.com/openapi/shipping/shipment/getparceltypes
- Get Special Services: https://docs.shipping360.pitneybowes.com/openapi/shipping/shipment/getspecialservices

---

## Connecting a Carrier Account

Most carriers are onboarded with the **Carrier Accounts API** by supplying the merchant's own carrier credentials. The shape is consistent:

```text
POST {shippingUrl}/api/v1/carrierAccounts
```

```json
{
  "carrierID": "PUROLATOR",
  "accountNumber": "0001234",
  "description": "My Purolator account",
  "carrierAccountType": "Shipping",
  "provisioningType": "API",
  "parameters": {
    "userID": "your-carrier-user-id"
  }
}
```

- `carrierID` — e.g. `USPS`, `UPS`, `FEDEX`, `CPC`, `PUROLATOR`, `CANPAR`, `DHLEXP`, `UNIUNI`.
- `parameters` — carrier-specific credentials (username/password, invoice details, etc.). See each carrier page.
- The response returns a **`carrierAccountId`**, which you pass at shipment time via `byCarrier.carrierAccountId`.

> **Exceptions:** USPS carrier onboarding is **not** available from the API (portal/PB-provisioned only). Some carriers (UniUni, Purolator, FedEx) are noted as "onboard through the client portal for now." When the API path is gated, add the carrier in the Developer/Client Portal instead.

Discover and manage accounts:

- `GET /api/v1/carrierAccounts` — list connected accounts.
- Carrier Onboarding / Accounts API: https://docs.shipping360.pitneybowes.com/openapi/carrieraccounts

---

## Getting Rates

```text
POST {shippingUrl}/api/v2/rates
```

Rating is **rate-shop oriented** via `rateShopBy`:

| `rateShopBy` | Meaning |
|---|---|
| `carrier` | You name the carrier (and optionally a service) in `byCarrier`. |
| `rateGroup` | Use a predefined rate group (Cheapest / Fastest). |
| `ruleSet` | Apply your automation rules to pick carrier/service. |
| `shipViaCode` | Use a saved code representing carrier+account+service+parcel+special services. |

`byCarrier` behavior:
- `carrier` **or** `carrierAccountId` → all rates for that carrier.
- carrier **and** `service` → a single rate.
- **Omit `byCarrier`** → rate-shop across every carrier in your subscription.

```json
{
  "fromAddress": { "postalCode": "06484", "countryCode": "US", "cityTown": "Shelton", "stateProvince": "CT", "addressLine1": "1001 Bridgeport Ave" },
  "toAddress":   { "postalCode": "90001", "countryCode": "US", "cityTown": "Los Angeles", "stateProvince": "CA", "addressLine1": "123 Main St" },
  "parcel": { "weight": 2.5, "weightUnit": "LB", "length": 10, "width": 7, "height": 4, "dimUnit": "IN", "packageValue": 50 },
  "parcelType": "PKG",
  "rateShopBy": "carrier",
  "byCarrier": { "carrier": "USPS" }
}
```

The response is a `rate[]` array. Key fields: `carrier`, `carrierAccount`, `serviceId`, `parcelType`, `baseCharge`, `totalCarrierCharge`, `rateTypeId` (`CONTRACT_RATES`/`RETAIL`/`COMMERCIAL`/`ONE_RATE`), `destinationZone`, `deliveryCommitment`, `isHazmat`. For UPS/FedEx you also get `publishedTotalCarrierCharge` (published vs discounted).

> Note the parcel dimension unit is **`dimUnit`**, not `dimensionUnit`.

- Rate Shipment API: https://docs.shipping360.pitneybowes.com/openapi/shipping/shipment/rateshipment

---

## Creating a Label (Create Shipment V2)

```text
POST {shippingUrl}/api/v2/shipments
```

Query params: `isReturn` (return label), `includeDeliveryCommitment` (default true).

```json
{
  "fromAddress": { "name": "Warehouse", "company": "My Store", "addressLine1": "1001 Bridgeport Ave", "cityTown": "Shelton", "stateProvince": "CT", "postalCode": "06484", "countryCode": "US", "phone": "2035551212" },
  "toAddress":   { "name": "Jane Customer", "addressLine1": "123 Main St", "cityTown": "Los Angeles", "stateProvince": "CA", "postalCode": "90001", "countryCode": "US", "phone": "2135551212" },
  "parcel": { "weight": 2.5, "weightUnit": "LB", "length": 10, "width": 7, "height": 4, "dimUnit": "IN" },
  "parcelType": "PKG",
  "rateShopBy": "carrier",
  "byCarrier": { "carrier": "USPS", "service": "PM" },
  "labelSize": "DOC_4X6",
  "labelType": "SHIPPING_LABEL",
  "labelFormat": "PDF",
  "contentType": "URL",
  "references": { "reference1": "ORDER-10001" },
  "dateOfShipment": "2026-07-07"
}
```

**Label fields are top-level** (not nested under `labelOptions`):

| Field | Values |
|---|---|
| `labelSize` | `DOC_4X6`, `DOC_4X8`, `DOC_8X11` (USPS also 4x3) |
| `labelType` | `SHIPPING_LABEL`, `QR_CODE` (QR is USPS-only) |
| `labelFormat` | `PDF`, `ZPL2`, `PNG`, `GIF` (note **ZPL2**, not `ZPL`) |
| `contentType` | `URL` (PDF/GIF), `BASE64` (ZPL2/PNG/GIF) |

Response essentials to save: `shipmentId`, `parcelTrackingNumber`, `correlationId`, `carrierAccountId`, `labelLayout[].contents` (URL or Base64), `rate.totalCarrierCharge`.

- Create Shipment API: https://docs.shipping360.pitneybowes.com/openapi/shipping/shipment/createshipmentv2

---

## International Customs

International shipments add a top-level `customs` object with `customsInfo` and `customsItems`. As of March 2026 customs line items are also accepted on **domestic** shipments where a carrier requires them.

```json
"customs": {
  "customsInfo": { "reasonForExport": "SALE", "currencyCode": "USD", "incoterm": "DAP" },
  "customsItems": [
    { "description": "Men's cotton t-shirt", "quantity": 2, "unitPrice": 15.00,
      "weight": 0.5, "weightUnit": "LB", "countryOfOrigin": "US", "hsTariffCode": "610910" }
  ]
}
```

- `reasonForExport`: `SALE`, `GIFT`, `SAMPLE`, `RETURN`, `REPAIR`.
- `incoterm`: `DAP` (buyer pays duties), `DDP` (seller pays), `DDU` (legacy).
- Use specific descriptions and correct values; add HS codes and country of origin.
- Reusable items: define a **Customs Product** once and reference `customsProductId`.
- **Electronic Trade Documents (ETD):** upload invoices via the Upload ETD API and reference them in `customsDocuments` to skip physical paperwork.

- Customs Product API: https://docs.shipping360.pitneybowes.com/openapi/customproduct
- ETD: https://docs.shipping360.pitneybowes.com/openapi/shipping/electronic-trade-document

---

## Return Labels

The standalone Create Return Label API is **deprecated** — generate returns through Create Shipment V2 with `?isReturn=true`.

```text
POST {shippingUrl}/api/v2/shipments?isReturn=true
```

- Addresses reversed: `fromAddress` = customer, `toAddress` = your return center.
- **UPS:** requires the `returnOptions` object **or** `serviceId: PRL` via `specialServices`.
- **FedEx / Purolator / CPC:** `returnOptions` optional.
- **USPS:** Scan-Based Returns — not charged at creation, only after induction; USPS return labels cannot be voided and their URLs expire after 24h.

---

## Cancelling / Voiding Labels

```text
POST {shippingUrl}/api/v2/shipments/cancel
```

```bash
curl -i -X POST \
  'https://api-sandbox.sendpro360.pitneybowes.com/shipping/api/v2/shipments/cancel' \
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{ "shipmentId": "USPS2200613202723337" }'
```

- Provide `shipmentId` **or** `parcelTrackingNumber` (shipmentId wins if both).
- It's a **POST to `/cancel`**, not a `DELETE`.
- Cancel only before carrier pickup/scan. Response `status` is `INITIATED` (refund requested) or `APPROVED`.
- Never delete the shipment record — mark it VOIDED and store the response.

- Cancel Shipment API: https://docs.shipping360.pitneybowes.com/openapi/shipping/shipment/cancelshipmentbyidv2

---

## Manifest / End of Day

Manifesting hands packages to the carrier (USPS SCAN form / Form 3877). End-of-Day (EOD) manifest is supported for **all carriers** (July 2026).

- Add shipments as you create them with `shipmentOptions.addToManifest: true`, or manifest a batch later.
- USPS 3877 can be generated by tracking numbers.
- The Manifest API supports `X-PB-LocationId` for location-based account resolution.

- Manifest APIs: https://docs.shipping360.pitneybowes.com/openapi/manifest

---

## Rate-Card Models: Who Pays

Two models exist depending on the carrier and your plan:

| Model | How it works |
|---|---|
| **Bring your own account** | You onboard the merchant's carrier account and credentials. Rates returned are that account's **negotiated rate card**; the carrier bills you (or PB settles per your setup). This is required for Canada Post, Purolator, Canpar, DHL Express, and UniUni. |
| **PB-rated / discounted (single-payer)** | PB provides **pre-negotiated discounted rates**; no own carrier account needed. PB charges your funded account/card per label and settles with the carrier (end-of-day). Available for **USPS**, and — since 2026 — **UPS and FedEx** on the Standalone Free plan. UPS PB-rated is gated: enable via the Carrier screen "Single Payer" feature, which requires PB Customer Support based on eligibility. |

Whichever model applies, fund your postage account — labels fail on insufficient funds. See each carrier page for its specific model.

---

## Official SDKs

Prefer an official SDK over a hand-rolled client. All support Bearer-token auth and both environments, with built-in methods for address validation, rating, shipment creation, and batch.

| SDK | Install |
|---|---|
| Go | `go get` the module |
| TypeScript / JavaScript | `npm` |
| Java | Maven / Gradle |
| .NET | NuGet |
| Python | `pip` (Python 3.7+) |

- SDKs and Client Libraries: https://docs.shipping360.pitneybowes.com/docs/overview/sdks
- Postman Collection: https://docs.shipping360.pitneybowes.com/docs/resources/postman

---

## Database Fields to Save

```sql
CREATE TABLE shipments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    order_id VARCHAR(100) NOT NULL,
    shipment_id VARCHAR(100) NOT NULL,
    correlation_id VARCHAR(100),
    tracking_number VARCHAR(100),
    carrier VARCHAR(50) NOT NULL,
    service_id VARCHAR(100),
    carrier_account_id VARCHAR(100),
    label_format VARCHAR(20),
    label_size VARCHAR(20),
    label_content_type VARCHAR(20),
    label_url TEXT,
    label_base64 LONGTEXT,
    total_charge DECIMAL(10,2),
    currency_code VARCHAR(10),
    destination_zone VARCHAR(10),
    status VARCHAR(50) NOT NULL,
    is_return BOOLEAN DEFAULT FALSE,
    original_shipment_id VARCHAR(100),
    void_status VARCHAR(50),
    refund_status VARCHAR(50),
    raw_create_response JSON,
    raw_void_response JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    voided_at TIMESTAMP NULL
);
```

Recommended statuses: `DRAFT`, `RATE_SELECTED`, `LABEL_CREATED`, `PRINTED`, `MANIFESTED`, `IN_TRANSIT`, `DELIVERED`, `VOIDED`, `VOID_FAILED`, `RETURN_CREATED`.

---

## Where to Next

Head to a carrier page for its verified codes, account-connection steps, and rate-card model:

- USPS, UPS, FedEx (US-focused)
- Canada Post, Purolator, Canpar (Canada-focused)
- DHL Express (international express)
- UniUni (last-mile e-commerce)

Every one of them uses the endpoints on this page — only the `carrier`/`service`/`carrierAccountId` values differ.

For bulk labels, label formats/PNG, custom references, pulling individual labels from a batch, and packing slips, see [Batch Shipping & Label Customization](batch-labels.html).
