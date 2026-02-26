# API Documentation

## Базовый URL
```
http://localhost:3000/api
```

## Аутентификация

Все защищённые endpoints требуют JWT токен в заголовке:
```
Authorization: Bearer <access_token>
```

### POST /auth/login
Вход в систему

**Request:**
```json
{
  "phone": "+77012345678",
  "password": "clinic123"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "name": "Иван Иванов",
    "role": "DOCTOR",
    "departmentId": "uuid"
  },
  "tokens": {
    "accessToken": "jwt_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

### POST /auth/refresh
Обновление access токена

**Request:**
```json
{
  "refreshToken": "jwt_refresh_token"
}
```

### POST /auth/logout
Выход из системы

### GET /auth/me
Получение информации о текущем пользователе

---

## Расписание (Appointments)

### GET /appointments
Получение списка записей

**Query Parameters:**
- `date` - дата (YYYY-MM-DD)
- `doctorId` - ID доктора
- `departmentId` - ID отделения
- `status` - статус записи

### POST /appointments
Создание новой записи

**Request:**
```json
{
  "patientId": "uuid",
  "doctorId": "uuid",
  "serviceId": "uuid",
  "departmentId": "uuid",
  "datetime": "2026-02-26T10:00:00Z",
  "comment": "Жалобы на боли",
  "prepayment": 3000
}
```

### PUT /appointments/:id
Обновление записи

### DELETE /appointments/:id
Отмена записи

### PATCH /appointments/:id/arrive
Отметка о прибытии пациента

---

## Пациенты (Patients)

### GET /patients
Получение списка пациентов

**Query Parameters:**
- `search` - поиск по ФИО, телефону, ИИН
- `blacklist` - фильтр по чёрному списку (true/false)
- `source` - источник пациента
- `page` - номер страницы
- `limit` - количество на странице

### POST /patients
Создание нового пациента

**Request:**
```json
{
  "fullName": "Иванов Иван Иванович",
  "iin": "900101300123",
  "dob": "1990-01-01T00:00:00Z",
  "gender": "MALE",
  "phone": "+77012345678",
  "address": "г. Алматы, ул. Абая 150",
  "source": "INSTAGRAM"
}
```

### GET /patients/:id
Получение полной карточки пациента

### PUT /patients/:id
Обновление данных пациента

### PATCH /patients/:id/blacklist
Добавление/удаление из чёрного списка

**Request:**
```json
{
  "blacklist": true,
  "reason": "Не явился на приём 3 раза подряд"
}
```

---

## Направления (Directions)

### GET /directions
Получение списка направлений

**Query Parameters:**
- `status` - статус направления
- `doctorId` - ID доктора
- `patientId` - ID пациента

### POST /directions
Создание направления

**Request:**
```json
{
  "appointmentId": "uuid",
  "fromDoctorId": "uuid",
  "toDoctorId": "uuid",
  "patientId": "uuid",
  "serviceId": "uuid",
  "comment": "Требуется консультация",
  "urgency": "NORMAL"
}
```

---

## Оплата (Payments)

### POST /payments
Создание оплаты

**Request:**
```json
{
  "appointmentId": "uuid",
  "amount": 7000,
  "cash": 7000,
  "cashless": 0,
  "change": 0,
  "method": "CASH"
}
```

### GET /payments/:id/receipt
Получение PDF чека

**Query Parameters:**
- `width` - ширина чека (58 или 80 мм)
- `download` - скачать файл (true/false)

---

## Возвраты (Refunds)

### POST /refunds
Создание возврата

**Request:**
```json
{
  "paymentId": "uuid",
  "appointmentId": "uuid",
  "amount": 7000,
  "type": "FULL",
  "reasonCategory": "Пациент отказался от услуги",
  "reasonText": "Дополнительная информация",
  "refundMethod": "CASH"
}
```

### PATCH /refunds/:id/approve
Одобрение/отклонение возврата (только OWNER)

**Request:**
```json
{
  "approved": true,
  "notes": "Одобрено"
}
```

---

## Зарплата (Salary)

### GET /salary/accruals
Получение начислений

**Query Parameters:**
- `doctorId` - ID доктора
- `month` - месяц (1-12)
- `year` - год (YYYY)

### GET /salary/summary
Сводка по зарплате за период

**Query Parameters:**
- `month` - месяц (1-12)
- `year` - год (YYYY)

---

## Аналитика (Analytics)

### GET /analytics/dashboard
Дашборд владельца

**Response:**
```json
{
  "success": true,
  "data": {
    "today": {
      "patients": 15,
      "revenue": 105000
    },
    "month": {
      "revenue": 3200000,
      "appointments": 450,
      "arrived": 380,
      "conversionRate": 84.44,
      "refunds": 35000
    },
    "debt": 12000,
    "patientsBySource": [...],
    "topServices": [...]
  }
}
```

### GET /analytics/doctor/:id
Личная статистика доктора

**Query Parameters:**
- `period` - период (day/week/month/year)

---

## WebSocket События

### Client → Server

- `join:schedule` - подписка на расписание доктора
- `leave:schedule` - отписка от расписания
- `join:department` - подписка на отделение
- `leave:department` - отписка от отделения

### Server → Client

- `appointment:created` - новая запись
- `appointment:updated` - обновление записи
- `appointment:cancelled` - отмена записи
- `patient:arrived` - пациент прибыл
- `direction:created` - новое направление
- `direction:updated` - обновление направления
- `refund:approval_needed` - требуется одобрение возврата
- `refund:status_changed` - изменение статуса возврата
- `notification:new` - новое уведомление
- `assistant:assigned` - назначение ассистенту

---

## Коды ошибок

- `400` - Ошибка валидации
- `401` - Не авторизован
- `403` - Нет доступа
- `404` - Не найдено
- `409` - Конфликт (дубликат, занято время)
- `429` - Слишком много запросов
- `500` - Внутренняя ошибка сервера

## Rate Limiting

- Login endpoint: 10 запросов в минуту
- Остальные endpoints: 100 запросов в минуту
