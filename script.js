/* ==========================================================
   WEATHER DASHBOARD — script.js
   ==========================================================
   ⚠️ ADD YOUR FREE API KEY BELOW ⚠️
   1. Go to https://openweathermap.org/api
   2. Sign up for a free account
   3. Copy your API key and paste it here:
========================================================== */
const API_KEY = "387ed57816597591ad27fc15a24bf986"; // <-- PUT YOUR KEY HERE

const BASE_URL = "https://api.openweathermap.org/data/2.5";
const GEO_URL = "https://api.openweathermap.org/geo/1.0/direct";

const MAX_HISTORY = 6;

/* ---------------- STATE ---------------- */
let state = {
  unit: localStorage.getItem("wd_unit") || "metric", // metric (C) or imperial (F)
  theme: localStorage.getItem("wd_theme") || "dark",
  lastCity: localStorage.getItem("wd_lastCity") || "",
  history: JSON.parse(localStorage.getItem("wd_history") || "[]"),
  currentData: null,
};

/* ---------------- DOM ELEMENTS ---------------- */
const els = {
  body: document.body,
  searchForm: document.getElementById("searchForm"),
  cityInput: document.getElementById("cityInput"),
  suggestions: document.getElementById("suggestions"),
  themeToggle: document.getElementById("themeToggle"),
  unitToggle: document.getElementById("unitToggle"),
  geoBtn: document.getElementById("geoBtn"),
  historyRow: document.getElementById("historyRow"),
  statusArea: document.getElementById("statusArea"),
  loadingState: document.getElementById("loadingState"),
  errorState: document.getElementById("errorState"),
  errorMessage: document.getElementById("errorMessage"),
  weatherCard: document.getElementById("weatherCard"),
  welcomeState: document.getElementById("welcomeState"),
  forecastSection: document.getElementById("forecastSection"),
  forecastRow: document.getElementById("forecastRow"),

  cityName: document.getElementById("cityName"),
  dateTime: document.getElementById("dateTime"),
  conditionText: document.getElementById("conditionText"),
  weatherEmoji: document.getElementById("weatherEmoji"),
  currentTemp: document.getElementById("currentTemp"),
  humidity: document.getElementById("humidity"),
  windSpeed: document.getElementById("windSpeed"),
  pressure: document.getElementById("pressure"),
  visibility: document.getElementById("visibility"),
  feelsLike: document.getElementById("feelsLike"),
  sunTimes: document.getElementById("sunTimes"),
};

/* ---------------- WEATHER ICON / EMOJI MAP ---------------- */
function getWeatherEmoji(main, icon) {
  const isNight = icon && icon.includes("n");
  const map = {
    Clear: isNight ? "🌙" : "☀️",
    Clouds: "☁️",
    Rain: "🌧️",
    Drizzle: "🌦️",
    Thunderstorm: "⛈️",
    Snow: "❄️",
    Mist: "🌫️",
    Smoke: "🌫️",
    Haze: "🌫️",
    Dust: "🌫️",
    Fog: "🌫️",
    Sand: "🌫️",
    Ash: "🌫️",
    Squall: "🌬️",
    Tornado: "🌪️",
  };
  return map[main] || "🌡️";
}

function getBgKey(main) {
  const key = (main || "").toLowerCase();
  if (["clear"].includes(key)) return "clear";
  if (["clouds"].includes(key)) return "clouds";
  if (["rain", "drizzle"].includes(key)) return "rain";
  if (["thunderstorm"].includes(key)) return "thunderstorm";
  if (["snow"].includes(key)) return "snow";
  if (["mist", "smoke", "haze", "dust", "fog", "sand", "ash"].includes(key)) return "mist";
  return "default";
}

/* ---------------- UI STATE HELPERS ---------------- */
function showLoading() {
  els.statusArea.classList.remove("hidden");
  els.loadingState.classList.remove("hidden");
  els.errorState.classList.add("hidden");
  els.welcomeState.classList.add("hidden");
}

function showError(message) {
  els.statusArea.classList.remove("hidden");
  els.errorState.classList.remove("hidden");
  els.loadingState.classList.add("hidden");
  els.errorMessage.textContent = message;
  els.weatherCard.classList.add("hidden");
  els.forecastSection.classList.add("hidden");
  els.welcomeState.classList.add("hidden");
}

function hideStatus() {
  els.statusArea.classList.add("hidden");
  els.loadingState.classList.add("hidden");
  els.errorState.classList.add("hidden");
}

function showWeatherUI() {
  hideStatus();
  els.weatherCard.classList.remove("hidden");
  els.forecastSection.classList.remove("hidden");
  els.welcomeState.classList.add("hidden");
}

/* ---------------- API CALLS ---------------- */
async function fetchCurrentWeather(city) {
  const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&units=${state.unit}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 404) throw new Error("City not found. Please check the spelling and try again.");
    if (res.status === 401) throw new Error("Invalid API key. Please add a valid OpenWeatherMap API key in script.js.");
    throw new Error("Something went wrong while fetching weather data.");
  }
  return res.json();
}

async function fetchForecast(city) {
  const url = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&units=${state.unit}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch forecast data.");
  return res.json();
}

async function fetchCitySuggestions(query) {
  if (!query || query.length < 2) return [];
  try {
    const url = `${GEO_URL}?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.map((c) => ({
      label: `${c.name}${c.state ? ", " + c.state : ""}, ${c.country}`,
      value: c.name,
    }));
  } catch {
    return [];
  }
}

/* ---------------- MAIN ORCHESTRATOR ---------------- */
async function getWeather(city) {
  if (!city || !city.trim()) return;
  showLoading();
  try {
    const [current, forecast] = await Promise.all([
      fetchCurrentWeather(city),
      fetchForecast(city),
    ]);
    state.currentData = current;
    renderCurrentWeather(current);
    renderForecast(forecast);
    showWeatherUI();
    updateBackground(current.weather[0].main);
    saveLastCity(current.name);
    addToHistory(current.name);
  } catch (err) {
    showError(err.message || "Unable to fetch weather. Please try again.");
  }
}

/* ---------------- RENDER: CURRENT WEATHER ---------------- */
function renderCurrentWeather(data) {
  const unitSymbol = state.unit === "metric" ? "°C" : "°F";
  const previousTemp = parseInt(els.currentTemp.textContent) || Math.round(data.main.temp);
  animateNumber(els.currentTemp, previousTemp, Math.round(data.main.temp), unitSymbol);
  const windUnit = state.unit === "metric" ? "km/h" : "mph";
  const windSpeedVal = state.unit === "metric"
    ? Math.round(data.wind.speed * 3.6) // m/s -> km/h
    : Math.round(data.wind.speed);

  els.cityName.textContent = `${data.name}, ${data.sys.country}`;
  els.dateTime.textContent = formatDateTime(new Date());
  els.conditionText.textContent = data.weather[0].description;
  els.weatherEmoji.textContent = getWeatherEmoji(data.weather[0].main, data.weather[0].icon);

  els.humidity.textContent = `${data.main.humidity}%`;
  els.windSpeed.textContent = `${windSpeedVal} ${windUnit}`;
  els.pressure.textContent = `${data.main.pressure} hPa`;
  els.visibility.textContent = data.visibility != null ? `${(data.visibility / 1000).toFixed(1)} km` : "N/A";
  els.feelsLike.textContent = `${Math.round(data.main.feels_like)}${unitSymbol}`;

  const sunrise = formatTime(new Date(data.sys.sunrise * 1000));
  const sunset = formatTime(new Date(data.sys.sunset * 1000));
  els.sunTimes.textContent = `${sunrise} / ${sunset}`;
}

/* ---------------- RENDER: 5-DAY FORECAST ---------------- */
function renderForecast(forecastData) {
  // Group 3-hour entries by date, pick midday entry, track min/max
  const days = {};
  forecastData.list.forEach((entry) => {
    const date = entry.dt_txt.split(" ")[0];
    if (!days[date]) {
      days[date] = { temps: [], entries: [] };
    }
    days[date].temps.push(entry.main.temp);
    days[date].entries.push(entry);
  });

  const todayStr = new Date().toISOString().split("T")[0];
  const dateKeys = Object.keys(days).filter((d) => d !== todayStr).slice(0, 5);

  els.forecastRow.innerHTML = "";

  dateKeys.forEach((dateKey) => {
    const dayInfo = days[dateKey];
    const max = Math.round(Math.max(...dayInfo.temps));
    const min = Math.round(Math.min(...dayInfo.temps));

    // pick entry closest to midday for representative icon
    const middayEntry =
      dayInfo.entries.find((e) => e.dt_txt.includes("12:00:00")) || dayInfo.entries[Math.floor(dayInfo.entries.length / 2)];

    const main = middayEntry.weather[0].main;
    const icon = middayEntry.weather[0].icon;
    const unitSymbol = state.unit === "metric" ? "°C" : "°F";

    const card = document.createElement("div");
    card.className = "forecast-card";
    card.innerHTML = `
      <p class="forecast-day">${getDayName(dateKey)}</p>
      <p class="forecast-date">${formatShortDate(dateKey)}</p>
      <div class="forecast-icon">${getWeatherEmoji(main, icon)}</div>
      <p class="forecast-temps"><span class="max">${max}${unitSymbol}</span><span class="min">${min}${unitSymbol}</span></p>
    `;
    els.forecastRow.appendChild(card);
  });
}

/* ---------------- BACKGROUND BY WEATHER ---------------- */
function updateBackground(main) {
  const key = getBgKey(main);
  els.body.setAttribute("data-weather", key);
  setWeatherEffect(key);
}

/* ---------------- DATE/TIME HELPERS ---------------- */
function formatDateTime(d) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(d) {
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function getDayName(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short" });
}

function formatShortDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------------- LOCAL STORAGE: LAST CITY ---------------- */
function saveLastCity(city) {
  state.lastCity = city;
  localStorage.setItem("wd_lastCity", city);
}

/* ---------------- LOCAL STORAGE: SEARCH HISTORY ---------------- */
function addToHistory(city) {
  state.history = state.history.filter((c) => c.toLowerCase() !== city.toLowerCase());
  state.history.unshift(city);
  state.history = state.history.slice(0, MAX_HISTORY);
  localStorage.setItem("wd_history", JSON.stringify(state.history));
  renderHistory();
}

function renderHistory() {
  els.historyRow.innerHTML = "";
  state.history.forEach((city) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "history-chip";
    chip.textContent = city;
    chip.addEventListener("click", () => {
      els.cityInput.value = city;
      getWeather(city);
    });
    els.historyRow.appendChild(chip);
  });
}

/* ---------------- ANIMATED COUNTER ---------------- */
function animateNumber(el, from, to, suffix, duration = 700) {
  const start = performance.now();
  const change = to - from;
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
    const value = Math.round(from + change * eased);
    el.textContent = `${value}${suffix}`;
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------------- RIPPLE EFFECT ---------------- */
function attachRipple(button) {
  button.addEventListener("click", (e) => {
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${(e.clientX || rect.left + rect.width / 2) - rect.left - size / 2}px`;
    ripple.style.top = `${(e.clientY || rect.top + rect.height / 2) - rect.top - size / 2}px`;
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 650);
  });
}

/* ---------------- WEATHER CANVAS PARTICLES ---------------- */
const canvas = document.getElementById("weatherCanvas");
const ctx = canvas.getContext("2d");
let particles = [];
let animationFrameId = null;
let currentEffect = "default";

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function createParticles(type) {
  particles = [];
  const w = canvas.width;
  const h = canvas.height;

  if (type === "rain") {
    for (let i = 0; i < 140; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 10 + Math.random() * 14,
        speed: 6 + Math.random() * 6,
        opacity: 0.2 + Math.random() * 0.35,
      });
    }
  } else if (type === "snow") {
    for (let i = 0; i < 110; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.5 + Math.random() * 3,
        speed: 0.6 + Math.random() * 1.4,
        drift: Math.random() * 1 - 0.5,
        opacity: 0.4 + Math.random() * 0.5,
      });
    }
  } else if (type === "clouds") {
    for (let i = 0; i < 6; i++) {
      particles.push({
        x: Math.random() * w,
        y: 40 + Math.random() * (h * 0.4),
        scale: 0.6 + Math.random() * 1.2,
        speed: 0.15 + Math.random() * 0.25,
        opacity: 0.12 + Math.random() * 0.12,
      });
    }
  } else if (type === "thunderstorm") {
    for (let i = 0; i < 160; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        len: 12 + Math.random() * 16,
        speed: 9 + Math.random() * 7,
        opacity: 0.25 + Math.random() * 0.35,
      });
    }
  } else if (type === "clear") {
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h * 0.6,
        r: 0.6 + Math.random() * 1.6,
        opacity: Math.random() * 0.5,
        twinkleSpeed: 0.02 + Math.random() * 0.03,
        phase: Math.random() * Math.PI * 2,
      });
    }
  } else if (type === "mist") {
    for (let i = 0; i < 5; i++) {
      particles.push({
        x: Math.random() * w,
        y: h * 0.3 + Math.random() * h * 0.5,
        scale: 1 + Math.random() * 1.5,
        speed: 0.1 + Math.random() * 0.2,
        opacity: 0.08 + Math.random() * 0.1,
      });
    }
  }
}

let lightningAlpha = 0;
function maybeFlashLightning() {
  if (Math.random() < 0.008) lightningAlpha = 0.5;
}

function drawCloud(x, y, scale, opacity) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(x, y, 40 * scale, 18 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x + 30 * scale, y - 10 * scale, 30 * scale, 16 * scale, 0, 0, Math.PI * 2);
  ctx.ellipse(x - 30 * scale, y - 6 * scale, 28 * scale, 15 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderFrame() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width;
  const h = canvas.height;

  if (currentEffect === "rain" || currentEffect === "thunderstorm") {
    ctx.strokeStyle = "rgba(174,214,255,0.6)";
    ctx.lineWidth = 1.4;
    particles.forEach((p) => {
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2, p.y + p.len);
      ctx.stroke();
      p.y += p.speed;
      p.x -= 0.6;
      if (p.y > h) { p.y = -10; p.x = Math.random() * w; }
    });
    ctx.globalAlpha = 1;

    if (currentEffect === "thunderstorm") {
      maybeFlashLightning();
      if (lightningAlpha > 0) {
        ctx.fillStyle = `rgba(255,255,255,${lightningAlpha})`;
        ctx.fillRect(0, 0, w, h);
        lightningAlpha -= 0.04;
      }
    }
  } else if (currentEffect === "snow") {
    ctx.fillStyle = "#ffffff";
    particles.forEach((p) => {
      ctx.globalAlpha = p.opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      p.y += p.speed;
      p.x += p.drift;
      if (p.y > h) { p.y = -5; p.x = Math.random() * w; }
    });
    ctx.globalAlpha = 1;
  } else if (currentEffect === "clouds" || currentEffect === "mist") {
    particles.forEach((p) => {
      drawCloud(p.x, p.y, p.scale, p.opacity);
      p.x += p.speed;
      if (p.x > w + 80) p.x = -80;
    });
  } else if (currentEffect === "clear") {
    ctx.fillStyle = "#fff6d8";
    particles.forEach((p) => {
      p.phase += p.twinkleSpeed;
      const tw = (Math.sin(p.phase) + 1) / 2;
      ctx.globalAlpha = p.opacity * tw;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  animationFrameId = requestAnimationFrame(renderFrame);
}

function setWeatherEffect(bgKey) {
  currentEffect = bgKey;
  createParticles(bgKey);
}

if (animationFrameId === null) {
  renderFrame();
}

/* ---------------- GEOLOCATION ---------------- */
async function fetchWeatherByCoords(lat, lon) {
  const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch weather for your location.");
  return res.json();
}

async function fetchForecastByCoords(lat, lon) {
  const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${state.unit}&appid=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Could not fetch forecast for your location.");
  return res.json();
}

async function getWeatherByLocation() {
  if (!navigator.geolocation) {
    showError("Geolocation is not supported by your browser.");
    return;
  }
  els.geoBtn.classList.add("locating");
  showLoading();
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      try {
        const { latitude, longitude } = pos.coords;
        const [current, forecast] = await Promise.all([
          fetchWeatherByCoords(latitude, longitude),
          fetchForecastByCoords(latitude, longitude),
        ]);
        state.currentData = current;
        renderCurrentWeather(current);
        renderForecast(forecast);
        showWeatherUI();
        updateBackground(current.weather[0].main);
        saveLastCity(current.name);
        addToHistory(current.name);
        els.cityInput.value = current.name;
      } catch (err) {
        showError(err.message || "Unable to fetch weather for your location.");
      } finally {
        els.geoBtn.classList.remove("locating");
      }
    },
    () => {
      els.geoBtn.classList.remove("locating");
      showError("Location access denied. Please search for a city instead.");
    }
  );
}

els.geoBtn.addEventListener("click", getWeatherByLocation);

/* ---------------- THEME TOGGLE ---------------- */
function applyTheme(theme) {
  state.theme = theme;
  els.body.setAttribute("data-theme", theme);
  localStorage.setItem("wd_theme", theme);
}

els.themeToggle.addEventListener("click", () => {
  applyTheme(state.theme === "dark" ? "light" : "dark");
});

/* ---------------- UNIT TOGGLE ---------------- */
function updateUnitLabel() {
  els.unitToggle.textContent = state.unit === "metric" ? "°C / °F" : "°F / °C";
}

els.unitToggle.addEventListener("click", async () => {
  state.unit = state.unit === "metric" ? "imperial" : "metric";
  localStorage.setItem("wd_unit", state.unit);
  updateUnitLabel();
  if (state.lastCity) {
    await getWeather(state.lastCity);
  }
});

/* ---------------- SEARCH FORM ---------------- */
els.searchForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const city = els.cityInput.value.trim();
  if (!city) return;
  els.suggestions.classList.add("hidden");
  getWeather(city);
});

/* ---------------- AUTOCOMPLETE SUGGESTIONS ---------------- */
let suggestTimeout = null;
els.cityInput.addEventListener("input", () => {
  clearTimeout(suggestTimeout);
  const query = els.cityInput.value.trim();
  if (!query) {
    els.suggestions.classList.add("hidden");
    return;
  }
  suggestTimeout = setTimeout(async () => {
    const results = await fetchCitySuggestions(query);
    renderSuggestions(results);
  }, 350);
});

function renderSuggestions(results) {
  if (!results.length) {
    els.suggestions.classList.add("hidden");
    els.suggestions.innerHTML = "";
    return;
  }
  els.suggestions.innerHTML = "";
  results.forEach((r) => {
    const item = document.createElement("div");
    item.textContent = r.label;
    item.addEventListener("click", () => {
      els.cityInput.value = r.value;
      els.suggestions.classList.add("hidden");
      getWeather(r.value);
    });
    els.suggestions.appendChild(item);
  });
  els.suggestions.classList.remove("hidden");
}

document.addEventListener("click", (e) => {
  if (!els.suggestions.contains(e.target) && e.target !== els.cityInput) {
    els.suggestions.classList.add("hidden");
  }
});

/* ---------------- INIT ---------------- */
function init() {
  applyTheme(state.theme);
  updateUnitLabel();
  renderHistory();
  attachRipple(document.querySelector(".btn-search"));
  attachRipple(els.geoBtn);
  attachRipple(els.unitToggle);
  setWeatherEffect("default");

 if (API_KEY === "YOUR_OPENWEATHERMAP_API_KEY") {
    showError("⚠️ Please add your OpenWeatherMap API key in script.js to start fetching weather data.");
    return;
  }

  if (state.lastCity) {
    els.cityInput.value = state.lastCity;
    getWeather(state.lastCity);
  }
}

init();