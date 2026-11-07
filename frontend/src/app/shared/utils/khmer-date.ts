const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
const KHMER_WEEKDAYS = ['អាទិត្យ', 'ចន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
const KHMER_MONTHS = [
  'មករា',
  'កុម្ភៈ',
  'មីនា',
  'មេសា',
  'ឧសភា',
  'មិថុនា',
  'កក្កដា',
  'សីហា',
  'កញ្ញា',
  'តុលា',
  'វិច្ឆិកា',
  'ធ្នូ',
];

export function toKhmerDigits(text: string | number): string {
  return String(text).replace(/\d/g, (digit) => KHMER_DIGITS[Number(digit)]);
}

/** "ថ្ងៃសៅរ៍ ទី២៤ ខែតុលា ឆ្នាំ២០២៦" for an ISO date (yyyy-mm-dd). */
export function khmerDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  const dd = String(day).padStart(2, '0');
  return `ថ្ងៃ${KHMER_WEEKDAYS[weekday]} ទី${toKhmerDigits(dd)} ខែ${KHMER_MONTHS[month - 1]} ឆ្នាំ${toKhmerDigits(year)}`;
}

/** "ម៉ោង ៩ : ០០ ពេលព្រឹក" for a 24-hour time (HH:mm), with the part of the day. */
export function khmerTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period =
    hours < 12
      ? 'ព្រឹក'
      : hours < 13
        ? 'ថ្ងៃត្រង់'
        : hours < 17
          ? 'រសៀល'
          : hours < 19
            ? 'ល្ងាច'
            : 'យប់';
  const clockHour = hours % 12 || 12;
  return `ម៉ោង ${toKhmerDigits(clockHour)} : ${toKhmerDigits(String(minutes).padStart(2, '0'))} ពេល${period}`;
}

/** "9:00 AM" for a 24-hour time (HH:mm). */
export function englishTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`;
}
