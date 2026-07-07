"use client";

import { useState } from "react";
import Link from "next/link";
import { BookUser, Mail, Plus, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ContactsUploadDialog, type Contact } from "@/components/contacts-upload-dialog";
import { MailComposeDialog } from "@/components/mail-compose-dialog";
import { cn } from "@/lib/utils";
import { loadContacts, mergeContacts, saveContacts } from "@/lib/contacts-store";

export function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(() => loadContacts());
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);

  function handleImported(imported: Contact[]) {
    setContacts((prev) => {
      const merged = mergeContacts(prev, imported);
      saveContacts(merged);
      return merged;
    });
    setUploadOpen(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] pt-16">
      {/* 사이드바 */}
      <aside className="hidden w-52 shrink-0 border-r border-border/60 bg-muted/20 sm:block">
        <nav className="flex flex-col gap-1 p-4 pt-8">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            메일관리
          </p>
          <button
            type="button"
            onClick={() => setMailOpen(true)}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors",
              "hover:bg-accent/10 hover:text-foreground",
            )}
          >
            <Mail className="h-4 w-4" />
            메일 작성
          </button>
          <Link
            href="/mail/contacts"
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              "bg-accent/15 text-accent",
            )}
          >
            <BookUser className="h-4 w-4" />
            주소록
          </Link>
        </nav>
      </aside>

      {/* 본문 */}
      <main className="flex-1 overflow-auto px-6 py-8">
        <div className="mx-auto max-w-4xl">
          {/* 상단 헤더 */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">주소록</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                총 {contacts.length}명
              </p>
            </div>
            <Button
              onClick={() => setUploadOpen(true)}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" />
              등록
            </Button>
          </div>

          {/* 목록 */}
          {contacts.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
              <UserRound className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">등록된 연락처가 없습니다.</p>
              <p className="text-xs text-muted-foreground">상단 등록 버튼으로 CSV를 업로드하세요.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>이름</TableHead>
                    <TableHead>이메일</TableHead>
                    <TableHead>연락처</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((c, i) => (
                    <TableRow key={c.email}>
                      <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{c.name || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{c.email}</TableCell>
                      <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      <ContactsUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onImported={handleImported}
      />
      <MailComposeDialog open={mailOpen} onOpenChange={setMailOpen} />
    </div>
  );
}
