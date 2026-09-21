# RelayWork — Informal Skilled-Labor Marketplace (Phase 1 MVP)

RelayWork is an informal skilled-labor marketplace built for the Nigerian market, connecting Clients with vetted, local trade Professionals (Electricians, Plumbers, Carpenters, AC Technicians, Painters, and Mechanics).

---

## 🛠 Tech Stack

- **Backend**: FastAPI (Python 3.12), SQLAlchemy 2.0 ORM, SQLite / PostgreSQL-ready, SlowAPI Rate Limiting, Argon2 Password Hashing, JWT Auth.
- **Payments & Escrow**: Paystack Split Payments & Subaccounts, Idempotent Webhook Handlers (`X-Paystack-Signature` HMAC-SHA512).
- **Live Communication**: WebSocket real-time bid & chat engine with in-memory connection pooling.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet & OpenStreetMap, Lucide Icons, Axios.

---

## 🚀 Quickstart Guide

### 1. Backend Setup & Run

1. **Navigate to the backend directory and configure `.env`**:
   ```bash
   cd backend
   # Ensure .env has your configurations (JWT secrets, ADMIN_BOOTSTRAP_TOKEN, Paystack keys)
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Seed database with standard trade categories and demo profiles**:
   ```bash
   python seed.py
   ```

4. **Start the FastAPI server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   API Swagger Docs will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

### 2. Frontend Setup & Run

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Testing

Run the full automated integration test suite:
```powershell
$env:PYTHONPATH='backend'
pytest backend/tests -v
```

All 4 test suites pass:
1. `test_health`: API readiness check.
2. `test_admin_bootstrap_flow`: Zero-hardcoded admin initialization via secure bootstrap token.
3. `test_user_flow_and_ownership`: Client/Pro account creation, geolocation proximity queries, role security.
4. `test_webhook_idempotency`: Paystack webhook replay protection and balance split settlement.

---

## 👥 Demo Walkthrough & Seed Credentials

### 1. Client Walkthrough
- **Login**: `client@relaywork.com` / `password123`
- **Actions**:
  1. Browse trade categories on the homepage.
  2. Search for nearby Pros using the interactive map and radius slider.
  3. View Pro details and submit a service request with custom details and dates.
  4. Chat with the Pro in real-time to negotiate price.
  5. Settle payments seamlessly via Paystack escrow once the job is completed.
  6. Rate and review the Pro with star ratings and comments.

### 2. Pro Walkthrough
- **Approved Pro Login**: `ade@relaywork.com` / `password123` (Electrician in Ikeja)
- **Pending Pro Login**: `tunde@relaywork.com` / `password123` (Carpenter)
- **Actions**:
  1. Update trade details, hourly rate, and service map pin.
  2. Enter payout bank details (masked for security).
  3. Upload government ID / trade credentials for verification badge review.
  4. View requested jobs, quote agreed prices, accept jobs, and update job status (`in_progress` -> `completed`).

### 3. Admin Governance Walkthrough
- **Bootstrap Admin**: Navigate to [http://localhost:5173/admin/bootstrap](http://localhost:5173/admin/bootstrap).
- **Bootstrap Token**: `SUPER_SECRET_ADMIN_TOKEN_2026` (from `.env`).
- **Actions**:
  1. View live marketplace metrics (Total Users, Verified Pros, Pending Applications, Total Commission Settled).
  2. Review pending Pro applications and view uploaded identity verification documents.
  3. Approve or Reject Pro badges with mandatory audit logging.
  4. Inspect the immutable Governance Audit Trail.

---

## 🔒 Security & Architecture Decisions

1. **Zero Hardcoded Admin Credentials**: Platform administrators are initialized only via `POST /api/admin/bootstrap` authenticated with the secret `ADMIN_BOOTSTRAP_TOKEN`.
2. **Bank Data Protection**: Raw bank account numbers are submitted directly to Paystack subaccount APIs and only stored in masked form (`•••• 4417`) in application databases.
3. **Idempotent Webhooks**: Paystack transaction references are tracked in a dedicated `Payment` ledger with unique transaction hash verification preventing double-credit and replay attacks.
4. **Platform Commission Configuration**: Default commission is 15% (`PLATFORM_COMMISSION_PERCENT=15`), automatically calculated and split upon job checkout.
