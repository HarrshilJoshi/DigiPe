import axios from "axios";
import { useState } from "react";

const apiUrl = import.meta.env.VITE_API_URL;

const BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Federal Bank",
  "Bank of Baroda",
  "Punjab National Bank",
  "Bank of America",
  "Chase Bank",
  "Wells Fargo",
];
const ACCOUNT_TYPES = ["Savings", "Current"];

export const CreateAccountForm = () => {
  const [accountNumber, setAccountNumber] = useState("");
  const [ifsc, setIfsc] = useState("");
  const [bankName, setBankName] = useState(BANKS[0]);
  const [accountType, setAccountType] = useState(ACCOUNT_TYPES[0]);
  const [balance, setBalance] = useState("0");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (!accountNumber || accountNumber.length < 10) {
      setError("Account Number must be at least 10 digits.");
      setSubmitting(false);
      return;
    }

    if (!ifsc) {
      setError("IFSC code is required.");
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${apiUrl}/account/create-account`,
        {
          accountNumber: String(accountNumber),
          ifsc: String(ifsc).toUpperCase(),
          bankName,
          balance: Number(balance),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess("Account linked successfully!");
      setAccountNumber("");
      setIfsc("");
      setBalance("0");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Account creation failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-6 font-sans">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 max-w-md w-full flex flex-col gap-4 animate-fade text-slate-800"
      >
        <div className="text-center">
          <h2 className="text-lg font-bold text-slate-800">
            Link Bank Account
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Fill in your bank account details below to bind your card.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Account Number
          </label>
          <input
            type="text"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 1000200030"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs shadow-inner focus:outline-none focus:border-blue-500 transition"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            IFSC Code
          </label>
          <input
            type="text"
            value={ifsc}
            onChange={(e) => setIfsc(e.target.value)}
            placeholder="e.g. HDFC0001234"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs shadow-inner focus:outline-none focus:border-blue-500 transition uppercase"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Bank Name
            </label>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs shadow-sm focus:outline-none focus:border-blue-500 transition"
              required
            >
              {BANKS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Account Type
            </label>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs shadow-sm focus:outline-none focus:border-blue-500 transition"
            >
              {ACCOUNT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Starting Balance (₹)
          </label>
          <input
            type="number"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            placeholder="e.g. 5000"
            min={0}
            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-xs shadow-inner focus:outline-none focus:border-blue-500 transition"
            required
          />
        </div>

        {error && (
          <div className="text-red-650 text-center text-xs font-semibold bg-red-50 border border-red-100 py-2 px-3 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="text-emerald-650 text-center text-xs font-semibold bg-emerald-50 border border-emerald-100 py-2 px-3 rounded-lg">{success}</div>
        )}

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs py-2.5 transition button-press mt-2 border border-transparent shadow-sm"
          disabled={submitting}
        >
          {submitting ? "Linking..." : "Link Bank Account"}
        </button>
      </form>
    </div>
  );
};
