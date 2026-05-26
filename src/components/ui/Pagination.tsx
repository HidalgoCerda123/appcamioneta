import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

export default function Pagination({ page, totalPages, buildHref }: Props) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-center gap-1 py-4">
      {page > 1 ? (
        <Link href={buildHref(page - 1)} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600">
          <ChevronLeft className="w-4 h-4" />
        </Link>
      ) : (
        <span className="p-2 text-gray-300"><ChevronLeft className="w-4 h-4" /></span>
      )}

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-gray-400 text-sm">…</span>
        ) : (
          <Link
            key={p}
            href={buildHref(p)}
            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition ${
              p === page
                ? "bg-construserv-orange text-white"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            {p}
          </Link>
        )
      )}

      {page < totalPages ? (
        <Link href={buildHref(page + 1)} className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600">
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <span className="p-2 text-gray-300"><ChevronRight className="w-4 h-4" /></span>
      )}
    </div>
  );
}
