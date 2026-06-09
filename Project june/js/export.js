/* GoalPad PDF Export Management */

// Helper to write text wrapped inside jsPDF page limits
function writePdfText(doc, text, x, y, maxW, lineH = 7) {
  const lines = doc.splitTextToSize(text, maxW);
  for (let i = 0; i < lines.length; i++) {
    if (y > 275) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines[i], x, y);
    y += lineH;
  }
  return y;
}

// 1. Export Weekly Report
function exportWeeklyReport() {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in to export data.", "warning");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const weekKey = getCurrentWeekKey();
  
  // Title Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(22, 163, 74); // Green accent color for PDF printing
  doc.text("GoalPad Weekly Report", 14, 20);
  
  // Metadata Info
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);
  doc.text(`User: ${user.fullName} (${user.email})`, 14, 31);
  doc.text(`Week Beginning: ${weekKey}`, 14, 36);
  
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 40, 196, 40);
  
  // Weekly Metrics Overview
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("Weekly Overview Statistics", 14, 48);
  
  const weekScores = getWeekScores();
  const avgScore = Math.round(weekScores.reduce((a, b) => a + b, 0) / 7);
  
  let totalGoals = 0;
  let totalCompleted = 0;
  
  // Calculate totals
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateStr = current.toISOString().slice(0, 10);
    const goals = getGoals(dateStr);
    totalGoals += goals.length;
    totalCompleted += goals.filter(g => g.done).length;
  }
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Average Completion Rate: ${avgScore}%`, 14, 56);
  doc.text(`Total Tasks Tracked: ${totalGoals}`, 14, 62);
  doc.text(`Total Tasks Completed: ${totalCompleted}`, 14, 68);
  
  doc.line(14, 73, 196, 73);
  
  // Day-by-day Breakdown
  let y = 81;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Daily Breakdown logs", 14, y);
  y += 8;
  
  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    const dateStr = current.toISOString().slice(0, 10);
    const dayGoals = getGoals(dateStr);
    
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(22, 163, 74);
    doc.text(`${weekdays[i]} (${dateStr}) - Score: ${getDayScore(dateStr)}%`, 14, y);
    y += 6;
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50, 50, 50);
    
    if (dayGoals.length === 0) {
      doc.text("  No goals logged on this day.", 14, y);
      y += 6;
    } else {
      dayGoals.forEach(g => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const check = g.done ? "[x] " : "[ ] ";
        const details = `  ${check}${g.title} (${g.category} - ${g.priority} Priority)`;
        y = writePdfText(doc, details, 14, y, 175, 5.5);
      });
      y += 2;
    }
  }
  
  // Weekly Reflection Note
  const note = getWeekNote(weekKey);
  if (note) {
    if (y > 240) {
      doc.addPage();
      y = 20;
    }
    y += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Weekly Reflection Notes", 14, y);
    y += 8;
    
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10.5);
    doc.setTextColor(80, 80, 80);
    y = writePdfText(doc, `"${note}"`, 14, y, 175, 6);
  }
  
  doc.save(`GoalPad_Weekly_Report_${weekKey}.pdf`);
  showToast("Weekly PDF report downloaded!", "success");
}

// 2. Export Monthly Report
function exportMonthlyReport() {
  const user = getCurrentUser();
  if (!user) {
    showToast("Please log in to export data.", "warning");
    return;
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const monthName = now.toLocaleString('en-US', { month: 'long' });
  const monthKey = `${year}-${String(month).padStart(2, '0')}`;
  
  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(22, 163, 74);
  doc.text("GoalPad Monthly Report", 14, 20);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 26);
  doc.text(`User: ${user.fullName} (${user.email})`, 14, 31);
  doc.text(`Month: ${monthName} ${year}`, 14, 36);
  
  doc.line(14, 40, 196, 40);
  
  // Monthly overview calculations
  const scoresObj = getMonthScores(year, month);
  const validScores = scoresObj.filter(s => {
    // Check if the day actually had goals to count in score average
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
    return getGoals(dateStr).length > 0;
  });
  
  const avgScore = validScores.length > 0 
    ? Math.round(validScores.reduce((sum, item) => sum + item.score, 0) / validScores.length) 
    : 0;
    
  let totalGoals = 0;
  let totalCompleted = 0;
  
  scoresObj.forEach(s => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
    const goals = getGoals(dateStr);
    totalGoals += goals.length;
    totalCompleted += goals.filter(g => g.done).length;
  });
  
  const streak = getStreak();
  
  // Stats Section
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 30);
  doc.text("Monthly Overview Statistics", 14, 48);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Average Active Score: ${avgScore}%`, 14, 56);
  doc.text(`Total Tasks Tracked: ${totalGoals}`, 14, 62);
  doc.text(`Total Tasks Completed: ${totalCompleted}`, 14, 68);
  doc.text(`Current Active Streak: ${streak.currentStreak} Days`, 14, 74);
  doc.text(`Best User Streak: ${streak.bestStreak} Days`, 14, 80);
  
  doc.line(14, 85, 196, 85);
  
  // Badges earned
  let y = 93;
  const badges = getBadges();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Badges Earned", 14, y);
  y += 8;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  if (badges.length === 0) {
    doc.text("  No badges unlocked yet. Keep completing daily goals!", 14, y);
    y += 6;
  } else {
    const badgeMap = {
      first_goal: "🎯 First Goal - Completed your very first goal",
      early_bird: "🌅 Early Bird - Completed a goal before noon",
      streak_3: "🔥 Streak 3 - Maintained a streak for 3 consecutive days",
      streak_7: "⚡ Streak 7 - Maintained a streak for 7 consecutive days",
      streak_30: "💎 Streak 30 - Completed goals consecutively for 30 days",
      century: "💯 Century - Completed 100 total goals tracker",
      honest_7: "📸 Honest 7 - Provided verification for 7 days",
      honest_30: "👑 Honest 30 - Provided verification for 30 days",
      perfect_week: "✨ Perfect Week - 100% compliance week",
      perfect_month: "🏆 Perfect Month - 100% compliance month"
    };
    
    badges.forEach(b => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const badgeText = badgeMap[b.id] || b.id;
      doc.text(`  • ${badgeText} (Earned: ${new Date(b.earnedAt).toLocaleDateString()})`, 14, y);
      y += 6;
    });
  }
  
  doc.line(14, y + 2, 196, y + 2);
  y += 10;
  
  // Daily Completion Summaries
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Daily Completion Summaries", 14, y);
  y += 8;
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50);
  
  let col = 14;
  scoresObj.forEach((s, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    
    const text = `Day ${s.day}: ${s.score}%`;
    doc.text(text, col, y);
    
    // Multi-column list layout
    if (col === 14) {
      col = 70;
    } else if (col === 70) {
      col = 130;
    } else {
      col = 14;
      y += 6;
    }
  });
  
  if (col !== 14) {
    y += 6; // carriage return
  }
  
  // Monthly goals list
  const monthlyGoals = getMonthlyGoals().filter(g => {
    // simple check if goals match current month name or monthKey
    return true; // render all monthly targets set
  });
  
  if (monthlyGoals.length > 0) {
    y += 4;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 30, 30);
    doc.text("Monthly High-Level Targets", 14, y);
    y += 8;
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    monthlyGoals.forEach(g => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const check = g.done ? "[x] " : "[ ] ";
      doc.text(`  ${check}${g.title} (Target: ${g.deadline || 'End of Month'})`, 14, y);
      y += 6;
    });
  }
  
  doc.save(`GoalPad_Monthly_Report_${monthKey}.pdf`);
  showToast("Monthly PDF report downloaded!", "success");
}
