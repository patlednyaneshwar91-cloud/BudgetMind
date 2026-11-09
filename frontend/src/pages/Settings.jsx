
import { useEffect, useState } from "react";
import "./Settings.css";

const API = "http://localhost:5001/api/auth";

const DEFAULT_SETTINGS = {
  name: "Dnyaneshwar",
  email: "",
  theme: "light",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  weekStarts: "Monday",
  budgetAlert: "80",
  budgetNotifications: true,
  goalNotifications: true,
  monthlySummary: true,
};

function getSavedSettings() {
  try {
    const saved = localStorage.getItem("budgetmind-settings");

    return saved
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function Settings() {
  const [settings, setSettings] = useState(getSavedSettings);

  // Real account information
  const [profile, setProfile] = useState({
    id: "",
    name: "",
    email: "",
  });

  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [passwordSaving, setPasswordSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load real account information
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(`${API}/me`, {
          method: "GET",
          credentials: "include",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Failed to load profile");
        }

        const user = data.user;

        setProfile({
          id: user.id || user._id || "",
          name: user.name || "",
          email: user.email || "",
        });

        setSettings((previous) => ({
          ...previous,
          name: user.name || previous.name,
          email: user.email || previous.email,
        }));
      } catch (err) {
        setError(
          err.message || "Unable to load your account information."
        );
      } finally {
        setProfileLoading(false);
      }
    };

    loadProfile();
  }, []);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
    localStorage.setItem("budgetmind-theme", settings.theme);
  }, [settings.theme]);

  const updateSetting = (key, value) => {
    setSettings((previous) => ({
      ...previous,
      [key]: value,
    }));

    setMessage("");
    setError("");
  };

  // Update actual MongoDB profile
  const handleProfileSave = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!profile.name.trim() || !profile.email.trim()) {
      setError("Name and email are required.");
      return;
    }

    setProfileSaving(true);

    try {
      const response = await fetch(`${API}/profile`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profile.name.trim(),
          email: profile.email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Profile update failed");
      }

      const updatedUser = data.user;

      const updatedProfile = {
        id: updatedUser.id || updatedUser._id || profile.id,
        name: updatedUser.name,
        email: updatedUser.email,
      };

      setProfile(updatedProfile);

      const updatedSettings = {
        ...settings,
        name: updatedUser.name,
        email: updatedUser.email,
      };

      setSettings(updatedSettings);

      localStorage.setItem(
        "budgetmind-settings",
        JSON.stringify(updatedSettings)
      );

      window.dispatchEvent(
        new Event("budgetmind-settings-updated")
      );

      setMessage("Your account profile has been updated successfully!");
    } catch (err) {
      setError(err.message || "Unable to update your profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  // Change account password
  const handlePasswordChange = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (
      !passwordData.currentPassword ||
      !passwordData.newPassword ||
      !passwordData.confirmPassword
    ) {
      setError("Please complete all password fields.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("New password must contain at least 6 characters.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch(`${API}/change-password`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Password change failed");
      }

      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setMessage("Your password has been changed successfully!");
    } catch (err) {
      setError(err.message || "Unable to change your password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  // Save application preferences
  const handleSave = (event) => {
    event.preventDefault();

    const updatedSettings = {
      ...settings,
      name: profile.name || settings.name,
      email: profile.email || settings.email,
    };

    localStorage.setItem(
      "budgetmind-settings",
      JSON.stringify(updatedSettings)
    );

    localStorage.setItem("budgetmind-theme", settings.theme);

    document.documentElement.setAttribute(
      "data-theme",
      settings.theme
    );

    window.dispatchEvent(
      new Event("budgetmind-settings-updated")
    );

    setMessage("Your preferences have been saved successfully!");
    setError("");
  };

  // Restore preferences without changing account information
  const handleReset = () => {
    const confirmed = window.confirm(
      "Are you sure you want to restore all default settings?"
    );

    if (!confirmed) return;

    const defaults = {
      ...DEFAULT_SETTINGS,
      name: profile.name || DEFAULT_SETTINGS.name,
      email: profile.email || "",
    };

    setSettings(defaults);

    localStorage.setItem(
      "budgetmind-settings",
      JSON.stringify(defaults)
    );

    localStorage.setItem("budgetmind-theme", "light");

    document.documentElement.setAttribute("data-theme", "light");

    window.dispatchEvent(
      new Event("budgetmind-settings-updated")
    );

    setMessage("Default preferences restored successfully!");
    setError("");
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <span className="settings-eyebrow">
            PERSONALIZE YOUR EXPERIENCE
          </span>

          <h1>Settings</h1>

          <p>
            Manage your account, preferences and notifications.
          </p>
        </div>

        <div className="settings-header-icon">⚙️</div>
      </div>

      {message && (
        <div className="settings-success">
          <span>✓</span> {message}
        </div>
      )}

      {error && (
        <div className="settings-error" role="alert">
          <span>⚠</span> {error}
        </div>
      )}

      {/* REAL ACCOUNT PROFILE */}
      <section className="settings-card">
        <div className="settings-section-heading">
          <div className="settings-icon">👤</div>

          <div>
            <h2>Account Profile</h2>
            <p>
              Update your registered BudgetMind account information.
            </p>
          </div>
        </div>

        {profileLoading ? (
          <p>Loading account information...</p>
        ) : (
          <>
            <form onSubmit={handleProfileSave}>
              <div className="settings-form-grid">
                <div className="settings-field">
                  <label htmlFor="profile-name">Full Name</label>

                  <input
                    id="profile-name"
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((previous) => ({
                        ...previous,
                        name: e.target.value,
                      }))
                    }
                    placeholder="Enter your name"
                    required
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="profile-email">
                    Email Address
                  </label>

                  <input
                    id="profile-email"
                    type="email"
                    value={profile.email}
                    onChange={(e) =>
                      setProfile((previous) => ({
                        ...previous,
                        email: e.target.value,
                      }))
                    }
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="settings-actions">
                <button
                  type="submit"
                  className="settings-save-btn"
                  disabled={profileSaving || profileLoading}
                >
                  {profileSaving ? "Updating..." : "Update Profile"}
                </button>
              </div>
            </form>

            <div className="settings-account-info">
              <h3>Account Information</h3>

              <div className="settings-account-row">
                <span>Account ID</span>
                <strong>{profile.id || "Unavailable"}</strong>
              </div>

              <div className="settings-account-row">
                <span>Account Status</span>
                <strong>Active</strong>
              </div>

              <div className="settings-account-row">
                <span>Authentication</span>
                <strong>Secure login</strong>
              </div>
            </div>
          </>
        )}
      </section>

      {/* CHANGE PASSWORD */}
      <section className="settings-card">
        <div className="settings-section-heading">
          <div className="settings-icon">🔐</div>

          <div>
            <h2>Change Password</h2>
            <p>
              Keep your account secure with a strong password.
            </p>
          </div>
        </div>

        <form onSubmit={handlePasswordChange}>
          <div className="settings-form-grid">
            <div className="settings-field">
              <label htmlFor="current-password">
                Current Password
              </label>

              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData((previous) => ({
                    ...previous,
                    currentPassword: e.target.value,
                  }))
                }
                placeholder="Enter current password"
                required
              />
            </div>

            <div className="settings-field">
              <label htmlFor="new-password">
                New Password
              </label>

              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData((previous) => ({
                    ...previous,
                    newPassword: e.target.value,
                  }))
                }
                placeholder="Enter new password"
                required
              />
            </div>

            <div className="settings-field">
              <label htmlFor="confirm-password">
                Confirm New Password
              </label>

              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData((previous) => ({
                    ...previous,
                    confirmPassword: e.target.value,
                  }))
                }
                placeholder="Confirm new password"
                required
              />
            </div>
          </div>

          <p className="settings-note">
            Your current password is verified before the new password
            is saved.
          </p>

          <div className="settings-actions">
            <button
              type="submit"
              className="settings-save-btn"
              disabled={passwordSaving}
            >
              {passwordSaving ? "Changing..." : "Change Password"}
            </button>
          </div>
        </form>
      </section>

      {/* APPLICATION PREFERENCES */}
      <form onSubmit={handleSave}>
        {/* APPEARANCE */}
        <section className="settings-card">
          <div className="settings-section-heading">
            <div className="settings-icon">🎨</div>

            <div>
              <h2>Appearance</h2>
              <p>Choose how BudgetMind looks on your device.</p>
            </div>
          </div>

          <div className="settings-choice-grid">
            <button
              type="button"
              className={`theme-option ${
                settings.theme === "light" ? "selected" : ""
              }`}
              onClick={() => updateSetting("theme", "light")}
            >
              <span className="theme-preview light-preview">☀️</span>

              <span>
                <strong>Light Mode</strong>
                <small>Clean and bright appearance</small>
              </span>

              <span className="theme-check">
                {settings.theme === "light" ? "✓" : ""}
              </span>
            </button>

            <button
              type="button"
              className={`theme-option ${
                settings.theme === "dark" ? "selected" : ""
              }`}
              onClick={() => updateSetting("theme", "dark")}
            >
              <span className="theme-preview dark-preview">🌙</span>

              <span>
                <strong>Dark Mode</strong>
                <small>Comfortable low-light appearance</small>
              </span>

              <span className="theme-check">
                {settings.theme === "dark" ? "✓" : ""}
              </span>
            </button>
          </div>
        </section>

        {/* REGIONAL PREFERENCES */}
        <section className="settings-card">
          <div className="settings-section-heading">
            <div className="settings-icon">🌍</div>

            <div>
              <h2>Regional Preferences</h2>
              <p>Choose your preferred display formats.</p>
            </div>
          </div>

          <div className="settings-form-grid">
            <div className="settings-field">
              <label htmlFor="settings-currency">Currency</label>

              <select
                id="settings-currency"
                value={settings.currency}
                onChange={(e) =>
                  updateSetting("currency", e.target.value)
                }
              >
                <option value="INR">Indian Rupee (₹ INR)</option>
                <option value="USD">US Dollar ($ USD)</option>
                <option value="EUR">Euro (€ EUR)</option>
                <option value="GBP">British Pound (£ GBP)</option>
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="settings-date">Date Format</label>

              <select
                id="settings-date"
                value={settings.dateFormat}
                onChange={(e) =>
                  updateSetting("dateFormat", e.target.value)
                }
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>

            <div className="settings-field">
              <label htmlFor="settings-week">Week Starts On</label>

              <select
                id="settings-week"
                value={settings.weekStarts}
                onChange={(e) =>
                  updateSetting("weekStarts", e.target.value)
                }
              >
                <option value="Monday">Monday</option>
                <option value="Sunday">Sunday</option>
                <option value="Saturday">Saturday</option>
              </select>
            </div>
          </div>
        </section>

        {/* NOTIFICATIONS */}
        <section className="settings-card">
          <div className="settings-section-heading">
            <div className="settings-icon">🔔</div>

            <div>
              <h2>Notifications</h2>
              <p>Choose which reminders you want enabled.</p>
            </div>
          </div>

          <div className="settings-toggle-list">
            <div className="settings-toggle-row">
              <div>
                <strong>Budget Alerts</strong>
                <p>
                  Receive reminders when spending approaches your budget.
                </p>
              </div>

              <input
                type="checkbox"
                checked={settings.budgetNotifications}
                onChange={(e) =>
                  updateSetting(
                    "budgetNotifications",
                    e.target.checked
                  )
                }
                aria-label="Enable budget alerts"
              />
            </div>

            <div className="settings-toggle-row">
              <div>
                <strong>Savings Goal Reminders</strong>
                <p>Keep track of your savings goals.</p>
              </div>

              <input
                type="checkbox"
                checked={settings.goalNotifications}
                onChange={(e) =>
                  updateSetting(
                    "goalNotifications",
                    e.target.checked
                  )
                }
                aria-label="Enable savings goal reminders"
              />
            </div>

            <div className="settings-toggle-row">
              <div>
                <strong>Monthly Summary</strong>
                <p>Enable your monthly financial summary preference.</p>
              </div>

              <input
                type="checkbox"
                checked={settings.monthlySummary}
                onChange={(e) =>
                  updateSetting(
                    "monthlySummary",
                    e.target.checked
                  )
                }
                aria-label="Enable monthly summary preference"
              />
            </div>
          </div>
        </section>

        {/* BUDGET ALERT THRESHOLD */}
        <section className="settings-card">
          <div className="settings-section-heading">
            <div className="settings-icon">💰</div>

            <div>
              <h2>Budget Alert Threshold</h2>
              <p>Choose when your budget warning should activate.</p>
            </div>
          </div>

          <div className="settings-field settings-threshold-field">
            <label htmlFor="settings-threshold">
              Alert me when budget usage reaches
            </label>

            <select
              id="settings-threshold"
              value={settings.budgetAlert}
              onChange={(e) =>
                updateSetting("budgetAlert", e.target.value)
              }
            >
              <option value="70">70% of budget</option>
              <option value="80">80% of budget</option>
              <option value="90">90% of budget</option>
              <option value="100">100% of budget</option>
            </select>

            <p className="settings-note">
              This preference is used by the dashboard alert settings.
            </p>
          </div>
        </section>

        {/* SAVE AND RESET */}
        <div className="settings-actions">
          <button
            type="button"
            className="settings-reset-btn"
            onClick={handleReset}
          >
            Restore Defaults
          </button>

          <button type="submit" className="settings-save-btn">
            Save Settings
          </button>
        </div>
      </form>

      <div className="settings-footer">
        <span>BudgetMind</span> · Personal Finance Management
      </div>
    </div>
  );
}

export default Settings;
