'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { purgeLegacyInterviewData } from '@/app/admin/legacy-purge-actions';

const CONFIRM_PHRASE = 'DELETE INTERVIEWS';

export default function AdminMaintenancePage() {
  const { user } = useUser();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isPurging, setIsPurging] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const canConfirm = confirmText.trim() === CONFIRM_PHRASE;

  const handlePurge = async () => {
    if (!user) return;
    setIsPurging(true);
    try {
      const idToken = await user.getIdToken();
      const result = await purgeLegacyInterviewData({ idToken });
      setLastResult({ success: result.success, message: result.message });
      if (result.success) {
        setDialogOpen(false);
        setConfirmText('');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error.';
      setLastResult({ success: false, message });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[28px] font-bold text-[#333333]">Maintenance</h1>
        <p className="text-[14px] text-[#8E8E8E] mt-1">
          One-off administrative tasks. Use with care — these operations are irreversible.
        </p>
      </div>

      <section
        className="rounded-xl border border-[#FFD1B3] bg-[#FFF4EC] p-6"
        style={{ boxShadow: '0 2px 12px rgba(255,98,0,0.08)' }}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-white p-2">
            <AlertTriangle className="h-6 w-6 text-[#FF6200]" />
          </div>
          <div className="flex-1">
            <h2 className="text-[18px] font-semibold text-[#333333]">
              Purge legacy interview data
            </h2>
            <p className="text-[13px] text-[#565656] mt-2 leading-relaxed">
              Deletes every document in the <code>interviewSlots</code> and{' '}
              <code>interviewBookings</code> collections. The in-person interview flow has
              been retired in favor of the indoctrination class flow, so this legacy data
              is no longer referenced by any UI. This action cannot be undone.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button
                variant="destructive"
                onClick={() => {
                  setConfirmText('');
                  setLastResult(null);
                  setDialogOpen(true);
                }}
                disabled={isPurging}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Purge legacy interview data
              </Button>

              {lastResult && (
                <span
                  className={
                    lastResult.success
                      ? 'text-[13px] font-semibold text-[#008A00]'
                      : 'text-[13px] font-semibold text-[#D64545]'
                  }
                >
                  {lastResult.message}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={(open) => !isPurging && setDialogOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Purge legacy interview data?</DialogTitle>
            <DialogDescription>
              This will permanently delete all documents in <code>interviewSlots</code> and{' '}
              <code>interviewBookings</code>. There is no undo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="confirm-phrase" className="text-[13px] font-semibold">
              Type <code>{CONFIRM_PHRASE}</code> to confirm
            </Label>
            <Input
              id="confirm-phrase"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              disabled={isPurging}
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={isPurging}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePurge}
              disabled={!canConfirm || isPurging}
            >
              {isPurging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Purging…
                </>
              ) : (
                'Purge permanently'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
