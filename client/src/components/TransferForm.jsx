import axios from "axios";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { userService } from "../services/userService";
import { MpinModal } from "./MpinModal";

const apiUrl = import.meta.env.VITE_API_URL;

export const TransferForm = () => {
  const location = useLocation();
  const fromAccount = location.state?.fromAccount;
  const toAccount = location.state?.toAccount;
  const { accounts, hasMpin } = userService();
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

  const handleSearch = async (val) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await axios.get(`${apiUrl}/account/search-accounts?q=${val}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedAccount) {
      setError("Please select a source account.");
      return;
    }
    setMpinError("");
    setMpinOpen(true);
  };

  const handleMpinSubmit = async (pin) => {
    setSubmitting(true);
    setMpinError("");
    setError("");
    setSuccess("");

    const payload = {
      toAccountNumber: form.toAccountNumber,
      ifsc: form.ifsc,
      firstname: form.firstname,
      lastname: form.lastname,
      amount: Number(form.amount),
      description: form.description,
    };

    try {
      const { data } = await axios.post(
        `${apiUrl}/transaction/transfer-funds`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "account-number": selectedAccount.accountNumber,
            "x-mpin": pin,
          },
        }
      );
      setTransferResult(data);
      setSuccess("Transaction successful!");
      setMpinOpen(false);
      setShowSuccessModal(true);
    } catch (err) {
      const msg = err?.response?.data?.message || "Transfer failed. Please try again.";
      setMpinError(msg);
      setError(msg);
    } finally {
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
