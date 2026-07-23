import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Reusable logout helper to consistently handle session cleanup & backend token revocation
 */
export const performLogout = async (navigate, apiUrl) => {
  const token = localStorage.getItem("token");
  const targetApiUrl = apiUrl || import.meta.env.VITE_API_URL;

  if (token && targetApiUrl) {
    try {
      await axios.post(
        `${targetApiUrl}/auth/logout`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch (err) {
      console.warn("Backend token revocation skipped or failed:", err.message);
    }
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
  const apiUrl = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found, redirecting to sign-in page.");
      navigate("/signin");
      return;
    }

    const fetchUser = async () => {
      try {
        const { data } = await axios.get(`${apiUrl}/user/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
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
          performLogout(navigate, apiUrl);
        }
      }
    };
    fetchUser();
  }, [apiUrl, navigate]);

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
