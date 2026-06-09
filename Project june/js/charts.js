/* GoalPad Metrics and Tracking Charts Engine */

// Global registry of chart instances to destroy/reset cleanly
let chartInstances = {};

// Get theme colors for styling charts
function getChartColors() {
  const theme = document.body.getAttribute('data-theme') || 'dark';
  const isDark = theme === 'dark';
  
  return {
    accent: isDark ? '#C8F55A' : '#16A34A',
    grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    text: isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
    bg: isDark ? 'rgba(200, 245, 90, 0.15)' : 'rgba(22, 163, 74, 0.12)',
    tooltipBg: isDark ? '#1E1E28' : '#FFFFFF',
    tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
  };
}

// 1. Weekly compliance bar chart
function renderWeeklyChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const colors = getChartColors();
  const dataScores = getWeekScores(); // Array of 7 values
  
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }
  
  const ctx = canvas.getContext('2d');
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [{
        label: 'Goal Completion %',
        data: dataScores,
        backgroundColor: colors.accent,
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.text,
          bodyColor: colors.accent,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return ` ${context.parsed.y}% completed`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.text, font: { family: 'DM Sans' } }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            stepSize: 20,
            font: { family: 'JetBrains Mono' },
            callback: function(value) { return value + '%'; }
          }
        }
      },
      animation: {
        duration: 800,
        easing: 'easeOutQuart'
      }
    }
  });
}

// 2. Monthly progress line chart
function renderMonthlyChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  const colors = getChartColors();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed
  
  const scoresObj = getMonthScores(year, month);
  const labels = scoresObj.map(s => s.day);
  const dataScores = scoresObj.map(s => s.score);
  
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }
  
  const ctx = canvas.getContext('2d');
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Daily Score',
        data: dataScores,
        borderColor: colors.accent,
        backgroundColor: colors.bg,
        borderWidth: 2.5,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: colors.accent,
        pointBorderColor: colors.tooltipBg,
        pointHoverRadius: 6,
        pointRadius: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: colors.tooltipBg,
          titleColor: colors.text,
          bodyColor: colors.accent,
          borderColor: colors.tooltipBorder,
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            title: function(tooltipItems) {
              return `Day ${tooltipItems[0].label}`;
            },
            label: function(context) {
              return `Score: ${context.parsed.y}%`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.text, font: { family: 'JetBrains Mono', size: 10 } }
        },
        y: {
          min: 0,
          max: 100,
          grid: { color: colors.grid },
          ticks: {
            color: colors.text,
            stepSize: 25,
            font: { family: 'JetBrains Mono' },
            callback: function(value) { return value + '%'; }
          }
        }
      }
    }
  });
}

// 3. GitHub style heatmap grid calendar
function renderHeatmap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  
  // Calculate first day weekday index (Mon=0, Tue=1, ..., Sun=6)
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const numDays = new Date(year, month + 1, 0).getDate();
  
  let gridHtml = '';
  
  // Empty grids leading to the start day of month
  for (let i = 0; i < startOffset; i++) {
    gridHtml += '<div class="heatmap-cell" style="opacity: 0; pointer-events: none;"></div>';
  }
  
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  
  // Generate active calendar blocks
  for (let d = 1; d <= numDays; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const score = getDayScore(dateStr);
    
    let level = '0';
    if (score > 0 && score <= 25) level = '1';
    else if (score > 25 && score <= 50) level = '2';
    else if (score > 50 && score <= 75) level = '3';
    else if (score > 75) level = '4';
    
    // Add data-level and title tooltip
    const tooltipText = `${monthName} ${d}, ${year} &#10;Completion: ${score}%`;
    gridHtml += `
      <div class="heatmap-cell" 
           data-level="${level}" 
           title="${tooltipText}">
      </div>
    `;
  }
  
  container.innerHTML = gridHtml;
}

// Theme toggles updates charts configurations
function updateChartsTheme() {
  const weeklyCanvas = document.getElementById('weeklyChartCanvas');
  if (weeklyCanvas) {
    renderWeeklyChart('weeklyChartCanvas');
  }
  
  const monthlyCanvas = document.getElementById('monthlyChartCanvas');
  if (monthlyCanvas) {
    renderMonthlyChart('monthlyChartCanvas');
  }
}
