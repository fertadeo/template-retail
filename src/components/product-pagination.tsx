import { Button } from "@/components/ui/button";

export function ProductPagination({ page, hasMore, loading, onPage, label = "Páginas de productos" }: {
  page: number; hasMore: boolean; loading: boolean; onPage: (page: number) => void; label?: string;
}) {
  return (
    <nav aria-label={label} className="flex items-center justify-between gap-3 px-3 py-3 text-sm">
      <Button variant="outline" disabled={loading || page === 1} onClick={() => onPage(page - 1)}>Anterior</Button>
      <span aria-live="polite">Página {page}</span>
      <Button variant="outline" disabled={loading || !hasMore} onClick={() => onPage(page + 1)}>Siguiente</Button>
    </nav>
  );
}
