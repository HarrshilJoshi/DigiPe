import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "./apiClient";

/**
 * Reusable logout helper to consistently handle session cleanup & backend token revocation
 */
export const performLogout = async (navigate, apiUrl) => {
  try {
    await apiClient.post("/auth/logout");
  } catch (err) {
    console.warn("Backend token revocation skipped or failed:", err.message);
  }

  localStorage.removeItem("token");
  if (navigate) {
    navigate("/signin");
  } else {
    window.location.href = "/signin";
  }
};

export const userService = () => {
  const [username, setUsername] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [id, setId] = useState("");
  const [hasMpin, setHasMpin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await apiClient.get("/user/me");
        setUsername(data.username);
        setFirstname(data.firstname);
        setLastname(data.lastname);
        setEmail(data.email);
        setPhone(data.phone);
        setAccounts(data.account || []);
        setId(data.id);
        setHasMpin(data.hasMpin);
      } catch (err) {
        console.error("Error fetching user details:", err.message);
        if (err.response && err.response.status === 401) {
          console.error("Unauthorized access, performing logout.");
          performLogout(navigate);
        }
      }
    };
    fetchUser();
  }, [navigate]);

  return {
    username,
    firstname,
    lastname,
    email,
    phone,
    accounts,
    id,
    hasMpin,
  };
};
