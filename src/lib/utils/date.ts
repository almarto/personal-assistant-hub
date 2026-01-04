export function calculateAge(birthDate: Date | string) {
  const birth = new Date(birthDate);
  const now = new Date();

  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();

  if (days < 0) {
    months--;
    // Get days in previous month
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  return { years, months, days };
}

export function calculateDaysToNextMonthversary(birthDate: Date | string) {
  const birth = new Date(birthDate);
  const now = new Date();
  
  // Normalize time to start of day for accurate day difference
  now.setHours(0, 0, 0, 0);
  
  const birthDay = birth.getDate();
  let targetMonth = now.getMonth();
  let targetYear = now.getFullYear();

  // Helper to get last day of month
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  // Determine potential target date in current month
  const maxDaysInCurrentMonth = getDaysInMonth(targetYear, targetMonth);
  const targetDayInCurrentMonth = Math.min(birthDay, maxDaysInCurrentMonth);
  let targetDate = new Date(targetYear, targetMonth, targetDayInCurrentMonth);

  // If target date is in the past, move to next month
  if (targetDate < now) {
    targetMonth++;
    if (targetMonth > 11) {
      targetMonth = 0;
      targetYear++;
    }
    const maxDaysInNextMonth = getDaysInMonth(targetYear, targetMonth);
    const targetDayInNextMonth = Math.min(birthDay, maxDaysInNextMonth);
    targetDate = new Date(targetYear, targetMonth, targetDayInNextMonth);
  }

  // Calculate difference in days
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

export function formatAge(
  age: { years: number; months: number; days: number },
  t: (key: string) => string
) {
  let ageString = "";
  if (age.years > 0) {
    ageString = `${age.years} ${t(age.years === 1 ? "year" : "years")}`;
    if (age.months > 0) {
      ageString += ` ${age.months} ${t(age.months === 1 ? "month" : "months")}`;
    }
  } else if (age.months > 0) {
    ageString = `${age.months} ${t(age.months === 1 ? "month" : "months")}`;
  } else {
    ageString = `${age.days} ${t(age.days === 1 ? "day" : "days")}`;
  }
  return ageString;
}
