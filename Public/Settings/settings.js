let userProfile = null;

// Local dropdown setup function (fallback if script.js not loaded)
function setupUserDropdownLocal() {
  const profile = document.getElementById("userProfile");
  const dropdown = document.getElementById("userDropdown");
  const dropdownHeader = document.getElementById("dropdownHeader");
  const dropdownMenu = document.getElementById("dropdownMenu");
  
  if (!profile || !dropdown || !dropdownHeader || !dropdownMenu) return;

  function isUserLoggedIn() {
    if (typeof AuthUtils !== 'undefined') {
      return AuthUtils.isAuthenticated();
    }
    return !!(localStorage.getItem("user") || sessionStorage.getItem("user"));
  }

  function updateDropdownContent() {
    if (isUserLoggedIn()) {
      const user = typeof AuthUtils !== 'undefined' 
        ? AuthUtils.getUser() 
        : JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");

      profile.innerHTML = `
        <div class="user-avatar">${user.name.charAt(0)}${user.surname.charAt(0)}</div>
        <span class="user-name">${user.name} ${user.surname}</span>
        <i class="fas fa-chevron-down"></i>
      `;

      dropdownHeader.innerHTML = `
        <h3>${user.name} ${user.surname}</h3>
        <p>${user.membershipType || "Standard Member"}</p>
      `;

      dropdownMenu.innerHTML = `
        <li><a href="/profile"><i class="fas fa-user"></i> My Profile</a></li>
        <li><a href="/my-favorites"><i class="fas fa-bookmark"></i> My Favorites</a></li>
        <li><a href="/my-reviews"><i class="fas fa-star"></i> My Reviews</a></li>
        <li><a href="/settings"><i class="fas fa-cog"></i> Settings</a></li>
        <li><a href="#" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</a></li>
      `;
    } else {
      profile.innerHTML = `
        <div class="user-avatar"><i class="fas fa-user"></i></div>
        <span class="user-name">Guest</span>
        <i class="fas fa-chevron-down"></i>
      `;

      dropdownHeader.innerHTML = `
        <h3>Welcome, Guest</h3>
        <p>Please login to continue</p>
      `;

      dropdownMenu.innerHTML = `
        <li><a href="/login"><i class="fas fa-sign-in-alt"></i> Login</a></li>
        <li><a href="/register"><i class="fas fa-user-plus"></i> Register</a></li>
      `;
    }
  }

  updateDropdownContent();

  // Function to position dropdown relative to profile button
  function positionDropdown() {
    if (!profile || !dropdown) return;
    
    const profileRect = profile.getBoundingClientRect();
    const navbar = document.querySelector('.navbar');
    const navbarRect = navbar ? navbar.getBoundingClientRect() : null;
    
    // Position dropdown below the navbar, aligned with the profile button
    if (navbarRect) {
      dropdown.style.top = `${navbarRect.bottom}px`;
      dropdown.style.right = `${window.innerWidth - profileRect.right}px`;
    } else {
      // Fallback: position below profile button
      dropdown.style.top = `${profileRect.bottom + 5}px`;
      dropdown.style.right = `${window.innerWidth - profileRect.right}px`;
    }
  }

  window.logout = async function () {
    if (typeof AuthUtils !== 'undefined') {
      await AuthUtils.logout('/login');
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
      localStorage.removeItem("rememberMe");
      updateDropdownContent();
      window.location.href = "/login";
    }
  };

  profile.addEventListener("click", () => {
    positionDropdown(); // Reposition before showing
    dropdown.classList.toggle("show");
  });

  // Reposition dropdown on scroll and resize
  window.addEventListener("scroll", () => {
    if (dropdown.classList.contains("show")) {
      positionDropdown();
    }
  });

  window.addEventListener("resize", () => {
    if (dropdown.classList.contains("show")) {
      positionDropdown();
    }
  });

  window.addEventListener("click", (e) => {
    if (
      !e.target.closest("#userProfile") &&
      !e.target.closest("#userDropdown")
    ) {
      dropdown.classList.remove("show");
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  // Load AuthUtils if not already loaded
  if (typeof AuthUtils === 'undefined') {
    const script = document.createElement('script');
    script.src = '/auth-utils.js';
    await new Promise((resolve) => {
      script.onload = resolve;
      document.head.appendChild(script);
    });
  }

  // Listen for logout events
  window.addEventListener('auth:logout', () => {
    window.location.href = '/login';
  });

  // Setup user dropdown - use from script.js if available, otherwise use local
  if (typeof setupUserDropdown === 'function') {
    setupUserDropdown();
  } else {
    setupUserDropdownLocal();
  }

  const token = typeof AuthUtils !== 'undefined' 
    ? AuthUtils.getToken() 
    : (localStorage.getItem("token") || sessionStorage.getItem("token"));
  
  if (!token) {
    window.location.href = "/login";
    return;
  }

  try {
    const profileRes = await fetch("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!profileRes.ok) {
      if (profileRes.status === 401) {
        if (typeof AuthUtils !== 'undefined') {
          AuthUtils.clearAuth();
        } else {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
        }
        window.location.href = "/login";
        return;
      }
      throw new Error("Failed to load profile");
    }

    userProfile = await profileRes.json();
    loadUserData();
    setupForms();
    document.getElementById("loading").style.display = "none";
  } catch (error) {
    console.error("Error loading settings:", error);
    document.getElementById("loading").textContent = "Error loading settings...";
  }
});

function loadUserData() {
  if (!userProfile) return;

  document.getElementById("name").value = userProfile.name || "";
  document.getElementById("surname").value = userProfile.surname || "";
  document.getElementById("email").value = userProfile.email || "";
}

function setupForms() {
  // Profile form
  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updateProfile();
  });

  // Password form
  document.getElementById("passwordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updatePassword();
  });
}

async function updateProfile() {
  const token = typeof AuthUtils !== 'undefined' 
    ? AuthUtils.getToken() 
    : (localStorage.getItem("token") || sessionStorage.getItem("token"));
  if (!token) {
    showNotification("Please login to update profile", "error");
    return;
  }

  const name = document.getElementById("name").value.trim();
  const surname = document.getElementById("surname").value.trim();
  const email = document.getElementById("email").value.trim();

  if (!name || !surname || !email) {
    showNotification("All fields are required", "error");
    return;
  }

  try {
    const response = await fetch("/api/auth/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, surname, email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update profile");
    }

    // Update user data
    const user = typeof AuthUtils !== 'undefined' 
      ? AuthUtils.getUser() 
      : JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "{}");
    user.name = data.user.name;
    user.surname = data.user.surname;
    user.email = data.user.email;
    
    if (typeof AuthUtils !== 'undefined') {
      const storage = AuthUtils.getStorage();
      storage.setItem("user", JSON.stringify(user));
    } else {
      const storage = localStorage.getItem("rememberMe") === "true" ? localStorage : sessionStorage;
      storage.setItem("user", JSON.stringify(user));
    }

    showNotification("Profile updated successfully!", "success");
  } catch (error) {
    console.error("Error updating profile:", error);
    showNotification(error.message || "Failed to update profile", "error");
  }
}

async function updatePassword() {
  const token = typeof AuthUtils !== 'undefined' 
    ? AuthUtils.getToken() 
    : (localStorage.getItem("token") || sessionStorage.getItem("token"));
  if (!token) {
    showNotification("Please login to update password", "error");
    return;
  }

  const currentPassword = document.getElementById("currentPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const confirmPassword = document.getElementById("confirmPassword").value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    showNotification("All password fields are required", "error");
    return;
  }

  if (newPassword.length < 6) {
    showNotification("Password must be at least 6 characters long", "error");
    return;
  }

  if (newPassword !== confirmPassword) {
    showNotification("New passwords do not match", "error");
    return;
  }

  // Verify current password first
  try {
    const verifyRes = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: userProfile.email,
        password: currentPassword,
      }),
    });

    if (!verifyRes.ok) {
      showNotification("Current password is incorrect", "error");
      return;
    }

    // Update password
    const response = await fetch("/api/auth/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password: newPassword }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update password");
    }

    // Clear password fields
    document.getElementById("currentPassword").value = "";
    document.getElementById("newPassword").value = "";
    document.getElementById("confirmPassword").value = "";

    showNotification("Password updated successfully!", "success");
  } catch (error) {
    console.error("Error updating password:", error);
    showNotification(error.message || "Failed to update password", "error");
  }
}


function showNotification(message, type = "success") {
  const notification = document.getElementById("notification");
  notification.textContent = message;
  notification.className = `notification ${type} show`;

  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000);
}

