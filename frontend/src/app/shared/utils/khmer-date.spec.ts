import { englishTime, khmerDate, khmerTime, toKhmerDigits } from './khmer-date';

describe('Khmer dates', () => {
  it('writes numbers with Khmer digits', () => {
    expect(toKhmerDigits('2028')).toBe('២០២៨');
  });

  it('writes the full Khmer date', () => {
    expect(khmerDate('2028-01-08')).toBe('ថ្ងៃសៅរ៍ ទី០៨ ខែមករា ឆ្នាំ២០២៨');
  });

  it('names the part of the day', () => {
    expect(khmerTime('12:00')).toBe('ម៉ោង ១២ : ០០ ពេលថ្ងៃត្រង់');
    expect(khmerTime('09:30')).toBe('ម៉ោង ៩ : ៣០ ពេលព្រឹក');
    expect(khmerTime('18:00')).toBe('ម៉ោង ៦ : ០០ ពេលល្ងាច');
  });

  it('writes English 12-hour times', () => {
    expect(englishTime('12:00')).toBe('12:00 PM');
    expect(englishTime('00:15')).toBe('12:15 AM');
  });
});
