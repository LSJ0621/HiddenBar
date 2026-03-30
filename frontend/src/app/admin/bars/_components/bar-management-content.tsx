'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useAdminBars } from '@/hooks/queries/use-admin';
import { BarStatusBadge } from '@/components/ui/bar-status-badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/pagination';
import { SEARCH_DEBOUNCE_MS, ADMIN_BARS_SORT_LABELS } from '@/lib/constants';
import { BarStatus, AdminBarsSortBy } from '@/types';
import type { AdminBarItem } from '@/types';

const columnHelper = createColumnHelper<AdminBarItem>();

const columns = [
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('city', {
    header: 'City',
    meta: { className: 'hidden md:table-cell' },
  }),
  columnHelper.accessor((row) => row.owner.name, {
    id: 'owner',
    header: 'Owner',
  }),
  columnHelper.accessor('photoCount', {
    header: 'Photos',
    meta: { className: 'hidden md:table-cell' },
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <BarStatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('en-US'),
    meta: { className: 'hidden md:table-cell' },
  }),
];

/** Bar management page with search, filter, sort, and table */
export function BarManagementContent() {
  const router = useRouter();
  const [status, setStatus] = useQueryState('status', parseAsString);
  const [q, setQ] = useQueryState('q', parseAsString);
  const [sortBy, setSortBy] = useQueryState('sortBy', parseAsString);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const [searchInput, setSearchInput] = useState(q ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = searchInput.trim() || null;
      if (trimmed !== q) {
        setQ(trimmed);
        setPage(1);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput, q, setQ, setPage]);

  const { data, isLoading } = useAdminBars({
    status: (status as BarStatus) || undefined,
    q,
    sortBy: (sortBy as AdminBarsSortBy) || undefined,
    page,
  });

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = data?.meta?.totalPages ?? 0;

  const handleTabChange = (value: string) => {
    setStatus(value === 'ALL' ? null : value);
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Bar Management</h1>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-card/30 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Tabs
          value={status ?? 'ALL'}
          onValueChange={handleTabChange}
        >
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value={BarStatus.PENDING}>Pending</TabsTrigger>
            <TabsTrigger value={BarStatus.APPROVED}>Approved</TabsTrigger>
            <TabsTrigger value={BarStatus.REJECTED}>Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        <Input
          placeholder="Search bar name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full sm:w-60"
        />

        <Select
          value={sortBy ?? ''}
          onValueChange={(value) => {
            setSortBy(value || null);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(ADMIN_BARS_SORT_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="overflow-hidden rounded-lg border border-border/50">
          <Skeleton className="h-10 w-full bg-muted/30" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border/50">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={(header.column.columnDef.meta as { className?: string })?.className}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No data
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className="cursor-pointer transition-colors hover:bg-primary/5"
                    onClick={() =>
                      router.push(`/admin/bars/${row.original.id}`)
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={(cell.column.columnDef.meta as { className?: string })?.className}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
