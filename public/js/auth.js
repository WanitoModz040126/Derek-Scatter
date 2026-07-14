(function () {
  const tabs = document.querySelectorAll('.tab');
  const form = document.getElementById('authForm');
  const submitBtn = document.getElementById('submitBtn');
  const errorText = document.getElementById('errorText');
  const finePrint = document.getElementById('finePrint');
  const passwordInput = document.getElementById('password');

  let mode = 'login';

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      mode = tab.dataset.mode;
      errorText.textContent = '';
      if (mode === 'login') {
        submitBtn.textContent = 'Log In';
        passwordInput.autocomplete = 'current-password';
        finePrint.style.display = 'block';
      } else {
        submitBtn.textContent = 'Create Account';
        passwordInput.autocomplete = 'new-password';
        finePrint.style.display = 'block';
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorText.textContent = '';
    submitBtn.disabled = true;

    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    try {
      const res = await fetch(`/api/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        errorText.textContent = data.error || 'Something went wrong.';
        submitBtn.disabled = false;
        return;
      }
      window.location.href = '/index.html';
    } catch (err) {
      errorText.textContent = 'Could not reach the server. Try again.';
      submitBtn.disabled = false;
    }
  });
})();
