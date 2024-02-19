import { getUser } from "./utility.js";

const loginForm = document.querySelector('#login_form');
const signinForm = document.querySelector('#signin_form');

async function login(username, password) {
  try {
      //const response = await fetch('https://codex-s45z.onrender.com/auth', {
      const response = await fetch('https://openaiserverlwt.azurewebsites.net/auth', {
      //const response = await fetch('https://localhost:5000/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
  
      const data = await response.json();
      console.log(data);
  
      if (data.accessToken) {
        localStorage.setItem('jwtToken', data.accessToken);
        return true;
      } else {
        return false;
      }
  } catch (error) {
      console.error('Error:', error);
      return false;
  }
}
  
async function signin(username, password) {
    try {
      //const response = await fetch('https://codex-s45z.onrender.com/users', {
      const response = await fetch('https://openaiserverlwt.azurewebsites.net/users', {
      //const response = await fetch('https://localhost:5000/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
  
      const data = await response.json();
      console.log(data);
  
      if (data.accessToken) {
        localStorage.setItem('jwtToken', data.accessToken);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
}


  
function logout() {
    localStorage.removeItem('jwtToken');
    window.location.reload();
}

async function handleLogin(event) {
  event.preventDefault();
  //const username = document.getElementById("username").value;
  //const password = document.getElementById("password").value;

  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");

  const username = usernameInput.value;
  const password = passwordInput.value;

  // Clear the input fields
  usernameInput.value = '';
  passwordInput.value = '';

  const loggedIn = await login(username, password);

  if (loggedIn) {
    // Hide login container
    const loginContainer = document.getElementById("login_container");
    loginContainer.style.display = "none";

    // Hide signin container
    const signinContainer = document.getElementById("signin_container");
    signinContainer.style.display = "none";

    // Show chat container
    const appWrapper = document.getElementById("app_wrapper");
    appWrapper.style.display = "flex";
  } else {
    alert('Invalid username or password');
  }
}

async function handleSignin(event) {
  event.preventDefault();
  //const username = document.getElementById("signusername").value;
  //const password = document.getElementById("signpassword").value;

  const signusernameInput = document.getElementById("signusername");
  const signpasswordInput = document.getElementById("signpassword");

  const signusername = signusernameInput.value;
  const signpassword = signpasswordInput.value;

  // Clear the input fields
  signusernameInput.value = '';
  signpasswordInput.value = '';

  const SignedIn = await signin(signusername, signpassword);
  
  if (SignedIn) {
    // Hide login container
    const loginContainer = document.getElementById("login_container");
    loginContainer.style.display = "none";

    // Hide signin container
    const signinContainer = document.getElementById("signin_container");
    signinContainer.style.display = "none";

    // Show chat container
    const appWrapper = document.getElementById("app_wrapper");
    appWrapper.style.display = "flex";
  } else {
    alert('Invalid username or password');
  }
}

// Check user authentication on page load
document.addEventListener('DOMContentLoaded', () => {
  const user = getUser();
  if (!user) {
    const loginContainer = document.getElementById('login_container');
    loginContainer.style.display = 'block';
  } else {
    // Hide login container
    const loginContainer = document.getElementById("login_container");
    loginContainer.style.display = "none";

    // Hide signin container
    const signinContainer = document.getElementById("signin_container");
    signinContainer.style.display = "none";

    const appWrapper = document.getElementById('app_wrapper');
    appWrapper.style.display = 'flex';
  }
})

loginForm.addEventListener('submit', handleLogin);
signinForm.addEventListener('submit', handleSignin);

const logoutLink = document.getElementById('logout_link');
const profileLink = document.getElementById('profile_link');

// Add a click event listener to the logout link
logoutLink.addEventListener('click', function(event) {
  event.preventDefault(); // Prevent the default behavior of the link
  // Your logout code here
  logout();
});

// Add a click event listener to the profile link
profileLink.addEventListener('click', function(event) {
  event.preventDefault(); // Prevent the default behavior of the link
  // Your profile code here
  console.log("Profile clicked!");
});