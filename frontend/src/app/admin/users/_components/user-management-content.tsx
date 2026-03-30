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
import { useAdminUsers } from '@/hooks/queries/use-admin';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { SEARCH_DEBOUNCE_MS, ROLE_LABELS } from '@/lib/constants';
import { Role } from '@/types';
import type { AdminUserItem } from '@/types';

const columnHelper = createColumnHelper<AdminUserItem>();

const columns = [
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('email', { header: 'Email' }),
  columnHelper.accessor('role', {
    header: 'Role',
    cell: (info) => (
      <Badge variant={info.getValue() === Role.ADMIN ? 'default' : 'secondary'}>
        {ROLE_LABELS[info.getValue()]}
      </Badge>
    ),
  }),
  columnHelper.accessor('isActive', {
    header: 'Status',
    cell: (info) => (
      <Badge variant={info.getValue() ? 'default' : 'destructive'}>
        {info.getValue() ? 'Active' : 'Suspended'}
      </Badge>
    ),
  }),
  columnHelper.accessor('createdAt', {
    header: 'Joined',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('en-US'),
    meta: { className: 'hidden md:table-cell' },
  }),
];

/** User management page with search, filters, and table */
export function UserManagementContent() {
  const router = useRouter();
  const [q, setQ] = useQueryState('q', parseAsString);
  const [role, setRole] = useQueryState('role', parseAsString);
  const [isActive, setIsActive] = useQueryState('isActive', parseAsString);
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

  const { data, isLoading } = useAdminUsers({
    q,
    role: (role as Role) || undefined,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    page,
  });

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const totalPages = data?.meta?.totalPages ?? 0;

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <h1 className="font-display text-2xl font-semibold tracking-tight">User Management</h1>

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-card/30 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          placeholder="Search name or email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="w-full sm:w-64"
        />

        <Select
          value={role ?? 'ALL'}
          onValueChange={(value) => {
            setRole(value === 'ALL' ? null : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {Object.entries(ROLE_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={isActive ?? 'ALL'}
          onValueChange={(value) => {
            setIsActive(value === 'ALL' ? null : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Suspended</SelectItem>
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
                      router.push(`/admin/users/${row.original.id}`)
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
