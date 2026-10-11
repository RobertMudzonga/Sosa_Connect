# Kuwana API contract (ordering)

The app talks to the **Kuwana_BE** backend (`github.com/RobertMudzonga/Kuwana_BE`) under `API_URL` (default `http://localhost:3000/api/v1`).
App-side TypeScript shapes live in `src/hooks/*.ts`; server-side shapes are built in `Kuwana_BE/src/lib/serializers.ts`. Keep them in sync.
Interactive docs: `{API_URL}/docs` (Swagger).

**Conventions**
- Auth: `Authorization: Bearer <accessToken>` (15 min). Renew with `POST /auth/refresh`.
- Every response is wrapped: `{ success, message, data, meta? }`. The app reads `response.data.data`.
- Validation errors: HTTP 422 `{ message: 'Validation failed', errors: { field: ['problem'] } }`. The app shows the field messages.
- Money is a JSON number in the order's `currency` (`USD` or `ZWG`). **The server calculates every total.**
- Lists are paginated with `?page=&limit=` (default limit 20, or 50 for orders). The app requests `limit=100` for services.

## Auth
| Method | Path | Body | Notes |
|---|---|---|---|
| POST | `/auth/register` | `{ fullName, email, phone?, password }` | Always creates a `USER`. Returns `{ accessToken, refreshToken, user }` |
| POST | `/auth/login` | `{ email, password }` | Same response as register |
| POST | `/auth/refresh` | `{ refreshToken }` | Rotates the refresh token, so the old one stops working. Same response shape |
| GET | `/auth/me` | | The current user |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` | Signs out other sessions |
| POST | `/auth/forgot-password` | `{ email }` | Always 200. Emails `{APP_URL}/reset-password?token=…`, valid for 1 hour |
| POST | `/auth/reset-password` | `{ token, password }` | Single use |
| POST | `/auth/phone/send-code` | `{ phone: '+2637XXXXXXXX' }` | 6-digit SMS code, 10 min expiry, 60 s cooldown, 5 per hour |
| POST | `/auth/phone/verify` | `{ phone, code }` | Returns the updated user (`phoneVerified: true`). 5 attempts per code |

Passwords need 8+ characters, an uppercase letter and a number.
`user` is `{ id, email, phone, phoneVerified, role, status, fullName, avatarUrl }`, where `role` is one of `USER | PROVIDER | DRIVER | ADMIN`.
**A verified phone is required to place orders.**

## Catalogue & stores
| Method | Path | Notes |
|---|---|---|
| GET | `/services?category&search&providerId` | Only approved stores (sellers also see their own). Includes `provider` and `optionGroups[]` |
| GET | `/services/:id` | |
| POST / PATCH / DELETE | `/services[/:id]` | Seller (own store) or admin. Body can include `stock` (null = untracked), `isAvailable`, `section` and `optionGroups[]`. The groups you send replace the existing ones; IDs you keep stay stable |
| GET | `/providers` | Approved stores (admins can use `?approvalStatus=PENDING`) |
| GET | `/providers/:id` | Store page with its settings. Does not include the owner's personal contact details |
| GET / PATCH | `/providers/me` | The seller's own store and settings (`isOpen`, `openingHours`, `deliveryFee`, `minOrder`, `deliveryRadiusKm`, `estimatedPrepMinutes`, `offersDelivery`, `offersCollection`). 404 if the user has no store |
| GET | `/providers/me/stats` | `{ ordersToday, revenueToday, revenueMonth, pendingOrders, currency }` |
| POST | `/uploads` | multipart `file` (JPEG/PNG/WebP, ≤ 5 MB) → `{ url }` |

## Checkout & orders
`CheckoutRequest`: `{ items: [{ serviceId, quantity, optionIds, notes? }], fulfilment: DELIVERY|COLLECTION, addressId?, paymentMethod: ECOCASH|ONEMONEY|CARD|CASH, paymentPhone?, scheduledFor?, promoCode?, notes? }`

| Method | Path | Notes |
|---|---|---|
| POST | `/orders/quote` | Returns `Quote`. Anything that blocks ordering is listed in `errors[]` (closed store, minimum order, sold out, missing option, outside delivery area, mixed currencies, missing address). A bad promo code goes in `promoError` and doesn't block ordering |
| POST | `/orders` | Re-checks and re-prices everything and reserves stock atomically (two buyers can't both get the last item). Creates one order per store, then starts payment. Returns `{ orders, payment? }` |
| GET | `/orders?as=buyer\|seller&status=A,B` | Sellers never see unpaid (`PENDING_PAYMENT`) orders |
| GET | `/orders/:id` | Includes `statusHistory`, `driver` (with live `lat`/`lng`) and `review`. Also checks Paynow directly if a payment is still pending |
| POST | `/orders/:id/cancel` | Buyer only, while `PENDING_PAYMENT` or `PLACED`. Restores stock and refunds if the order was paid |
| PATCH | `/orders/:id/status` | Seller moves: `PLACED→ACCEPTED/REJECTED → PREPARING → READY → COLLECTED`, or `READY → OUT_FOR_DELIVERY → DELIVERED` with their own rider. Admins can also set `CANCELLED` |
| POST | `/reviews` | `{ orderId, rating, comment? }`. Once per order, after delivery. Updates the store's rating |

When a cash order is delivered or collected, it's marked paid. Checkouts left unpaid for `PENDING_PAYMENT_TIMEOUT_MINUTES` (default 30) are cancelled and their stock is released.

## Payments
| Method | Path | Notes |
|---|---|---|
| POST | `/payments/initiate` | `{ orderId, paymentMethod?, paymentPhone? }`. Retries or changes payment for an unpaid checkout. Switching to `CASH` sends the order to the seller immediately |
| POST | `/payments/paynow/result` | Paynow result callback (form-encoded). The SHA512 hash and the amount are both checked |
| POST | `/payments/webhook` | Stripe webhook (signature verified) |
| GET | `/payments/return` | The page a browser lands on after hosted checkout |

Gateways are selected with `ACTIVE_PAYMENT_GATEWAY`:
- `paynow`: EcoCash/OneMoney prompt on the phone, and card through Paynow's hosted page. Paynow has no refund API, so refunds are recorded as manual.
- `stripe`: card only, through Stripe Checkout.
- `mock`: development only; every payment succeeds instantly. It's refused when `NODE_ENV=production`.

## Account
- `GET/POST /addresses`, `DELETE /addresses/:id`. The first saved address becomes the default.
- `GET /favourites` returns services. `POST /favourites { serviceId }` (repeating it is harmless), `DELETE /favourites/:serviceId`.
- `POST /devices { token: 'ExponentPushToken[…]', platform }`, `DELETE /devices/:token`

## Push notifications (sent by the server through Expo)
The app routes a tapped notification using its `data` field:
- `{ type: 'ORDER_UPDATE', orderId }` goes to the buyer
- `{ type: 'NEW_ORDER', orderId }` goes to the seller
- `{ type: 'NEW_DELIVERY' }` goes to all drivers
- `{ type: 'EMERGENCY_ALERT', alertId }` goes to admins

Tokens that Expo reports as unregistered are deleted.

## Drivers (`DRIVER` or `ADMIN` role)
| Method | Path | Notes |
|---|---|---|
| GET | `/deliveries/available` | Delivery orders that have been accepted and have no driver. The customer's phone stays hidden until a driver accepts |
| GET | `/deliveries/mine` | |
| POST | `/deliveries/:id/accept` | Atomic: returns 409 if another driver took it first. One active job per driver |
| PATCH | `/deliveries/:id/status` | `PICKED_UP` (the order must be `READY`), then `DELIVERED`, which requires `proofPhotoUrl` |
| POST | `/deliveries/:id/location` | `{ lat, lng }`; the buyer sees it as `order.driver.lat/lng` |

## SOS
- `POST /emergency/alerts { lat?, lng?, accuracy? }` records the alert and notifies admins by push, rate-limited to 5 per 10 minutes. **It does not contact public emergency services.**
- `GET /emergency/alerts`, `PATCH /emergency/alerts/:id/resolve` (admin)
- `GET /emergency` returns the emergency phone numbers

## Admin
- `GET /admin/orders?status`
- `POST /admin/orders/:id/refund { amount?, reason }` (full or partial)
- `GET/PATCH /admin/settings { commissionPercent, serviceFee, taxPercent, currency }`
- `GET/POST/PATCH /admin/promo-codes`
- `POST /admin/users` (with `role: DRIVER`)
- The existing user, provider and approval routes are unchanged

Every `/admin/*` route requires `role === 'ADMIN'` on the server.
