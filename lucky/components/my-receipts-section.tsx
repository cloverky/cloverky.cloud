"use client";

import { ReceiptText } from "lucide-react";
import { useAuth } from "@/components/auth-context";
import { useOpenLogin } from "@/components/login-dialog-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReceiptImageList } from "@/components/receipt-image-list";

/** 소비 패턴 분석 화면에서 내가 올린 영수증 원본을 확인하는 영역. */
export function MyReceiptsSection() {
  const { user, isReady } = useAuth();
  const openLogin = useOpenLogin();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptText className="h-5 w-5 text-accent" />
          내가 올린 영수증
        </CardTitle>
        <CardDescription className="text-sm leading-relaxed">
          지금까지 업로드한 영수증 원본입니다. 분석 결과가 실제와 다르면 원본을 열어
          확인해 보세요.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!isReady ? null : user?.email ? (
          <ReceiptImageList fetchEnabled userEmail={user.email} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              로그인하면 내가 올린 영수증을 확인할 수 있습니다.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={openLogin}>
              로그인
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
