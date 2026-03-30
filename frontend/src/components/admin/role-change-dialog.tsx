'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2 } from 'lucide-react';
import { Role } from '@/types';
import { ROLE_LABELS } from '@/lib/constants';

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole: Role;
  onConfirm: (role: Role, reason: string) => Promise<void>;
}

/** Dialog for changing a user's role */
export function RoleChangeDialog({
  open,
  onOpenChange,
  currentRole,
  onConfirm,
}: RoleChangeDialogProps) {
  const [selectedRole, setSelectedRole] = useState<Role>(currentRole);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    if (selectedRole === currentRole) return;

    setIsLoading(true);
    try {
      await onConfirm(selectedRole, reason.trim());
      setReason('');
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setSelectedRole(currentRole);
      setReason('');
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Role</DialogTitle>
          <DialogDescription>Change the user&apos;s role.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Select Role</Label>
            <RadioGroup
              value={selectedRole}
              onValueChange={(value) => setSelectedRole(value as Role)}
            >
              {Object.values(Role).map((role) => (
                <div key={role} className="flex items-center gap-2">
                  <RadioGroupItem value={role} id={`role-${role}`} />
                  <Label htmlFor={`role-${role}`} className="font-normal">
                    {ROLE_LABELS[role]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="role-reason">Reason (optional)</Label>
            <Textarea
              id="role-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for change..."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isLoading || selectedRole === currentRole}
          >
            {isLoading && <Loader2 className="size-4 animate-spin" />}
            Change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
