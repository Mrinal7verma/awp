  // Modified script.js
  'use strict';

  const API_URL = 'http://localhost:3000/api';

  // DOM Elements
  const labelWelcome = document.querySelector('.welcome');
  const labelDate = document.querySelector('.date');
  const labelBalance = document.querySelector('.balance__value');
  const labelSumIn = document.querySelector('.summary__value--in');
  const labelSumOut = document.querySelector('.summary__value--out');
  const labelSumInterest = document.querySelector('.summary__value--interest');
  const labelTimer = document.querySelector('.timer');

  const containerApp = document.querySelector('.app');
  const containerMovements = document.querySelector('.movements');

  const btnLogin = document.querySelector('.login__btn');
  const btnTransfer = document.querySelector('.form__btn--transfer');
  const btnLoan = document.querySelector('.form__btn--loan');
  const btnClose = document.querySelector('.form__btn--close');
  const btnSort = document.querySelector('.btn--sort');

  const inputLoginUsername = document.querySelector('.login__input--user');
  const inputLoginPin = document.querySelector('.login__input--pin');
  const inputTransferTo = document.querySelector('.form__input--to');
  const inputTransferAmount = document.querySelector('.form__input--amount');
  const inputLoanAmount = document.querySelector('.form__input--loan-amount');
  const inputCloseUsername = document.querySelector('.form__input--user');
  const inputClosePin = document.querySelector('.form__input--pin');

  let currentAccount = null;
  let logoutTimer;

  // Store the account info in sessionStorage to persist across refreshes
  const storeAccountInfo = account => {
    sessionStorage.setItem('currentAccount', JSON.stringify(account));
  };

  const getStoredAccountInfo = () => {
    const stored = sessionStorage.getItem('currentAccount');
    return stored ? JSON.parse(stored) : null;
  };

  // Utilities
  const formatMovementDate = function (date) {
    const calcDaysPassed = (date1, date2) =>
      Math.round(Math.abs(date2 - date1) / (1000 * 60 * 60 * 24));

    const daysPassed = calcDaysPassed(new Date(), new Date(date));

    if (daysPassed === 0) return 'Today';
    if (daysPassed === 1) return 'Yesterday';
    if (daysPassed <= 7) return `${daysPassed} days ago`;

    return new Intl.DateTimeFormat('en-US').format(new Date(date));
  };

  const formatCurrency = function (value) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  const displayMovements = function (movements, sort = false) {
    containerMovements.innerHTML = '';

    const movs = sort
      ? [...movements].sort((a, b) => a.amount - b.amount)
      : movements;

    movs.forEach(function (mov) {
      const type = mov.amount > 0 ? 'deposit' : 'withdrawal';
      const displayDate = formatMovementDate(mov.created_at);

      const html = `
        <div class="movements__row">
          <div class="movements__type movements__type--${type}">
            ${type}
          </div>
          <div class="movements__date">${displayDate}</div>
          <div class="movements__value">${formatCurrency(mov.amount)}</div>
        </div>
      `;

      containerMovements.insertAdjacentHTML('afterbegin', html);
    });
  };

  const calcDisplayBalance = function (movements) {
    const balance = movements.reduce((acc, mov) => acc + Number(mov.amount), 0);
    labelBalance.textContent = formatCurrency(balance);
    return balance;
  };

  const calcDisplaySummary = function (account) {
    const movements = account.movements;
    const incomes = movements
      .filter(mov => Number(mov.amount) > 0)
      .reduce((acc, mov) => acc + Number(mov.amount), 0);
    labelSumIn.textContent = formatCurrency(incomes);

    const out = movements
      .filter(mov => Number(mov.amount) < 0)
      .reduce((acc, mov) => acc + Number(mov.amount), 0);
    labelSumOut.textContent = formatCurrency(Math.abs(out));

    const interest = movements
      .filter(mov => Number(mov.amount) > 0)
      .map(deposit => (Number(deposit.amount) * account.interestRate) / 100)
      .filter(int => int >= 1)
      .reduce((acc, int) => acc + int, 0);
    labelSumInterest.textContent = formatCurrency(interest);
  };

  const updateUI = async function (account) {
    try {
      // Fetch latest movements
      const res = await fetch(`${API_URL}/movements/${account.id}`);
      if (!res.ok) throw new Error('Failed to fetch movements');

      const movements = await res.json();
      account.movements = movements;

      // Display movements
      displayMovements(account.movements);

      // Calculate and display balance
      const balance = calcDisplayBalance(account.movements);
      account.balance = balance;

      // Calculate and display summary
      calcDisplaySummary(account);

      // Update stored account info
      storeAccountInfo(account);
    } catch (err) {
      console.error('Error updating UI:', err);
      alert('Failed to update account information');
    }
  };

  const startLogoutTimer = function () {
    const tick = function () {
      const min = String(Math.trunc(time / 60)).padStart(2, 0);
      const sec = String(time % 60).padStart(2, 0);

      labelTimer.textContent = `${min}:${sec}`;

      if (time === 0) {
        clearInterval(timer);
        labelWelcome.textContent = 'Log in to get started';
        containerApp.style.opacity = 0;
        currentAccount = null;
        sessionStorage.removeItem('currentAccount');
      }

      time--;
    };

    let time = 300;
    tick();
    const timer = setInterval(tick, 1000);

    return timer;
  };

  // Check for stored account on page load
  window.addEventListener('load', async () => {
    const storedAccount = getStoredAccountInfo();
    if (storedAccount) {
      currentAccount = storedAccount;

      labelWelcome.textContent = `Welcome back, ${
        currentAccount.owner.split(' ')[0]
      }`;
      containerApp.style.opacity = 100;

      // Update UI with fresh data
      await updateUI(currentAccount);

      // Reset timer
      if (logoutTimer) clearInterval(logoutTimer);
      logoutTimer = startLogoutTimer();
    }
  });

  // Event handlers
  btnLogin.addEventListener('click', async function (e) {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: inputLoginUsername.value,
          pin: inputLoginPin.value,
        }),
      });

      if (!res.ok) throw new Error('Invalid credentials');

      const userData = await res.json();
      currentAccount = {
        ...userData,
        id: userData.id, // Make sure ID is included
        movements: userData.movements,
      };

      // Clear input fields
      inputLoginUsername.value = inputLoginPin.value = '';
      inputLoginPin.blur();

      // Display UI and message
      labelWelcome.textContent = `Welcome back, ${
        currentAccount.owner.split(' ')[0]
      }`;
      containerApp.style.opacity = 100;

      // Create current date and time
      const now = new Date();
      const options = {
        hour: 'numeric',
        minute: 'numeric',
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
      };
      labelDate.textContent = new Intl.DateTimeFormat('en-US', options).format(
        now
      );

      // Store account info
      storeAccountInfo(currentAccount);

      // Clear existing timer if any
      if (logoutTimer) clearInterval(logoutTimer);
      logoutTimer = startLogoutTimer();

      // Update UI
      await updateUI(currentAccount);
    } catch (err) {
      console.error('Login error:', err);
      alert('Failed to log in. Please check your credentials.');
    }
  });

  // Complete frontend script.js with working features
  // ... (previous code remains the same until the event handlers)

  // Transfer money handler
  btnTransfer.addEventListener('click', async function (e) {
    e.preventDefault();

    try {
      const amount = Number(inputTransferAmount.value);
      const receiverUsername = inputTransferTo.value;

      if (amount <= 0) {
        throw new Error('Please enter a positive amount');
      }

      if (amount > currentAccount.balance) {
        throw new Error('Insufficient funds');
      }

      if (receiverUsername === currentAccount.username) {
        throw new Error('Cannot transfer to yourself');
      }

      const res = await fetch(`${API_URL}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromUserId: currentAccount.id,
          toUsername: receiverUsername,
          amount: amount,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Transfer failed');
      }

      // Clear transfer inputs
      inputTransferAmount.value = inputTransferTo.value = '';
      inputTransferAmount.blur();

      // Update UI
      await updateUI(currentAccount);

      // Reset timer
      clearInterval(logoutTimer);
      logoutTimer = startLogoutTimer();
    } catch (err) {
      console.error('Transfer error:', err);
      alert(
        err.message || 'Transfer failed. Please check the recipient and amount.'
      );
    }
  });

  // Loan handler
  btnLoan.addEventListener('click', async function (e) {
    e.preventDefault();

    try {
      const amount = Math.floor(Number(inputLoanAmount.value));

      if (amount <= 0) {
        throw new Error('Please enter a positive amount');
      }

      // Check if there's any deposit >= 10% of loan amount
      const hasQualifyingDeposit = currentAccount.movements.some(
        mov => Number(mov.amount) >= amount * 0.1 && mov.type === 'deposit'
      );

      if (!hasQualifyingDeposit) {
        throw new Error(
          'Loan request denied. You need at least one deposit >= 10% of the loan amount.'
        );
      }

      const res = await fetch(`${API_URL}/loan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentAccount.id,
          amount: amount,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Loan request failed');
      }

      // Clear loan input
      inputLoanAmount.value = '';
      inputLoanAmount.blur();

      // Update UI
      await updateUI(currentAccount);

      // Reset timer
      clearInterval(logoutTimer);
      logoutTimer = startLogoutTimer();
    } catch (err) {
      console.error('Loan error:', err);
      alert(err.message || 'Loan request failed. Please try a different amount.');
    }
  });

  // Close account handler
  btnClose.addEventListener('click', async function (e) {
    e.preventDefault();

    try {
      const confirmUsername = inputCloseUsername.value;
      const confirmPin = inputClosePin.value;

      if (confirmUsername !== currentAccount.username) {
        throw new Error('Invalid username');
      }

      if (confirmPin !== currentAccount.pin) {
        throw new Error('Invalid PIN');
      }

      const res = await fetch(`${API_URL}/users/${currentAccount.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: confirmUsername,
          pin: confirmPin,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to close account');
      }

      // Clear inputs
      inputCloseUsername.value = inputClosePin.value = '';

      // Hide UI
      containerApp.style.opacity = 0;
      labelWelcome.textContent = 'Log in to get started';

      // Clear session storage
      sessionStorage.removeItem('currentAccount');
      currentAccount = null;

      // Clear timer
      if (logoutTimer) clearInterval(logoutTimer);
    } catch (err) {
      console.error('Close account error:', err);
      alert(
        err.message || 'Failed to close account. Please check your credentials.'
      );
    }
  });
