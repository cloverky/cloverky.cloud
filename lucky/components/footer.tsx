"use client";

import { Clock, Refrigerator } from "lucide-react";


export function Footer() {
  return (
    <footer id="contact" className="border-t border-border bg-card/50 py-12">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <Refrigerator className="h-6 w-6 text-accent" />
              <span className="text-xl font-bold text-foreground">FridgeAI</span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              AI 기반 냉장고 재고 관리 및 맞춤 레시피 서비스로
              더 스마트한 주방 생활을 경험하세요.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">문의</h3>
            <ul className="mt-4 space-y-2">
              <li><a href="mailto:hisoyeon04@gmail.com" className="text-sm text-muted-foreground hover:text-foreground">hisoyeon04@gmail.com</a></li>
              <li><a href="https://github.com/cloverky" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">GitHub</a></li>
            </ul>
            <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <div>
                <p className="font-medium text-foreground">문의 시간</p>
                <p className="mt-0.5">평일 10:00 – 18:00 (KST)</p>
                <p className="text-xs">답변은 순차 처리됩니다</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-border pt-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2026 FridgeAI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
