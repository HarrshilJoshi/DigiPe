import { useEffect, useState } from "react";

export const MpinModal = ({ isOpen, onSubmit, onClose, error }) => {
  const [pin, setPin] = useState("");
  const [attempts, setAttempts] = useState(0);

  // Clear PIN and increment attempt counter when an error is returned
  useEffect(() => {
    if (error) {
      setPin("");
      setAttempts((prev) => prev + 1);
    }
  }, [error]);

  // Reset PIN and attempts when modal is opened
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setAttempts(0);
    }
  }, [isOpen]);

  const handleKeyPress = (num) => {
    if (attempts >= 3) return; // Prevent input if locked out
    if (pin.length < 4) {
      setPin((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    if (attempts >= 3) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (attempts >= 3) return;
    setPin("");
  };

  const handleConfirm = () => {
    if (attempts >= 3) return;
    if (pin.length === 4) {
      onSubmit(pin);
    }
  };

  if (!isOpen) return null;

  const isLocked = attempts >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs px-4">
      <div className="bg-white border border-slate-100 rounded-2xl p-6 w-full max-w-sm flex flex-col items-center shadow-2xl animate-pop text-slate-800">
        <h3 className="text-base font-bold text-slate-800 mb-1">Enter Transaction PIN</h3>
        <p className="text-xs text-slate-400 mb-6 text-center">
          Please enter your 4-digit security PIN to authorize transfer.
        </p>

        {/* PIN Indicators */}
        <div className="flex gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border border-slate-200 transition ${
                i < pin.length ? "bg-blue-600 border-blue-600" : "bg-slate-50"
              }`}
            />
          ))}
        </div>

        {/* Attempt message or lockout warning */}
        {isLocked ? (
          <div className="text-red-655 text-xs font-semibold bg-red-50 border border-red-100 py-3 px-4 rounded-xl mb-6 w-full text-center">
            🔒 Too many incorrect attempts. For security reasons, this transaction session is blocked. Please close this window and try again.
          </div>
        ) : error ? (
          <div className="text-red-655 text-xs font-semibold bg-red-50 border border-red-100 py-1.5 px-3 rounded-lg mb-4 w-full text-center">
            {error} <span className="text-[10px] text-red-500 font-normal">({3 - attempts} attempts remaining)</span>
          </div>
        ) : null}

        {/* Keypad */}
        <div className={`grid grid-cols-3 gap-3 w-full mb-6 ${isLocked ? "opacity-30 pointer-events-none" : ""}`}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(String(num))}
              className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-base py-3 rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition active:scale-95 cursor-pointer"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress("0")}
            className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-base py-3 rounded-xl border border-slate-200 transition active:scale-95 cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="flex items-center justify-center text-slate-500 hover:text-slate-700 transition active:scale-95 cursor-pointer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414-6.414A2 2 0 0010.828 5H20a2 2 0 012 2v10a2 2 0 01-2 2h-9.172a2 2 0 01-1.414-.586L3 12z"
              />
            </svg>
          </button>
        </div>

        {/* Buttons */}
        <div className="flex gap-2.5 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium py-2.5 rounded-xl text-xs border border-slate-200 transition"
          >
            {isLocked ? "Close" : "Cancel"}
          </button>
          {!isLocked && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pin.length !== 4}
              className={`flex-1 font-medium py-2.5 rounded-xl text-xs transition border border-transparent ${
                pin.length === 4
                  ? "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                  : "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
              }`}
            >
              Authorize
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
