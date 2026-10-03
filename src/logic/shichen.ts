const SHICHEN_HOURS = [0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23] as const;

const getShichenIndex = (hour: number): number => {
  const normalizedHour = ((Math.trunc(hour) % 24) + 24) % 24;
  if (normalizedHour === 23) return SHICHEN_HOURS.length - 1;
  if (normalizedHour === 0) return 0;
  return Math.floor((normalizedHour + 1) / 2);
};

export const shiftShichen = (currentHour: number, delta: number): number => {
  const currentIndex = getShichenIndex(currentHour);
  const nextIndex = (currentIndex + delta % SHICHEN_HOURS.length + SHICHEN_HOURS.length) % SHICHEN_HOURS.length;
  return SHICHEN_HOURS[nextIndex];
};

