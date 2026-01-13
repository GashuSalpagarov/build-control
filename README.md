# Build Control

Контроль строительства объектов для Министерства строительства КЧР.

## Технологии

- **Backend**: NestJS, Prisma, PostgreSQL
- **Frontend**: Next.js 14, React, Tailwind CSS, shadcn/ui
- **Инфраструктура**: Docker, Nginx, Let's Encrypt

## Возможности

### Роли пользователей
- **SUPERADMIN** - полный доступ ко всем тенантам
- **MINISTER** - дашборд министра, полный доступ к объектам
- **GOVERNMENT** - просмотр статистики (read-only)
- **ACCOUNTANT** - управление платежами
- **TECHNADZOR** - проверка объёмов работ
- **INSPECTOR** - ежедневные проверки ресурсов
- **CONTRACTOR** - просмотр своих объектов, обращения

### Функционал
- Управление объектами строительства
- Календарный план-график с масштабированием (дни/недели/декады/месяцы)
- Ежедневный контроль людей и техники
- Проверка объёмов выполненных работ
- Учёт платежей
- Система обращений
- Дашборд с аналитикой и экспортом в Excel
- PWA для мобильных устройств

## Быстрый старт (Development)

### Требования
- Node.js 20+
- PostgreSQL 16+
- npm или yarn

### Установка

```bash
# Клонирование репозитория
git clone <repository-url>
cd build-control

# Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Frontend (в другом терминале)
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

### Доступ
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

### Тестовые пользователи
- **admin@example.com** / password123 (SUPERADMIN)

## Production Deployment

### Требования
- Docker и Docker Compose
- Домен с DNS записями (для SSL)

### Шаги

1. **Подготовка окружения**
```bash
cp .env.example .env
# Отредактируйте .env, установите:
# - POSTGRES_PASSWORD (надёжный пароль)
# - JWT_SECRET (минимум 32 символа)
```

2. **Запуск без SSL (для тестирования)**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

3. **Настройка SSL (для production)**

Отредактируйте `nginx/nginx.conf`:
- Раскомментируйте секцию HTTPS redirect (строки 49-60)
- Раскомментируйте SSL конфигурацию (строки 65-76)
- Замените `yourdomain.com` на ваш домен

Получение сертификата:
```bash
docker-compose -f docker-compose.prod.yml --profile ssl run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d yourdomain.com \
  --email admin@yourdomain.com \
  --agree-tos
```

Перезапуск nginx:
```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

4. **Автообновление сертификатов**
```bash
docker-compose -f docker-compose.prod.yml --profile ssl up -d certbot
```

### Мониторинг

```bash
# Логи всех сервисов
docker-compose -f docker-compose.prod.yml logs -f

# Логи конкретного сервиса
docker-compose -f docker-compose.prod.yml logs -f backend

# Статус
docker-compose -f docker-compose.prod.yml ps
```

### Обновление

```bash
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

## API Endpoints

### Авторизация
- `POST /api/auth/login` - вход
- `POST /api/auth/register` - регистрация
- `GET /api/auth/profile` - профиль текущего пользователя

### Объекты
- `GET /api/objects` - список объектов
- `GET /api/objects/:id` - детали объекта
- `POST /api/objects` - создание объекта
- `PATCH /api/objects/:id` - обновление
- `DELETE /api/objects/:id` - удаление
- `GET /api/objects/dashboard/stats` - статистика для дашборда

### Этапы
- `GET /api/stages?objectId=` - список этапов
- `POST /api/stages` - создание этапа
- `PATCH /api/stages/:id` - обновление
- `DELETE /api/stages/:id` - удаление

### Проверки ресурсов
- `GET /api/resource-checks?stageId=&date=` - список проверок
- `POST /api/resource-checks` - создание проверки
- `PATCH /api/resource-checks/:id` - обновление

### Проверки объёмов
- `GET /api/volume-checks?stageId=` - список проверок
- `POST /api/volume-checks` - создание проверки

### Платежи
- `GET /api/payments?stageId=` - список платежей
- `POST /api/payments` - создание платежа

### Обращения
- `GET /api/appeals` - список обращений
- `GET /api/appeals/:id` - детали обращения
- `POST /api/appeals` - создание обращения
- `POST /api/appeals/:id/messages` - добавление сообщения
- `PATCH /api/appeals/:id/status` - изменение статуса

### Справочники
- `GET /api/contractors` - подрядчики
- `GET /api/equipment-types` - типы техники
- `GET /api/users` - пользователи

## Структура проекта

```
build-control/
├── backend/
│   ├── src/
│   │   ├── auth/           # Авторизация (JWT)
│   │   ├── objects/        # Объекты строительства
│   │   ├── stages/         # Этапы работ
│   │   ├── contractors/    # Подрядчики
│   │   ├── resource-checks/ # Проверки ресурсов
│   │   ├── volume-checks/  # Проверки объёмов
│   │   ├── payments/       # Платежи
│   │   ├── appeals/        # Обращения
│   │   └── prisma/         # Prisma schema и миграции
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # React компоненты
│   │   └── lib/            # Утилиты и API клиент
│   ├── Dockerfile
│   └── package.json
├── nginx/
│   └── nginx.conf          # Конфигурация reverse proxy
├── docker-compose.prod.yml # Production конфигурация
└── .env.example            # Пример переменных окружения
```

## Лицензия

Proprietary - Министерство строительства КЧР
