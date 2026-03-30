'use client';

import { useRouter } from 'next/navigation';
import { useQueryState, parseAsInteger, parseAsString } from 'nuqs';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useAdminReviewReports } from '@/hooks/queries/use-review-reports';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
} from '@/lib/constants';
import { ReportStatus } from '@my-project/shared';
import type { ReportListItem } from '@/types/review-report';

const columnHelper = createColumnHelper<ReportListItem>();

const columns = [
  columnHelper.accessor('id', { header: 'ID' }),
  columnHelper.accessor('reason', {
    header: 'Reason',
    cell: (info) => REPORT_REASON_LABELS[info.getValue()],
  }),
  columnHelper.accessor((row) => row.reporter?.name ?? 'Unknown', {
    id: 'reporter',
    header: 'Reporter',
  }),
  columnHelper.accessor((row) => row.review?.status ?? 'DELETED', {
    id: 'reviewStatus',
    header: 'Review Status',
  }),
  columnHelper.accessor('status', {
    header: 'Report Status',
    cell: (info) => {
      const status = info.getValue();
      return (
        <Badge
          variant={status === ReportStatus.PENDING ? 'secondary' : 'default'}
        >
          {REPORT_STATUS_LABELS[status]}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('createdAt', {
    header: 'Date',
    cell: (info) => new Date(info.getValue()).toLocaleDateString('en-US'),
  }),
];

/** 관리자 리뷰 신고 목록 테이블 */
export function ReviewReportsTable() {
  const router = useRouter();
  const [status, setStatus] = useQueryState('status', parseAsString);
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1));

  const { data, isLoading } = useAdminReviewReports({
    status: (status as ReportStatus) || undefined,
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
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        Review Reports
      </h1>

      {/* 상태 필터 */}
      <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-card/30 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <Tabs
          value={status ?? 'ALL'}
          onValueChange={handleTabChange}
        >
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value={ReportStatus.PENDING}>Pending</TabsTrigger>
            <TabsTrigger value={ReportStatus.RESOLVED}>Resolved</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 테이블 */}
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
                      className={
                        (
                          header.column.columnDef.meta as {
                            className?: string;
                          }
                        )?.className
                      }
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
                      router.push(`/admin/review-reports/${row.original.id}`)
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={
                          (
                            cell.column.columnDef.meta as {
                              className?: string;
                            }
                          )?.className
                        }
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

      {/* 페이지네이션 */}
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
