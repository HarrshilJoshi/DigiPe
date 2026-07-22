import { useState } from "react";
import axios from "axios";

const apiUrl = import.meta.env.VITE_API_URL;

export const SecuritySettings = () => {
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");

    if (pin.length !== 4 || isNaN(Number(pin))) {
      setError("PIN must be a 4-digit number.");
      setSubmitting(false);
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match.");
      setSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.post(
        `${apiUrl}/user/set-mpin`,
        { mpin: pin },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccess(data.message || "Transaction PIN updated successfully!");
      setPin("");
      setConfirmPin("");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to update transaction PIN. Please try again."
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
            Security Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Update your 4-digit security PIN used for authorizing money transfers.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            New 4-Digit PIN
          </label>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 1234"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm shadow-inner focus:outline-none focus:border-blue-500 transition text-center tracking-widest font-mono"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Confirm New PIN
          </label>
          <input
            type="password"
            maxLength={4}
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
            placeholder="e.g. 1234"
            className="w-full px-4 py-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 text-sm shadow-inner focus:outline-none focus:border-blue-500 transition text-center tracking-widest font-mono"
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
          {submitting ? "Updating PIN..." : "Update Transaction PIN"}
        </button>
      </form>
    </div>
  );
};
