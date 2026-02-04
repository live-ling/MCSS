import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ServerCard } from '@/components/server/ServerCard';
import { ServerFilterComponent } from '@/components/server/ServerFilter';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { getServers } from '@/db/api';
import type { ServerDetail, ServerFilter } from '@/types';

export default function ServersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [servers, setServers] = useState<ServerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const page = Number.parseInt(searchParams.get('page') || '1');
  const pageSize = 12;

  const filter: ServerFilter = {
    version: searchParams.get('version') as any,
    server_type: searchParams.get('server_type') as any,
    is_pure_public: searchParams.get('is_pure_public') === 'true' ? true : undefined,
    requires_whitelist: searchParams.get('requires_whitelist') === 'false' ? false : undefined,
    requires_genuine: searchParams.get('requires_genuine') === 'true' ? true : undefined,
    search: searchParams.get('search') || undefined,
    sort: (searchParams.get('sort') as any) || 'latest',
  };

  useEffect(() => {
    const loadServers = async () => {
      setLoading(true);
      try {
        const result = await getServers(filter, { page, pageSize });
        setServers(result.data);
        setTotal(result.total);
        setTotalPages(result.totalPages);
      } catch (error) {
        console.error('加载服务器列表失败:', error);
      } finally {
        setLoading(false);
      }
    };

    loadServers();
  }, [searchParams]);

  const handleFilterChange = (newFilter: ServerFilter) => {
    const params = new URLSearchParams();
    if (newFilter.version) params.set('version', newFilter.version);
    if (newFilter.server_type) params.set('server_type', newFilter.server_type);
    if (newFilter.is_pure_public !== undefined) params.set('is_pure_public', String(newFilter.is_pure_public));
    if (newFilter.requires_whitelist !== undefined) params.set('requires_whitelist', String(newFilter.requires_whitelist));
    if (newFilter.requires_genuine !== undefined) params.set('requires_genuine', String(newFilter.requires_genuine));
    if (newFilter.search) params.set('search', newFilter.search);
    if (newFilter.sort) params.set('sort', newFilter.sort);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold">服务器列表</h1>
          <p className="text-muted-foreground">
            共找到 {total} 个服务器
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* 筛选侧边栏 */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20">
              <ServerFilterComponent filter={filter} onFilterChange={handleFilterChange} />
            </div>
          </aside>

          {/* 服务器列表 */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {[...Array(pageSize)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-video w-full bg-muted" />
                    <Skeleton className="h-6 w-3/4 bg-muted" />
                    <Skeleton className="h-4 w-full bg-muted" />
                    <Skeleton className="h-4 w-2/3 bg-muted" />
                  </div>
                ))}
              </div>
            ) : servers.length > 0 ? (
              <>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {servers.map((server) => (
                    <ServerCard key={server.id} server={server} />
                  ))}
                </div>

                {/* 分页 */}
                {totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => page > 1 && handlePageChange(page - 1)}
                            className={page <= 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                        {[...Array(totalPages)].map((_, i) => {
                          const pageNum = i + 1;
                          if (
                            pageNum === 1 ||
                            pageNum === totalPages ||
                            (pageNum >= page - 1 && pageNum <= page + 1)
                          ) {
                            return (
                              <PaginationItem key={pageNum}>
                                <PaginationLink
                                  onClick={() => handlePageChange(pageNum)}
                                  isActive={pageNum === page}
                                  className="cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          if (pageNum === page - 2 || pageNum === page + 2) {
                            return (
                              <PaginationItem key={pageNum}>
                                <span className="px-4">...</span>
                              </PaginationItem>
                            );
                          }
                          return null;
                        })}
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => page < totalPages && handlePageChange(page + 1)}
                            className={page >= totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-12 text-center">
                <p className="text-muted-foreground">没有找到符合条件的服务器</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
