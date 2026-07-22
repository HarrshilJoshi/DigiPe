import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const [user, setUser] = useState({ firstname: "", lastname: "", email: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState({ accounts: [], transactions: [] });
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef(null);

  const apiUrl = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) return;
    const fetchUser = async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/user/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(data);
      } catch (err) {
        console.error("Header user fetch failed", err);
      }
    };
    fetchUser();
  }, [apiUrl, token]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ accounts: [], transactions: [] });
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    setShowDropdown(true);

    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/account/search-accounts`, {
          params: { q: searchQuery.trim() },
          headers: { Authorization: `Bearer ${token}` },
        });
        setSearchResults({
          accounts: data.accounts || [],
          transactions: data.transactions || [],
        });
      } catch (err) {
        console.error("Search API error:", err);
        setSearchResults({ accounts: [], transactions: [] });
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, apiUrl, token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = (user.firstname?.charAt(0) || "") + (user.lastname?.charAt(0) || "");
  const hasAccounts = searchResults.accounts.length > 0;
  const hasTransactions = searchResults.transactions.length > 0;
  const hasResults = hasAccounts || hasTransactions;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 fixed top-0 right-0 left-64 z-20">
      {/* Search Input Container */}
      <div className="flex-1 max-w-md relative" ref={searchRef}>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4.5 w-4.5 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Search transactions, accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchQuery.trim()) setShowDropdown(true);
            }}
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowDropdown(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 text-xs"
            >
              &#x2715;
            </button>
          )}
        </div>

        {/* Search Results Dropdown Overlay */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 max-h-96 overflow-y-auto z-50 divide-y divide-slate-100 animate-fadeIn">
            {searchLoading ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Searching...
              </div>
            ) : !hasResults ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No matching accounts or transactions found for &ldquo;<span className="font-medium text-slate-600">{searchQuery}</span>&rdquo;
              </div>
            ) : (
              <>
                {/* Accounts Section */}
                {hasAccounts && (
                  <div className="p-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Accounts / Beneficiaries ({searchResults.accounts.length})
                    </div>
                    <div className="space-y-1">
                      {searchResults.accounts.map((acc) => (
                        <div
                          key={acc.id}
                          className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                              {(acc.firstname || acc.bankName || "B").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-slate-800">
                                {acc.firstname ? `${acc.firstname} ${acc.lastname}` : acc.username || "Account Holder"}
                                <span className="ml-1.5 text-[11px] font-normal text-slate-500">
                                  ({acc.bankName})
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-400">
                                A/C: {acc.accountNumber} &middot; IFSC: {acc.ifsc}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setShowDropdown(false);
                              setSearchQuery("");
                              navigate("/user/transferfunds/form", {
                                state: {
                                  toAccount: {
                                    accountNumber: acc.accountNumber,
                                    ifsc: acc.ifsc,
                                    bankName: acc.bankName,
                                    firstname: acc.firstname,
                                    lastname: acc.lastname,
                                    id: acc.id,
                                  },
                                },
                              });
                            }}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-medium transition shadow-sm"
                          >
                            Send
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transactions Section */}
                {hasTransactions && (
                  <div className="p-2">
                    <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Transactions ({searchResults.transactions.length})
                    </div>
                    <div className="space-y-1">
                      {searchResults.transactions.map((txn) => (
                        <div
                          key={txn.id}
                          onClick={() => {
                            setShowDropdown(false);
                            setSearchQuery("");
                            navigate("/user/transactions");
                          }}
                          className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-lg transition cursor-pointer"
                        >
                          <div>
                            <div className="text-xs font-semibold text-slate-800 flex items-center gap-2">
                              <span>{txn.description}</span>
                              <span
                                className={`px-1.5 py-0.5 text-[9px] rounded font-semibold uppercase ${
                                  txn.status === "completed"
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                    : "bg-amber-50 text-amber-600 border border-amber-200"
                                }`}
                              >
                                {txn.status}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {txn.senderName} &rarr; {txn.receiverName} &middot; Ref: {txn.referenceId || "N/A"}
                            </div>
                          </div>
                          <div className="text-xs font-bold text-slate-800">
                            &#8377;{Number(txn.amount).toLocaleString("en-IN")}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-6">
        {/* User Card */}
        <div className="flex items-center gap-3 pl-6">
          <div className="flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-800">
              {user.firstname || user.username} {user.lastname}
            </span>
            <span className="text-[10px] text-slate-400 font-mono leading-none mt-0.5">
              {user.email}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-600 font-bold text-xs select-none">
            {initials.toUpperCase() || "U"}
          </div>
        </div>
      </div>
    </header>
  );
};
