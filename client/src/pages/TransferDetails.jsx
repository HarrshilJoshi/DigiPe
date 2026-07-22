import { useLocation, useNavigate } from "react-router-dom";

export const TransferDetails = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const transferResult = location.state?.transferResult;
  const senderAccountNumber =
    location.state?.senderAccountNumber ||
    transferResult?.senderAccount?.accountNumber ||
    transferResult?.sender?.accountNumber;
  const receiverAccountNumber =
    location.state?.receiverAccountNumber ||
    transferResult?.receiverAccount?.accountNumber ||
    transferResult?.receiver?.accountNumber;
  const referenceId =
    location.state?.referenceId ||
    transferResult?.referenceId ||
    transferResult?.reference;
  const date =
    location.state?.date || transferResult?.createdAt || transferResult?.date;

  if (!transferResult) {
    return (
      <div className="flex items-center justify-center py-10 font-sans">
        <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <div className="text-base font-bold mb-2 text-slate-800">
            No transfer details found.
          </div>
          <button
            className="mt-4 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-xs text-white font-medium shadow transition cursor-pointer"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const sender = transferResult.senderAccount || transferResult.sender;
  const receiver = transferResult.receiverAccount || transferResult.receiver;

  return (
    <div className="flex items-center justify-center py-6 font-sans">
      <div className="bg-white text-slate-850 p-8 rounded-2xl shadow-sm max-w-md w-full border border-slate-100 relative">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-emerald-50 text-emerald-600 border border-emerald-100/50 rounded-full p-3.5 mb-3 shadow-xs">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="text-lg font-bold mb-1 text-center text-slate-800">
            Transaction Successful
          </div>
          <div className="text-slate-400 text-xs text-center">
            Your funds have been transferred successfully.
          </div>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          <div className="py-3 flex items-center justify-between">
            <span className="font-semibold text-slate-500">Status</span>
            <span className="text-emerald-600 font-bold capitalize">
              {transferResult.status}
            </span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="font-semibold text-slate-500">Reference ID</span>
            <span className="font-mono text-slate-800">{referenceId}</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="font-semibold text-slate-500">Date</span>
            <span className="text-slate-800">
              {date ? new Date(date).toLocaleString() : "-"}
            </span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="font-semibold text-slate-500">Amount</span>
            <span className="font-bold text-slate-900 text-sm">
              ₹ {transferResult.amount}
            </span>
          </div>
          <div className="py-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Sender</span>
            </div>
            <div className="ml-1 text-slate-500 text-[11px]">
              {sender?.bankName || "Linked Bank"} &middot; {senderAccountNumber}
            </div>
          </div>
          <div className="py-3 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Receiver</span>
            </div>
            <div className="ml-1 text-slate-500 text-[11px]">
              {receiver?.bankName || "HDFC Bank"} &middot; {receiverAccountNumber}
            </div>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="font-semibold text-slate-500">Description</span>
            <span className="text-slate-800">{transferResult.description}</span>
          </div>
        </div>
        <button
          className="mt-6 w-full bg-blue-600 hover:bg-blue-500 py-2.5 rounded-lg font-semibold shadow-sm text-white transition text-xs cursor-pointer border border-transparent"
          onClick={() => navigate("/user/dashboard")}
        >
          Back to Dashboard
        </button>
        <button
          className="mt-3 w-full bg-white hover:bg-slate-50 text-slate-700 py-2.5 rounded-lg font-semibold shadow-2xs transition text-xs border border-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
          onClick={() => navigate("/user/transactions")}
        >
          <svg
            xmlns="http://www.w3.org/2500/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7h18M3 12h18M3 17h18"
            />
          </svg>
          See all transactions
        </button>
      </div>
    </div>
  );
};
