class SoftMinimalismRegisterForm {
  constructor() {
    this.form = document.getElementById("registerForm");
    this.nameInput = document.getElementById("name");
    this.surnameInput = document.getElementById("surname");
    this.emailInput = document.getElementById("email");
    this.passwordInput = document.getElementById("password");
    this.termsCheckbox = document.getElementById("terms");
    this.passwordToggle = document.getElementById("passwordToggle");
    this.submitButton = this.form.querySelector(".comfort-button");
    this.successMessage = document.getElementById("successMessage");

    this.init();
  }

  init() {
    this.bindEvents();
    this.setupInputs();
    this.setupPasswordToggle();
  }

  bindEvents() {
    this.form.addEventListener("submit", (e) => this.handleSubmit(e));

    // Input validations
    this.nameInput.addEventListener("blur", () => this.validateName());
    this.surnameInput.addEventListener("blur", () => this.validateSurname());
    this.emailInput.addEventListener("blur", () => this.validateEmail());
    this.passwordInput.addEventListener("blur", () => this.validatePassword());
    this.termsCheckbox.addEventListener("change", () => this.validateTerms());

    // Clear errors on input
    ["name", "surname", "email", "password"].forEach((field) => {
      document
        .getElementById(field)
        .addEventListener("input", () => this.clearError(field));
    });
  }

  setupInputs() {
    // Her input için label animasyonunu ayarla
    const inputs = ["name", "surname", "email", "password"];
    inputs.forEach((id) => {
      const input = document.getElementById(id);
      const label = input.nextElementSibling;

      // Input boş değilse label'ı yukarı taşı
      if (input.value) {
        label.classList.add("active");
      }

      // Input focus olduğunda label'ı yukarı taşı
      input.addEventListener("focus", () => {
        label.classList.add("active");
      });

      // Input blur olduğunda ve boşsa label'ı eski haline getir
      input.addEventListener("blur", () => {
        if (!input.value) {
          label.classList.remove("active");
        }
      });
    });
  }

  setupPasswordToggle() {
    const toggle = document.getElementById("passwordToggle");
    if (!toggle) return;

    toggle.innerHTML = `
            <svg class="toggle-icon eye-open" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="10" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/>
            </svg>
            <svg class="toggle-icon eye-closed" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2 2l16 16M9 4.8A8 8 0 012 10s3 6 8 6c1.2 0 2.2-.3 3.2-.7M13 14.7c1.2-.8 2.2-2 3-3.7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

    toggle.addEventListener("click", () => {
      const input = this.passwordInput;
      input.type = input.type === "password" ? "text" : "password";
      toggle.classList.toggle("toggle-active");
    });
  }

  validateName() {
    const name = this.nameInput.value.trim();
    if (!name) {
      this.showError("name", "Please enter your first name");
      return false;
    }
    if (name.length < 2) {
      this.showError("name", "Name must be at least 2 characters");
      return false;
    }
    return true;
  }

  validateSurname() {
    const surname = this.surnameInput.value.trim();
    if (!surname) {
      this.showError("surname", "Please enter your last name");
      return false;
    }
    if (surname.length < 2) {
      this.showError("surname", "Last name must be at least 2 characters");
      return false;
    }
    return true;
  }

  validateEmail() {
    const email = this.emailInput.value.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      this.showError("email", "Please enter your email address");
      return false;
    }
    if (!emailRegex.test(email)) {
      this.showError("email", "Please enter a valid email address");
      return false;
    }
    return true;
  }

  validatePassword() {
    const password = this.passwordInput.value;
    if (!password) {
      this.showError("password", "Please enter a password");
      return false;
    }
    if (password.length < 6) {
      this.showError("password", "Password must be at least 6 characters");
      return false;
    }
    return true;
  }

  validateTerms() {
    if (!this.termsCheckbox.checked) {
      this.showError("terms", "You must agree to the Terms & Conditions");
      return false;
    }
    return true;
  }

  async handleSubmit(e) {
    e.preventDefault();

    const formData = {
      name: this.nameInput.value.trim(),
      surname: this.surnameInput.value.trim(),
      email: this.emailInput.value.trim(),
      password: this.passwordInput.value,
    };

    if (!this.validateAll(formData)) return;

    this.setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      // Başarılı kayıt
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Başarılı mesajı göster
      this.showSuccess();

      // 2 saniye sonra ana sayfaya yönlendir
      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      console.error("Registration error:", error);
      this.showError("email", error.message);
    } finally {
      this.setLoading(false);
    }
  }

  validateAll(data) {
    let isValid = true;

    if (!data.name) {
      this.showError("name", "Please enter your first name");
      // Placeholder'ı tekrar göster
      document.getElementById("name").value = "";
      isValid = false;
    }

    if (!data.surname) {
      this.showError("surname", "Please enter your last name");
      document.getElementById("surname").value = "";
      isValid = false;
    }

    if (!data.email || !data.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      this.showError("email", "Please enter a valid email address");
      document.getElementById("email").value = "";
      isValid = false;
    }

    if (!data.password || data.password.length < 6) {
      this.showError("password", "Password must be at least 6 characters");
      document.getElementById("password").value = "";
      isValid = false;
    }

    return isValid;
  }

  showError(field, message) {
    const softField = document.getElementById(field).closest(".soft-field");
    const errorElement = document.getElementById(`${field}Error`);

    softField.classList.add("error");
    errorElement.textContent = message;
    errorElement.classList.add("show");

    // Input'u temizle ve placeholder'ı göster
    const input = document.getElementById(field);
    input.value = "";
    input.focus();
  }

  clearError(field) {
    const softField = document.getElementById(field).closest(".soft-field");
    const errorElement = document.getElementById(`${field}Error`);

    softField.classList.remove("error");
    errorElement.classList.remove("show");
    setTimeout(() => {
      errorElement.textContent = "";
    }, 300);
  }
}
