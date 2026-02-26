/**
 * Утилиты валидации
 */

/**
 * Валидация ИИН (12 цифр)
 */
export function validateIIN(iin: string): boolean {
  return /^\d{12}$/.test(iin);
}

/**
 * Валидация телефона
 */
export function validatePhone(phone: string): boolean {
  return /^\+?[0-9]{10,15}$/.test(phone.replace(/[\s()-]/g, ''));
}

/**
 * Форматирование телефона
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.startsWith('7') && cleaned.length === 11) {
    return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
  }
  
  return phone;
}

/**
 * Форматирование ИИН
 */
export function formatIIN(iin: string): string {
  const cleaned = iin.replace(/\D/g, '');
  
  if (cleaned.length === 12) {
    return `${cleaned.slice(0, 6)} ${cleaned.slice(6)}`;
  }
  
  return iin;
}
