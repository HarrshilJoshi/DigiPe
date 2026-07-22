import axios from "axios";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export const SignInPage = () => {
  const emailRef = useRef();
  const passwordRef = useRef();
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [response, setResponse] = useState("");
  const [fadeOut, setFadeOut] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      email: emailRef.current.value,
      password: passwordRef.current.value,
    };
    try {
      const response = await axios.post(`${apiUrl}/auth/signin`, {
        email: payload.email,
        password: payload.password,
      });
      localStorage.setItem("token", response.data.token);
      setResponse(response.data.message);
      setFadeOut(true);
      setTimeout(() => {
        navigate("/user/dashboard");
      }, 400);
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] px-4 font-sans text-slate-800">
      <div
        className={`w-full max-w-md p-8 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center ${
          fadeOut ? "animate-fade-out" : "animate-fade"
        }`}
      >
        <div className="mb-4">
          <span className="text-2xl font-bold tracking-tight text-slate-800">DigiPe</span>
        </div>
        <h2 className="mb-1 text-xl font-bold text-slate-800 text-center">
          Welcome back
        </h2>
        <p className="mb-6 text-xs text-slate-400 text-center">
          Sign in to manage your bank accounts & transfers
        </p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">
              Email Address
            </label>
            <input
              type="email"
              ref={emailRef}
              placeholder="name@example.com"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">
              Password
            </label>
            <input
              type="password"
              ref={passwordRef}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
            />
          </div>
          {error && (
            <div className="text-red-650 text-center text-xs font-semibold bg-red-50 border border-red-100 py-2 px-3 rounded-lg">
              {response || error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg px-4 py-2.5 text-xs shadow-sm transition button-press mt-2 border border-transparent"
          >
            Sign in to Account
          </button>
        </form>
        <div className="w-full mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400">New to DigiPe?</span>
          <button
            className="text-blue-600 hover:text-blue-500 font-semibold transition"
            onClick={() => navigate("/signup")}
          >
            Create an account →
          </button>
        </div>
      </div>
    </div>
  );
};
