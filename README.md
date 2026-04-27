# casebattlecopy

Демо-клон case-battle-style сайта на Next.js 14 с виртуальной валютой.
**Без реальных платежей и выводов** — это просто игра.

## Функции

- Открытие кейсов с анимацией рулетки.
- Баттлы 1v1 / 1v1v1 / 2v2 (с авто-ботами при старте).
- Апгрейд: ставка предмета или монет → шанс получить более дорогой предмет.
- Контракты: 10 предметов → 1 рандомный.
- Профиль с инвентарём и историей транзакций.
- Виртуальный баланс (стартовый бонус 1000 монет, `+1000` в любой момент).

## Стек

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Prisma + SQLite (для простоты запуска)
- Cookie-based session auth по нику (без паролей)
- Каталог скинов CS2 — публичные данные из [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API)

## Запуск

```bash
npm install
cp .env.example .env
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Открой http://localhost:3000.

## Скрипты

- `npm run dev` — dev-сервер
- `npm run build` — production-сборка
- `npm run start` — production-сервер
- `npm run lint` — ESLint
- `npm run db:migrate` — Prisma миграции
- `npm run db:seed` — заполнение БД (предметы + кейсы)

## Дисклеймер

Этот проект — учебная демонстрация. Любая «валюта» внутри — фантики, не имеет
реальной стоимости и не может быть выведена. Сайт не аффилирован с
case-battle.red и не использует его код.
