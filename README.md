# DigiPe

**A Modern, Secure, Full-Stack Digital Banking & Payments Application**

DigiPe is a state-of-the-art payment platform that enables seamless peer-to-peer (P2P) transfers, multi-account banking, instant searches, and live notifications. Built using the **MERN Stack** (MongoDB, Express, React, Node.js) with real-time WebSockets and strict inactivity security, it delivers a premium digital banking experience.

---

## Key Features

### 1. Authentication & Security
* **JWT Session Guard**: Secure user registration and login with JSON Web Tokens (JWT) protecting private routes.
* **Salted Credentials**: Strong cryptography using `bcryptjs` to hash and store passwords and MPINs.
* **Auto-Logout Security**: Automatic session expiration and redirection to the login page after **10 minutes of inactivity** to prevent unauthorized access.

### 2. Account & Ledger Management
* **Bank Linking**: Link multiple bank accounts by providing the Account Number, Bank Name, and IFSC.
* **Live Balances**: Instant balance updates and centralized view of all linked accounts on the Dashboard.

### 3. Instant Fund Transfers
* **Atomic Transactions**: Transfers are processed atomically using MongoDB transactions to ensure data consistency and zero-loss execution.
* **Beneficiary Validation**: Verification of target account details (IFSC, Account Number, name) before transfer execution.
* **Secure MPIN Verification**: A secure custom modal prompt that requires entering the user's 4-digit MPIN to authorize transfers.

### 4. Request Money
* **Payment Requests**: Request funds from any registered account number with specified amounts and custom memos (e.g., share dinner, utilities).
* **Interactive Approval Dashboard**: Approve or decline incoming payment requests directly from the dashboard. Approved requests initiate immediate atomic transfers.

### 5. Real-Time Interactions
* **Live Socket.io Notifications**: Immediate desktop/in-app notification toasts whenever another user sends money or requests payment.
* **Quick Search**: Real-time lookup bar inside the AppBar to search for beneficiaries by name, account number, or IFSC.

### 6. Transactions & PDF Statements
* **Interactive Ledger**: Complete log of all incoming and outgoing transactions.
* **Export PDF Receipts**: Generate and download professional transaction statements and receipts locally (utilizing `jspdf` and `jspdf-autotable`).

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
* **Database**: MongoDB with Mongoose ODM
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
* `POST /auth/signup` - Register a new user.
* `POST /auth/signin` - Authenticate using email/username.

### Bank Accounts
* `POST /account/create-account` - Link a new bank account.
* `GET /account/search-accounts?q=` - Search for accounts by beneficiary details.
* `POST /account/get-account` - Fetch details for a specific account.

### Transactions
* `POST /transaction/transfer-funds` - Perform an atomic fund transfer.
* `POST /transaction/transactions` - Fetch transaction ledger for a user.

### Payment Requests
* `POST /payment-request/create` - Create a payment request.
* `GET /payment-request/my-requests` - Get incoming/outgoing requests.
* `POST /payment-request/respond` - Approve/decline request.

### User
* `GET /user/me` - Fetch profile information of the logged-in user.

---

## Developer Profile

* **GitHub**: [harrshiljoshi](https://github.com/harrshiljoshi)
