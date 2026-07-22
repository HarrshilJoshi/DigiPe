import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { transactionService } from "../services/transactionService";

export const TransactionHistory = () => {
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterAccount, setFilterAccount] = useState("");

  const { transactions } = transactionService();
  const navigate = useNavigate();

  useEffect(() => {
    setFilteredTransactions(transactions);
  }, [transactions]);

  const handleFilter = () => {
    if (!filterAccount) {
      setFilteredTransactions(transactions);
      setFilterOpen(false);
      return;
    }
    const filtered = transactions.filter(
      (txn) =>
        txn.sender?.accountNumber === filterAccount ||
        txn.receiver?.accountNumber === filterAccount
    );
    setFilteredTransactions(filtered);
    setFilterOpen(true);
  };

  const handleRowClick = (txn) => {
    navigate("/user/transferfunds/details", {
      state: {
        transferResult: txn,
        senderAccountNumber: txn.sender?.accountNumber,
        receiverAccountNumber: txn.receiver?.accountNumber,
        referenceId: txn.reference,
        date: txn.date,
      },
    });
  };

  return (
    <div className="bg-[#F0F2F5] text-slate-800 py-6 px-4 font-sans w-full">
      <div className="max-w-5xl mx-auto animate-fade">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200 transition button-press"
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
            <h2 className="text-xl font-bold text-slate-800">
              Transaction History
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              className="bg-white hover:bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg font-medium text-xs shadow-2xs transition text-slate-700 cursor-pointer"
              onClick={() => setFilterOpen((open) => !open)}
            >
              Filter Account
            </button>
          </div>
        </div>
        <div
          className={`transition-all duration-300 ease-in-out ${
            filterOpen ? "filter-drawer-open" : "filter-drawer-closed"
          }`}
          style={{
            overflow: "hidden",
            maxHeight: filterOpen ? "200px" : "0",
            opacity: filterOpen ? 1 : 0,
          }}
        >
          <div className="mb-6 flex items-center gap-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <input
              type="text"
              className="px-4 py-2 rounded-lg bg-slate-50 text-slate-850 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              placeholder="Enter Account Number"
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
            />
            <button
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-semibold shadow text-white cursor-pointer text-xs border border-transparent"
              onClick={handleFilter}
            >
              Apply
            </button>
            <button
              className="bg-slate-100 hover:bg-slate-200 border border-slate-200 px-4 py-2 rounded-lg font-semibold shadow text-slate-600 cursor-pointer text-xs"
              onClick={() => {
                setFilterAccount("");
                setFilteredTransactions(transactions);
                setFilterOpen(false);
              }}
            >
              Reset
            </button>
          </div>
        </div>
        {filteredTransactions.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-slate-400 shadow-xs border border-slate-100">
            No transactions recorded.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl shadow-xs border border-slate-100 bg-white">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 text-left font-semibold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Sender Account</th>
                  <th className="py-3 px-4">Receiver Account</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((txn) => (
                  <tr
                    key={txn.id}
                    className="hover:bg-slate-55/60 transition group cursor-pointer"
                    onClick={() => handleRowClick(txn)}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[10px]">
                      {txn.date ? new Date(txn.date).toLocaleString() : "N/A"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-blue-600 font-semibold">
                      {txn.reference}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 font-medium">
                      {txn.description}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      <span>
                        ₹ {txn.amount}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-slate-700">
                          {txn.sender?.accountNumber}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {txn.sender?.bankName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-mono text-slate-700">
                          {txn.receiver?.accountNumber}
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          {txn.receiver?.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                          txn.status === "completed"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100/50"
                            : txn.status === "failed"
                            ? "bg-red-50 text-red-600 border-red-100/50"
                            : "bg-amber-50 text-amber-600 border-amber-100/50"
                        }`}
                      >
                        {txn.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
