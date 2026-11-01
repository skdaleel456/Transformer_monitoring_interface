
const $ = (id) => document.getElementById(id);

const history = [];
let updateCount = 0;
let requestInProgress = false;

function setText(id, value) {
  $(id).textContent = value;
}

function setMetric(id, status, value, max) {
  const badge = $(id + "-status");
  badge.textContent = status;
  badge.className = "pill";

  if (status === "Warning") badge.classList.add("warning");
  if (status === "Critical") badge.classList.add("critical");

  $(id + "-meter").style.width =
    Math.max(0, Math.min(100, (value / max) * 100)) + "%";
}

function assess(value, warning, critical, lowIsBad = false) {
  if (lowIsBad) {
    if (value <= critical) return "Critical";
    if (value <= warning) return "Warning";
    return "Normal";
  }

  if (value >= critical) return "Critical";
  if (value >= warning) return "Warning";
  return "Normal";
}

function drawChart() {
  const canvas = $("temperature-chart");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;

  canvas.width = Math.max(1, Math.round(rect.width * ratio));
  canvas.height = Math.max(1, Math.round(rect.height * ratio));
  ctx.scale(ratio, ratio);

  const width = rect.width;
  const height = rect.height;
  const left = 35, right = 12, top = 12, bottom = 22;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  ctx.clearRect(0, 0, width, height);
  ctx.font = "10px Segoe UI, Arial";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#29364b";
  ctx.fillStyle = "#8c9bb3";

  [40, 60, 80, 100, 120].forEach((value) => {
    const y = top + ((120 - value) / 80) * plotHeight;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(width - right, y);
    ctx.stroke();
    ctx.fillText(String(value), 2, y + 3);
  });

  if (history.length < 1) return;

  const points = history.map((item, index) => ({
    x: left + (history.length === 1 ? plotWidth / 2 :
      (index / (history.length - 1)) * plotWidth),
    y: top + ((120 - item) / 80) * plotHeight
  }));

  if (points.length > 1) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, top + plotHeight);
    points.forEach((point) => ctx.lineTo(point.x, point.y));
    ctx.lineTo(points[points.length - 1].x, top + plotHeight);
    ctx.closePath();
    ctx.fillStyle = "rgba(105, 168, 255, 0.10)";
    ctx.fill();
  }

  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.strokeStyle = "#69a8ff";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const last = points[points.length - 1];
  ctx.beginPath();
  ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#69a8ff";
  ctx.fill();
}

function showAlerts(reading) {
  const alerts = [];

  
if (reading.temperature >= 100) {
  alerts.push(["critical", "High temperature",
    "CRITICAL: Transformer temperature is at least 100 °C!"]);
} else if (reading.temperature >= 90) {
  alerts.push(["warning", "Temperature warning",
    "WARNING: Transformer temperature is at least 90 °C."]);
}

  if (reading.voltage < 220 || reading.voltage > 240) {
    alerts.push(["warning", "Voltage outside example range",
      "Voltage is outside the configured 220–240 V range."]);
  }

  if (reading.current >= 18) {
    alerts.push(["critical", "High current",
      "Current is at least 18 A in this simulation."]);
  } else if (reading.current >= 16) {
    alerts.push(["warning", "Current warning",
      "Current is at least 16 A in this simulation."]);
  }

  if (reading.oil_level < 80) {
    alerts.push(["critical", "Low oil level",
      "Oil level is below 80% in this simulation."]);
  }

  setText("alert-count", alerts.length);

  const list = $("alerts-list");
  list.replaceChildren();

  if (alerts.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No active threshold alerts for the latest reading.";
    list.appendChild(empty);
    return alerts.length;
  }

  alerts.forEach(([severity, title, description]) => {
    const item = document.createElement("div");
    item.className = "alert-item " + severity;

    const mark = document.createElement("span");
    mark.className = "alert-mark";
    mark.textContent = severity === "critical" ? "▲" : "●";

    const content = document.createElement("div");
    const heading = document.createElement("strong");
    heading.textContent = title;
    const detail = document.createElement("p");
    detail.textContent = description;

    content.append(heading, detail);
    item.append(mark, content);
    list.appendChild(item);
  });

  return alerts.length;
}

function checkTemperaturePopup(temperature) {
  if (temperature >= 100) {
    if (!window.temperaturePopupShown) {
      window.temperaturePopupShown = true;
      alert("CRITICAL WARNING!\nTransformer temperature has reached 100°C or higher!");
    }
  } else {
    window.temperaturePopupShown = false;
  }
}



function updateDashboard(reading) {
  const temp = Number(reading.temperature);
  const voltage = Number(reading.voltage);
  const current = Number(reading.current);
  const oil = Number(reading.oil_level);

  checkTemperaturePopup(temp);


  if (![temp, voltage, current, oil].every(Number.isFinite)) {
    throw new Error("The server returned invalid sensor values.");
  }

  setText("temperature", temp.toFixed(1));
  setText("voltage", voltage.toFixed(1));
  setText("current", current.toFixed(1));
  setText("oil-level", oil.toFixed(1));

  const tempStatus = assess(temp, 90, 100);
  const voltageStatus = voltage < 220 || voltage > 240 ? "Warning" : "Normal";
  const currentStatus = assess(current, 16, 18);
  const oilStatus = assess(oil, 85, 80, true);

  setMetric("temperature", tempStatus, temp, 120);
  setMetric("voltage", voltageStatus, voltage - 180, 80);
  setMetric("current", currentStatus, current, 25);
  setMetric("oil", oilStatus, oil, 100);

  const activeAlerts = showAlerts({
    temperature: temp,
    voltage,
    current,
    oil_level: oil
  });

  const severity = [tempStatus, voltageStatus, currentStatus, oilStatus];
  const critical = severity.includes("Critical");
  const warning = severity.includes("Warning");

  const indicator = $("health-indicator");
  indicator.className = "health-indicator";

  if (critical) {
    indicator.classList.add("critical");
    setText("health-title", "Critical condition");
    setText("health-description", "One or more example thresholds require attention.");
  } else if (warning) {
    indicator.classList.add("warning");
    setText("health-title", "Attention required");
    setText("health-description", "At least one reading is outside its normal example range.");
  } else {
    setText("health-title", "Within example ranges");
    setText("health-description", "No configured warning thresholds were crossed.");
  }

  history.push(temp);
  if (history.length > 24) history.shift();
  drawChart();

  updateCount++;
  setText("update-count", String(updateCount));
  setText("last-update", new Date().toLocaleTimeString());
  setText("storage-status", reading.saved ? "Saved" : "Save failed");
  setText("connection-status", "Connected");
  $("connection-status").classList.remove("disconnected");
  $("connection-status").classList.add("connected");

  return activeAlerts;
}

async function pollServer() {
  if (requestInProgress) return;
  requestInProgress = true;

  try {
    const response = await fetch("https://vagueness-paper-jersey.ngrok-free.dev/api/readings", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);

    const reading = await response.json();
    console.log("Sensor data received:", reading);
    updateDashboard(reading);
  } catch (error) {
    console.error("Dashboard update failed:", error);
    setText("connection-status", "Disconnected");
    $("connection-status").classList.remove("connected");
$("connection-status").classList.add("disconnected");
    setText("health-title", "Server unavailable");
    setText("health-description",
      "Check that the C server is running and refresh the page.");
    setText("storage-status", "Unknown");
  } finally {
    requestInProgress = false;
  }
}

window.addEventListener("resize", drawChart);
pollServer();
setInterval(pollServer, 5000);

/* Sidebar navigation */
document.querySelectorAll(".nav-link[data-section]").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();

    const section = link.dataset.section;
    const target = document.getElementById(section);

    if (!target) {
      console.error("Dashboard section not found:", section);
      return;
    }

    document.querySelectorAll(".nav-link[data-section]").forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");

    document.querySelectorAll(".main > header, .main > section, .main > footer")
      .forEach((item) => {
        item.hidden = true;
      });

    target.hidden = false;

    // Overview shows the full dashboard.
    if (section === "overview") {
      document.querySelectorAll(".main > header, .main > section, .main > footer")
        .forEach((item) => {
          item.hidden = false;
        });
    }

    // Show the selected section and its heading.
    if (section !== "overview") {
      const header = document.querySelector(".main > header");
      if (header) header.hidden = false;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
});
