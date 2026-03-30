'use client';

import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useAdminActions } from '@/hooks/queries/use-admin';
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
import { ADMIN_ACTION_TYPE_LABELS } from '@/lib/constants';
import { AdminActionType } from '@/types';
import type { AdminAction } from '@/types';

const columnHelper = createColumnHelper<AdminAction>();

const columns = [
  columnHelper.accessor('actionType', {
    header: 'Action',
    cell: (info) => ADMIN_ACTION_TYPE_LABELS[info.getValue()],
  }),
  columnHelper.accessor('targetType', { header: 'Target Type' }),
  columnHelper.accessor('targetId', {
    header: 'Target ID',
    meta: { className: 'hidden md:table-cell' },
  }),
  columnHelper.accessor('reason', {
    header: 'Reason',
    cell: (info) => info.getValue() ?? '-',
  }),
  columnHelper.accessor((row) => row.admin.name, {
    id: 'admin',
    header: 'Admin',
    meta: { className: 'hidden md:table-cell' },
  }),
  columnHelper.accessor('createdAt', {
    header: 'Date',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('en-US'),
  }),
];

/** Audit log page with action type filter and table */
export function AuditLogContent() {
  const [actionType, setActionType] = useQueryState('actionType', parseAsString);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const { data, isLoading } = useAdminActions({
    actionType: (actionType as AdminActionType) || undefined,
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
      <h1 className="font-display text-2xl font-semibold tracking-tight">Activity Log</h1>

      {/* Filter */}
      <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-card/30 p-4 sm:flex-row sm:items-center">
        <Select
          value={actionType ?? 'ALL'}
          onValueChange={(value) => {
            setActionType(value === 'ALL' ? null : value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Action type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {Object.entries(ADMIN_ACTION_TYPE_LABELS).map(([key, label]) => (
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
                  <TableRow key={row.id}>
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
