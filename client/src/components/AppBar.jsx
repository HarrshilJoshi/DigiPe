import axios from "axios";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export const AppBar = () => {
  const [firstname, setFirstname] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);


  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found, redirecting to sign-in page.");
      navigate("/signin");
    }
    const fetchUser = async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/user/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setFirstname(data.firstname);
        console.log("User Data:", data.username);
        console.log("Fetched Data:", data);
      } catch (err) {
        console.error("Error fetching user details:", err);
        if (err.response && err.response.status === 401) {
          console.error("Unauthorized access, redirecting to sign-in page.");
          navigate("/signin");
        } else {
          console.error(
            "An error occurred while fetching user details:",
            err.message
          );
        }
      }
    };
    fetchUser();
  }, [navigate, apiUrl]);



  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <>
      <nav className="bg-[#1E293B] border-b border-slate-800 h-16 flex items-center justify-between px-6 relative z-20 shadow-md">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/user/dashboard")}>
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
            D
          </div>
          <span className="text-xl font-bold tracking-tight text-white select-none">
            DigiPe
          </span>
          <span className="px-2 py-0.5 bg-slate-800 text-[10px] uppercase font-bold rounded text-blue-400 border border-slate-700">
            PRO
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:block text-sm text-slate-300 font-medium">
            Welcome,{" "}
            <span className="font-semibold text-white">
              {firstname &&
                firstname.charAt(0).toUpperCase() + firstname.slice(1)}
            </span>
          </span>
          <div className="relative" ref={dropdownRef}>
            <button
              className="flex items-center justify-center rounded-xl bg-blue-600 h-9 w-9 text-white font-bold text-sm shadow-sm border border-blue-500 hover:bg-blue-500 transition focus:outline-none cursor-pointer"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-label="User menu"
            >
              {firstname && firstname.charAt(0).toUpperCase()}
            </button>
            {dropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl py-2 px-2 animate-fade border border-slate-800 bg-[#1E293B] flex flex-col gap-1 z-30"
              >
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-sm text-slate-200 hover:bg-[#0F172A] transition"
                  onClick={() => {
                    setDropdownOpen(false);
                    navigate("/user/create-account");
                  }}
                >
                  <span className="inline-flex items-center justify-center bg-blue-900/50 text-blue-400 rounded-md p-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </span>
                  Add Bank Account
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 transition cursor-pointer"
                  onClick={() => {
                    setDropdownOpen(false);
                    localStorage.removeItem("token");
                    navigate("/signin");
                  }}
                >
                  <span className="inline-flex items-center justify-center bg-red-950/60 rounded-md p-1">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-red-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7"
                      />
                    </svg>
                  </span>
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};
