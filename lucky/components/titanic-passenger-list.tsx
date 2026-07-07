"use client";

import { useEffect, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(
  /\/$/,
  "",
);
const PAGE_SIZE = 50;

type Passenger = {
  id: number;
  passengerId: number;
  name: string;
  gender: string;
  age: number | null;
  pclass: number;
  survived: number;
  ticket: string;
  fare: number;
  embarked: string | null;
};

type PassengerResponse = {
  items: Passenger[];
  pagination: {
    page: number;
    size: number;
    totalCount: number;
    totalPages: number;
  };
};

export function TitanicPassengerList({ fetchEnabled = false }: { fetchEnabled?: boolean }) {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PassengerResponse | null>(null);

  useEffect(() => {
    if (!fetchEnabled) return;

    let mounted = true;
    const fetchPassengers = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/titanic/walter/myself`, {
          cache: "no-store",
        });
        if (!res.ok) {
          throw new Error("승객 목록 조회에 실패했습니다.");
        }
        await res.json().catch(() => null);
        if (mounted) {
          setData({
            items: [],
            pagination: {
              page,
              size: PAGE_SIZE,
              totalCount: 0,
              totalPages: 1,
            },
          });
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void fetchPassengers();
    return () => {
      mounted = false;
    };
  }, [fetchEnabled, page]);

  const totalPages = data?.pagination.totalPages ?? 1;

  return (
    <div className="mt-5 space-y-4">
      <div className="text-xs text-muted-foreground">
        총 {data?.pagination.totalCount ?? 0}명 · 페이지 {page}/{totalPages} · 페이지당 50명
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-muted-foreground">승객 명단을 불러오는 중...</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-[760px] w-full table-fixed text-[15px] leading-7">
          <thead className="bg-muted/40">
            <tr>
              <th className="w-14 px-3 py-2 text-center whitespace-nowrap">ID</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">이름</th>
              <th className="w-16 px-3 py-2 text-center whitespace-nowrap">성별</th>
              <th className="w-16 px-3 py-2 text-center whitespace-nowrap">나이</th>
              <th className="w-16 px-3 py-2 text-center whitespace-nowrap">객실</th>
              <th className="w-16 px-3 py-2 text-center whitespace-nowrap">생존</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border/70">
                <td className="px-3 py-2 text-center tabular-nums whitespace-nowrap">{p.passengerId}</td>
                <td className="px-3 py-2 whitespace-nowrap overflow-hidden text-ellipsis">{p.name}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap">{p.gender}</td>
                <td className="px-3 py-2 text-center tabular-nums whitespace-nowrap">{p.age ?? "-"}</td>
                <td className="px-3 py-2 text-center tabular-nums whitespace-nowrap">{p.pclass}</td>
                <td className="px-3 py-2 text-center whitespace-nowrap">{p.survived === 1 ? "생존" : "사망"}</td>
              </tr>
            ))}
            {!loading && (data?.items.length ?? 0) === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  표시할 승객 데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1 || loading}
        >
          이전
        </button>
        <span className="text-sm">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-50"
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          disabled={page >= totalPages || loading}
        >
          다음
        </button>
      </div>
    </div>
  );
}
