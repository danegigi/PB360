# Batch Shipping & Label Customization

Everything about generating labels **in bulk**, the **label formats** Shipping360 returns (single and batch), how to **customize** what prints on a label, and whether you can **pull individual labels** or **insert packing slips** when working in a batch. Read [Basics](00-basics.html) first for auth, headers, and the single Create Shipment V2 call this builds on.

> **Verified against the live docs on 2026-10-19** (`docs.shipping360.pitneybowes.com`). Endpoints and enums below are copied from the Batch Shipment, Create Shipment V2, Multipiece, and Print API reference pages. Service/parcel/special-service codes are still runtime metadata — see [Basics → Carrier Metadata](00-basics.html).

---

## Table of Contents

1. [Three ways to make many labels](#three-ways-to-make-many-labels)
2. [Label types & formats returned](#label-types--formats-returned)
3. [Can you get PNG?](#can-you-get-png)
4. [Customizing the label](#customizing-the-label)
5. [Batch Shipping API](#batch-shipping-api)
6. [Pulling individual labels from a batch](#pulling-individual-labels-from-a-batch)
7. [Packing slips & extra documents](#packing-slips--extra-documents)
8. [Voiding batch labels](#voiding-batch-labels)
9. [Quick decision guide](#quick-decision-guide)
10. [Further Reading](#further-reading)

---

## Three ways to make many labels

Shipping360 has **three distinct "more than one label" concepts** — don't confuse them:

| Concept | What it is | One shipment? | API |
|---|---|---|---|
| **Batch shipping** | Many **separate shipments** to many recipients, printed from **one combined document** | No — N shipments | Batch Shipment API (`/api/v1/bulkShipments`, etc.) |
| **Multi-piece** | **Multiple parcels to the same recipient** under one shipment | One shipment, N parcels | Multipiece API (`/api/v1/multipiece/shipments`) |
| **Multi-parcel (V2)** | Same as multi-piece but via the new `parcels[]` array on Create Shipment V2 | One shipment, N parcels | Create Shipment V2 `parcels[]` |

> **Rule of thumb:** different recipients → **Batch**. Same recipient, several boxes → **Multi-piece / Multi-parcel**.

This page focuses on **Batch**, plus label customization and documents that apply to all three.

---

## Label types & formats returned

Every label-producing call (single Create Shipment V2, multi-piece, and batch) is governed by four fields: `labelType`, `labelSize`, `labelFormat`, and `contentType`.

### `labelType`

| Value | Meaning | Notes |
|---|---|---|
| `SHIPPING_LABEL` | A normal shipping label | Default for all carriers |
| `QR_CODE` | A scannable QR code instead of a printed label | **USPS only**, and only in `GIF` format |

### `labelSize` (document size)

| Value | Size | Typical use |
|---|---|---|
| `DOC_4X6` | 4″ × 6″ | Thermal label printers (the common case) |
| `DOC_4X8` | 4″ × 8″ | Labels with extra content (not on every path) |
| `DOC_8X11` | 8.5″ × 11″ | Plain paper / laser printers |

### `labelFormat` (file format) — single Create Shipment V2

| Value | Supported sizes | Notes |
|---|---|---|
| `PDF` | `DOC_4X6` **and** `DOC_8X11` | Most common; `contentType: URL` or `BASE64` |
| `ZPL2` | `DOC_4X6` only | Zebra thermal printers; `contentType: BASE64` |
| `PNG` | — | Raster image; `contentType: BASE64` |
| `GIF` | — | **Required** for `QR_CODE`; `contentType: URL` or `BASE64` |

> There is no bare `ZPL` for shipping labels — the enum is **`ZPL2`**. (`ZPL` appears only in the separate Print Document API's `documentType`.)

### `contentType` (how the label bytes come back)

| Value | Supported with |
|---|---|
| `URL` | `PDF`, `GIF` — returns a temporary S3 URL to download |
| `BASE64` | `ZPL2`, `PNG`, `GIF` — returns the encoded bytes inline |

The response carries the label under `labelLayout[]`:

```json
{
  "shipmentId": "USPS123456789",
  "parcelTrackingNumber": "9400100000000000000000",
  "correlationId": "00da5e928af44bcc9e5c092163e036f9",
  "labelLayout": [
    {
      "contentType": "URL",
      "contents": "https://.../temp-labels/USPS123456789.pdf",
      "fileFormat": "PDF",
      "size": "DOC_4X6",
      "type": "SHIPPING_LABEL"
    }
  ]
}
```

> **URL labels are temporary.** The S3 link under `labelLayout[].contents` expires (≈24h for USPS). Download and store the label if you need it later — don't treat the URL as permanent.

---

## Can you get PNG?

**Yes, for single and multi-parcel labels.** On Create Shipment V2, `labelFormat: "PNG"` is a supported enum (`PDF` / `ZPL2` / `PNG` / `GIF`). PNG comes back `BASE64`-encoded (not as a URL), so decode `labelLayout[].contents` and write a `.png`.

**Batch is the exception.** The **Batch Shipment API currently supports only `format: "PDF"`** — the field is documented with a single value (`PDF`) because a batch is one combined print document, and the ERR (return-receipt) batch adds `Shipping Label` + `Coversheet` document types, still rendered to PDF. **The multi-piece API likewise supports only `PDF` and `ZPL2`.**

| Path | PDF | ZPL2 | PNG | GIF |
|---|---|---|---|---|
| Single Create Shipment V2 | ✅ | ✅ (4×6) | ✅ (BASE64) | ✅ (QR only) |
| Multi-piece / split labels | ✅ | ✅ | ❌ | ❌ |
| **Batch** | ✅ | ❌ | ❌ | ❌ |

> **If you need per-shipment PNGs at volume**, don't use the Batch API — loop single Create Shipment V2 calls with `labelFormat: "PNG"`, or create the batch in PDF and convert client-side.

---

## Customizing the label

Shipping360 lets you print custom text/references on the label and control its layout. There is **no arbitrary template/logo editor in the shipping API** — customization is via structured fields (free-form label templates live in the PitneyShip **web app**, not the API).

### Reference / custom-message fields

Pass a `references` object (max **6** references) on Create Shipment V2. These print on the label as tags: department, PO number, invoice number, custom message, etc.

```json
"references": {
  "reference1": "Handle with care",
  "reference2": "SendTech",
  "reference3": "98437",
  "reference4": "Overnight Shipping",
  "poNumber": "PO-10231",
  "department": "Fulfillment",
  "shippingNotes": "Leave at side door",
  "additionalReference1": "612987641"
}
```

On the **multi-piece** API the equivalent lives in `shipmentOptions` / `parcelShipmentOptions`:

```json
"parcelShipmentOptions": {
  "printCustomMessage": "custom message 1",
  "printDepartment": "Department 1",
  "printInvoiceNumber": "INV-2345",
  "printPONumber": "PO-4567"
}
```

### Layout & printer controls

| Field | What it does |
|---|---|
| `labelSize` | 4×6 vs 8.5×11 (above) |
| `labelFormat` | PDF / ZPL2 / PNG / GIF (above) |
| `orientation` | `PORTRAIT` / `LANDSCAPE` (Print Document API's `formName`/`orientation`) |
| `printerAliasName` | Target a named printer for direct printing |
| `altReturnAddress` | Print a **different return address** than `fromAddress` (FedEx, UPS, Purolator) |
| `company logo / signature` | Uploaded once via the **Company Logo & Signature** feature (PNG/JPG, max 600×400, 5 MB) and applied to **international** documents — not a per-call field |

### Carrier branded / special messages

Some carriers support printed special-service indicators (e.g. signature required, custom messages). Those come from the carrier's **special services** metadata (`getSpecialServices`) and are passed in `specialServices[]`, not hard-coded.

---

## Batch Shipping API

Batch = print **many shipments to many recipients from one document**. There are **two approaches**.

**Base path:** `/shipping` on the standard hosts (see [Basics → Environment](00-basics.html)). All calls use the same bearer token and `X-PB-*` headers.

### Operations

| Operation | Method & path |
|---|---|
| Create Bulk Shipments (API payload) | `POST /api/v1/bulkShipments` |
| Create Bulk Shipments — ERR (return receipt) | `POST /api/v1/err/bulkShipments` |
| Bulk Import Shipments (file/CSV) | `POST /api/v1/shipments/importUrl` |
| Bulk Import Shipments — ERR | `POST /api/v1/err/shipments/importUrl` |
| Process Batch | `POST /api/v1/shipments/batch/{batchId}/process` |
| Void Batch Labels | `POST /api/v1/shipments/batch/{batchId}/void` |
| Get Batch Status | `GET /api/v1/shipments/batch/{batchId}/status` |
| Get Batch Shipment Details | `GET /api/v1/shipments/batch/{batchId}/shipments` |

### Approach 1 — Synchronous bulk (API payload)

Best when you already hold the shipment data in your app.

1. **Create Bulk Shipments** → `POST /api/v1/bulkShipments`. Returns a `batchId`.
2. **Get Batch Status** → `GET /api/v1/shipments/batch/{batchId}/status` (poll until labels are generated).
3. **Get Batch Shipment Details** → `GET /api/v1/shipments/batch/{batchId}/shipments` (per-shipment `SUCCESS`/`FAILED` + error reasons).

**Root vs shipment level.** Common values (`carrierAccountId`, `parcelType`, `serviceId`, special services) are set once at the **root (default)** level and apply to every shipment; any shipment can **override** them at the shipment level. The combination `carrierAccountId` + `parcelType` + `serviceId` must be supplied **together** at the shipment level or you get a validation error.

```bash
curl -i -X POST \
  'https://api-sandbox.sendpro360.pitneybowes.com/shipping/api/v1/bulkShipments' \
  -H 'Authorization: Bearer <YOUR_TOKEN_HERE>' \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Bulk07",
    "groupName": "Shipping-021",
    "size": "DOC_4X6",
    "type": "SHIPPING_LABEL",
    "format": "PDF",
    "carrierAccountId": "abcd123",
    "serviceId": "PM",
    "parcelType": "PKG",
    "shipments": [
      { "toAddress": { "name": "Recipient A", "addressLine1": "350 Fifth Avenue", "cityTown": "New York", "stateProvince": "NY", "postalCode": "10118", "countryCode": "US" },
        "parcel": { "length": 10, "width": 8, "height": 4, "dimUnit": "IN", "weight": 16, "weightUnit": "OZ" } },
      { "toAddress": { "name": "Recipient B", "addressLine1": "1 Infinite Loop", "cityTown": "Cupertino", "stateProvince": "CA", "postalCode": "95014", "countryCode": "US" },
        "parcel": { "length": 10, "width": 8, "height": 4, "dimUnit": "IN", "weight": 16, "weightUnit": "OZ" } }
    ]
  }'
```

### Approach 2 — Asynchronous import (CSV via S3)

Best for large volumes or when shipment data is already in a file.

1. **Bulk Import Shipments** → `POST /api/v1/shipments/importUrl`. Returns a `batchId` **and an `uploadUrl`** (a presigned S3 URL).
2. **Upload the CSV** to that `uploadUrl` with an HTTP `PUT`:
   ```bash
   curl --location --request PUT '<uploadUrl>' \
     --header 'Content-Type: text/csv' \
     --data '@/path/to/import_shipment.csv'
   ```
   Use PB's downloadable [import template](https://docs.shipping360.pitneybowes.com/docs/shipping/batch/overview) — the generated PDF labels follow the **same row order as the import file**.
3. **Process Batch** → `POST /api/v1/shipments/batch/{batchId}/process`.
4. **Get Batch Status** → poll `GET .../status`.
5. **Get Batch Shipment Details** → `GET .../shipments`.

> **Processing is asynchronous in both approaches** — you create/import, then poll status, then fetch details. Address validation, rating, and label generation each report `SUCCESS`/`FAILED` per shipment, with detailed errors for failures.

---

## Pulling individual labels from a batch

**Short answer: the batch's combined PDF is the single deliverable** — the Batch API does not have a "give me shipment X's label out of batch Y" endpoint. But you have two reliable ways to get a single label:

1. **Get Batch Shipment Details** (`GET /api/v1/shipments/batch/{batchId}/shipments`) returns each shipment's result, including its `shipmentId` and `parcelTrackingNumber`. Because batch PDFs preserve **import/row order**, you can locate and extract a specific page from the combined PDF, or key your records by `shipmentId`.
2. **Reprint by shipment** — once you have a `shipmentId`, reprint that one label:
   - **Reprint shipment** (per-shipment reprint endpoint), or
   - **Print Document API** → `POST /api/v1/document/print` with the stored label `data` (URL or BASE64), `documentType` (`PDF`/`ZPL`/`ZPL2`), `formName` (`4x6`/`8x11`/…), and optional `orientation`/`printerAliasName`.

> So: you can **re-pull or reprint any individual label after a batch** via its `shipmentId`, but there's no endpoint that splits the batch document for you — you track shipment IDs (from Get Batch Shipment Details) and reprint or page-extract as needed.

**Multi-piece note:** for a **same-recipient multi-piece** shipment you *can* ask for separate per-parcel labels with the `splitContent=true` query flag on `POST /api/v1/multipiece/shipments` — **supported for FedEx and UPS only**. That returns individual parcel labels instead of one combined label.

---

## Packing slips & extra documents

**There is no "insert a packing slip into the batch label document" option in the shipping API.** What exists:

- **Batch** produces **shipping labels** (and for **ERR** batches, additional **`Shipping Label` + `Coversheet`** documents) — a coversheet, not a per-order packing slip.
- **Customs / commercial invoice** documents are generated for international shipments (via the Electronic Trade Document flow), not packing slips.
- A true **packing slip** (order line items, quantities, prices) is **order-data**, not shipping-data — generate it from your OMS/order system and print it alongside the label. Shipping360's **OMS APIs** hold order/line-item data if you manage orders in PB; otherwise render the packing slip yourself.

> **Bottom line:** labels and (for ERR) a coversheet come from the batch. Packing slips with order contents are produced from your order system and merged/printed on your side — the batch document won't embed them.

---

## Voiding batch labels

You can cancel shipments created by a batch — **all of them or a selected subset** — then track the void like any batch operation:

1. **Void Batch Shipping Labels** → `POST /api/v1/shipments/batch/{batchId}/void` (pass specific `shipmentId`s to void selectively, or void the whole batch).
2. **Get Batch Status** → poll `GET .../status`.
3. **Get Batch Shipment Details** → `GET .../shipments` shows each void result `SUCCESS`/`FAILED` with errors.

> Void support and windows vary by carrier (e.g. USPS Scan-Based returns can't be voided). Check the carrier page and the void response per shipment.

---

## Quick decision guide

| You want… | Do this |
|---|---|
| Many labels, many recipients, one PDF | **Batch Shipping API** (`format: PDF` only) |
| Per-shipment **PNG**/ZPL2 labels at volume | **Loop single Create Shipment V2** with `labelFormat: PNG`/`ZPL2` (batch won't do non-PDF) |
| Several boxes to the **same** recipient | **Multi-piece** / Multi-parcel V2 |
| Separate label per parcel in a multi-piece | `splitContent=true` (**FedEx/UPS only**) |
| Pull one label back out after a batch | **Get Batch Shipment Details** → reprint by `shipmentId` / Print Document API |
| A **packing slip** on the label | Not in the shipping API — generate from your OMS/order system |
| Custom text on the label | `references` (Create V2) or `print*` options (multi-piece), max 6 references |
| QR code instead of a label | `labelType: QR_CODE` + `labelFormat: GIF` (**USPS only**) |

---

## Further Reading

- [Batch Overview](https://docs.shipping360.pitneybowes.com/docs/shipping/batch/overview) — the two batch approaches and void flow
- [Batch Shipment APIs](https://docs.shipping360.pitneybowes.com/openapi/batchshipping/batch-shipment) — all eight operations and schemas
- [Create Shipment V2](https://docs.shipping360.pitneybowes.com/openapi/newshipping/shipping-apis/createshipmentv2) — `labelType` / `labelSize` / `labelFormat` / `contentType` / `references`
- [Multipiece APIs](https://docs.shipping360.pitneybowes.com/openapi/newshipping/multipiece-apis) — `splitContent` for per-parcel labels
- [Single & Multi-Parcel Support](https://docs.shipping360.pitneybowes.com/docs/shipping/shipment/multiparcel) — the V2 `parcels[]` model
- [Print API](https://docs.shipping360.pitneybowes.com/openapi/shipping/print) — reprint / direct-print a stored label
