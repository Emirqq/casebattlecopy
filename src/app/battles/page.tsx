import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { formatCoins } from "@/lib/format";
import { CreateBattleButton } from "@/components/CreateBattleButton";

export const dynamic = "force-dynamic";

export default async function BattlesPage() {
  const [user, waiting, finished, cases] = await Promise.all([
    getCurrentUser(),
    prisma.battle.findMany({
      where: { status: "waiting" },
      include: {
        cases: { include: { case: true }, orderBy: { position: "asc" } },
        seats: { include: { user: true }, orderBy: { seat: "asc" } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.battle.findMany({
      where: { status: "finished" },
      include: {
        cases: { include: { case: true }, orderBy: { position: "asc" } },
        seats: { include: { user: true }, orderBy: { seat: "asc" } },
      },
      orderBy: { finishedAt: "desc" },
      take: 10,
    }),
    prisma.case.findMany({ orderBy: { price: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold uppercase">Баттлы</h1>
          <p className="text-[color:var(--muted)] text-sm">
            Открывай кейсы вместе — у кого выпали предметы дороже, тот забирает всё.
          </p>
        </div>
        <CreateBattleButton
          loggedIn={!!user}
          balance={user?.balance ?? 0}
          cases={cases.map((c) => ({ id: c.id, slug: c.slug, name: c.name, price: c.price, imageUrl: c.imageUrl }))}
        />
      </div>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-[color:var(--muted)] mb-2">Активные</h2>
        {waiting.length === 0 ? (
          <div className="card p-6 text-center text-[color:var(--muted)]">Нет активных баттлов.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {waiting.map((b) => (
              <BattleCard key={b.id} battle={b} />
            ))}
          </div>
        )}
      </section>

      {finished.length > 0 && (
        <section>
          <h2 className="text-sm uppercase tracking-wider text-[color:var(--muted)] mb-2">Завершённые</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {finished.map((b) => (
              <BattleCard key={b.id} battle={b} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

type BattleSummary = {
  id: string;
  mode: string;
  status: string;
  size: number;
  totalPrice: number;
  winnerSeat: number | null;
  cases: { case: { id: string; name: string; imageUrl: string } }[];
  seats: { seat: number; user: { username: string } | null; isBot: boolean }[];
};

function BattleCard({ battle }: { battle: BattleSummary }) {
  return (
    <Link href={`/battles/${battle.id}`} className="card p-4 hover:border-orange-400/40 transition block">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wider text-[color:var(--muted)]">{battle.mode}</span>
        <span className="text-orange-300 text-sm font-bold">{formatCoins(battle.totalPrice)} монет</span>
      </div>
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-thin">
        {battle.cases.map((bc, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={bc.case.imageUrl} alt={bc.case.name} className="w-12 h-12 object-contain shrink-0" />
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap text-sm">
        {battle.seats.map((s) => (
          <span
            key={s.seat}
            className={`px-2 py-0.5 rounded ${
              battle.winnerSeat === s.seat
                ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                : s.user
                ? "bg-white/5 border border-white/10"
                : s.isBot
                ? "bg-purple-400/10 text-purple-300 border border-purple-400/20"
                : "bg-white/5 text-[color:var(--muted)] border border-white/10"
            }`}
          >
            {s.user?.username ?? (s.isBot ? "Бот" : "пусто")}
          </span>
        ))}
      </div>
      {battle.status === "finished" ? (
        <div className="text-xs mt-2 text-emerald-300">Завершён</div>
      ) : (
        <div className="text-xs mt-2 text-[color:var(--muted)]">Ожидание игроков</div>
      )}
    </Link>
  );
}
