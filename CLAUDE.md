# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Build Control — система управления и мониторинга строительных объектов для Министерства строительства КЧР. Мультитенантная архитектура с 7 ролями пользователей.

## Commands

### Development (both services)
```bash
npm run dev                    # Запуск backend и frontend одновременно
npm run install:all            # Установка зависимостей для обоих проектов
```

### Backend (NestJS, port 3001)
```bash
cd backend
npm run start:dev              # Dev server с hot reload
npm run build                  # Production сборка
npm run lint                   # ESLint с автоисправлением
npm test                       # Запуск всех тестов
npm run test:watch             # Тесты в watch режиме
npm run test:e2e               # E2E тесты
npx jest path/to/file.spec.ts  # Запуск одного теста
```

### Database (Prisma)
```bash
cd backend
npx prisma migrate dev         # Применить миграции (dev)
npx prisma db push             # Синхронизация схемы без миграции
npx prisma db seed             # Заполнение тестовыми данными
npx prisma studio              # GUI для БД
npx prisma generate            # Генерация клиента после изменения схемы
```

### Frontend (Next.js 14, port 3000)
```bash
cd frontend
npm run dev                    # Dev server
npm run build                  # Production сборка
npm run lint                   # ESLint
```

### Docker (Production)
```bash
docker-compose -f docker-compose.prod.yml up -d      # Запуск
docker-compose -f docker-compose.prod.yml logs -f    # Логи
```

## Architecture

### Backend Structure (NestJS)
- **Модульная архитектура**: каждая сущность = отдельный модуль (controller + service + DTOs)
- **Точка входа**: `backend/src/main.ts` — bootstrap, CORS, глобальная валидация, префикс `/api`
- **Корневой модуль**: `backend/src/app.module.ts` — импорты всех feature-модулей
- **БД**: Prisma ORM, схема в `backend/prisma/schema.prisma`
- **Аутентификация**: JWT через Passport.js (`auth/` модуль)
- **Авторизация**: Role-based guards в `common/guards/`
- **Декораторы**: `@CurrentUser()`, `@Roles()` в `common/decorators/`

### Frontend Structure (Next.js App Router)
- **Роутинг**: `frontend/src/app/` — файловая структура = маршруты
- **API клиент**: `frontend/src/lib/api.ts` — типизированный REST клиент с JWT
- **Состояние**: React Context для авторизации (`contexts/auth-context.tsx`)
- **UI компоненты**: shadcn/ui в `components/ui/`
- **Feature компоненты**: `components/{feature}/` (objects, stages, etc.)

### Data Flow
1. Frontend вызывает методы из `lib/api.ts`
2. JWT токен автоматически добавляется из localStorage
3. Backend проверяет JWT через `JwtAuthGuard`
4. `RolesGuard` проверяет права доступа по роли
5. Service слой работает с Prisma

### Key Models (Prisma)
- **Tenant** — организация/регион (мультитенантность)
- **User** — пользователь с одной из 7 ролей
- **Object** — строительный объект
- **Stage** — этап работ внутри объекта
- **ResourceCheck** — ежедневная проверка ресурсов (люди + техника)
- **VolumeCheck** — проверка объёмов выполненных работ
- **Payment** — платёж по этапу
- **Appeal** — обращение (вопрос/проблема/предложение)

### User Roles
- `SUPERADMIN` — доступ ко всем тенантам
- `MINISTER` — полный доступ + дашборд
- `GOVERNMENT` — только чтение
- `ACCOUNTANT` — платежи
- `TECHNADZOR` — проверки объёмов
- `INSPECTOR` — ежедневные проверки ресурсов
- `CONTRACTOR` — свои объекты, обращения

## Environment Variables

Backend требует `.env` с:
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — секрет для JWT токенов

Frontend требует `.env.local` с:
- `NEXT_PUBLIC_API_URL` — URL бэкенда (default: http://localhost:3001/api)

## Test User
- Email: `admin@example.com`
- Password: `password123`
- Role: SUPERADMIN
