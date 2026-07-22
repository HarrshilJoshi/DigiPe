import axios from "axios";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

export const SignUpPage = () => {
  const usernameRef = useRef();
  const firstnameRef = useRef();
  const lastnameRef = useRef();
  const emailRef = useRef();
  const phoneRef = useRef();
  const passwordRef = useRef();

  const [error, setError] = useState("");
  const [response, setResponse] = useState("");
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();

  const apiUrl = import.meta.env.VITE_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = {
      username: usernameRef.current.value,
      firstname: firstnameRef.current.value,
      lastname: lastnameRef.current.value,
      phone: phoneRef.current.value,
      email: emailRef.current.value,
      password: passwordRef.current.value,
    };
    try {
      const response = await axios.post(`${apiUrl}/auth/signup`, {
        username: payload.username,
        firstname: payload.firstname,
        lastname: payload.lastname,
        phone: payload.phone,
        email: payload.email,
        password: payload.password,
      });
      setResponse(response.data.message);
      setFadeOut(true);
      setTimeout(() => {
        navigate("/signin");
      }, 400);
    } catch (err) {
      const message = err.response?.data?.message || err.message;
      setError(message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] px-4 py-8 font-sans text-slate-800">
      <div
        className={`w-full max-w-lg p-8 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center ${
          fadeOut ? "animate-fade-out" : "animate-fade"
        }`}
      >
        <div className="mb-4">
          <span className="text-2xl font-bold tracking-tight text-slate-800">DigiPe</span>
        </div>
        <h2 className="mb-1 text-xl font-bold text-slate-800 text-center">
          Create your account
        </h2>
        <p className="mb-6 text-xs text-slate-400 text-center">
          Enter your information to set up secure banking access
        </p>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">
              Username
            </label>
            <input
              type="text"
              ref={usernameRef}
              placeholder="johndoe123"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">
                First Name
              </label>
              <input
                type="text"
                ref={firstnameRef}
                placeholder="John"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">
                Last Name
              </label>
              <input
                type="text"
                ref={lastnameRef}
                placeholder="Doe"
                className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 text-slate-500">
              Phone Number
            </label>
            <input
              type="number"
              ref={phoneRef}
              placeholder="9876543210"
              className="w-full px-4 py-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 focus:outline-none focus:border-blue-500 text-xs shadow-inner transition"
              required
            />
          </div>
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
            <div className="text-red-655 text-center text-xs font-semibold bg-red-50 border border-red-100 py-2 px-3 rounded-lg">
              {response || error}
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-lg px-4 py-2.5 text-xs shadow-sm transition button-press mt-2 border border-transparent"
          >
            Create Free Account
          </button>
        </form>
        <div className="w-full mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-400">Already have an account?</span>
          <button
            className="text-blue-600 hover:text-blue-500 font-semibold transition"
            onClick={() => navigate("/signin")}
          >
            Sign in here →
          </button>
        </div>
      </div>
    </div>
  );
};
