const JAKARTA_TIMEZONE = 'Asia/Jakarta';

function getJakartaDateParts(date: Date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);

  return { year, month, day };
}

export function getJakartaWorkDate(date: Date = new Date()): Date {
  const { year, month, day } = getJakartaDateParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getJakartaMonthRange(monthStr: string): { startDate: Date; endDate: Date } {
  const [year, month] = monthStr.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  return {
    startDate: new Date(Date.UTC(year, month - 1, 1)),
    endDate: new Date(Date.UTC(year, month - 1, lastDay)),
  };
}

export function getJakartaWeekRange(date: Date = new Date()): { startDate: Date; endDate: Date } {
  const currentDate = getJakartaWorkDate(date);
  const dayOfWeek = currentDate.getUTCDay(); // 0=Sunday
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const startDate = new Date(currentDate);
  startDate.setUTCDate(currentDate.getUTCDate() - mondayOffset);

  const endDate = new Date(startDate);
  endDate.setUTCDate(startDate.getUTCDate() + 6);

  return { startDate, endDate };
}
