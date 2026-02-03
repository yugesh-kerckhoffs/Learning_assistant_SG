marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});
// Initialize Supabase client
window.speechSynthesis.onvoiceschanged = () => {};
window.supabaseClient = null;

// User data
let currentUser = null;
let currentUserName = null;

// Initialize Supabase client by fetching config from backend
async function initializeSupabase() {
  // Prevent multiple initializations
  if (window.supabaseClient) {
    console.log("⚠️ Supabase already initialized");
    return;
  }

  try {
    const response = await fetch("/api/supabase-config");
    const config = await response.json();

    if (config.url && config.anonKey) {
      window.supabaseClient = window.supabase.createClient(
        config.url,
        config.anonKey
      );
      console.log("✅ Supabase initialized successfully");

      // Set up auth state change listener for password reset
      window.supabaseClient.auth.onAuthStateChange((event, session) => {
        console.log("🔔 Auth event:", event);

        if (event === "PASSWORD_RECOVERY") {
          console.log("🔑 Password recovery event detected");
          showResetPasswordModal();
        }

        if (event === "SIGNED_IN" && session) {
          console.log("✅ User signed in:", session.user.email);
        }
      });
    } else {
      console.error("❌ Supabase config missing");
    }
  } catch (error) {
    console.error("❌ Failed to initialize Supabase:", error);
  }
}

// Call initialization immediately
(async function () {
  await initializeSupabase();

  // Check if this is a password reset callback
  const hash = window.location.hash;
  if (hash && hash.includes("access_token") && hash.includes("type=recovery")) {
    console.log("🔑 Password reset detected - processing token manually...");

    // Process the recovery token manually
    const success = await processRecoveryToken();

    if (success) {
      console.log("✅ Token processed, showing reset modal");
      showResetPasswordModal();
    } else {
      console.error("❌ Failed to process token");
      showNotification(
        "❌ Invalid or expired reset link. Please request a new one."
      );
      // Clear hash and show auth modal
      window.history.replaceState(null, "", window.location.pathname);
      checkExistingSession();
    }
    return;
  }

  // Normal session check for regular logins
  checkExistingSession();
})();

// Load schools for signup dropdown
async function loadSchoolsForSignup() {
  if (!window.supabaseClient) {
    console.log('⏳ Waiting for Supabase to initialize...');
    setTimeout(loadSchoolsForSignup, 500);
    return;
  }

  try {
    const { data: schools, error } = await window.supabaseClient
      .from('schools')
      .select('id, school_name')
      .order('school_name');

    if (error) throw error;

    const schoolSelect = document.getElementById('signUpSchool');
    if (!schoolSelect) return;

    // Clear existing options except the first one
    schoolSelect.innerHTML = '<option value="">🏫 Select Your School (Optional)</option>';

    schools.forEach(school => {
      const option = document.createElement('option');
      option.value = school.id;
      option.textContent = school.school_name;
      schoolSelect.appendChild(option);
    });

    console.log('✅ Loaded', schools.length, 'schools');
  } catch (error) {
    console.error('Error loading schools:', error);
  }
}

// Load teachers when school is selected
async function loadTeachersForSchool(schoolId) {
  const teacherSelect = document.getElementById('signUpTeacher');
  if (!teacherSelect) return;

  if (!schoolId) {
    teacherSelect.style.display = 'none';
    teacherSelect.innerHTML = '<option value="">👨‍🏫 Select Your Teacher</option>';
    return;
  }

  try {
    const { data: teachers, error } = await window.supabaseClient
      .from('teachers')
      .select('id, teacher_name, teacher_email')
      .eq('school_id', schoolId)
      .order('teacher_name');

    if (error) throw error;

    teacherSelect.innerHTML = '<option value="">👨‍🏫 Select Your Teacher</option>';

    teachers.forEach(teacher => {
      const option = document.createElement('option');
      option.value = teacher.id;
      option.textContent = `${teacher.teacher_name} (${teacher.teacher_email})`;
      teacherSelect.appendChild(option);
    });

    teacherSelect.style.display = 'block';
    console.log('✅ Loaded', teachers.length, 'teachers for school');
  } catch (error) {
    console.error('Error loading teachers:', error);
  }
}

async function processRecoveryToken() {
  const hash = window.location.hash;

  if (!hash.includes("access_token") || !hash.includes("type=recovery")) {
    return false;
  }

  console.log("🔄 Processing recovery token manually...");

  // Parse the hash - remove the # first
  const hashParams = hash.substring(1);
  const params = new URLSearchParams(hashParams);
  const token = params.get("access_token");
  const type = params.get("type");

  console.log("📋 Token type:", type);
  console.log("📋 Token length:", token ? token.length : 0);

  if (!token || type !== "recovery") {
    console.error("❌ Invalid recovery parameters");
    return false;
  }

  try {
    // Use verifyOtp for recovery tokens (this is the correct Supabase method)
    console.log("🔐 Verifying recovery token with Supabase...");

    const { data, error } = await window.supabaseClient.auth.verifyOtp({
      token_hash: token,
      type: "recovery",
    });

    if (error) {
      console.error("❌ Error verifying token:", error);
      return false;
    }

    if (!data.session) {
      console.error("❌ No session returned from verification");
      return false;
    }

    console.log(
      "✅ Recovery session established for:",
      data.session.user.email
    );
    return true;
  } catch (error) {
    console.error("❌ Error processing recovery token:", error);
    return false;
  }
}

// Floating Banner System
const bannerMessages = [
  {
    text: '🚀 App in development! Found a bug? Report it to <a href="mailto:info@sendelightgifts.com">info@sendelightgifts.com</a>',
    icon: "🔔",
  },
  {
    text: '💡 Have ideas for new features? Email us at <a href="mailto:info@sendelightgifts.com">info@sendelightgifts.com</a>',
    icon: "✨",
  },
  {
    text: '🎯 Help us improve! Share your feedback at <a href="mailto:info@sendelightgifts.com">info@sendelightgifts.com</a>',
    icon: "💬",
  },
];

let currentBannerIndex = 0;
let bannerTimeout = null;
let bannerCycleInterval = null;
let bannerDismissed = false;

function showBanner() {
  // Don't show if user dismissed it
  if (bannerDismissed) return;

  const banner = document.getElementById("floatingBanner");
  const bannerText = document.getElementById("bannerText");
  const bannerIcon = document.querySelector(".banner-icon");

  if (!banner || !bannerText || !bannerIcon) return;

  // Set current message
  const currentMessage = bannerMessages[currentBannerIndex];
  bannerText.innerHTML = currentMessage.text;
  bannerIcon.textContent = currentMessage.icon;

  // Show banner
  banner.classList.add("show");

  // Hide after 8 seconds
  bannerTimeout = setTimeout(() => {
    banner.classList.remove("show");
  }, 8000);

  // Move to next message
  currentBannerIndex = (currentBannerIndex + 1) % bannerMessages.length;
}

function closeBanner() {
  const banner = document.getElementById("floatingBanner");
  if (banner) {
    banner.classList.remove("show");
  }

  // Mark as dismissed for this session
  bannerDismissed = true;

  // Clear intervals
  if (bannerTimeout) clearTimeout(bannerTimeout);
  if (bannerCycleInterval) clearInterval(bannerCycleInterval);
}

function initializeBanner() {
  // Show first banner after 5 seconds
  setTimeout(() => {
    showBanner();
  }, 5000);

  // Show banner every 2 minutes (120000ms)
  bannerCycleInterval = setInterval(() => {
    showBanner();
  }, 120000);
}

// Initialize banner when page loads
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeBanner);
} else {
  initializeBanner();
}

// Show reset password modal directly
function showResetPasswordModal() {
  console.log("📝 Showing reset password modal");

  const resetModal = document.getElementById("resetPasswordModal");
  const authModal = document.getElementById("authModal");

  // Hide auth modal
  authModal.style.display = "none";

  // Show reset modal
  resetModal.style.display = "flex";
  resetModal.style.opacity = "0";

  setTimeout(() => {
    resetModal.style.opacity = "1";
  }, 100);

  // Focus on password input
  document.getElementById("resetNewPassword").focus();
}

// Toggle password visibility
function togglePasswordVisibility(inputId, buttonElement) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === "password";

  // Toggle input type
  input.type = isPassword ? "text" : "password";

  // Toggle button icon
  buttonElement.textContent = isPassword ? "👁️" : "👁️‍🗨️";

  // Add animation
  buttonElement.style.transform = "translateY(-50%) scale(1.2)";
  buttonElement.style.transition = "all 0.15s ease";
  setTimeout(() => {
    buttonElement.style.transform = "translateY(-50%) scale(1)";
  }, 150);
}

let currentCharacter = "tom",
  progress = 25,
  voiceEnabled = false,
  conversationHistory = [],
  isLoading = false,
  socialStoriesMode = false,
  calmBreathingMode = false,
  feelingsHelperMode = false,
  colorsShapesMode = false,
  galleryMode = false,
  memoryGameMode = false;
let currentUtterance = null,
  currentVolume = 0.5,
  lastMessageId = 0,
  currentThemeIndex = 0;
let currentAudio = null,
  currentPlayingSound = null;
// Authentication state
let userRole = null;
let sessionToken = null;

// Progress System Variables
let userLevel = 1;
let sessionStartTime = Date.now();
let nextLevelTime = 1;

// Memory Game Variables
let memoryGameLevel = 1;
let memoryCards = [];
let flippedCards = [];
let matchedPairs = 0;
let totalPairs = 0;
let canFlip = true;
let memoryGameMoves = 0;

// Colors & Shapes Game Variables
let colorsShapesGameType = "";
let colorsShapesLevel = 1;
let selectedLeftItem = null;
let selectedRightItem = null;
let matchedItems = [];
let currentGameItems = [];

// Show Forgot Password Form
function showForgotPassword() {
  document.getElementById("signInForm").style.display = "none";
  document.getElementById("forgotPasswordForm").style.display = "block";
  document.getElementById("forgotPasswordEmail").focus();
  document.getElementById("forgotPasswordError").textContent = "";
  document.getElementById("forgotPasswordSuccess").textContent = "";
}

// Hide Forgot Password Form
function hideForgotPassword() {
  document.getElementById("forgotPasswordForm").style.display = "none";
  document.getElementById("signInForm").style.display = "block";
  document.getElementById("forgotPasswordEmail").value = "";
  document.getElementById("forgotPasswordError").textContent = "";
  document.getElementById("forgotPasswordSuccess").textContent = "";
}

// Handle Forgot Password
async function handleForgotPassword() {
  const email = document.getElementById("forgotPasswordEmail").value.trim();
  const errorElement = document.getElementById("forgotPasswordError");
  const successElement = document.getElementById("forgotPasswordSuccess");

  errorElement.textContent = "";
  successElement.textContent = "";

  if (!email) {
    errorElement.textContent = "⚠️ Please enter your email";
    return;
  }

  try {
    // Send reset email - user will click link and return to this page
    const { error } = await window.supabaseClient.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: window.location.origin,
      }
    );

    if (error) {
      errorElement.textContent = `❌ ${error.message}`;
      return;
    }

    successElement.textContent =
      "✅ Password reset link sent! Check your email (including spam folder). Link valid for 1 hour.";

    setTimeout(() => {
      hideForgotPassword();
    }, 4000);
  } catch (error) {
    console.error("Forgot password error:", error);
    errorElement.textContent = "⚠️ Connection error. Please try again.";
  }
}

// Handle actual password reset when user comes back from email link
// Handle actual password reset when user comes back from email link
async function handlePasswordReset() {
  const newPassword = document.getElementById("resetNewPassword").value.trim();
  const confirmPassword = document
    .getElementById("resetConfirmPassword")
    .value.trim();
  const errorElement = document.getElementById("resetPasswordError");
  const successElement = document.getElementById("resetPasswordSuccess");

  errorElement.textContent = "";
  successElement.textContent = "";

  if (!newPassword || !confirmPassword) {
    errorElement.textContent = "⚠️ Please fill in both fields";
    return;
  }

  if (newPassword !== confirmPassword) {
    errorElement.textContent = "❌ Passwords do not match";
    return;
  }

  if (newPassword.length < 6) {
    errorElement.textContent = "⚠️ Password must be at least 6 characters";
    return;
  }

  try {
    console.log("🔄 Updating password...");

    // First, get the current session
    const {
      data: { session },
      error: sessionError,
    } = await window.supabaseClient.auth.getSession();

    if (sessionError || !session) {
      console.error("Session error:", sessionError);
      errorElement.textContent =
        "❌ Session expired. Please request a new reset link.";

      // Redirect back to forgot password
      setTimeout(() => {
        document.getElementById("resetPasswordModal").style.display = "none";
        document.getElementById("authModal").style.display = "flex";
        showForgotPassword();
        window.history.replaceState(null, "", window.location.pathname);
      }, 2000);
      return;
    }

    console.log("✅ Valid session found, updating password...");

    // Now update the password
    const { data, error } = await window.supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Password update error:", error);
      errorElement.textContent = `❌ ${error.message}`;
      return;
    }

    console.log("✅ Password updated successfully");
    successElement.textContent =
      "✅ Password reset successful! Redirecting to login...";

    // Clear fields
    document.getElementById("resetNewPassword").value = "";
    document.getElementById("resetConfirmPassword").value = "";

    // Clear the hash
    window.history.replaceState(null, "", window.location.pathname);

    // Sign out and show login after 2 seconds
    setTimeout(async () => {
      await window.supabaseClient.auth.signOut();
      document.getElementById("resetPasswordModal").style.display = "none";
      document.getElementById("authModal").style.display = "flex";
      showNotification(
        "✅ Password updated! Please sign in with your new password."
      );
    }, 2000);
  } catch (error) {
    console.error("Password reset error:", error);
    errorElement.textContent = "⚠️ Connection error. Please try again.";
  }
}

// Progress System Functions
function checkLevelProgress() {
  const currentTime = Date.now();
  const elapsedMinutes = (currentTime - sessionStartTime) / (1000 * 60);

  let calculatedLevel = 1;
  let totalMinutes = 0;
  let levelMinutes = 1;

  while (totalMinutes + levelMinutes <= elapsedMinutes) {
    totalMinutes += levelMinutes;
    calculatedLevel++;
    levelMinutes = Math.pow(2, calculatedLevel - 2);
  }

  if (calculatedLevel > userLevel) {
    userLevel = calculatedLevel;
    triggerLevelUp();
  }

  updateLevelDisplay();
}

async function triggerLevelUp() {
  showNotification(`🎉 LEVEL UP! You're now Level ${userLevel}! 🎊`);

  // Save level to Supabase if user is logged in
  if (currentUser && window.supabaseClient) {
    try {
      await window.supabaseClient
        .from("profiles")
        .update({
          user_level: userLevel,
          session_start_time: sessionStartTime,
        })
        .eq("id", currentUser.id);

      // Also save to level history
      await window.supabaseClient.from("user_level_history").insert({
        user_id: currentUser.id,
        level: userLevel,
      });

      console.log("✅ Level saved to database");
    } catch (error) {
      console.error("Error saving level:", error);
    }
  }
}

function updateLevelDisplay() {
  const levelDisplay = document.getElementById("currentLevel");
  if (levelDisplay) {
    levelDisplay.textContent = userLevel;
  }
}

function updateProgressBar() {
  const currentTime = Date.now();
  const elapsedMinutes = (currentTime - sessionStartTime) / (1000 * 60);

  let totalMinutesForCurrentLevel = 0;
  for (let i = 1; i < userLevel; i++) {
    totalMinutesForCurrentLevel += Math.pow(2, i - 1);
  }

  const minutesIntoCurrentLevel = elapsedMinutes - totalMinutesForCurrentLevel;
  const minutesNeededForLevel = Math.pow(2, userLevel - 1);

  const progressPercent =
    (minutesIntoCurrentLevel / minutesNeededForLevel) * 100;
  const clampedProgress = Math.min(progressPercent, 100);

  const progressBar = document.getElementById("progressBar");
  if (progressBar) {
    progressBar.style.width = clampedProgress + "%";
  }
}

setInterval(() => {
  checkLevelProgress();
  updateProgressBar();
}, 1000);

const themes = [
  {
    bg: "linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)",
    name: "Ocean Night",
  },
  {
    bg: "linear-gradient(135deg, #2d1b69, #11998e, #38ef7d)",
    name: "Forest Magic",
  },
  {
    bg: "linear-gradient(135deg, #55a3ff, #003d82, #001f3f)",
    name: "Midnight Blue",
  },
  //{ bg: 'linear-gradient(135deg, #834d9b, #d04ed6, #ff6b6b)', name: 'Sunset Dream' },
  //{ bg: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)', name: 'Purple Sky' },
  //{ bg: 'linear-gradient(135deg, #ff9a9e, #fecfef, #fecfef)', name: 'Cotton Candy' },
  //{ bg: 'linear-gradient(135deg, #a8edea, #fed6e3)', name: 'Soft Mint' },
  //{ bg: 'linear-gradient(135deg, #ff6b6b, #ee5a24, #ff9ff3)', name: 'Fire Coral' },
  //{ bg: 'linear-gradient(135deg, #74b9ff, #0984e3, #6c5ce7)', name: 'Deep Blue' },
  //{ bg: 'linear-gradient(135deg, #fd79a8, #e84393, #6c5ce7)', name: 'Neon Pink' },
  //{ bg: 'linear-gradient(135deg, #00b894, #00cec9, #74b9ff)', name: 'Tropical Teal' },
  //{ bg: 'linear-gradient(135deg, #fdcb6e, #e17055, #fd79a8)', name: 'Warm Sunset' },
  //{ bg: 'linear-gradient(135deg, #2d3436, #636e72, #74b9ff)', name: 'Steel Blue' },
  //{ bg: 'linear-gradient(135deg, #a29bfe, #6c5ce7, #fd79a8)', name: 'Electric Purple' },
  //{ bg: 'linear-gradient(135deg, #ff7675, #fab1a0, #fdcb6e)', name: 'Autumn Glow' },
  //{ bg: 'linear-gradient(135deg, #00b894, #55efc4, #81ecec)', name: 'Mint Fresh' }
];

const sounds = {
  waterfall: {
    name: "Waterfall Sound",
    emoji: "💧",
    description: "Peaceful waterfall sounds to help you relax",
    file: "waterfalls.mp3",
  },
  forest: {
    name: "Forest Sound",
    emoji: "🌲",
    description: "Calming forest ambience with birds",
    file: "forest.mp3",
  },
};

const feelings = {
  happy: {
    emoji: "😊",
    name: "HAPPY",
    color: "#FFD700",
    prompt:
      "I see you're feeling happy! 😊 That's wonderful! What made you feel so happy today? I'd love to hear about it!",
  },
  sad: {
    emoji: "😢",
    name: "SAD",
    color: "#4ECDC4",
    prompt:
      "I notice you're feeling sad 😢. I'm here for you. Would you like to tell me what's making you feel this way? Sometimes talking helps.",
  },
  tired: {
    emoji: "😴",
    name: "TIRED",
    color: "#9B59B6",
    prompt:
      "You're feeling tired 😴. That's okay! Everyone needs rest. Have you been doing lots of activities today? Would you like to talk about it or maybe try some calm breathing?",
  },
  scared: {
    emoji: "😨",
    name: "SCARED",
    color: "#5DADE2",
    prompt:
      "I can see you're feeling scared 😨. It's okay to feel scared sometimes. I'm here with you. Can you tell me what's making you feel scared? We can work through it together.",
  },
  angry: {
    emoji: "😠",
    name: "ANGRY",
    color: "#E74C3C",
    prompt:
      "You're feeling angry 😠. Those feelings are okay to have. What happened that made you feel angry? Let's talk about it and see if we can help you feel better.",
  },
  nervous: {
    emoji: "😰",
    name: "NERVOUS",
    color: "#88B04B",
    prompt:
      "I see you're feeling nervous 😰. It's normal to feel nervous sometimes. What's making you feel this way? Talking about it might help you feel calmer.",
  },
  shy: {
    emoji: "😳",
    name: "SHY",
    color: "#FFB6C1",
    prompt:
      "You're feeling shy 😳. That's perfectly fine! Many people feel shy sometimes. Is there something you'd like to share with me? I'm a good listener and I won't judge.",
  },
  excited: {
    emoji: "🤩",
    name: "EXCITED",
    color: "#FF8C42",
    prompt:
      "Wow, you're feeling excited 🤩! That's amazing! What's got you so excited? I want to hear all about it! Your excitement makes me happy too!",
  },
  bored: {
    emoji: "😑",
    name: "BORED",
    color: "#F4D03F",
    prompt:
      "You're feeling bored 😑. I understand! Would you like to do something fun? We could chat about interesting topics, play a game, or I could tell you a story. What sounds good?",
  },
  silly: {
    emoji: "😜",
    name: "SILLY",
    color: "#16A085",
    prompt:
      "You're feeling silly 😜! That's fun! Being silly is great! Want to share something funny with me? Or shall we have a playful conversation?",
  },
  worried: {
    emoji: "😟",
    name: "WORRIED",
    color: "#8E44AD",
    prompt:
      "I can tell you're worried 😟. It's okay to worry, but I'm here to help. What's on your mind? Let's talk about what's worrying you and see if we can make it better together.",
  },
  sick: {
    emoji: "🤒",
    name: "SICK",
    color: "#5DADE2",
    prompt:
      "Oh no, you're not feeling well 🤒. I'm sorry you're sick. Make sure to rest and drink water. Would you like to talk about how you're feeling? I'm here to keep you company.",
  },
};

const memoryGameEmojis = {
  1: ["🐱", "🐭", "🐶", "🐰"],
  2: ["🍎", "🍌", "🍇", "🍊", "🍓", "🍉"],
  3: ["⚽", "🏀", "🎾", "⚾", "🏐", "🎱", "🏈", "🎳"],
  4: ["🚗", "🚕", "🚙", "🚌", "🚎", "🏎️", "🚓", "🚑", "🚒", "🚐"],
  5: ["🌟", "⭐", "✨", "💫", "🌠", "🌈", "☀️", "🌙", "⚡", "🔥", "💧", "🌸"],
  6: [
    "😀",
    "😂",
    "😍",
    "😎",
    "🤗",
    "😜",
    "🥳",
    "😇",
    "🤩",
    "😋",
    "🥰",
    "😁",
    "🤓",
    "😸",
    "😺",
    "🐼",
    "🦊",
    "🐨",
  ],
};
const shapesData = {
  1: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
  ],
  2: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
    { shape: "⬠", name: "Pentagon", color: "#ab47bc" },
  ],
  3: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
    { shape: "⬠", name: "Pentagon", color: "#ab47bc" },
    { shape: "⬡", name: "Hexagon", color: "#ef5350" },
  ],
  4: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
    { shape: "⬠", name: "Pentagon", color: "#ab47bc" },
    { shape: "⬡", name: "Hexagon", color: "#ef5350" },
    { shape: "◆", name: "Diamond", color: "#ffd54f" },
  ],
  5: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
    { shape: "⬠", name: "Pentagon", color: "#ab47bc" },
    { shape: "⬡", name: "Hexagon", color: "#ef5350" },
    { shape: "◆", name: "Diamond", color: "#ffd54f" },
    { shape: "▭", name: "Rectangle", color: "#42a5f5" },
  ],
  6: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
    { shape: "⬠", name: "Pentagon", color: "#ab47bc" },
    { shape: "⬡", name: "Hexagon", color: "#ef5350" },
    { shape: "◆", name: "Diamond", color: "#ffd54f" },
    { shape: "▭", name: "Rectangle", color: "#42a5f5" },
    { shape: "★", name: "Star", color: "#ffeb3b" },
  ],
  7: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
    { shape: "⬠", name: "Pentagon", color: "#ab47bc" },
    { shape: "⬡", name: "Hexagon", color: "#ef5350" },
    { shape: "◆", name: "Diamond", color: "#ffd54f" },
    { shape: "▭", name: "Rectangle", color: "#42a5f5" },
    { shape: "★", name: "Star", color: "#ffeb3b" },
    { shape: "♥", name: "Heart", color: "#e91e63" },
  ],
  8: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
    { shape: "⬠", name: "Pentagon", color: "#ab47bc" },
    { shape: "⬡", name: "Hexagon", color: "#ef5350" },
    { shape: "◆", name: "Diamond", color: "#ffd54f" },
    { shape: "▭", name: "Rectangle", color: "#42a5f5" },
    { shape: "★", name: "Star", color: "#ffeb3b" },
    { shape: "♥", name: "Heart", color: "#e91e63" },
    { shape: "⯃", name: "Octagon", color: "#26c6da" },
  ],
  9: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
    { shape: "⬠", name: "Pentagon", color: "#ab47bc" },
    { shape: "⬡", name: "Hexagon", color: "#ef5350" },
    { shape: "◆", name: "Diamond", color: "#ffd54f" },
    { shape: "▭", name: "Rectangle", color: "#42a5f5" },
    { shape: "★", name: "Star", color: "#ffeb3b" },
    { shape: "♥", name: "Heart", color: "#e91e63" },
    { shape: "⯃", name: "Octagon", color: "#26c6da" },
    { shape: "▱", name: "Parallelogram", color: "#9575cd" },
  ],
  10: [
    { shape: "●", name: "Circle", color: "#4fc3f7" },
    { shape: "■", name: "Square", color: "#66bb6a" },
    { shape: "▲", name: "Triangle", color: "#ffa726" },
    { shape: "⬠", name: "Pentagon", color: "#ab47bc" },
    { shape: "⬡", name: "Hexagon", color: "#ef5350" },
    { shape: "◆", name: "Diamond", color: "#ffd54f" },
    { shape: "▭", name: "Rectangle", color: "#42a5f5" },
    { shape: "★", name: "Star", color: "#ffeb3b" },
    { shape: "♥", name: "Heart", color: "#e91e63" },
    { shape: "⯃", name: "Octagon", color: "#26c6da" },
    { shape: "▱", name: "Parallelogram", color: "#9575cd" },
    { shape: "⬭", name: "Oval (Ellipse)", color: "#78909c" },
  ],
};

const colorsData = {
  1: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
  ],
  2: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#00FF00", name: "Green" },
  ],
  3: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#00FF00", name: "Green" },
    { color: "#FFA500", name: "Orange" },
  ],
  4: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#00FF00", name: "Green" },
    { color: "#FFA500", name: "Orange" },
    { color: "#800080", name: "Purple" },
  ],
  5: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#00FF00", name: "Green" },
    { color: "#FFA500", name: "Orange" },
    { color: "#800080", name: "Purple" },
    { color: "#FFC0CB", name: "Pink" },
  ],
  6: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#00FF00", name: "Green" },
    { color: "#FFA500", name: "Orange" },
    { color: "#800080", name: "Purple" },
    { color: "#FFC0CB", name: "Pink" },
    { color: "#000000", name: "Black" },
  ],
  7: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#00FF00", name: "Green" },
    { color: "#FFA500", name: "Orange" },
    { color: "#800080", name: "Purple" },
    { color: "#FFC0CB", name: "Pink" },
    { color: "#000000", name: "Black" },
    { color: "#FFFFFF", name: "White" },
  ],
  8: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#00FF00", name: "Green" },
    { color: "#FFA500", name: "Orange" },
    { color: "#800080", name: "Purple" },
    { color: "#FFC0CB", name: "Pink" },
    { color: "#000000", name: "Black" },
    { color: "#FFFFFF", name: "White" },
    { color: "#808080", name: "Gray" },
  ],
  9: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#00FF00", name: "Green" },
    { color: "#FFA500", name: "Orange" },
    { color: "#800080", name: "Purple" },
    { color: "#FFC0CB", name: "Pink" },
    { color: "#000000", name: "Black" },
    { color: "#FFFFFF", name: "White" },
    { color: "#808080", name: "Gray" },
    { color: "#A52A2A", name: "Brown" },
  ],
  10: [
    { color: "#FF0000", name: "Red" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#00FF00", name: "Green" },
    { color: "#FFA500", name: "Orange" },
    { color: "#800080", name: "Purple" },
    { color: "#FFC0CB", name: "Pink" },
    { color: "#000000", name: "Black" },
    { color: "#FFFFFF", name: "White" },
    { color: "#808080", name: "Gray" },
    { color: "#A52A2A", name: "Brown" },
    { color: "#00FFFF", name: "Cyan" },
  ],
};
// Authentication functions
function showAdminLogin() {
  document.querySelector(".auth-buttons").style.display = "none";
  document.getElementById("adminLoginForm").style.display = "block";
  document.getElementById("secretKeyInput").focus();
}

function hideAdminLogin() {
  document.querySelector(".auth-buttons").style.display = "flex";
  document.getElementById("adminLoginForm").style.display = "none";
  document.getElementById("authError").textContent = "";
  document.getElementById("secretKeyInput").value = "";
}

function handleAdminKeyPress(event) {
  if (event.key === "Enter") {
    verifyAdminKey();
  }
}

async function verifyAdminKey() {
  const secretKey = document.getElementById("secretKeyInput").value.trim();
  const errorElement = document.getElementById("authError");

  if (!secretKey) {
    errorElement.textContent = "⚠️ Please enter the secret key";
    return;
  }

  try {
    const response = await fetch("/api/authenticate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ secretKey }),
    });

    const data = await response.json();

    if (data.success) {
      userRole = "admin";
      sessionToken = data.sessionToken;
      localStorage.setItem("userRole", "admin");
      localStorage.setItem("sessionToken", sessionToken);
      closeAuthModal();
      showNotification("🎉 Admin login successful! Full access granted.");
    } else {
      errorElement.textContent = "❌ Invalid secret key. Please try again.";
      document.getElementById("secretKeyInput").value = "";
    }
  } catch (error) {
    console.error("Authentication error:", error);
    errorElement.textContent = "⚠️ Connection error. Please try again.";
  }
}

// Show Sign In Form
function showSignIn() {
  document.getElementById("authMainButtons").style.display = "none";
  document.getElementById("signInForm").style.display = "block";
  document.getElementById("signInEmail").focus();
  document.getElementById("signInError").textContent = "";
}

// Hide Sign In Form
function hideSignIn() {
  document.getElementById("authMainButtons").style.display = "flex";
  document.getElementById("signInForm").style.display = "none";
  document.getElementById("signInEmail").value = "";
  document.getElementById("signInPassword").value = "";
  document.getElementById("signInError").textContent = "";
}

// Show Sign Up Form
function showSignUp() {
  document.getElementById("authMainButtons").style.display = "none";
  document.getElementById("signUpForm").style.display = "block";
  document.getElementById("signUpName").focus();
  document.getElementById("signUpError").textContent = "";
  
  // Load schools when signup form opens
  loadSchoolsForSignup();
}

// Hide Sign Up Form
function hideSignUp() {
  document.getElementById("authMainButtons").style.display = "flex";
  document.getElementById("signUpForm").style.display = "none";
  document.getElementById("signUpName").value = "";
  document.getElementById("signUpEmail").value = "";
  document.getElementById("signUpPassword").value = "";
  document.getElementById("signUpConfirmPassword").value = "";
  document.getElementById("signUpError").textContent = "";
}

// Handle Sign In
async function handleSignIn() {
  const email = document.getElementById("signInEmail").value.trim();
  const password = document.getElementById("signInPassword").value;
  const errorElement = document.getElementById("signInError");

  if (!email || !password) {
    errorElement.textContent = "⚠️ Please fill in all fields";
    return;
  }

  try {
    const { data, error } = await window.supabaseClient.auth.signInWithPassword(
      {
        email: email,
        password: password,
      }
    );

    if (error) {
      errorElement.textContent = `❌ ${error.message}`;
      return;
    }

    // Success! Get user's name and level from profile
    const { data: profile } = await window.supabaseClient
      .from("profiles")
      .select("display_name, user_level, session_start_time")
      .eq("id", data.user.id)
      .single();

    currentUser = data.user;
    currentUserName = profile ? profile.display_name : "Friend";

    // Load user's saved level
    if (profile && profile.user_level) {
      userLevel = profile.user_level;
      sessionStartTime = profile.session_start_time || Date.now();
      updateLevelDisplay();
      updateProgressBar();
    }
    userRole = "user";
    sessionToken = data.session.access_token;

    closeAuthModal();
    showNotification(
      `🎉 Welcome back, ${currentUserName}! You're at Level ${userLevel}!`
    );
     checkTermsAcceptance();
  } catch (error) {
    console.error("Sign in error:", error);
    errorElement.textContent = "⚠️ Connection error. Please try again.";
  }
}

// Handle Sign Up
async function handleSignUp() {
  const name = document.getElementById("signUpName").value.trim();
  const email = document.getElementById("signUpEmail").value.trim();
  const password = document.getElementById("signUpPassword").value;
  const confirmPassword = document.getElementById(
    "signUpConfirmPassword"
  ).value;
  const errorElement = document.getElementById("signUpError");

  if (!name || !email || !password || !confirmPassword) {
    errorElement.textContent = "⚠️ Please fill in all fields";
    return;
  }

  if (password !== confirmPassword) {
    errorElement.textContent = "❌ Passwords don't match";
    return;
  }

  if (password.length < 6) {
    errorElement.textContent = "⚠️ Password must be at least 6 characters";
    return;
  }

try {
    const schoolId = document.getElementById('signUpSchool').value || null;
    const teacherId = document.getElementById('signUpTeacher').value || null;

    const { data, error } = await window.supabaseClient.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          display_name: name,
          school_id: schoolId,
          assigned_teacher_id: teacherId,
        },
      },
    });

    if (error) {
      errorElement.textContent = `❌ ${error.message}`;
      return;
    }

    // Check if email confirmation is required
    if (data.user && !data.session) {
      // Email confirmation enabled - show message
      errorElement.textContent = "";
      showNotification(
        `📧 Account created! Check your email to confirm before signing in.`
      );
      
      document.getElementById("signUpName").value = "";
      document.getElementById("signUpEmail").value = "";
      document.getElementById("signUpPassword").value = "";
      document.getElementById("signUpConfirmPassword").value = "";
      
      setTimeout(() => {
        hideSignUp();
      }, 3000);
      
    } else if (data.session) {
      // User signed in immediately - show terms
      currentUser = data.user;
      currentUserName = name;
      userRole = "user";
      sessionToken = data.session.access_token;

      closeAuthModal();
      showNotification(
        `🎉 Welcome, ${currentUserName}! Your account is created!`
      );
      
      // Show terms modal for new users - MUST accept before using app
      await checkTermsAcceptance();
    }

    // Save school and teacher to profiles table
      if (schoolId || teacherId) {
        try {
          await window.supabaseClient
            .from('profiles')
            .update({
              school_id: schoolId,
              assigned_teacher_id: teacherId
            })
            .eq('id', data.user.id);
          console.log('✅ School and teacher saved to profile');
        } catch (profileError) {
          console.error('Error saving school/teacher:', profileError);
        }
      }
  } catch (error) {
    console.error("Sign up error:", error);
    errorElement.textContent = "⚠️ Connection error. Please try again.";
  }
}

function loginAsGuest() {
  userRole = "guest";
  sessionToken = null;
  localStorage.setItem("userRole", "guest");
  localStorage.removeItem("sessionToken");
  closeAuthModal();
  showNotification("👤 Welcome, Guest! You can chat and generate images.");
}

function closeAuthModal() {
  const modal = document.getElementById("authModal");
  modal.style.opacity = "0";
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

async function logout() {
  // Sign out from Supabase if user is logged in
  if (currentUser) {
    await window.supabaseClient.auth.signOut();
  }

  userRole = null;
  sessionToken = null;
  currentUser = null;
  currentUserName = null;
  localStorage.removeItem("userRole");
  localStorage.removeItem("sessionToken");
  location.reload();
}
// ========================================
// Terms of Service Functions
// ========================================

async function checkTermsAcceptance() {
  if (userRole !== "user" || !currentUser) {
    return;
  }

  try {
    // Check database for terms acceptance
    const { data: profile, error } = await window.supabaseClient
      .from("profiles")
      .select("terms_accepted")
      .eq("id", currentUser.id)
      .single();

    if (error) {
      console.error("Error checking terms:", error);
      return;
    }

    // If terms_accepted is NULL or false, show the modal
    if (profile.terms_accepted !== true) {
      console.log("📜 User needs to accept terms");
      showTermsModal();
    }
  } catch (error) {
    console.error("Error in checkTermsAcceptance:", error);
  }
}

function showTermsModal() {
  const termsModal = document.getElementById("termsModal");
  const authModal = document.getElementById("authModal");

  if (authModal) {
    authModal.style.display = "none";
  }

  // Hide main app content until terms accepted
  const container = document.querySelector(".container");
  if (container) {
    container.style.display = "none";
  }

  termsModal.style.display = "flex";
  termsModal.style.opacity = "0";

  setTimeout(() => {
    termsModal.style.opacity = "1";
  }, 100);

  document.getElementById("termsCheckbox").checked = false;
  document.getElementById("acceptTermsBtn").disabled = true;

  const termsContent = document.querySelector(".terms-content");
  if (termsContent) {
    termsContent.scrollTop = 0;
  }
}

function hideTermsModal() {
  const termsModal = document.getElementById("termsModal");
  termsModal.style.opacity = "0";
  setTimeout(() => {
    termsModal.style.display = "none";
    
    // Show main app content after accepting
    const container = document.querySelector(".container");
    if (container) {
      container.style.display = "block";
    }
  }, 300);
}

function handleTermsCheckbox() {
  const checkbox = document.getElementById("termsCheckbox");
  const acceptBtn = document.getElementById("acceptTermsBtn");

  if (checkbox.checked) {
    acceptBtn.disabled = false;
    acceptBtn.style.cursor = "pointer";
  } else {
    acceptBtn.disabled = true;
    acceptBtn.style.cursor = "not-allowed";
  }
}

async function acceptTerms() {
  const checkbox = document.getElementById("termsCheckbox");

  if (!checkbox.checked) {
    showNotification("⚠️ Please check the box to accept the terms");
    return;
  }

  if (!currentUser) {
    showNotification("❌ Error: User not authenticated");
    return;
  }

  try {
    // Save to database
    const { error } = await window.supabaseClient
      .from("profiles")
      .update({
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
      })
      .eq("id", currentUser.id);

    if (error) {
      console.error("Error saving terms acceptance:", error);
      showNotification("❌ Error saving acceptance. Please try again.");
      return;
    }

    console.log("✅ Terms accepted and saved to database");

    hideTermsModal();
    showNotification("✅ Terms accepted! Welcome to the app!");
    
    // Load user's level and progress if available
    if (window.supabaseClient) {
      try {
        const { data: profile } = await window.supabaseClient
          .from("profiles")
          .select("user_level, session_start_time")
          .eq("id", currentUser.id)
          .single();

        if (profile && profile.user_level) {
          userLevel = profile.user_level;
          sessionStartTime = profile.session_start_time || Date.now();
          updateLevelDisplay();
          updateProgressBar();
        }
      } catch (err) {
        console.log("Could not load user progress:", err);
      }
    }
  } catch (error) {
    console.error("Error accepting terms:", error);
    showNotification("❌ Error saving acceptance. Please try again.");
  }
}

async function declineTerms() {
  const confirmDecline = confirm(
    "⚠️ You must accept the Terms of Service to use this app.\n\n" +
    "If you decline, you will be logged out.\n\n" +
    "Are you sure you want to decline?"
  );

  if (confirmDecline) {
    showNotification("👋 Terms declined. Logging out...");

    setTimeout(async () => {
      // Just logout - don't delete anything
      await logout();
    }, 1500);
  }
}

async function checkExistingSession() {
  // Wait for Supabase to initialize
  if (!window.supabaseClient) {
    await initializeSupabase();
  }

  // DON'T handle password reset here - it's handled in initialization
  const hash = window.location.hash;
  if (hash && hash.includes("type=recovery")) {
    console.log("⏭️ Skipping session check - password reset in progress");
    return;
  }

  const savedRole = localStorage.getItem("userRole");
  if (savedRole === "guest") {
    console.log("✅ Guest session found - continuing as guest");
    userRole = "guest";
    sessionToken = null;
    currentUserName = "Guest";
    closeAuthModal();
    showNotification(`👤 Welcome back, Guest!`);
    return;
  }

  // Check if user has an active Supabase session
  if (window.supabaseClient) {
    try {
      const {
        data: { session },
        error,
      } = await window.supabaseClient.auth.getSession();

      if (error) {
        console.error("Session check error:", error);
      }

      if (session) {
        // User is logged in with Supabase
        currentUser = session.user;
        userRole = "user";
        sessionToken = session.access_token;

        // Get user's name and level from profile
        const { data: profile, error: profileError } =
          await window.supabaseClient
            .from("profiles")
            .select("display_name, user_level, session_start_time")
            .eq("id", session.user.id)
            .single();

        if (profileError) {
          console.error("Profile fetch error:", profileError);
          currentUserName = "Friend";
        } else {
          currentUserName = profile ? profile.display_name : "Friend";

          // Load user's saved level and progress
          if (profile && profile.user_level) {
            userLevel = profile.user_level;
            sessionStartTime = profile.session_start_time || Date.now();
            updateLevelDisplay();
            updateProgressBar();
          }
        }

        closeAuthModal();
        showNotification(
          `✅ Welcome back, ${currentUserName}! You're at Level ${userLevel}!`
        );
        checkTermsAcceptance();
        return;
      }
    } catch (error) {
      console.error("Session verification error:", error);
    }
  }

  // Check for old admin session
  const savedToken = localStorage.getItem("sessionToken");

  if (savedRole === "admin" && savedToken) {
    try {
      const response = await fetch("/api/verify-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          role: savedRole,
          sessionToken: savedToken,
        }),
      });

      const data = await response.json();

      if (data.valid) {
        userRole = savedRole;
        sessionToken = savedToken;
        closeAuthModal();
        showNotification(`✅ Welcome back, Admin!`);
        return;
      }
    } catch (error) {
      console.error("Admin session verification error:", error);
    }
  }

  // Show auth modal if no valid session
  const authModal = document.getElementById("authModal");
  authModal.style.opacity = "0";
  authModal.style.display = "flex";
  setTimeout(() => {
    authModal.style.opacity = "1";
  }, 100);
}
// COLORS & SHAPES MODE FUNCTIONS
function enterColorsShapesMode() {
  if (calmBreathingMode) {
    exitCalmBreathingModeQuietly();
  }

  if (socialStoriesMode) {
    exitSocialStoriesModeQuietly();
  }

  if (feelingsHelperMode) {
    exitFeelingsHelperModeQuietly();
  }

  if (memoryGameMode) {
    exitMemoryGameModeQuietly();
  }

  colorsShapesMode = true;
  socialStoriesMode = false;
  calmBreathingMode = false;
  feelingsHelperMode = false;
  memoryGameMode = false;
  conversationHistory = [];
  stopCurrentSpeech();
  stopAllSounds();

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn exit-btn" onclick="exitColorsShapesMode()" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); font-weight: bold;">🚪 Exit Colors & Shapes</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
        </div>
        <div class="colors-shapes-menu">
            <h2 class="colors-shapes-title">🎨 Colors & Shapes Learning</h2>
            <p class="colors-shapes-subtitle">Choose what you want to learn today!</p>
            <div class="game-type-buttons">
                <button class="game-type-btn" onclick="startColorsShapesGame('colors')" style="background: linear-gradient(135deg, #ff6b6b, #ffa726);">
                    <div class="game-type-icon">🎨</div>
                    <div class="game-type-name">Colors</div>
                    <div class="game-type-desc">Match colors with their names</div>
                </button>
                <button class="game-type-btn" onclick="startColorsShapesGame('shapes')" style="background: linear-gradient(135deg, #4fc3f7, #29b6f6);">
                    <div class="game-type-icon">⬛</div>
                    <div class="game-type-name">Shapes</div>
                    <div class="game-type-desc">Match shapes with their names</div>
                </button>
            </div>
        </div>
        <div class="messages" id="messages" style="display:none;"></div>
        <div class="input-area" id="inputArea" style="display:none;">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  showNotification("🎨 Entered Colors & Shapes Mode!");
}

function startColorsShapesGame(type) {
  colorsShapesGameType = type;
  colorsShapesLevel = 1;
  selectedLeftItem = null;
  selectedRightItem = null;
  matchedItems = [];

  showNotification(`🎮 Starting ${type} matching game!`);
  initializeColorsShapesLevel();
}

function initializeColorsShapesLevel() {
  const data =
    colorsShapesGameType === "colors"
      ? colorsData[colorsShapesLevel]
      : shapesData[colorsShapesLevel];
  currentGameItems = [...data];
  matchedItems = [];
  selectedLeftItem = null;
  selectedRightItem = null;

  const leftItems = [...currentGameItems];
  const rightItems = [...currentGameItems].sort(() => Math.random() - 0.5);

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn exit-btn" onclick="exitColorsShapesMode()" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); font-weight: bold;">🚪 Exit</button>
            <button class="control-btn" onclick="restartColorsShapesLevel()">🔄 Restart Level</button>
        </div>
        <div class="colors-shapes-game-container">
            <h2 class="colors-shapes-game-title">${
              colorsShapesGameType === "colors" ? "🎨 Colors" : "⬛ Shapes"
            } Matching - Level ${colorsShapesLevel}</h2>
            <p class="colors-shapes-instructions">Click one item on the left, then click its match on the right!</p>
            <div class="matching-game-grid">
                <div class="matching-column left-column" id="leftColumn"></div>
                <div class="matching-column right-column" id="rightColumn"></div>
            </div>
        </div>
        <div class="messages" id="messages" style="display:none;"></div>
        <div class="input-area" id="inputArea" style="display:none;">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  renderMatchingItems(leftItems, rightItems);
}

function renderMatchingItems(leftItems, rightItems) {
  const leftColumn = document.getElementById("leftColumn");
  const rightColumn = document.getElementById("rightColumn");

  if (!leftColumn || !rightColumn) return;

  leftColumn.innerHTML = "";
  rightColumn.innerHTML = "";

  leftItems.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "matching-item";
    div.dataset.index = index;
    div.dataset.name = item.name;

    if (colorsShapesGameType === "colors") {
      div.innerHTML = `<div class="color-box" style="background:${item.color};${
        item.name === "White" ? "border:3px solid #666;" : ""
      }"></div>`;
    } else {
      div.innerHTML = `<div class="shape-box" style="color:${item.color}">${item.shape}</div>`;
    }

    div.addEventListener("click", () => selectLeftItem(index, item.name));
    leftColumn.appendChild(div);
  });

  rightItems.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "matching-item";
    div.dataset.index = index;
    div.dataset.name = item.name;
    div.innerHTML = `<div class="name-box">${item.name}</div>`;

    div.addEventListener("click", () => selectRightItem(index, item.name));
    rightColumn.appendChild(div);
  });
}

function selectLeftItem(index, name) {
  if (matchedItems.includes(name)) return;

  document.querySelectorAll(".left-column .matching-item").forEach((item) => {
    item.classList.remove("selected");
  });

  const item = document.querySelector(
    `.left-column .matching-item[data-index="${index}"]`
  );
  item.classList.add("selected");
  selectedLeftItem = name;

  if (selectedRightItem) {
    checkColorsShapesMatch();
  }
}

function selectRightItem(index, name) {
  if (matchedItems.includes(name)) return;

  document.querySelectorAll(".right-column .matching-item").forEach((item) => {
    item.classList.remove("selected");
  });

  const item = document.querySelector(
    `.right-column .matching-item[data-index="${index}"]`
  );
  item.classList.add("selected");
  selectedRightItem = name;

  if (selectedLeftItem) {
    checkColorsShapesMatch();
  }
}

function checkColorsShapesMatch() {
  if (selectedLeftItem === selectedRightItem) {
    matchedItems.push(selectedLeftItem);

    document
      .querySelectorAll(`.matching-item[data-name="${selectedLeftItem}"]`)
      .forEach((item) => {
        item.classList.add("matched");
        item.classList.remove("selected");
      });

    showNotification("🎉 Great match!");

    if (matchedItems.length === currentGameItems.length) {
      setTimeout(() => colorsShapesLevelComplete(), 1000);
    }

    selectedLeftItem = null;
    selectedRightItem = null;
  } else {
    showNotification("❌ Try again!");

    setTimeout(() => {
      document.querySelectorAll(".matching-item").forEach((item) => {
        item.classList.remove("selected");
      });
      selectedLeftItem = null;
      selectedRightItem = null;
    }, 1000);
  }
}

// Save Colors & Shapes Game session to Supabase
async function saveColorsShapesGameToDatabase(gameType, level, completed) {
  if (!currentUser || !window.supabaseClient) return;

  try {
    await window.supabaseClient.from("colors_shapes_sessions").insert({
      user_id: currentUser.id,
      game_type: gameType,
      level_reached: level,
      completed: completed,
    });

    console.log(
      `✅ ${gameType} game ${
        completed ? "completion" : "progress"
      } saved to database`
    );
  } catch (error) {
    console.error("Error saving colors/shapes game:", error);
  }
}

function colorsShapesLevelComplete() {
  if (colorsShapesLevel < 10) {
    showNotification(
      `🎉 Level ${colorsShapesLevel} Complete! Moving to Level ${
        colorsShapesLevel + 1
      }!`
    );
    colorsShapesLevel++;
    // Save level progress to database
    if (currentUser && window.supabaseClient) {
      saveColorsShapesGameToDatabase(
        colorsShapesGameType,
        colorsShapesLevel - 1,
        false
      );
    }
    setTimeout(() => initializeColorsShapesLevel(), 1500);
  } else {
    colorsShapesGameComplete();
  }
}

function colorsShapesGameComplete() {
  const chatArea = document.getElementById("chatArea");
  const gameType = colorsShapesGameType === "colors" ? "Colors" : "Shapes";

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn exit-btn" onclick="exitColorsShapesMode()" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); font-weight: bold;">🚪 Exit</button>
        </div>
        <div class="colors-shapes-game-container">
            <div class="game-complete-message">
                <div class="game-complete-emoji">🏆</div>
                <h2>🎉 Congratulations! 🎉</h2>
                <p>You completed all 10 levels of ${gameType}!</p>
                <p>You're amazing at learning! 🌟</p>
                <button class="game-complete-btn" onclick="enterColorsShapesMode()">Back to Menu 🏠</button>
                <button class="game-complete-btn" onclick="exitColorsShapesMode()">Exit 🚪</button>
            </div>
        </div>
        <div class="messages" id="messages" style="display:none;"></div>
        <div class="input-area" id="inputArea" style="display:none;">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;
  // Save game completion to database
  if (currentUser && window.supabaseClient) {
    saveColorsShapesGameToDatabase(colorsShapesGameType, 10, true);
  }

  showNotification(`🏆 You completed all ${gameType} levels!`);
}

function restartColorsShapesLevel() {
  initializeColorsShapesLevel();
  showNotification("🔄 Level restarted!");
}

function exitColorsShapesMode() {
  colorsShapesMode = false;
  stopCurrentSpeech();

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  const messagesContainer = document.getElementById("messages");
  lastMessageId++;
  const returnMessage = `## ✨ **Back to General Chat!** 🌈\n\n**Tom and Jerry are happy to chat with you again!** 🐱🐭\n\n*Great job learning Colors & Shapes!* You did amazing! 🎨\n\nWhat would you like to talk about now? 💬`;
  messagesContainer.innerHTML = `<div class="message assistant"><div class="message-avatar">🐱</div><div class="message-content">${processMarkdown(
    returnMessage
  )}<div class="emoji-reactions">
    <button class="emoji-btn" onclick="reactWithEmoji('😊')">😊</button>
    <button class="emoji-btn" onclick="reactWithEmoji('👍')">👍</button>
    <button class="emoji-btn" onclick="reactWithEmoji('❤️')">❤️</button></div></div></div>`;

  showNotification("✨ Returned to General Chat!");
}

function exitColorsShapesModeQuietly() {
  colorsShapesMode = false;

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;
}

function playMP3Sound(soundType) {
  const sound = sounds[soundType];
  if (!sound || !sound.file) {
    console.error("Sound file not found:", soundType);
    return false;
  }

  try {
    currentAudio = new Audio(sound.file);
    currentAudio.loop = true;
    currentAudio.volume = currentVolume;

    currentAudio.onerror = function (e) {
      console.error("Error loading audio file:", sound.file, e);
      showNotification(`❌ Could not load ${sound.name}`);
      currentPlayingSound = null;
      currentAudio = null;
      document
        .querySelectorAll(".sound-card")
        .forEach((card) => card.classList.remove("playing"));
    };

    currentAudio.onloadeddata = function () {
      console.log("Audio loaded successfully:", sound.file);
    };

    const playPromise = currentAudio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("Playing:", sound.name);
        })
        .catch((error) => {
          console.error("Playback error:", error);
          showNotification(`❌ Could not play ${sound.name}`);
          currentPlayingSound = null;
          currentAudio = null;
          document
            .querySelectorAll(".sound-card")
            .forEach((card) => card.classList.remove("playing"));
        });
    }

    return true;
  } catch (error) {
    console.error("Error creating audio:", error);
    showNotification(`❌ Error: ${error.message}`);
    return false;
  }
}

function stopMP3Sounds() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

function handleKeyPress(e) {
  if (e.key === "Enter" && !isLoading) sendMessage();
}

function processMarkdown(content) {
  let html = marked.parse(content);
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "b",
      "i",
      "u",
      "code",
      "pre",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "blockquote",
      "a",
      "hr",
    ],
    ALLOWED_ATTR: ["href", "target"],
  });
}

function stopCurrentSpeech() {
  if (currentUtterance) {
    speechSynthesis.cancel();
    currentUtterance = null;
  }
}

function speakText(text, messageId) {
  if (!voiceEnabled || !("speechSynthesis" in window)) return;
  if (messageId !== lastMessageId) return;

  stopCurrentSpeech();
  window.speechSynthesis.cancel();

  // 🔇 Remove emojis completely
  const cleanText = text.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF])/g,
    ""
  );

  const utterance = new SpeechSynthesisUtterance(cleanText);

  const voices = window.speechSynthesis.getVoices();

  // 🎯 PRIORITY LIST — BEST → WORST (Windows)
  const preferredVoice =
    voices.find(v => v.name === "Google US English") ||
    voices.find(v => v.name === "Microsoft Aria Online (Natural) - English (United States)") ||
    voices.find(v => v.name === "Microsoft Jenny Online (Natural) - English (United States)") ||
    voices.find(v => v.name === "Microsoft Guy Online (Natural) - English (United States)") ||
    voices.find(v => v.lang === "en-US") ||
    voices[0];

  if (preferredVoice) {
    utterance.voice = preferredVoice;
  }

  // 🧘‍♀️ PERFECT CALM SETTINGS (tested values)
  utterance.rate = 0.78;    // slower, clearer
  utterance.pitch = 0.85;   // removes sharp robotic tone
  utterance.volume = Math.min(currentVolume, 0.9);

  utterance.onend = () => {
    currentUtterance = null;
  };

  utterance.onerror = () => {
    currentUtterance = null;
  };

  currentUtterance = utterance;
  window.speechSynthesis.speak(utterance);
}



function updateVolume() {
  currentVolume = document.getElementById("volume").value / 100;

  if (currentAudio) {
    currentAudio.volume = currentVolume;
  }

  if (currentUtterance && speechSynthesis.speaking) {
    const txt = currentUtterance.text;
    stopCurrentSpeech();
    setTimeout(() => {
      if (voiceEnabled) speakText(txt, lastMessageId);
    }, 100);
  }
}

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  const btn = document.getElementById("voiceButton");
  if (voiceEnabled) {
    btn.innerHTML = "🔊 Voice";
    btn.style.background = "linear-gradient(135deg,#4caf50,#66bb6a)";
    showNotification("🔊 Voice is now ON");
  } else {
    stopCurrentSpeech();
    btn.innerHTML = "🔇 Voice";
    btn.style.background = "linear-gradient(135deg,#f44336,#d32f2f)";
    showNotification("🔇 Voice is now MUTED");
  }
}

async function sendMessage() {
  if (isLoading) return;

  const input = document.getElementById("messageInput");
  const sendButton = document.getElementById("sendButton");
  const message = input.value.trim();

  if (message === "") return;

  // Disable input while processing
  isLoading = true;
  input.disabled = true;
  sendButton.disabled = true;

  addMessage("user", message, "👤");
  input.value = "";

  const isImageReq = checkIfImageRequest(message);
  const isVideoReq = checkIfVideoRequest(message);
  showTypingIndicator(isImageReq, isVideoReq);

  try {
    // Call backend API with authentication
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: message,
        conversationHistory: conversationHistory,
        role: userRole,
        sessionToken: sessionToken,
        userId: currentUser ? currentUser.id : null,
        userEmail: currentUser ? currentUser.email : null,
      }),
    });

    const data = await response.json();

    hideTypingIndicator();

    if (data.response) {
      // Increment message ID for the new response
      lastMessageId++;

      // Check if video was generated
      if (data.videoGenerated && data.videoData) {
        addMessage(
          "assistant",
          data.response,
          data.character || "🤖",
          lastMessageId,
          null,
          null,
          data.videoData,
          data.mimeType
        );
      }
      // Save video generation to database
      if (data.videoGenerated && currentUser && window.supabaseClient) {
        saveVideoGenerationToDatabase(message, data.videoData, data.mimeType);
      }
      // Check if image was generated
      else if (data.imageGenerated && data.imageData) {
        addMessage(
          "assistant",
          data.response,
          data.character || "🤖",
          lastMessageId,
          data.imageData,
          data.mimeType
        );
      }
      // Save image generation to database
      if (data.imageGenerated && currentUser && window.supabaseClient) {
        saveImageGenerationToDatabase(message, data.imageData, data.mimeType);
      } else {
        addMessage(
          "assistant",
          data.response,
          data.character || "🤖",
          lastMessageId
        );
      }

      // Update conversation history
      conversationHistory.push(
        { role: "user", content: message },
        { role: "assistant", content: data.response }
      );

      // Keep only last 20 messages to prevent context overflow
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }
      // Save to Supabase if user is logged in
      if (currentUser && window.supabaseClient) {
        saveChatToDatabase(message, data.response);
      }
    } else {
      lastMessageId++;
      addMessage(
        "assistant",
        "I'm having trouble thinking right now 🤔. Can you ask me again?",
        "🤖",
        lastMessageId
      );
    }
  } catch (error) {
    console.error("Error:", error);
    hideTypingIndicator();
    lastMessageId++;

    let errorMessage =
      "Oops! I'm having trouble connecting 🔌. Let me try again!";

    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError")
    ) {
      errorMessage =
        "🔌 Can't connect to the server. Please check your internet connection!";
    } else if (error.name === "TypeError") {
      errorMessage =
        "⚠️ Something went wrong. Please refresh the page and try again!";
    }

    addMessage("assistant", errorMessage, "🤖", lastMessageId);
  } finally {
    // Re-enable input
    isLoading = false;
    input.disabled = false;
    sendButton.disabled = false;
    input.focus();
  }

  updateProgress(progress + 5);
}

// Exit gallery mode properly
function exitGalleryMode() {
  galleryMode = false;

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
    <div class="controls" id="controlsArea">
      <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
      <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
      <button class="control-btn" onclick="showHelp()">❓ Help</button>
      <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
    </div>
    <div class="messages" id="messages"></div>
    <div class="input-area" id="inputArea">
      <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
      <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
    </div>
  `;

  const userName = currentUserName || "friend";
  const messagesContainer = document.getElementById("messages");
  lastMessageId++;
  const returnMessage = `## ✨ **Back to General Chat!** 🌈\n\n**Hi ${userName}!** Tom and Jerry are ready to chat! 🐱🐭\n\nWhat would you like to talk about? 💬`;
  messagesContainer.innerHTML = `<div class="message assistant"><div class="message-avatar">🐱</div><div class="message-content">${processMarkdown(
    returnMessage
  )}</div></div>`;

  showNotification("✨ Back to chat!");
}

// View user's saved images and videos
async function viewSavedMedia() {
  galleryMode = true;
  if (!currentUser || !window.supabaseClient) {
    showNotification("⚠️ Please sign in to view your saved media!");
    return;
  }

  const chatArea = document.getElementById("chatArea");

  // Show loading state immediately
  chatArea.innerHTML = `
    <div class="controls">
      <button class="control-btn" onclick="exitGalleryMode()">🔙 Back to Chat</button>
    </div>
    <div style="padding:20px;text-align:center;">
      <h2>🖼️ My Gallery</h2>
      <p style="margin:20px 0;">Loading your media... ⏳</p>
    </div>
  `;

  try {
    // Fetch only metadata first (without image_data for speed)
    const { data: images, error: imgError } = await window.supabaseClient
      .from("generated_images")
      .select("id, prompt, created_at, mime_type")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: videos, error: vidError } = await window.supabaseClient
      .from("generated_videos")
      .select("id, prompt, created_at, mime_type")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (imgError) throw imgError;
    if (vidError) throw vidError;

    // Display gallery immediately with placeholders
    displayMediaGalleryFast(images, videos);
  } catch (error) {
    console.error("Error fetching saved media:", error);
    chatArea.innerHTML = `
      <div class="controls">
        <button class="control-btn" onclick="exitGalleryMode()">🔙 Back to Chat</button>
      </div>
      <div style="padding:20px;text-align:center;">
        <h2>🖼️ My Gallery</h2>
        <p style="color:#ff6b6b;margin:20px 0;">❌ Error loading your media. Please try again!</p>
      </div>
    `;
  }
}

// Display media gallery with lazy loading
function displayMediaGalleryFast(images, videos) {
  const chatArea = document.getElementById("chatArea");

  let imageGallery =
    '<h3>📸 Your Saved Images</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:15px;margin:20px 0;" id="imageGallery">';

  if (images && images.length > 0) {
    images.forEach((img) => {
      imageGallery += `
        <div id="img-${
          img.id
        }" style="border:2px solid rgba(255,255,255,0.3);border-radius:10px;padding:10px;background:rgba(255,255,255,0.1);">
          <div style="width:100%;height:150px;background:rgba(255,255,255,0.1);border-radius:8px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);">
            <span onclick="loadImage('${
              img.id
            }')" style="cursor:pointer;">👁️ Click to View</span>
          </div>
          <p style="font-size:0.8em;margin:5px 0;">${img.prompt.substring(
            0,
            40
          )}...</p>
          <small style="color:rgba(255,255,255,0.5);">${new Date(
            img.created_at
          ).toLocaleDateString()}</small>
        </div>
      `;
    });
  } else {
    imageGallery +=
      "<p>No saved images yet. Generate some images to see them here! 🎨</p>";
  }

  imageGallery += "</div>";

  let videoGallery =
    '<h3>🎬 Your Saved Videos</h3><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:15px;margin:20px 0;" id="videoGallery">';

  if (videos && videos.length > 0) {
    videos.forEach((vid) => {
      videoGallery += `
        <div id="vid-${
          vid.id
        }" style="border:2px solid rgba(255,255,255,0.3);border-radius:10px;padding:10px;background:rgba(255,255,255,0.1);">
          <div style="width:100%;height:180px;background:rgba(255,255,255,0.1);border-radius:8px;margin-bottom:8px;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.5);">
            <span onclick="loadVideo('${
              vid.id
            }')" style="cursor:pointer;">👁️ Click to View</span>
          </div>
          <p style="font-size:0.8em;margin:5px 0;">${vid.prompt.substring(
            0,
            40
          )}...</p>
          <small style="color:rgba(255,255,255,0.5);">${new Date(
            vid.created_at
          ).toLocaleDateString()}</small>
        </div>
      `;
    });
  } else {
    videoGallery +=
      "<p>No saved videos yet. Generate some videos to see them here! 🎬</p>";
  }

  videoGallery += "</div>";

  chatArea.innerHTML = `
    <div class="controls">
      <button class="control-btn" onclick="exitGalleryMode()">🔙 Back to Chat</button>
    </div>
    <div style="padding:20px;max-height:80vh;overflow-y:auto;">
      <h2>🖼️ My Gallery</h2>
      <p style="color:rgba(255,255,255,0.7);margin-bottom:20px;">Click on any item to load and view it</p>
      ${imageGallery}
      ${videoGallery}
    </div>
  `;

  showNotification("📸 Gallery loaded! Click items to view them.");
}

// Load individual image on demand
async function loadImage(imageId) {
  const container = document.getElementById(`img-${imageId}`);
  if (!container) return;

  container.innerHTML =
    '<p style="text-align:center;padding:50px 0;">Loading... ⏳</p>';

  try {
    const { data, error } = await window.supabaseClient
      .from("generated_images")
      .select("image_data, mime_type, prompt")
      .eq("id", imageId)
      .single();

    if (error) throw error;

    if (data && data.image_data) {
      const dataUrl = `data:${data.mime_type};base64,${data.image_data}`;
      container.innerHTML = `
        <img src="${dataUrl}" style="width:100%;height:150px;object-fit:cover;border-radius:8px;margin-bottom:8px;">
        <p style="font-size:0.8em;margin:5px 0;">${data.prompt.substring(
          0,
          40
        )}...</p>
        <button onclick="downloadImage('${dataUrl}', 'image-${imageId}.png')" style="background:#4fc3f7;border:none;padding:5px 10px;border-radius:5px;color:white;cursor:pointer;font-size:0.8em;width:100%;">📥 Download</button>
      `;
    } else {
      container.innerHTML = '<p style="color:#ff6b6b;">Image not found</p>';
    }
  } catch (error) {
    console.error("Error loading image:", error);
    container.innerHTML = '<p style="color:#ff6b6b;">Error loading image</p>';
  }
}

// Load individual video on demand
async function loadVideo(videoId) {
  const container = document.getElementById(`vid-${videoId}`);
  if (!container) return;

  container.innerHTML =
    '<p style="text-align:center;padding:80px 0;">Loading video... ⏳</p>';

  try {
    const { data, error } = await window.supabaseClient
      .from("generated_videos")
      .select("video_data, mime_type, prompt")
      .eq("id", videoId)
      .single();

    if (error) throw error;

    if (data && data.video_data) {
      const dataUrl = `data:${data.mime_type};base64,${data.video_data}`;
      container.innerHTML = `
        <video controls style="width:100%;border-radius:8px;margin-bottom:8px;">
          <source src="${dataUrl}" type="${data.mime_type}">
        </video>
        <p style="font-size:0.8em;margin:5px 0;">${data.prompt.substring(
          0,
          40
        )}...</p>
        <button onclick="downloadVideo('${dataUrl}', 'video-${videoId}.mp4')" style="background:#4fc3f7;border:none;padding:5px 10px;border-radius:5px;color:white;cursor:pointer;font-size:0.8em;width:100%;">📥 Download</button>
      `;
    } else {
      container.innerHTML = '<p style="color:#ff6b6b;">Video not found</p>';
    }
  } catch (error) {
    console.error("Error loading video:", error);
    container.innerHTML = '<p style="color:#ff6b6b;">Error loading video</p>';
  }
}

// Save chat messages to Supabase
async function saveChatToDatabase(userMessage, assistantMessage) {
  if (!currentUser || !window.supabaseClient) return;

  try {
    // Determine current mode
    let currentMode = "general";
    if (socialStoriesMode) currentMode = "social_stories";
    else if (calmBreathingMode) currentMode = "calm_breathing";
    else if (feelingsHelperMode) currentMode = "feelings_helper";
    else if (memoryGameMode) currentMode = "memory_game";
    else if (colorsShapesMode) currentMode = "colors_shapes";

    // Save both messages
    const { error } = await window.supabaseClient.from("chat_history").insert([
      {
        user_id: currentUser.id,
        role: "user",
        message_text: userMessage,
        mode: currentMode,
      },
      {
        user_id: currentUser.id,
        role: "assistant",
        message_text: assistantMessage,
        mode: currentMode,
      },
    ]);

    if (error) throw error;

    console.log("✅ Chat saved to database");
  } catch (error) {
    console.error("Error saving chat:", error);
    // Don't show error to user - just log it
  }
}

// Save image generation to Supabase
async function saveImageGenerationToDatabase(
  prompt,
  imageData = null,
  mimeType = null
) {
  if (!currentUser || !window.supabaseClient) return;

  try {
    let currentMode = "general";
    if (socialStoriesMode) currentMode = "social_stories";

    await window.supabaseClient.from("generated_images").insert({
      user_id: currentUser.id,
      prompt: prompt,
      mode: currentMode,
      image_data: imageData, // Save the actual image
      mime_type: mimeType,
    });

    console.log("✅ Image generation saved to database");
  } catch (error) {
    console.error("Error saving image generation:", error);
  }
}

// Save video generation to Supabase
async function saveVideoGenerationToDatabase(
  prompt,
  videoData = null,
  mimeType = null
) {
  if (!currentUser || !window.supabaseClient) return;

  try {
    await window.supabaseClient.from("generated_videos").insert({
      user_id: currentUser.id,
      prompt: prompt,
      video_data: videoData, // Save the actual video
      mime_type: mimeType,
    });

    console.log("✅ Video generation saved to database");
  } catch (error) {
    console.error("Error saving video generation:", error);
  }
}

function checkIfImageRequest(message) {
  const imageKeywords = [
    "generate image",
    "create image",
    "make image",
    "draw",
    "picture of",
    "show me image",
    "create picture",
    "generate picture",
    "make picture",
    "draw me",
    "create drawing",
    "make drawing",
    "image of",
    "picture",
    "generate photo",
    "create photo",
    "illustration",
    "sketch",
    "paint",
    "show me a photo",
    "can you draw",
    "show me what",
    "looks like",
  ];
  return imageKeywords.some((k) => message.toLowerCase().includes(k));
}

// Helper function to detect video generation requests (client-side)
function checkIfVideoRequest(message) {
  const videoKeywords = [
    "generate video",
    "create video",
    "make video",
    "video of",
    "show me video",
    "create animation",
    "make animation",
    "animate",
    "video clip",
    "moving picture",
    "motion",
    "film",
    "movie",
    "animated",
    "show movement",
    "in motion",
    "moving",
    "action",
  ];

  const lowerMessage = message.toLowerCase();
  return videoKeywords.some((keyword) => lowerMessage.includes(keyword));
}

function showTypingIndicator(
  isImageGeneration = false,
  isVideoGeneration = false
) {
  const messagesContainer = document.getElementById("messages");
  const typingDiv = document.createElement("div");
  typingDiv.className = "message assistant typing-indicator";
  typingDiv.id = "typing-indicator";

  // Choose the appropriate text and emoji based on generation type
  let indicatorText = "thinking...";
  let indicatorEmoji = "💭";

  if (isVideoGeneration) {
    indicatorText = "creating video... (this may take a minute)";
    indicatorEmoji = "🎬";
  } else if (isImageGeneration) {
    indicatorText = "sketching...";
    indicatorEmoji = "🎨";
  }

  typingDiv.innerHTML = `
        <div class="message-avatar">${indicatorEmoji}</div>
        <div class="message-content">
            ${indicatorText}
        </div>
    `;

  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTypingIndicator() {
  const indicator = document.getElementById("typing-indicator");
  if (indicator) indicator.remove();
}

function addMessage(
  type,
  content,
  avatar,
  messageId = null,
  imageData = null,
  mimeType = null,
  videoData = null,
  videoMimeType = null
) {
  const messagesContainer = document.getElementById("messages");
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${type}`;

  // Process content based on message type
  let processedContent = content;
  if (type === "assistant") {
    // Parse markdown for assistant messages
    processedContent = processMarkdown(content);
  } else {
    // For user messages, just escape HTML and preserve line breaks
    processedContent = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
  }

  // Add video if provided
  let videoHtml = "";
  if (videoData && videoMimeType) {
    const dataUrl = `data:${videoMimeType};base64,${videoData}`;
    videoHtml = `
            <div class="generated-video-container">
                <video controls style="max-width: 100%; height: auto; border-radius: 10px; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                    <source src="${dataUrl}" type="${videoMimeType}">
                    Your browser does not support the video tag.
                </video>
                <div class="video-controls">
                    <button onclick="downloadVideo('${dataUrl}', 'generated-video-${Date.now()}.mp4')" 
                            style="background: linear-gradient(135deg, #4fc3f7, #29b6f6); border: none; border-radius: 8px; padding: 6px 12px; color: white; cursor: pointer; font-size: 0.9em; transition: all 0.3s ease;"
                            onmouseover="this.style.transform='scale(1.05)'"
                            onmouseout="this.style.transform='scale(1)'">
                        📥 Download Video
                    </button>
                </div>
            </div>
        `;
  }

  // Add image if provided
  let imageHtml = "";
  if (imageData && mimeType) {
    const dataUrl = `data:${mimeType};base64,${imageData}`;
    imageHtml = `
            <div class="generated-image-container" style="margin: 10px 0;">
                <img src="${dataUrl}" alt="Generated Image" style="max-width: 100%; height: auto; border-radius: 10px; border: 2px solid rgba(255,255,255,0.3); box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
                <div style="margin-top: 8px;">
                    <button onclick="downloadImage('${dataUrl}', 'generated-image-${Date.now()}.png')" 
                            style="background: linear-gradient(135deg, #4fc3f7, #29b6f6); border: none; border-radius: 8px; padding: 6px 12px; color: white; cursor: pointer; font-size: 0.9em; transition: all 0.3s ease;"
                            onmouseover="this.style.transform='scale(1.05)'"
                            onmouseout="this.style.transform='scale(1)'">
                        📥 Download Image
                    </button>
                </div>
            </div>
        `;
  }

  messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            ${processedContent}
            ${videoHtml}
            ${imageHtml}
            ${
              type === "assistant"
                ? `
                <div class="emoji-reactions">
                    <button class="emoji-btn" onclick="reactWithEmoji('😊')" tabindex="0">😊</button>
                    <button class="emoji-btn" onclick="reactWithEmoji('👍')" tabindex="0">👍</button>
                    <button class="emoji-btn" onclick="reactWithEmoji('❤️')" tabindex="0">❤️</button>
                </div>
            `
                : ""
            }
        </div>
    `;

  messagesContainer.appendChild(messageDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;

  // Only speak if this is a new assistant message and voice is enabled
  if (
    voiceEnabled &&
    type === "assistant" &&
    messageId &&
    "speechSynthesis" in window
  ) {
    // Remove markdown syntax for speech
    const textForSpeech = content
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/#{1,6}\s/g, "")
      .replace(/\n/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1"); // Remove markdown links
    speakText(textForSpeech, messageId);
  }
}

function downloadImage(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification("📥 Image downloaded!");
}

// Add this new function for downloading videos
function downloadVideo(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification("📥 Video downloaded!");
}

function speakAs(character) {
  currentCharacter = character;
  lastMessageId++;
  const userName = currentUserName || "friend";
  const messages = {
    tom: `**Meow!** Hi ${userName}! I'm **Tom**, and I'm excited to chat with you today! 🐱\n\nI can help you with:\n- Learning new things\n- Answering questions\n- Having fun conversations\n\nWhat would you like to talk about?`,
    jerry: `**Squeak squeak!** Hello ${userName}! I'm **Jerry**, and I can't wait to have fun conversations with you! 🐭\n\n*I love to:*\n- Share interesting facts\n- Help with problems\n- Make learning fun!\n\nWhat's on your mind today?`,
  };
  addMessage(
    "assistant",
    messages[character],
    character === "tom" ? "🐱" : "🐭",
    lastMessageId
  );
}

function showDevelopmentMessage(activityName) {
  if (calmBreathingMode) {
    exitCalmBreathingModeQuietly();
  }

  if (socialStoriesMode) {
    exitSocialStoriesModeQuietly();
  }

  if (feelingsHelperMode) {
    exitFeelingsHelperModeQuietly();
  }

  if (memoryGameMode) {
    exitMemoryGameModeQuietly();
  }

  lastMessageId++;
  const message = `🚧 **${activityName}** is still in development!\n\nBut don't worry - I'm here to chat about anything you'd like to talk about.\n\n*Some things I can help with:*\n- Answering questions\n- Explaining concepts\n- Creative writing\n- Problem solving\n- Fun conversations\n\nWhat interests you? 🌟`;
  addMessage(
    "assistant",
    message,
    Math.random() > 0.5 ? "🐱" : "🐭",
    lastMessageId
  );
}

function updateProgress(newProgress) {
  progress = Math.min(newProgress, 100);
  const progressBar = document.getElementById("progressBar");
  if (progressBar) {
    progressBar.style.width = progress + "%";
  }
  if (progress >= 90)
    showNotification("🏆 Amazing progress! You're doing so well!");
}

function clearChat() {
  if (calmBreathingMode) {
    exitCalmBreathingMode();
    return;
  }
  if (socialStoriesMode) {
    exitSocialStoriesMode();
    return;
  }
  if (feelingsHelperMode) {
    exitFeelingsHelperMode();
    return;
  }
  if (memoryGameMode) {
    exitMemoryGameMode();
    return;
  }
  const container = document.getElementById("messages");
  conversationHistory = [];
  lastMessageId++;
  stopCurrentSpeech();
  const welcomeMessage = `**Chat cleared!** 🧹✨\n\nTom and Jerry are ready for a fresh start!\n\nWhat would you like to talk about? 🌟\n\n*Feel free to ask me about anything - I'm here to help and chat!*`;
  container.innerHTML = `<div class="message assistant"><div class="message-avatar">🐱</div><div class="message-content">${processMarkdown(
    welcomeMessage
  )}<div class="emoji-reactions">
    <button class="emoji-btn" onclick="reactWithEmoji('😊')">😊</button>
    <button class="emoji-btn" onclick="reactWithEmoji('👍')">👍</button>
    <button class="emoji-btn" onclick="reactWithEmoji('❤️')">❤️</button></div></div></div>`;
}

function showHelp() {
  lastMessageId++;
  const helpMessage = `## 🤖 How to use the Learning Assistant

**Chat Features:**
- Click **Tom** 🐱 or **Jerry** 🐭 to greet them
- Type messages to chat about *anything*
- Use control buttons for features

**What I can help with:**
1. **Answering questions** - Ask me anything!
2. **Explaining concepts** - I'll break it down
3. **Creative writing** - Stories, poems, ideas
4. **Problem solving** - Let's work together
5. **Fun conversations** - Just chat and have fun!
6. **Social Stories** - Visual stories to learn situations
7. **Calm Breathing** - Relax with nature sounds
8. **Feelings Helper** - Share and talk about your emotions
9. **Memory Game** - Fun matching game with levels!

**Tips:**
- I understand *markdown* formatting
- Ask follow-up questions
- Be specific for better help
- **Celebrate your progress!** 🎉

*What would you like to explore together?* 🌟`;
  addMessage("assistant", helpMessage, "❓", lastMessageId);
}

function celebrateProgress() {
  lastMessageId++;
  const celebrationMessage = `## 🎉 **AMAZING WORK!** 🎉\n\n**Tom and Jerry are SO proud of you!** 🐱🐭\n\n*You're doing fantastic by:*\n- Asking great questions\n- Being curious and engaged\n- Making excellent progress\n\n### ⭐ Keep up the wonderful work! ⭐\n\n*What would you like to learn about next?* 🌈`;
  showNotification("🎉 Amazing work! Tom and Jerry are so proud! 🌟");
  addMessage("assistant", celebrationMessage, "🎉", lastMessageId);
  updateProgress(progress + 10);
}

function reactWithEmoji(emoji) {
  showNotification(`You reacted with ${emoji}! 😊`);
}

function showNotification(message) {
  const authModal = document.getElementById("authModal");

  // ❌ Do NOT show notification if auth modal is visible
  if (authModal && authModal.style.display !== "none") {
    return;
  }

  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #66bb6a, #4caf50);
        color: white;
        padding: 16px 24px;
        border-radius: 15px;
        font-size: 1em;
        z-index: 1001;
        border: 2px solid rgba(255, 255, 255, 0.3);
        animation: popIn 0.5s ease-out;
        max-width: 90%;
        text-align: center;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.transition = "opacity 0.5s ease";
    notification.style.opacity = "0";
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 500);
  }, 3000);
}

function changeTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  const selectedTheme = themes[currentThemeIndex];
  document.body.style.background = selectedTheme.bg;
  showNotification(`🎨 Theme: ${selectedTheme.name}!`);
}

function enterGeneralMode() {
  if (galleryMode) {
    exitGalleryMode();
    return;
  }
  if (socialStoriesMode) {
    exitSocialStoriesMode();
    return;
  }

  if (feelingsHelperMode) {
    exitFeelingsHelperMode();
    return;
  }

  if (memoryGameMode) {
    exitMemoryGameMode();
    return;
  }

  if (calmBreathingMode) {
    exitCalmBreathingMode();
    return;
  }
  if (colorsShapesMode) {
    exitColorsShapesMode();
    return;
  }

  showNotification("✨ You're already in General Chat!");
}

function enterSocialStoriesMode() {
  if (calmBreathingMode) {
    exitCalmBreathingModeQuietly();
  }

  if (feelingsHelperMode) {
    exitFeelingsHelperModeQuietly();
  }

  if (memoryGameMode) {
    exitMemoryGameModeQuietly();
  }

  conversationHistory = [];
  socialStoriesMode = true;
  calmBreathingMode = false;
  feelingsHelperMode = false;
  memoryGameMode = false;
  lastMessageId++;
  stopCurrentSpeech();
  stopAllSounds();

  const chatArea = document.getElementById("chatArea");
  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn exit-btn" onclick="exitSocialStoriesMode()" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); font-weight: bold;">🚪 Exit Social Stories</button>
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="social-stories-buttons" id="socialStoriesButtons">
            <button class="story-btn" onclick="showSocialStory('hospital')">
                <span class="story-emoji">🏥</span>
                <span class="story-text">Go to Hospital</span>
            </button>
            <button class="story-btn" onclick="showSocialStory('salon')">
                <span class="story-emoji">💇</span>
                <span class="story-text">Go to Salon</span>
            </button>
            <button class="story-btn" onclick="showSocialStory('dentist')">
                <span class="story-emoji">🦷</span>
                <span class="story-text">Visit Dentist</span>
            </button>
            <button class="story-btn" onclick="showSocialStory('party')">
                <span class="story-emoji">🎉</span>
                <span class="story-text">Go to Party</span>
            </button>
            <button class="story-btn" onclick="showSocialStory('friends')">
                <span class="story-emoji">👋</span>
                <span class="story-text">Meet Friends</span>
            </button>
        </div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  const socialStoriesWelcome = `## 📚 **Welcome to Social Stories!** 🎨\n\n**Social stories help you learn about different situations in a fun, visual way!** 😊\n\n### How it works:\n1. Click one of the buttons below to see a social story\n2. Or type your own situation to create a custom story\n3. Each panel shows what to do step-by-step\n\n### Quick Stories Available:\n- **Hospital** 🏥 - Learn about visiting the hospital\n- **Salon** 💇 - Going to get a haircut\n- **Dentist** 🦷 - Visiting the dentist\n- **Party** 🎉 - Going to a party\n- **Friends** 👋 - Meeting new friends\n\n**Click a button below or tell me what situation you'd like to learn about!** 🌟\n\n*Press the Exit button anytime to go back to regular chat!*`;

  const messagesContainer = document.getElementById("messages");
  messagesContainer.innerHTML = `<div class="message assistant"><div class="message-avatar">📚</div><div class="message-content">${processMarkdown(
    socialStoriesWelcome
  )}</div></div>`;

  showNotification("📚 Entered Social Stories Mode!");
}

function showSocialStory(storyType) {
  const storyMap = {
    hospital: "how-to-go-to-hospital.jpg",
    salon: "how-to-go-to-salon.jpg",
    dentist: "how-to-visit-dentist.jpg",
    party: "how-to-go-to-party.jpg",
    friends: "how-to-meet-new-friends.jpg",
  };

  const storyTitles = {
    hospital: "How to Go to the Hospital 🏥",
    salon: "How to Go to the Salon 💇",
    dentist: "How to Visit the Dentist 🦷",
    party: "How to Go to a Party 🎉",
    friends: "How to Meet New Friends 👋",
  };

  const imageFile = storyMap[storyType];
  const title = storyTitles[storyType];

  lastMessageId++;

  const storyMessage = `## 📚 **${title}**\n\nHere's your social story! Look at each panel to learn what to do. 😊\n\n*You can click another button to see a different story, or press Exit to go back to regular chat!*`;

  const container = document.getElementById("messages");
  const div = document.createElement("div");
  div.className = "message assistant";

  const imageHtml = `<div style="margin:10px 0">
        <img src="${imageFile}" alt="${title}" style="max-width:100%;height:auto;border-radius:10px;border:2px solid rgba(255,255,255,0.3);box-shadow:0 4px 15px rgba(0,0,0,0.3)">
    </div>`;

  div.innerHTML = `<div class="message-avatar">📚</div><div class="message-content">${processMarkdown(
    storyMessage
  )}${imageHtml}<div class="emoji-reactions">
    <button class="emoji-btn" onclick="reactWithEmoji('😊')">😊</button>
    <button class="emoji-btn" onclick="reactWithEmoji('👍')">👍</button>
    <button class="emoji-btn" onclick="reactWithEmoji('❤️')">❤️</button></div></div>`;

  container.appendChild(div);
  container.scrollTop = container.scrollHeight;

  showNotification(`📚 Showing: ${title}`);
}

function exitSocialStoriesMode() {
  socialStoriesMode = false;
  conversationHistory = [];
  stopCurrentSpeech();

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  const messagesContainer = document.getElementById("messages");
  lastMessageId++;
  const returnMessage = `## ✨ **Back to General Chat!** 🌈\n\n**Tom and Jerry are happy to chat with you again!** 🐱🐭\n\n*What would you like to talk about?* I can help with:\n- Answering questions 🤔\n- Explaining concepts 📖\n- Creative stories 📝\n- Fun conversations 💬\n- And much more! 🎉\n\nJust ask me anything! 😊`;
  messagesContainer.innerHTML = `<div class="message assistant"><div class="message-avatar">🐱</div><div class="message-content">${processMarkdown(
    returnMessage
  )}<div class="emoji-reactions">
    <button class="emoji-btn" onclick="reactWithEmoji('😊')">😊</button>
    <button class="emoji-btn" onclick="reactWithEmoji('👍')">👍</button>
    <button class="emoji-btn" onclick="reactWithEmoji('❤️')">❤️</button></div></div></div>`;

  showNotification("✨ Returned to General Chat!");
}

function enterCalmBreathingMode() {
  if (socialStoriesMode) {
    exitSocialStoriesModeQuietly();
  }

  if (feelingsHelperMode) {
    exitFeelingsHelperModeQuietly();
  }

  if (memoryGameMode) {
    exitMemoryGameModeQuietly();
  }

  calmBreathingMode = true;
  socialStoriesMode = false;
  feelingsHelperMode = false;
  memoryGameMode = false;
  conversationHistory = [];
  stopCurrentSpeech();
  stopAllSounds();

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn exit-btn" id="exitCalmBreathingBtn" onclick="exitCalmBreathingMode()" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); font-weight: bold;">🚪 Exit Calm Breathing</button>
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
        </div>
        <div class="calm-breathing-container">
            <h2 class="calm-breathing-title">🫁 Calm Breathing</h2>
            <p class="calm-breathing-subtitle">Choose a calming sound to help you relax and breathe deeply</p>
            
            <div class="breathing-animation"></div>
            
            <div class="sound-options">
                <div class="sound-card" id="waterfall-card" onclick="playSound('waterfall')">
                    <div class="play-indicator">▶️</div>
                    <div class="sound-image">${sounds.waterfall.emoji}</div>
                    <div class="sound-name">${sounds.waterfall.name}</div>
                    <div class="sound-description">${sounds.waterfall.description}</div>
                </div>
                
                <div class="sound-card" id="forest-card" onclick="playSound('forest')">
                    <div class="play-indicator">▶️</div>
                    <div class="sound-image">${sounds.forest.emoji}</div>
                    <div class="sound-name">${sounds.forest.name}</div>
                    <div class="sound-description">${sounds.forest.description}</div>
                </div>
            </div>
            
            <p style="margin-top: 20px; color: rgba(255,255,255,0.7); text-align: center;">
                Take deep breaths: Breathe in slowly through your nose for 4 counts, hold for 4, and breathe out for 4 counts 🌬️
            </p>
        </div>
        <div class="messages" id="messages" style="display:none;"></div>
        <div class="input-area" id="inputArea" style="display:none;">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  showNotification("🫁 Entered Calm Breathing Mode!");
}

function exitCalmBreathingMode() {
  calmBreathingMode = false;
  stopAllSounds();

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  const messagesContainer = document.getElementById("messages");
  lastMessageId++;
  const returnMessage = `## ✨ **Back to General Chat!** 🌈\n\n**Tom and Jerry are happy to chat with you again!** 🐱🐭\n\n*How are you feeling now?* I hope the calm breathing helped you relax! 😊\n\nWhat would you like to talk about? 💬`;
  messagesContainer.innerHTML = `<div class="message assistant"><div class="message-avatar">🐱</div><div class="message-content">${processMarkdown(
    returnMessage
  )}<div class="emoji-reactions">
    <button class="emoji-btn" onclick="reactWithEmoji('😊')">😊</button>
    <button class="emoji-btn" onclick="reactWithEmoji('👍')">👍</button>
    <button class="emoji-btn" onclick="reactWithEmoji('❤️')">❤️</button></div></div></div>`;

  showNotification("✨ Returned to General Chat!");
}

function exitCalmBreathingModeQuietly() {
  calmBreathingMode = false;
  stopAllSounds();

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;
}

function exitSocialStoriesModeQuietly() {
  socialStoriesMode = false;
  conversationHistory = [];

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;
}

function playSound(soundType) {
  const sound = sounds[soundType];
  if (!sound) {
    console.error("Sound not found:", soundType);
    return;
  }

  console.log("Playing sound:", soundType);

  document
    .querySelectorAll(".sound-card")
    .forEach((card) => card.classList.remove("playing"));

  if (currentPlayingSound === soundType) {
    stopAllSounds();
    currentPlayingSound = null;
    showNotification(`⏸️ Stopped ${sound.name}`);
    return;
  }

  stopAllSounds();

  const success = playMP3Sound(soundType);

  if (success) {
    currentPlayingSound = soundType;
    const card = document.getElementById(`${soundType}-card`);
    if (card) {
      card.classList.add("playing");
    }
    showNotification(`▶️ Playing ${sound.name}`);
  }
}

function stopAllSounds() {
  stopMP3Sounds();
  currentPlayingSound = null;
  document
    .querySelectorAll(".sound-card")
    .forEach((card) => card.classList.remove("playing"));
}

function enterFeelingsHelperMode() {
  if (calmBreathingMode) {
    exitCalmBreathingModeQuietly();
  }

  if (socialStoriesMode) {
    exitSocialStoriesModeQuietly();
  }

  if (memoryGameMode) {
    exitMemoryGameModeQuietly();
  }

  feelingsHelperMode = true;
  socialStoriesMode = false;
  calmBreathingMode = false;
  memoryGameMode = false;
  conversationHistory = [];
  stopCurrentSpeech();
  stopAllSounds();

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn exit-btn" onclick="exitFeelingsHelperMode()" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); font-weight: bold;">🚪 Exit Feelings Helper</button>
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="feelings-buttons-container" id="feelingsButtons">
            <div class="feelings-row">
                <button class="feeling-btn" onclick="selectFeeling('happy')" style="background: linear-gradient(135deg, ${feelings.happy.color}, #FFA500);">
                    <div class="feeling-emoji">${feelings.happy.emoji}</div>
                    <div class="feeling-name">${feelings.happy.name}</div>
                </button>
                <button class="feeling-btn" onclick="selectFeeling('sad')" style="background: linear-gradient(135deg, ${feelings.sad.color}, #2E86AB);">
                    <div class="feeling-emoji">${feelings.sad.emoji}</div>
                    <div class="feeling-name">${feelings.sad.name}</div>
                </button>
                <button class="feeling-btn" onclick="selectFeeling('tired')" style="background: linear-gradient(135deg, ${feelings.tired.color}, #6C5B7B);">
                    <div class="feeling-emoji">${feelings.tired.emoji}</div>
                    <div class="feeling-name">${feelings.tired.name}</div>
                </button>
                <button class="feeling-btn" onclick="selectFeeling('scared')" style="background: linear-gradient(135deg, ${feelings.scared.color}, #3498DB);">
                    <div class="feeling-emoji">${feelings.scared.emoji}</div>
                    <div class="feeling-name">${feelings.scared.name}</div>
                </button>
            </div>
            <div class="feelings-row">
                <button class="feeling-btn" onclick="selectFeeling('angry')" style="background: linear-gradient(135deg, ${feelings.angry.color}, #C0392B);">
                    <div class="feeling-emoji">${feelings.angry.emoji}</div>
                    <div class="feeling-name">${feelings.angry.name}</div>
                </button>
                <button class="feeling-btn" onclick="selectFeeling('nervous')" style="background: linear-gradient(135deg, ${feelings.nervous.color}, #5F9E6E);">
                    <div class="feeling-emoji">${feelings.nervous.emoji}</div>
                    <div class="feeling-name">${feelings.nervous.name}</div>
                </button>
                <button class="feeling-btn" onclick="selectFeeling('shy')" style="background: linear-gradient(135deg, ${feelings.shy.color}, #FF69B4);">
                    <div class="feeling-emoji">${feelings.shy.emoji}</div>
                    <div class="feeling-name">${feelings.shy.name}</div>
                </button>
                <button class="feeling-btn" onclick="selectFeeling('excited')" style="background: linear-gradient(135deg, ${feelings.excited.color}, #FF6347);">
                    <div class="feeling-emoji">${feelings.excited.emoji}</div>
                    <div class="feeling-name">${feelings.excited.name}</div>
                </button>
            </div>
            <div class="feelings-row">
                <button class="feeling-btn" onclick="selectFeeling('bored')" style="background: linear-gradient(135deg, ${feelings.bored.color}, #E6B333);">
                    <div class="feeling-emoji">${feelings.bored.emoji}</div>
                    <div class="feeling-name">${feelings.bored.name}</div>
                </button>
                <button class="feeling-btn" onclick="selectFeeling('silly')" style="background: linear-gradient(135deg, ${feelings.silly.color}, #1ABC9C);">
                    <div class="feeling-emoji">${feelings.silly.emoji}</div>
                    <div class="feeling-name">${feelings.silly.name}</div>
                </button>
                <button class="feeling-btn" onclick="selectFeeling('worried')" style="background: linear-gradient(135deg, ${feelings.worried.color}, #9B59B6);">
                    <div class="feeling-emoji">${feelings.worried.emoji}</div>
                    <div class="feeling-name">${feelings.worried.name}</div>
                </button>
                <button class="feeling-btn" onclick="selectFeeling('sick')" style="background: linear-gradient(135deg, ${feelings.sick.color}, #48B5C4);">
                    <div class="feeling-emoji">${feelings.sick.emoji}</div>
                    <div class="feeling-name">${feelings.sick.name}</div>
                </button>
            </div>
        </div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  const messagesContainer = document.getElementById("messages");
  lastMessageId++;
  const welcomeMessage = `## 😊 **Welcome to Feelings Helper!** ❤️\n\n**How are you feeling today?** I'm here to listen and help you with your emotions! 🌟\n\n### Choose a feeling:\nClick on any emoji below that matches how you're feeling right now. I'll help you talk about it and feel better! 💙\n\n*You can also type to tell me about your feelings, or press Exit to go back to regular chat.*`;

  messagesContainer.innerHTML = `<div class="message assistant"><div class="message-avatar">❤️</div><div class="message-content">${processMarkdown(
    welcomeMessage
  )}</div></div>`;

  showNotification("😊 Entered Feelings Helper Mode!");
}

async function selectFeeling(feelingType) {
  const feeling = feelings[feelingType];
  if (!feeling) {
    console.error("Feeling not found:", feelingType);
    return;
  }

  lastMessageId++;
  addMessage(
    "user",
    `I'm feeling ${feeling.name.toLowerCase()} ${feeling.emoji}`,
    feeling.emoji
  );

  showTypingIndicator(false);

  try {
    const systemContext = `The user just expressed feeling ${feeling.name.toLowerCase()}. Respond empathetically as a supportive friend for an autistic child. Ask follow-up questions to understand why they feel this way. Be kind, supportive, and help them process their emotions. Use simple language, emojis, and be encouraging.`;

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: feeling.prompt,
        conversationHistory: [{ role: "system", content: systemContext }],
        socialStoriesMode: false,
      }),
    });

    const data = await response.json();
    hideTypingIndicator();

    if (data.response) {
      lastMessageId++;
      addMessage("assistant", data.response, "❤️", lastMessageId);
      conversationHistory.push(
        {
          role: "user",
          content: `I'm feeling ${feeling.name.toLowerCase()}`,
        },
        { role: "assistant", content: data.response }
      );
      // Save to database
      if (currentUser && window.supabaseClient) {
        saveChatToDatabase(
          `I'm feeling ${feeling.name.toLowerCase()}`,
          data.response
        );
      }
    } else {
      lastMessageId++;
      addMessage(
        "assistant",
        "I'm here for you. Can you tell me more about how you're feeling?",
        "❤️",
        lastMessageId
      );
    }
  } catch (error) {
    console.error("Error:", error);
    hideTypingIndicator();
    lastMessageId++;
    addMessage(
      "assistant",
      "I'm here to listen. Tell me more about how you're feeling, and I'll do my best to help! 💙",
      "❤️",
      lastMessageId
    );
  }
}

function exitFeelingsHelperMode() {
  feelingsHelperMode = false;
  conversationHistory = [];
  stopCurrentSpeech();

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  const messagesContainer = document.getElementById("messages");
  lastMessageId++;
  const returnMessage = `## ✨ **Back to General Chat!** 🌈\n\n**Tom and Jerry are happy to chat with you again!** 🐱🐭\n\n*I hope talking about your feelings helped!* Remember, it's always okay to share how you feel. 💙\n\nWhat would you like to talk about now? 😊`;
  messagesContainer.innerHTML = `<div class="message assistant"><div class="message-avatar">🐱</div><div class="message-content">${processMarkdown(
    returnMessage
  )}<div class="emoji-reactions">
    <button class="emoji-btn" onclick="reactWithEmoji('😊')">😊</button>
    <button class="emoji-btn" onclick="reactWithEmoji('👍')">👍</button>
    <button class="emoji-btn" onclick="reactWithEmoji('❤️')">❤️</button></div></div></div>`;

  showNotification("✨ Returned to General Chat!");
}

function exitFeelingsHelperModeQuietly() {
  feelingsHelperMode = false;
  conversationHistory = [];

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;
}

function enterMemoryGameMode() {
  if (calmBreathingMode) {
    exitCalmBreathingModeQuietly();
  }

  if (socialStoriesMode) {
    exitSocialStoriesModeQuietly();
  }

  if (feelingsHelperMode) {
    exitFeelingsHelperModeQuietly();
  }

  memoryGameMode = true;
  socialStoriesMode = false;
  calmBreathingMode = false;
  feelingsHelperMode = false;
  conversationHistory = [];
  stopCurrentSpeech();
  stopAllSounds();

  memoryGameLevel = 1;
  memoryGameMoves = 0;

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn exit-btn" onclick="exitMemoryGameMode()" style="background: linear-gradient(135deg, #ff6b6b, #ee5a24); font-weight: bold;">🚪 Exit Memory Game</button>
            <button class="control-btn" onclick="resetMemoryGame()">🔄 Restart</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
        </div>
        <div class="memory-game-container">
            <h2 class="memory-game-title">🎮 Memory Matching Game</h2>
            <div class="memory-game-info">
                <div class="memory-level">Level: <span id="memoryLevel">1</span></div>
                <div class="memory-moves">Moves: <span id="memoryMoves">0</span></div>
            </div>
            <div class="memory-grid" id="memoryGrid"></div>
        </div>
        <div class="messages" id="messages" style="display:none;"></div>
        <div class="input-area" id="inputArea" style="display:none;">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  showNotification("🎮 Welcome to Memory Game!");
  initializeMemoryGame();
}

function initializeMemoryGame() {
  const gridConfigs = [
    { rows: 2, cols: 2 },
    { rows: 2, cols: 3 },
    { rows: 3, cols: 4 },
    { rows: 4, cols: 4 },
    { rows: 4, cols: 5 },
    { rows: 5, cols: 6 },
  ];

  const config = gridConfigs[memoryGameLevel - 1];
  const totalCards = config.rows * config.cols;
  totalPairs = totalCards / 2;

  matchedPairs = 0;
  flippedCards = [];
  canFlip = true;

  if (memoryGameLevel === 1) {
    memoryGameMoves = 0;
  }

  document.getElementById("memoryLevel").textContent = memoryGameLevel;
  document.getElementById("memoryMoves").textContent = memoryGameMoves;

  const emojisForLevel = memoryGameEmojis[memoryGameLevel];
  const selectedEmojis = emojisForLevel.slice(0, totalPairs);
  const cardPairs = [...selectedEmojis, ...selectedEmojis];

  for (let i = cardPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
  }

  memoryCards = cardPairs;

  renderMemoryGrid(config.rows, config.cols);

  console.log(
    `Level ${memoryGameLevel}: Grid ${config.rows}x${config.cols}, Total Cards: ${totalCards}, Total Pairs: ${totalPairs}`
  );
}

function renderMemoryGrid(rows, cols) {
  const grid = document.getElementById("memoryGrid");
  if (!grid) {
    console.error("Memory grid element not found!");
    return;
  }

  grid.innerHTML = "";
  grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

  memoryCards.forEach((emoji, index) => {
    const card = document.createElement("div");
    card.className = "memory-card";
    card.dataset.index = index;
    card.dataset.emoji = emoji;
    card.innerHTML = `
            <div class="memory-card-inner">
                <div class="memory-card-front">?</div>
                <div class="memory-card-back">${emoji}</div>
            </div>
        `;
    card.addEventListener("click", function () {
      flipCard(index);
    });
    grid.appendChild(card);
  });

  console.log(`Rendered ${memoryCards.length} cards in ${rows}x${cols} grid`);
}

function flipCard(index) {
  if (!canFlip) return;

  const card = document.querySelector(`.memory-card[data-index="${index}"]`);
  if (!card) {
    console.error("Card not found:", index);
    return;
  }
  if (card.classList.contains("flipped") || card.classList.contains("matched"))
    return;

  card.classList.add("flipped");
  flippedCards.push(index);

  console.log(`Flipped card ${index}, total flipped: ${flippedCards.length}`);

  if (flippedCards.length === 2) {
    canFlip = false;
    memoryGameMoves++;
    document.getElementById("memoryMoves").textContent = memoryGameMoves;

    setTimeout(() => checkMatch(), 800);
  }
}

function checkMatch() {
  const [index1, index2] = flippedCards;
  const card1 = document.querySelector(`.memory-card[data-index="${index1}"]`);
  const card2 = document.querySelector(`.memory-card[data-index="${index2}"]`);

  if (!card1 || !card2) {
    console.error("Cards not found:", index1, index2);
    flippedCards = [];
    canFlip = true;
    return;
  }

  const emoji1 = card1.dataset.emoji;
  const emoji2 = card2.dataset.emoji;

  console.log(`Checking match: ${emoji1} vs ${emoji2}`);

  if (emoji1 === emoji2) {
    card1.classList.add("matched");
    card2.classList.add("matched");
    matchedPairs++;
    showNotification("🎉 Great match!");

    console.log(`Matched pairs: ${matchedPairs}/${totalPairs}`);

    if (matchedPairs === totalPairs) {
      console.log("Level complete!");
      setTimeout(() => levelComplete(), 500);
    }
  } else {
    card1.classList.remove("flipped");
    card2.classList.remove("flipped");
  }

  flippedCards = [];
  canFlip = true;
}

function levelComplete() {
  if (memoryGameLevel < 6) {
    showNotification(
      `🎉 Level ${memoryGameLevel} Complete! Moving to Level ${
        memoryGameLevel + 1
      }!`
    );
    memoryGameLevel++;
    // Save level progress to database
    if (currentUser && window.supabaseClient) {
      saveMemoryGameToDatabase(memoryGameLevel - 1, memoryGameMoves, false);
    }
    setTimeout(() => initializeMemoryGame(), 1500);
  } else {
    showNotification("🏆 Congratulations! You completed all levels!");
    setTimeout(() => gameComplete(), 2000);
  }
}

function gameComplete() {
  const grid = document.getElementById("memoryGrid");
  grid.innerHTML = `
        <div class="game-complete-message">
            <div class="game-complete-emoji">🏆</div>
            <h2>🎉 Congratulations! 🎉</h2>
            <p>You completed all 6 levels!</p>
            <p>Total Moves: ${memoryGameMoves}</p>
            <button class="game-complete-btn" onclick="resetMemoryGame()">Play Again 🔄</button>
            <button class="game-complete-btn" onclick="exitMemoryGameMode()">Exit 🚪</button>
        </div>
    `;
  // Save game completion to database
  if (currentUser && window.supabaseClient) {
    saveMemoryGameToDatabase(6, memoryGameMoves, true);
  }
}

// Save Memory Game session to Supabase
async function saveMemoryGameToDatabase(level, moves, completed) {
  if (!currentUser || !window.supabaseClient) return;

  try {
    await window.supabaseClient.from("memory_game_sessions").insert({
      user_id: currentUser.id,
      level_reached: level,
      moves_used: moves,
      completed: completed,
    });

    console.log(
      `✅ Memory game ${
        completed ? "completion" : "progress"
      } saved to database`
    );
  } catch (error) {
    console.error("Error saving memory game:", error);
  }
}

function resetMemoryGame() {
  memoryGameLevel = 1;
  memoryGameMoves = 0;
  initializeMemoryGame();
  showNotification("🔄 Game Reset! Starting from Level 1");
}

function exitMemoryGameMode() {
  memoryGameMode = false;
  stopCurrentSpeech();

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;

  const messagesContainer = document.getElementById("messages");
  lastMessageId++;
  const returnMessage = `## ✨ **Back to General Chat!** 🌈\n\n**Tom and Jerry are happy to chat with you again!** 🐱🐭\n\n*Great job playing the Memory Game!* You did amazing! 🎮\n\nWhat would you like to talk about now? 💬`;
  messagesContainer.innerHTML = `<div class="message assistant"><div class="message-avatar">🐱</div><div class="message-content">${processMarkdown(
    returnMessage
  )}<div class="emoji-reactions">
    <button class="emoji-btn" onclick="reactWithEmoji('😊')">😊</button>
    <button class="emoji-btn" onclick="reactWithEmoji('👍')">👍</button>
    <button class="emoji-btn" onclick="reactWithEmoji('❤️')">❤️</button></div></div></div>`;

  showNotification("✨ Returned to General Chat!");
}

function exitMemoryGameModeQuietly() {
  memoryGameMode = false;

  const chatArea = document.getElementById("chatArea");

  chatArea.innerHTML = `
        <div class="controls" id="controlsArea">
            <button class="control-btn" onclick="clearChat()">🗑️ Clear</button>
            <button class="control-btn" onclick="toggleVoice()" id="voiceButton">🔇 Voice</button>
            <button class="control-btn" onclick="showHelp()">❓ Help</button>
            <button class="control-btn" onclick="celebrateProgress()">🎉 Celebrate</button>
        </div>
        <div class="messages" id="messages"></div>
        <div class="input-area" id="inputArea">
            <input type="text" class="input-field" placeholder="Type your message here... 🌟" id="messageInput" onkeypress="handleKeyPress(event)">
            <button class="send-button" onclick="sendMessage()" tabindex="0" id="sendButton">➤</button>
        </div>
    `;
}

document.addEventListener("DOMContentLoaded", function () {
  document.getElementById("messageInput").focus();
  currentVolume = document.getElementById("volume").value / 100;
  const voiceButton = document.getElementById("voiceButton");
  voiceButton.innerHTML = "🔇 Voice";
  voiceButton.style.background = "linear-gradient(135deg, #f44336, #d32f2f)";

  updateLevelDisplay();
  updateProgressBar();
  checkExistingSession();

  // Welcome message after a delay
  // Welcome message after a delay
  setTimeout(() => {
    lastMessageId++;
    const userName = currentUserName || "friend";
    const welcomeMessage = `✨ **Hi ${userName}!** 🌟\n\n
I'm so excited to chat with you today! 🌈💬\n\n
We can talk, imagine fun stories, learn cool things, giggle together 😄🎨📚,\n\n
and **I can even generate cute pictures and videos for you!** 🖼️🎬✨\n\n
*Examples:*\n
- "Draw a happy puppy" → I'll create an image 🎨\n
- "Create a video of butterflies flying" → I'll make a video 🎬\n
- "What is the sun?" → I'll explain it 💬`;
    addMessage("assistant", welcomeMessage, "🐭", lastMessageId);
  }, 1000);
});

async function checkConnection() {
  try {
    const response = await fetch("/api/health");
    if (response.ok) {
      console.log("✅ Backend connected successfully");
    } else {
      console.warn("⚠️ Backend connection issues");
    }
  } catch (error) {
    console.error("❌ Cannot connect to backend:", error);
  }
}

checkConnection();

window.addEventListener("beforeunload", function () {
  stopCurrentSpeech();
  stopAllSounds();
});

document.addEventListener("visibilitychange", function () {
  if (document.hidden) {
    // Optionally pause sounds when tab is hidden
  }
});

// Terms checkbox event listener
document.addEventListener("DOMContentLoaded", function () {
  const termsCheckbox = document.getElementById("termsCheckbox");
  if (termsCheckbox) {
    termsCheckbox.addEventListener("change", handleTermsCheckbox);
  }
});
