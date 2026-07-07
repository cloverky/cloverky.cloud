import { redirect } from "next/navigation";

/** 예전 /titanic 경로 → /lesson */
export default function TitanicRedirectPage() {
  redirect("/lesson");
}
