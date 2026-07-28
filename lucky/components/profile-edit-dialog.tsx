"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/auth-context";
import { changePassword, updateUsername } from "@/lib/auth-api";

interface ProfileEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditDialog({ open, onOpenChange }: ProfileEditDialogProps) {
  const { user, updateUser } = useAuth();

  const [nickname, setNickname] = useState(user?.username ?? "");
  const [nicknameLoading, setNicknameLoading] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | null>(null);
  const [nicknameDone, setNicknameDone] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordDone, setPasswordDone] = useState(false);

  useEffect(() => {
    // 다이얼로그가 열릴 때만 1회 프리필한다 — 이후 사용자가 편집하는 입력값을 덮어쓰지 않는다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) setNickname(user?.username ?? "");
  }, [open, user?.username]);

  const resetAndClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setPasswordError(null);
    setPasswordDone(false);
    setNicknameError(null);
    setNicknameDone(false);
    onOpenChange(false);
  };

  const handleNicknameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setNicknameLoading(true);
    setNicknameError(null);
    setNicknameDone(false);
    try {
      const result = await updateUsername(user.email, nickname.trim());
      updateUser({ username: result.username });
      setNicknameDone(true);
    } catch (err) {
      setNicknameError(err instanceof Error ? err.message : "닉네임 변경에 실패했습니다.");
    } finally {
      setNicknameLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== newPasswordConfirm) {
      setPasswordError("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordDone(false);
    try {
      await changePassword(user.email, currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setPasswordDone(true);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "비밀번호 변경에 실패했습니다.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : resetAndClose())}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">내 정보 수정</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            닉네임과 비밀번호를 변경할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleNicknameSubmit} className="space-y-2">
          <Label htmlFor="profile-nickname" className="text-foreground">
            닉네임
          </Label>
          <div className="flex gap-2">
            <Input
              id="profile-nickname"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setNicknameDone(false);
              }}
              minLength={2}
              maxLength={20}
              required
              className="border-border bg-background text-foreground"
            />
            <Button type="submit" variant="outline" disabled={nicknameLoading}>
              {nicknameLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "변경"}
            </Button>
          </div>
          {nicknameError && (
            <p className="text-sm text-destructive" role="alert">
              {nicknameError}
            </p>
          )}
          {nicknameDone && (
            <p className="text-sm text-accent" role="status">
              닉네임이 변경되었습니다.
            </p>
          )}
        </form>

        <div className="h-px bg-border" />

        <form onSubmit={handlePasswordSubmit} className="space-y-2">
          <Label className="text-foreground">비밀번호 변경</Label>
          <Input
            type="password"
            placeholder="현재 비밀번호"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            className="border-border bg-background text-foreground placeholder:text-muted-foreground"
          />
          <Input
            type="password"
            placeholder="새 비밀번호 (8자 이상)"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground"
          />
          <Input
            type="password"
            placeholder="새 비밀번호 확인"
            autoComplete="new-password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            required
            minLength={8}
            className="border-border bg-background text-foreground placeholder:text-muted-foreground"
          />
          <Button type="submit" variant="outline" className="w-full" disabled={passwordLoading}>
            {passwordLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "비밀번호 변경"
            )}
          </Button>
          {passwordError && (
            <p className="text-sm text-destructive" role="alert">
              {passwordError}
            </p>
          )}
          {passwordDone && (
            <p className="text-sm text-accent" role="status">
              비밀번호가 변경되었습니다.
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
