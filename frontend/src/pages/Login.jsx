import { useState } from "react";

function Login({ onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:5001/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Login successful!");
        onLogin();
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert("Unable to connect to server");
      console.error(error);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">₹</div>

        <h1>Welcome to BudgetMind</h1>

        <p>Login to manage your finances</p>

        <form onSubmit={handleLogin}>
          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">
            Login
          </button>
        </form>

        <p className="login-footer">
    Don't have an account?{" "}
     <span onClick={onRegister}>Register</span>
     </p>
      </div>
    </div>
  );
}

export default Login;