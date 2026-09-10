# ROUTEFILL — Smart Backhaul & Digital Logistics Exchange (frontend prototype)

"Don't create another trip. Fill the empty one."

A commercial vehicle already has an existing trip. ROUTEFILL surfaces the
**unused capacity** on that trip and matches it — down to the kilogram — with
a compatible shipment: shippers post loads, drivers publish partial backhaul
capacity, ROUTEFILL scores the match, the driver keeps final approval, and an
admin verifies KYC, approves bills and resolves disputes.

Journey: **EXISTING TRIP → UNUSED CAPACITY → SMART MATCH → DRIVER APPROVAL →
DIGITAL LOGISTICS → DELIVERY**.

## Run it
No build step. Serve the folder with any static server and open `index.html`.
```
npx serve .
# or
python3 -m http.server 8000
```
Opening `index.html` directly via `file://` also works, since everything is
localStorage-based.

## Structure
```
index.html, login.html, register.html      landing + auth
css/style.css                               shared design system (navy/emerald/amber, waybill/ledger motifs)
js/mockApi.js                               mock backend — localStorage, shaped like future REST responses
js/auth.js                                  session + role guard (Auth.requireRole('driver', '../../'))
js/main.js                                  nav rendering, toasts, formatting helpers
pages/customer/                             dashboard, post-load, my-loads, load-detail
pages/driver/                               dashboard, kyc-onboarding, post-capacity, matched-loads, earnings
pages/admin/                                dashboard, kyc-queue, bill-queue, disputes
```

## Demo accounts
| Role     | Email                     | Password |
|----------|---------------------------|----------|
| Customer | rohit@deshmukhagro.in     | demo1234 |
| Driver (verified) | suresh@example.com | demo1234 |
| Driver (KYC pending) | iqbal@example.com | demo1234 |
| Driver (Vijayawada → Hyderabad demo) | ganesh@example.com | demo1234 |
| Admin    | admin@routefill.in        | admin123 |

Run `Api.resetDemoData()` in the browser console to wipe localStorage and reseed.

The seeded data includes the flagship demo scenario: Ganesh's Tata Ace is
already running Vijayawada → Hyderabad with 350kg loaded and 400kg of unused
backhaul capacity (`cp_3001`), and Priya has a 250kg shipment on the same
corridor (`ld_2001`) — log in as either account to run the full request →
accept → digital record → delivery → OTP → POD flow end to end.

## Data model (mirrors the future backend entities)
- **User** — role (`customer`/`driver`/`admin`), profile fields, and for drivers:
  `kycStatus` (`none`/`pending`/`verified`/`rejected`) + `kycDocs`.
- **Load** — posted by a customer: route, weight (`weightTons` + `unit`), material,
  pickup date, budget, `status` (`draft`/`open`/`requested`/`matched`/`in_transit`/
  `delivered`/`cancelled`/`disputed`).
- **Capacity** — posted by a driver: `totalCapacityTons`, `existingLoadTons`,
  `bookedTons`, with `availableBackhaulTons`/`remainingTons` always recomputed
  as `remaining = (total - existingLoad) - booked`, floored at zero. A single
  capacity post can back multiple accepted bookings as long as capacity remains.
- **Match** (booking / consignment) — links one Load to one Capacity.
  `status`: `requested → accepted|rejected → pickup_confirmed → in_transit →
  arrived → delivered` (or `cancelled`/`disputed`); invalid transitions are
  rejected. Carries `matchScore` + `matchBreakdown` (rule-based, not AI),
  an `events[]` timeline, an auto-generated `digitalRecord` once accepted, and
  a `pod` object (OTP + Proof of Delivery) once delivered.
- **Bill** — driver-submitted freight + toll + other charges against a Match, admin-approved.
- **Dispute** — raised by either party against a Match.
- **TripPhoto** — pickup/delivery proof photos, admin-reviewable (kept alongside OTP-based POD).

## Swapping in a real backend
`js/mockApi.js` exposes one flat `Api` object (`Api.login`, `Api.createLoad`,
`Api.requestBooking`, `Api.decideBooking`, `Api.decideKyc`, etc.) — every page
calls only through `Api.*` and `Auth.*`, never touching `localStorage` directly.
To go live:
1. Re-implement each `Api.*` function as a `fetch()` call to the matching REST
   endpoint, returning the same `{ ok, ...payload }` shape.
2. Replace `Api.login`/`Api.register` with real JWT/session issuance; keep
   `Api.getSession()`'s contract the same so `auth.js` doesn't need to change.
3. The matching logic in `findMatchesForLoad`/`findMatchesForCapacity` and
   `computeMatchScore` is a deterministic, rule-based heuristic — replace with
   a real geo/time-window matching service if needed. It is explicitly not
   presented as AI/ML anywhere in the UI.

## Not yet built
- Payments/payout integration (bill approval currently just flips a status)
- Real file uploads for KYC docs and trip photos (currently store the filename only)
- Push/SMS notifications on match, KYC decision, dispute resolution
