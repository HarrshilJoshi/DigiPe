# DigiPe

**A Modern, Enterprise-Grade Digital Banking & Payments Application**

DigiPe is a state-of-the-art payment platform that enables seamless peer-to-peer (P2P) transfers, multi-account banking, instant searches, and live notifications. Built using the **MERN Stack** (MongoDB, Express, React, Node.js) with **Redis In-Memory Caching & Rate Limiting**, real-time WebSockets, and strict inactivity security, it delivers a premium digital banking experience.

---

## Key Features

### 1. Enterprise Redis Infrastructure
* **Sub-Millisecond RAM Caching**: Caches user profile details (`user:profile:<userId>`) and beneficiary search results (`search:<query>`) in Redis RAM for sub-5ms API response times.
* **Brute-Force Rate Limiting**: Protects sensitive auth (`/signin`, `/signup`) and transfer (`/transfer-funds`) endpoints against DDoS and brute-force attacks via Redis sliding-window counters (`rateLimiter.middleware.js`).
* **Real-Time Token Revocation**: Instantly revokes JWT tokens in Redis on user logout (`/auth/logout`) to prevent replay attacks across distributed servers.
* **Graceful Degradation**: Built using `ioredis` with automatic fallback — if Redis server is offline locally, the app seamlessly falls back to MongoDB execution without crashing.

### 2. Authentication & Security
* **JWT Session Guard**: Secure user registration and login with JSON Web Tokens (JWT) protecting private routes.
* **Salted Credentials**: Strong cryptography using `bcryptjs` to hash and store passwords and MPINs.
* **Auto-Logout Security**: Automatic session expiration and redirection to the login page after **10 minutes of inactivity** to prevent unauthorized access.

### 3. Account & Ledger Management
* **Bank Linking**: Link multiple bank accounts by providing the Account Number, Bank Name, and IFSC.
* **Live Balances**: Instant balance updates and centralized view of all linked accounts on the Dashboard.

### 4. Instant Fund Transfers & ACID Compliance
* **Atomic MongoDB Transactions**: Money transfers are processed atomically using Mongoose Sessions (`session.startTransaction()`) to guarantee data consistency, rollback safety, and zero-loss execution.
* **Beneficiary Validation**: Verification of target account details (IFSC, Account Number, name) before transfer execution.
* **Secure MPIN Verification**: A custom modal prompt requiring the user's 4-digit MPIN to authorize transfers.

### 5. Request Money & WebSockets
* **Payment Requests**: Request funds from any registered account number with specified amounts and custom memos.
* **Interactive Approval**: Approve or decline incoming requests directly from the dashboard with instant atomic transfers.
* **Live Socket.io Notifications**: Immediate desktop/in-app notification toasts whenever another user sends money or requests payment.
* **Interactive Search Bar**: Real-time header search overlay with accounts, beneficiaries, and transaction history tabs.

---

## Technology Stack

### Frontend (Client)
* **Core**: React 19, Vite (Fast build & development runner)
* **Routing**: React Router DOM v7
* **Styling**: Tailwind CSS v4 (Modern CSS framework), tw-animate-css
* **Real-time**: Socket.io Client
* **Utility Libraries**: Axios, Lucide React (icons), Chart.js (dashboard visualizations), jsPDF

### Backend (Server)
* **Runtime**: Node.js (Express framework)
* **Caching & Security**: Redis (`ioredis`), Sliding-Window Rate Limiter
* **Database**: MongoDB with Mongoose ODM (ACID Transactions)
* **Validation**: Zod (Schema-based payload validation)
* **Real-time**: Socket.io Server
* **Server Runner**: Nodemon (Auto-restart on code changes)

---

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/harrshiljoshi/digipe.git
cd digipe
```

### 2. Configure Environment Variables

#### Backend Configuration
Create `.env` inside `server/src/config/`:
```env
PORT=5000
DB_URI=<Your-MongoDB-Atlas-Connection-URI>
JWT_SECRET=<Your-JWT-Secret-Key>
REDIS_URL=redis://127.0.0.1:6379
```

#### Frontend Configuration
Create `.env` inside `client/`:
```env
VITE_API_URL=http://localhost:5000/api/v1
```

### 3. Install & Start Development Servers
From the root `digipe` directory:
```bash
# Install dependencies for both Client & Server
npm run install-all

# Launch both Client and Server concurrently
npm run dev
```

The application will launch on:
* **Frontend**: `http://localhost:5173`
* **Backend API**: `http://localhost:5000`

---

## API Reference

All protected endpoints require the `Authorization: Bearer <token>` header.

### Authentication
* `POST /auth/signup` - Register a new user (Rate-limited).
* `POST /auth/signin` - Authenticate using email/username (Rate-limited).
* `POST /auth/logout` - Revoke current JWT token in Redis.

### Bank Accounts
* `POST /account/create-account` - Link a new bank account.
* `GET /account/search-accounts?q=` - Search for accounts & transactions (Redis cached).
* `POST /account/get-account` - Fetch details for a specific account.

### Transactions
* `POST /transaction/transfer-funds` - Perform an atomic fund transfer (Rate-limited).
* `GET /transaction/transactions` - Fetch transaction ledger for a user.

### Payment Requests
* `POST /payment-request/create` - Create a payment request.
* `GET /payment-request/my-requests` - Get incoming/outgoing requests.
* `POST /payment-request/respond` - Approve/decline request with MPIN.

### User
* `GET /user/me` - Fetch profile information of the logged-in user (Redis cached).
* `POST /user/set-mpin` - Create or update 4-digit transaction MPIN.

---

## Developer Profile

* **GitHub**: [harrshiljoshi](https://github.com/harrshiljoshi)
