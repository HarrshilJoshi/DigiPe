import { useLocation, useNavigate } from "react-router-dom";
import { TransferForm } from "../components/TransferForm";
import { userService } from "../services/userService";

export const TransferFunds = () => {
  const { accounts } = userService();
  const navigate = useNavigate();
  const location = useLocation();

  const handleAccountClick = (account) => {
    navigate("/user/transferfunds/form", { state: { fromAccount: account } });
    console.log(account);
  };

  const isModalOpen = location.pathname.endsWith("/form");

  return (
    <div className="bg-[#F0F2F5] text-slate-800 py-6 px-4 flex flex-col items-center relative font-sans w-full">
      <div
        className={`max-w-2xl w-full mx-auto transition-all duration-300 ${
          isModalOpen ? "filter blur-sm pointer-events-none select-none" : ""
        } animate-fade`}
      >
        <h2 className="text-xl font-bold mb-6 text-slate-800">
          <span className="flex items-center gap-3">
            <button
              className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-250 transition button-press"
              onClick={() => navigate("/user/dashboard")}
              aria-label="Back to Dashboard"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <span>Choose a source account</span>
          </span>
        </h2>
        <div className="w-full grid grid-cols-1 gap-4">
          {accounts && accounts.length > 0 ? (
            accounts.map((account) => (
              <div
                key={account._id || account.id}
                className="bg-white rounded-xl p-5 shadow-xs cursor-pointer hover:border-slate-300 transition border border-slate-100 flex flex-col gap-2 animate-fade button-press"
                onClick={() => handleAccountClick(account)}
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-sm text-slate-800">
                    {account.bankName}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    A/C: {account.accountNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 border-t border-slate-100 pt-2 text-xs">
                  <span className="text-slate-400">Available Balance:</span>
                  <span className="font-bold text-slate-900">
                    ₹ {account.balance}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-xl p-8 text-center text-slate-400 shadow-xs border border-slate-100">
              No accounts linked. Please link a bank account first.
            </div>
          )}
        </div>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none animate-fade bg-black/40 backdrop-blur-xs">
          <div className="p-4 max-w-lg w-full relative pointer-events-auto animate-pop">
            <TransferForm />
            <button
              className="absolute top-8 right-8 text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              onClick={() => navigate(-1)}
              aria-label="Close"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
