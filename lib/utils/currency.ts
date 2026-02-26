/**
 * Утилиты для работы с валютой
 */

/**
 * Форматирование суммы в тенге
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num) + ' ₸';
}

/**
 * Парсинг суммы из строки
 */
export function parseCurrency(value: string): number {
  return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
}
