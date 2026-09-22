import { apiClient } from "./apiClient";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
        const { data } = await apiClient.get("/transaction/transactions");
        setTransactions(data);
      } catch (err) {}
    };
    fetchTransactions();
  }, [navigate]);

  return {
    transactions,
  };
};
