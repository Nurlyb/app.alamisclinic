/**
 * Twilio SMS интеграция
 * Отправка SMS уведомлений
 */

import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

let twilioClient: twilio.Twilio | null = null;

/**
 * Инициализация Twilio клиента
 */
function getTwilioClient(): twilio.Twilio | null {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    console.warn('Twilio не настроен');
    return null;
  }

  if (!twilioClient) {
    twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  }

  return twilioClient;
}

/**
 * Отправка SMS
 */
export async function sendSMS(phoneNumber: string, message: string): Promise<boolean> {
  const client = getTwilioClient();

  if (!client || !TWILIO_PHONE_NUMBER) {
    console.warn('Twilio не настроен, SMS не отправлен');
    return false;
  }

  try {
    await client.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber,
    });

    console.log(`✅ SMS отправлен: ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return false;
  }
}

/**
 * SMS подтверждение записи
 */
export async function sendAppointmentConfirmationSMS(
  phoneNumber: string,
  patientName: string,
  datetime: Date,
  doctorName: string
): Promise<boolean> {
  const dateStr = datetime.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
  const timeStr = datetime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const message = `Здравствуйте, ${patientName}! Ваша запись подтверждена: ${dateStr} в ${timeStr}, врач ${doctorName}. Клиника.`;

  return sendSMS(phoneNumber, message);
}

/**
 * SMS напоминание
 */
export async function sendAppointmentReminderSMS(
  phoneNumber: string,
  datetime: Date
): Promise<boolean> {
  const timeStr = datetime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const message = `Напоминаем о вашем приёме сегодня в ${timeStr}. Ждём вас! Клиника.`;

  return sendSMS(phoneNumber, message);
}
