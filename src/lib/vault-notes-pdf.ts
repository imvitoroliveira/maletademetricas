import jsPDF from "jspdf";
import type { VaultNote } from "@/hooks/useVaultNotes";

const MARGIN = 48;
const LINE_HEIGHT = 16;

export function exportVaultNoteToPdf(note: Pick<VaultNote, "title" | "content" | "tags" | "updated_at">) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - MARGIN * 2;

  let cursorY = MARGIN;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(20, 20, 30);
  const titleLines = doc.splitTextToSize(note.title || "Sem título", contentWidth);
  doc.text(titleLines, MARGIN, cursorY);
  cursorY += titleLines.length * 24;

  // Meta
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 130);
  const updated = new Date(note.updated_at).toLocaleString("pt-BR");
  const metaParts = [`Atualizado em ${updated}`];
  if (note.tags?.length) metaParts.push(`Tags: ${note.tags.join(", ")}`);
  doc.text(metaParts.join("  •  "), MARGIN, cursorY);
  cursorY += 20;

  // Divider
  doc.setDrawColor(220, 220, 230);
  doc.line(MARGIN, cursorY, pageWidth - MARGIN, cursorY);
  cursorY += 16;

  // Content
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 50);
  const paragraphs = (note.content || "").split(/\n/);
  for (const p of paragraphs) {
    const lines = doc.splitTextToSize(p.length ? p : " ", contentWidth);
    for (const line of lines) {
      if (cursorY > pageHeight - MARGIN) {
        doc.addPage();
        cursorY = MARGIN;
      }
      doc.text(line, MARGIN, cursorY);
      cursorY += LINE_HEIGHT;
    }
  }

  const safeName = (note.title || "anotacao")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "anotacao";
  doc.save(`${safeName}.pdf`);
}
