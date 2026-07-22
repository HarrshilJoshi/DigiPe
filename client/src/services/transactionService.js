import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
const apiUrl = import.meta.env.VITE_API_URL;

export const transactionService = () => {
  const [transactions, setTransactions] = useState([]);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found, redirecting to sign-in page.");
      navigate("/signin");
      return;
    }

    const fetchTransactions = async () => {
      try {
        const { data } = await axios.get(
          `${apiUrl}/transaction/transactions`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setTransactions(data);
      } catch (err) {}
    };
    fetchTransactions();
  }, [apiUrl, navigate]);
  return {
    transactions,
  };
};
