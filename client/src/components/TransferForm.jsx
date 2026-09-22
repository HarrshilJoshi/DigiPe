import { apiClient } from "../services/apiClient";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userService } from "../services/userService";
import { MpinModal } from "./MpinModal";

const getRazorpayBankCode = (bankName) => {
  if (!bankName) return null;
  const name = bankName.toLowerCase();
  if (name.includes("state bank") || name.includes("sbin")) return "SBIN";
  if (name.includes("hdfc")) return "HDFC";
  if (name.includes("icici")) return "ICIC";
  if (name.includes("axis")) return "UTIB";
  if (name.includes("federal")) return "FDRL";
  if (name.includes("baroda") || name.includes("bob")) return "BARB";
  if (name.includes("punjab") || name.includes("pnb")) return "PUNB";
  return null;
};

/**
 * TransferForm Component:
 * Provides a comprehensive bank transfer interface.
 * Key Functional Areas:
 * 1. Source Account selection (displays current balances).
 * 2. Autocomplete search directory to locate active beneficiaries quickly by name, bank, or account number.
 * 3. Input validation for recipient bank details (IFSC/Account).
 * 4. Intercepts submission to request a secure 4-digit transaction MPIN before executing the payment.
 */
export const TransferForm = () => {
  const location = useLocation();
  // Read state parameters passed from previous routing navigation
  const fromAccount = location.state?.fromAccount;
  const toAccount = location.state?.toAccount;
  
  // Custom hook containing user profiles and account records
  const { accounts, hasMpin } = userService();
  
  // Stores success receipt data returned from the backend after a transfer completes
  const [transferResult, setTransferResult] = useState(null);

  const [selectedAccount, setSelectedAccount] = useState(
    fromAccount || (accounts && accounts[0]) || null
  );
  const [form, setForm] = useState({
    toAccountNumber: toAccount?.accountNumber || "",
    ifsc: toAccount?.ifsc || "",
    firstname: toAccount?.firstname || toAccount?.firstName || "",
    lastname: toAccount?.lastname || toAccount?.lastName || "",
    amount: "",
    description: "",
  });

  const generateIdempotencyKey = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const [idempotencyKey, setIdempotencyKey] = useState(generateIdempotencyKey);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [mpinOpen, setMpinOpen] = useState(false);
  const [mpinError, setMpinError] = useState("");

  // Search autocomplete states
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) {
      navigate("/signin");
      return;
    }
  }, [navigate, token]);

  const namesPrefilled = Boolean(
    toAccount?.firstname ||
      toAccount?.firstName ||
      toAccount?.lastname ||
      toAccount?.lastName
  );
  const accountPrefilled = Boolean(toAccount?.accountNumber || toAccount?.ifsc);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAccountChange = (e) => {
    const acc = accounts.find((a) => (a._id || a.id) === e.target.value);
    setSelectedAccount(acc);
  };
  // Sends search requests to retrieve matches from the database as the user types.
  // Requires at least 2 characters to prevent flooding the backend with small queries.
  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await apiClient.get(`/account/search-accounts?q=${val}`);
      setSearchResults(data.user || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const selectSearchResult = (res) => {
    setForm({
      toAccountNumber: res.accountNumber || "",
      ifsc: res.ifsc || "",
      firstname: res.firstname || "",
      lastname: res.lastname || "",
      amount: form.amount,
      description: form.description,
    });
    setSearchResults([]);
    setSearchQuery("");
  };

  // Intercepts the form's submit behavior.
  // Instead of initiating the transaction directly, it opens the MpinModal overlay
  // to collect the 4-digit security PIN required for transaction signing.
  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!selectedAccount) {
      setError("Please select a source account.");
      return;
    }
    setMpinError("");
    setMpinOpen(true);
  };

  // Fires the final POST request to execute the fund transfer.
  // Sends core transaction details inside the request body.
  // Custom HTTP Headers:
  // - "account-number": Identifies which account belongs to the sender.
  // - "x-mpin": Passes the collected security PIN for backend cryptographic hashing verification.
  // - "Idempotency-Key": Prevents double-transfer or duplicate charges on network retries or rapid double-clicks.
  const handleMpinSubmit = async (pin) => {
    if (submitting) return;
    setSubmitting(true);
    setMpinError("");
    setError("");
    setSuccess("Executing fund transfer...");

    const payload = {
      toAccountNumber: form.toAccountNumber,
      ifsc: form.ifsc,
      firstname: form.firstname,
      lastname: form.lastname,
      amount: Number(form.amount),
      description: form.description,
      idempotencyKey,
    };

    try {
      const { data } = await apiClient.post(
        "/transaction/transfer-funds",
        payload,
        {
          headers: {
            "account-number": selectedAccount.accountNumber,
            "x-mpin": pin,
            "Idempotency-Key": idempotencyKey,
          },
        }
      );

      setMpinOpen(false);
      setSuccess("");
      setTransferResult(data);
      setShowSuccessModal(true);
      setSubmitting(false);
      // Rotate idempotency key for the next payment
      setIdempotencyKey(generateIdempotencyKey());
    } catch (err) {
      const msg = err?.response?.data?.message || "Transfer failed. Please try again.";
      setMpinError(msg);
      setError(msg);
      setSuccess("");
      setSubmitting(false);
    }
  };

  if (!hasMpin) {
    return (
      <div className="max-w-lg mx-auto bg-white border border-slate-100 p-6 rounded-2xl shadow-md text-center text-slate-800 animate-fade py-8">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-base font-bold text-slate-800 mb-2">Set Security PIN Required</h3>
        <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
          For your security, you must configure a 4-digit transaction MPIN before you can transfer funds.
        </p>
        <button
          onClick={() => navigate("/user/security")}
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs px-6 py-2.5 shadow transition button-press border border-transparent"
        >
          Set Transaction PIN
        </button>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4 animate-pop max-w-lg mx-auto bg-white border border-slate-100 p-6 rounded-2xl shadow-md text-slate-800">
        <h3 className="text-lg font-bold text-center text-slate-800 mb-2">Transfer Funds</h3>
        
        {/* From Account Select */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">From Account</label>
          <select
            className="w-full px-4 py-2.5 rounded-lg bg-white text-slate-855 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-sm transition"
            value={
              selectedAccount ? selectedAccount._id || selectedAccount.id : ""
            }
            onChange={handleAccountChange}
            required
          >
            <option value="" disabled>
              Select account
            </option>
            {accounts &&
              accounts.map((acc) => (
                <option key={acc._id || acc.id} value={acc._id || acc.id}>
                  {acc.bankName} - {acc.accountNumber} (₹ {acc.balance})
                </option>
              ))}
          </select>
        </div>

        {/* Quick Search Beneficiary Autocomplete */}
        <div className="relative">
          <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">Quick Search Beneficiary</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Type name, account number, or bank..."
            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-850 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
          />
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto z-10 text-xs divide-y divide-slate-100">
              {searchResults.map((res) => (
                <div
                  key={res.id}
                  onClick={() => selectSearchResult(res)}
                  className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex flex-col gap-0.5"
                >
                  <div className="font-semibold text-slate-800">{res.firstname} {res.lastname}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{res.bankName} - {res.accountNumber}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Beneficiary Details Form Inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">
              To Account Number
            </label>
            <input
              type="text"
              name="toAccountNumber"
              value={form.toAccountNumber}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
              readOnly={accountPrefilled}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">IFSC</label>
            <input
              type="text"
              name="ifsc"
              value={form.ifsc}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
              readOnly={accountPrefilled}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">First Name</label>
            <input
              type="text"
              name="firstname"
              value={form.firstname}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
              readOnly={namesPrefilled}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">Last Name</label>
            <input
              type="text"
              name="lastname"
              value={form.lastname}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
              readOnly={namesPrefilled}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">Amount (₹)</label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
              min={1}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">
              Description
            </label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
            />
          </div>
        </div>
        {error && <div className="text-red-650 text-xs font-semibold bg-red-50 border border-red-100 py-2 px-3 rounded-lg text-center">{error}</div>}
        {success && <div className="text-emerald-650 text-xs font-semibold bg-emerald-50 border border-emerald-100 py-2 px-3 rounded-lg text-center">{success}</div>}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-lg font-medium text-xs shadow-sm transition disabled:opacity-60 button-press mt-2 border border-transparent"
          disabled={submitting}
        >
          {submitting ? "Processing..." : "Transfer Funds"}
        </button>
      </form>

      {/* MPIN Security Modal */}
      <MpinModal
        isOpen={mpinOpen}
        onSubmit={handleMpinSubmit}
        onClose={() => setMpinOpen(false)}
        error={mpinError}
        isSubmitting={submitting}
      />

      {showSuccessModal && transferResult && (
        <>
          <div className="fixed inset-0 z-40 backdrop-blur-xs bg-black/40 transition-all duration-300 animate-fade" />
          <div className="fixed inset-0 flex items-center justify-center z-50 animate-pop">
            <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative animate-pop text-slate-800">
              <div className="text-4xl mb-4 text-emerald-500">✓</div>
              <div className="text-xl font-bold text-slate-900 mb-2">
                Transaction Successful!
              </div>
              <div className="text-slate-500 text-xs mb-6">
                Your transaction has been authorized and completed.
              </div>
              <button
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-lg font-semibold shadow transition w-full button-press border border-transparent"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate("/user/transferfunds/details", {
                    state: { transferResult },
                  });
                }}
              >
                View Transaction Receipt
              </button>
              <button
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
                onClick={() => setShowSuccessModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};
