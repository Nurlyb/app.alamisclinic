/**
 * WhatsApp Business API интеграция
 * Отправка уведомлений пациентам
 */

const WHATSAPP_API_URL = process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v18.0';
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

interface WhatsAppMessage {
  to: string;
  type: 'text' | 'template';
  text?: {
    body: string;
  };
  template?: {
    name: string;
    language: {
      code: string;
    };
    components: any[];
  };
}

/**
 * Отправка текстового сообщения
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<boolean> {
  if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    console.warn('WhatsApp API не настроен');
    return false;
  }

  try {
    // Форматирование номера (удаление + и пробелов)
    const formattedPhone = phoneNumber.replace(/[+\s]/g, '');

    const payload: WhatsAppMessage = {
      to: formattedPhone,
      type: 'text',
      text: {
        body: message,
      },
    };

    const response = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('WhatsApp API error:', error);
      return false;
    }

    console.log(`✅ WhatsApp отправлен: ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    return false;
  }
}

/**
 * Уведомление о подтверждении записи
 */
export async function sendAppointmentConfirmation(
  phoneNumber: string,
  patientName: string,
  doctorName: string,
  datetime: Date,
  department: string
): Promise<boolean> {
  const dateStr = datetime.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = datetime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const message = `🏥 Подтверждение записи

Здравствуйте, ${patientName}!

Ваша запись подтверждена:
📅 Дата: ${dateStr}
🕐 Время: ${timeStr}
👨‍⚕️ Врач: ${doctorName}
🏥 Отделение: ${department}

Пожалуйста, приходите за 10 минут до приёма.

Если не сможете прийти, пожалуйста, предупредите нас заранее.`;

  return sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Напоминание за 24 часа
 */
export async function sendAppointmentReminder24h(
  phoneNumber: string,
  patientName: string,
  doctorName: string,
  datetime: Date
): Promise<boolean> {
  const dateStr = datetime.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  });
  const timeStr = datetime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const message = `⏰ Напоминание о приёме

Здравствуйте, ${patientName}!

Напоминаем о вашем приёме завтра:
📅 ${dateStr} в ${timeStr}
👨‍⚕️ Врач: ${doctorName}

До встречи!`;

  return sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Напоминание за 2 часа
 */
export async function sendAppointmentReminder2h(
  phoneNumber: string,
  patientName: string,
  datetime: Date
): Promise<boolean> {
  const timeStr = datetime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const message = `⏰ Напоминание

Здравствуйте, ${patientName}!

Ваш приём сегодня в ${timeStr}.
Ждём вас!`;

  return sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Уведомление о новом направлении
 */
export async function sendDirectionNotification(
  phoneNumber: string,
  patientName: string,
  toDoctorName: string,
  department: string,
  datetime: Date
): Promise<boolean> {
  const dateStr = datetime.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeStr = datetime.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const message = `📋 Новое направление

Здравствуйте, ${patientName}!

Вам назначена консультация:
👨‍⚕️ Врач: ${toDoctorName}
🏥 Отделение: ${department}
📅 Дата: ${dateStr}
🕐 Время: ${timeStr}

Пожалуйста, приходите вовремя.`;

  return sendWhatsAppMessage(phoneNumber, message);
}
