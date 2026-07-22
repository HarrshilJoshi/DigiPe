import { useState } from "react";
import axios from "axios";

export const RequestMoneyForm = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    toAccountNumber: "",
    amount: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccessMsg("");

    try {
      const { data } = await axios.post(
        `${apiUrl}/payment-request/create`,
        {
          toAccountNumber: form.toAccountNumber,
          amount: Number(form.amount),
          description: form.description,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSuccessMsg(data.message || "Payment request sent successfully!");
      setForm({ toAccountNumber: "", amount: "", description: "" });
      if (onSuccess) onSuccess();
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create payment request");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-[#1E293B] border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-pop text-slate-100">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-white">Request Money</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition focus:outline-none"
          >
            <svg
              xmlns="http://www.w3.org/2500/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
              Payer's Account Number
            </label>
            <input
              type="text"
              name="toAccountNumber"
              value={form.toAccountNumber}
              onChange={handleChange}
              placeholder="e.g. 9000800070"
              className="w-full px-4 py-2.5 rounded-lg bg-[#0F172A] text-slate-100 border border-slate-700 focus:outline-none focus:border-blue-500 text-sm shadow-inner transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
              Amount (₹)
            </label>
            <input
              type="number"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              placeholder="e.g. 500"
              className="w-full px-4 py-2.5 rounded-lg bg-[#0F172A] text-slate-100 border border-slate-700 focus:outline-none focus:border-blue-500 text-sm shadow-inner transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2 text-slate-300">
              Description / Memo
            </label>
            <input
              type="text"
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="e.g. Dinner share, rent, utilities..."
              className="w-full px-4 py-2.5 rounded-lg bg-[#0F172A] text-slate-100 border border-slate-700 focus:outline-none focus:border-blue-500 text-sm shadow-inner transition"
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs font-semibold bg-red-950/40 border border-red-800/40 py-2 px-3 rounded-md text-center">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="text-emerald-400 text-xs font-semibold bg-emerald-950/40 border border-emerald-800/40 py-2 px-3 rounded-md text-center">
              {successMsg}
            </div>
          )}

          <div className="flex gap-2 justify-end mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-lg text-xs border border-slate-700 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs shadow-sm transition"
            >
              {submitting ? "Sending Request..." : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
