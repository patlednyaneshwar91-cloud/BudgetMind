import { useState } from "react";
function Register({ onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        "http://localhost:5001/api/auth/register",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name,
            email,
            password,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
  alert("Registration successful!");
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

        <h1>Create your BudgetMind account</h1>
        <p>Start managing your finances smarter</p>

        <form onSubmit={handleRegister}>
          <label>Name</label>
          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

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
            placeholder="Create a password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Create Account</button>
        </form>

        <p className="login-footer">
          Already have an account? <span>Login</span>
        </p>
      </div>
    </div>
  );
}

export default Register;