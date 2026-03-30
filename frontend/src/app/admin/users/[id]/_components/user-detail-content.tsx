'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import { ArrowLeft, Ban, CheckCircle, Shield } from 'lucide-react';
import {
  useAdminUserDetail,
  useSuspendUser,
  useActivateUser,
  useChangeUserRole,
} from '@/hooks/queries/use-admin';
import { DetailRow } from '@/components/admin/detail-row';
import { SuspendDialog } from '@/components/admin/suspend-dialog';
import { RoleChangeDialog } from '@/components/admin/role-change-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/hooks/use-auth';
import { ROLE_LABELS } from '@/lib/constants';
import type { Role } from '@/types';

interface UserDetailContentProps {
  params: Promise<{ id: string }>;
}

/** User detail page with suspend/activate/role-change actions */
export function UserDetailContent({ params }: UserDetailContentProps) {
  const { id: idStr } = use(params);
  const id = Number(idStr);
  const router = useRouter();
  const { user: currentUser } = useAuthStore();
  const { data: targetUser, isLoading } = useAdminUserDetail(id);
  const suspendUser = useSuspendUser();
  const activateUser = useActivateUser();
  const changeUserRole = useChangeUserRole();

  const [suspendOpen, setSuspendOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  const isSelf = currentUser?.id === id;

  const handleSuspend = async (reason: string) => {
    try {
      await suspendUser.mutateAsync({ id, reason });
      toast.success('User has been suspended');
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          toast.error('You cannot modify your own permissions');
        } else {
          toast.error(error.response?.data?.message ?? 'Failed to suspend');
        }
      }
    }
  };

  const handleActivate = async () => {
    try {
      await activateUser.mutateAsync({ id });
      toast.success('User has been activated');
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          toast.error('You cannot modify your own permissions');
        } else {
          toast.error(error.response?.data?.message ?? 'Failed to activate');
        }
      }
    }
  };

  const handleRoleChange = async (role: Role, reason: string) => {
    try {
      await changeUserRole.mutateAsync({ id, role, reason: reason || undefined });
      toast.success('Role has been changed');
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.response?.status === 403) {
          toast.error('You cannot modify your own permissions');
        } else {
          toast.error(error.response?.data?.message ?? 'Failed to change role');
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="text-center text-muted-foreground">
        User not found
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.push('/admin/users')}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="font-display text-2xl font-semibold tracking-tight">User Details</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {targetUser.isActive ? (
            <Button
              className="w-full sm:w-auto"
              variant="destructive"
              onClick={() => setSuspendOpen(true)}
              disabled={isSelf}
            >
              <Ban className="size-4" />
              Suspend
            </Button>
          ) : (
            <Button
              className="w-full sm:w-auto"
              onClick={handleActivate}
              disabled={isSelf || activateUser.isPending}
            >
              <CheckCircle className="size-4" />
              Activate
            </Button>
          )}
          <Button
            className="w-full sm:w-auto"
            variant="outline"
            onClick={() => setRoleOpen(true)}
            disabled={isSelf}
          >
            <Shield className="size-4" />
            Change Role
          </Button>
        </div>
      </div>

      <Separator />

      {/* User info */}
      <Card className="transition-shadow duration-200 hover:shadow-md">
        <CardHeader>
          <CardTitle className="text-base">User Info</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
            <Avatar className="size-20 shrink-0 ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
              <AvatarImage src={targetUser.profileImage ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-lg text-primary">
                {targetUser.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h2 className="text-xl font-semibold">{targetUser.name}</h2>
                <Badge variant={targetUser.role === 'ADMIN' ? 'default' : 'secondary'}>
                  {ROLE_LABELS[targetUser.role]}
                </Badge>
                <Badge variant={targetUser.isActive ? 'default' : 'destructive'}>
                  {targetUser.isActive ? 'Active' : 'Suspended'}
                </Badge>
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <DetailRow label="Email" value={targetUser.email} />
                <DetailRow label="Login Method" value={targetUser.provider} />
                <DetailRow label="Registered Bars" value={String(targetUser.barCount)} />
                <DetailRow label="Bookmarks" value={String(targetUser.bookmarkCount)} />
                <DetailRow
                  label="Joined"
                  value={new Date(targetUser.createdAt).toLocaleDateString('en-US')}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <SuspendDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onConfirm={handleSuspend}
      />
      <RoleChangeDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        currentRole={targetUser.role}
        onConfirm={handleRoleChange}
      />
    </div>
  );
}
