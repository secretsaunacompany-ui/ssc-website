const SLOT_DEFINITIONS = [
  { start: '09:00', end: '11:00' },
  { start: '11:00', end: '13:00' },
  { start: '13:00', end: '15:00' },
  { start: '15:00', end: '17:00' },
  { start: '17:00', end: '19:00' },
  { start: '19:00', end: '21:00' }
];

const DEFAULT_SOCIAL_CAPACITY = 12;
const PRIVATE_MAX_GUESTS = 14;
const SOCIAL_MAX_GUESTS = 12;
const MIN_ADVANCE_HOURS = 18;

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(value);
}

function normalizeTime(timeValue) {
  if (!timeValue) return null;
  const str = String(timeValue);
  return str.slice(0, 5);
}

function buildSlots() {
  return SLOT_DEFINITIONS.map((slot) => ({ ...slot }));
}

module.exports = {
  SLOT_DEFINITIONS,
  DEFAULT_SOCIAL_CAPACITY,
  PRIVATE_MAX_GUESTS,
  SOCIAL_MAX_GUESTS,
  MIN_ADVANCE_HOURS,
  isValidDate,
  isValidTime,
  normalizeTime,
  buildSlots
};
