import { useNavigate } from "react-router-dom";
import { userService } from "../services/userService";
import { transactionService } from "../services/transactionService";
import { useEffect, useState } from "react";
import axios from "axios";
import { RequestMoneyForm } from "../components/RequestMoneyForm";
import { MpinModal } from "../components/MpinModal";

export const Dashboard = () => {
  const { username, firstname, lastname, email, phone, accounts, id } =
    userService();
  const { transactions } = transactionService();
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [mpinRequestToApprove, setMpinRequestToApprove] = useState(null);
  const [mpinError, setMpinError] = useState("");
  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  useEffect(() => {
    if (!token) return;
    const fetchRequests = async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/payment-request/my-requests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setRequests(data.received || []);
      } catch (err) {
        console.error("Error fetching requests:", err);
      }
    };
    fetchRequests();
  }, [apiUrl, token, refreshTrigger]);

  const handleDeclineRequest = async (requestId) => {
    try {
      await axios.post(
        `${apiUrl}/payment-request/respond`,
        { requestId, accept: false },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to decline request");
    }
  };

  const handleApproveRequestClick = (requestId) => {
    setMpinError("");
    setMpinRequestToApprove(requestId);
  };

  const handleMpinSubmit = async (mpin) => {
    try {
      setMpinError("");
      await axios.post(
        `${apiUrl}/payment-request/respond`,
        { requestId: mpinRequestToApprove, accept: true, mpin },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMpinRequestToApprove(null);
      setRefreshTrigger((prev) => prev + 1);
      window.location.reload();
    } catch (err) {
      setMpinError(err.response?.data?.message || "Failed to approve request");
    }
  };

  const getCardStyle = (bankName = "") => {
    const name = bankName.toLowerCase();
    if (name.includes("state bank") || name.includes("sbi")) {
      return "bg-gradient-to-br from-[#005A6F] to-[#003442] text-white shadow-md shadow-slate-900/10";
    }
    if (name.includes("hdfc")) {
      return "bg-gradient-to-br from-[#1C3B87] to-[#0D1E4C] text-white shadow-md shadow-slate-900/10";
    }
    if (name.includes("icici")) {
      return "bg-gradient-to-br from-[#A84A04] to-[#602700] text-white shadow-md shadow-slate-900/10";
    }
    if (name.includes("axis")) {
      return "bg-gradient-to-br from-[#730D35] to-[#400019] text-white shadow-md shadow-slate-900/10";
    }
    return "bg-gradient-to-br from-slate-800 to-slate-950 text-white shadow-md shadow-slate-900/10";
  };

  const userAccountNumbers = accounts.map((acc) => acc.accountNumber);

  return (
    <div className="bg-[#F8FAFC] text-slate-800 min-h-screen font-sans animate-fade">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Left Workspace: Spans 2 Columns */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Welcome Banner */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-xs flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Welcome back, {firstname} {lastname}
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Manage your accounts, check balances, and execute fund transfers.
              </p>
            </div>
          </div>

          {/* Pending Requests Banner if any */}
          {requests.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  Incoming Payment Requests ({requests.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map((req) => (
                  <div key={req.id} className="bg-white rounded-xl p-4 border border-slate-200 flex flex-col gap-3 shadow-xs transition hover:shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-slate-800">{req.requesterName}</span>
                        <p className="text-[9px] text-slate-400 font-mono mt-0.5">{req.requesterEmail}</p>
                      </div>
                      <span className="text-base font-black text-slate-800">₹{req.amount}</span>
                    </div>
                    {req.description && (
                      <p className="text-[10px] text-slate-500 italic bg-slate-50 py-1.5 px-2.5 rounded-lg border border-slate-150">
                        "{req.description}"
                      </p>
                    )}
                    <div className="flex gap-2 text-[10px] font-bold mt-1">
                      <button
                        onClick={() => handleApproveRequestClick(req.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded-lg text-white shadow-xs transition active:scale-98 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDeclineRequest(req.id)}
                        className="flex-1 bg-slate-50 hover:bg-slate-100 py-2 rounded-lg text-slate-700 border border-slate-200 transition active:scale-98 cursor-pointer"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Balance Cards Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Your Linked Accounts
              </h3>
              <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => navigate("/user/create-account")}>+ Link Another</span>
            </div>
            {accounts.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-xs text-slate-400 shadow-2xs flex flex-col items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                No bank accounts linked. Click Link Account in Quick Actions.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {accounts.map((acc) => (
                  <div
                    key={acc.id || acc._id}
                    className={`relative overflow-hidden rounded-2xl p-6 shadow-md flex flex-col justify-between h-48 transition duration-300 transform hover:-translate-y-1 ${getCardStyle(acc.bankName)}`}
                  >
                    {/* Visual Card Chip & Overlay */}
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-white text-base tracking-tight">{acc.bankName}</h4>
                        <p className="text-[10px] text-white/70 font-mono tracking-widest mt-1">
                          •••• •••• •••• {acc.accountNumber?.slice(-4) || acc.accountNumber}
                        </p>
                      </div>
                      <div className="w-8 h-6 bg-amber-400/25 border border-amber-300/30 rounded-md relative flex items-center justify-center shadow-inner">
                        <div className="grid grid-cols-3 gap-0.5 w-5 h-4 opacity-80">
                          {[...Array(9)].map((_, idx) => (
                            <div key={idx} className="border-[0.5px] border-amber-400/50" />
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-end mt-4">
                      <div>
                        <span className="text-[9px] text-white/60 font-semibold uppercase tracking-wider">Available Balance</span>
                        <div className="text-2xl font-black tracking-tight mt-0.5">₹ {acc.balance.toLocaleString("en-IN")}</div>
                      </div>
                      <button
                        onClick={() => navigate("/user/transactions")}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 py-1.5 px-3 rounded-lg font-bold text-[10px] transition cursor-pointer flex items-center gap-1 backdrop-blur-xs"
                      >
                        Ledger
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transaction History Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Transaction History
              </h3>
              <span className="text-[10px] text-blue-600 font-semibold cursor-pointer hover:underline" onClick={() => navigate("/user/transactions")}>View Full Ledger</span>
            </div>
            {transactions.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-2xl p-10 text-center text-xs text-slate-400 shadow-2xs">
                No recent transactions found.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {transactions.slice(0, 5).map((txn) => {
                  const isCredit = userAccountNumbers.includes(txn.receiver?.accountNumber);
                  return (
                    <div
                      key={txn.id}
                      onClick={() => navigate("/user/transactions")}
                      className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs hover:shadow-xs hover:border-slate-300 transition duration-200 cursor-pointer transform hover:scale-[1.005]"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs select-none bg-slate-100 ${
                          isCredit ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {isCredit ? (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 13l-7 7-7-7m14-6l-7 7-7-7" />
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 11l7-7 7 7M5 19l7-7 7 7" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-850 text-sm tracking-tight">{txn.description}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {txn.date ? new Date(txn.date).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                            <span className="mx-1.5">&middot;</span>
                            Ref: {txn.reference}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className={`font-black text-sm tracking-tight ${isCredit ? "text-emerald-600" : "text-slate-800"}`}>
                          {isCredit ? "+" : "-"} ₹ {txn.amount}
                        </div>
                        <span className={`px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase tracking-wider ${
                          isCredit ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-50 text-slate-600 border border-slate-200"
                        }`}>
                          {isCredit ? "Credit" : "Debit"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Widget Column: Spans 1 Column */}
        <div className="flex flex-col gap-8">
          {/* Quick Actions Panel */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-2xs flex flex-col gap-5">
            <div>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight">Quick Actions</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5">
              {/* Send Money */}
              <button
                onClick={() => navigate("/user/transferfunds")}
                className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer text-center"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <span className="block text-xs font-bold text-slate-800">Send Money</span>
              </button>

              {/* Transfer Funds */}
              <button
                onClick={() => navigate("/user/transferfunds")}
                className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer text-center"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="block text-xs font-bold text-slate-800">Transfer</span>
              </button>

              {/* Request Money */}
              <button
                onClick={() => setShowRequestModal(true)}
                className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer text-center"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="block text-xs font-bold text-slate-800">Request</span>
              </button>

              {/* Link Account */}
              <button
                onClick={() => navigate("/user/create-account")}
                className="group flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition cursor-pointer text-center"
              >
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shadow-2xs group-hover:scale-105 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <span className="block text-xs font-bold text-slate-800">Link Bank</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Request Money Modal */}
      <RequestMoneyForm
        isOpen={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        onSuccess={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Transaction MPIN Modal for Request Approval */}
      <MpinModal
        isOpen={mpinRequestToApprove !== null}
        onSubmit={handleMpinSubmit}
        onClose={() => setMpinRequestToApprove(null)}
        error={mpinError}
      />
    </div>
  );
};
