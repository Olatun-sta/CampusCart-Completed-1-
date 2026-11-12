async function postAuth(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function redirectIfLoggedIn() {
  try {
    const response = await fetch("/api/me", { credentials: "same-origin" });
    if (response.ok) window.location.replace("/");
  } catch (_) {}
}

const registerForm = document.getElementById("registerForm");
if (registerForm) {
  const message = document.getElementById("authMessage");
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = registerForm.querySelector("button[type=submit]");
    button.disabled = true;
    message.textContent = "Creating your account...";
    message.className = "auth-message";
    try {
      await postAuth("/api/register", {
        full_name: document.getElementById("registerName").value.trim(),
        email: document.getElementById("registerEmail").value.trim(),
        password: document.getElementById("registerPassword").value
      });
      registerForm.reset();
      message.textContent = "Account created successfully. Taking you to login...";
      setTimeout(() => window.location.assign("/login?registered=1"), 900);
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("error");
      button.disabled = false;
    }
  });
}

const loginForm = document.getElementById("loginForm");
if (loginForm) {
  const message = document.getElementById("authMessage");
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = loginForm.querySelector("button[type=submit]");
    button.disabled = true;
    message.textContent = "Signing you in...";
    message.className = "auth-message";
    try {
      await postAuth("/api/login", {
        email: document.getElementById("loginEmail").value.trim(),
        password: document.getElementById("loginPassword").value
      });
      message.textContent = "Login successful. Opening CampusCart...";
      window.location.assign("/");
    } catch (error) {
      message.textContent = error.message;
      message.classList.add("error");
      button.disabled = false;
    }
  });
  if (new URLSearchParams(window.location.search).has("registered")) {
    message.textContent = "Your account is ready. Please log in.";
  }
}

redirectIfLoggedIn();
