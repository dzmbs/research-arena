// Minimal dependency-free table renderer for terminal output.
import pc from "picocolors";

/**
 * Render an array of row objects as an aligned text table.
 *
 * @param {Array<Record<string, any>>} rows
 * @param {Array<{ key: string, label: string, align?: 'left'|'right', color?: (v:string)=>string }>} columns
 */
export function table(rows, columns) {
  const widths = columns.map((c) =>
    Math.max(c.label.length, ...rows.map((r) => String(r[c.key] ?? "").length), 0),
  );

  const pad = (text, width, align) => {
    const s = String(text ?? "");
    const space = " ".repeat(Math.max(0, width - s.length));
    return align === "right" ? space + s : s + space;
  };

  const header = columns
    .map((c, i) => pc.bold(pad(c.label, widths[i], c.align)))
    .join("  ");
  const sep = pc.dim(columns.map((_, i) => "-".repeat(widths[i])).join("  "));

  const lines = rows.map((r) =>
    columns
      .map((c, i) => {
        const cell = pad(r[c.key], widths[i], c.align);
        return c.color ? c.color(cell) : cell;
      })
      .join("  "),
  );

  return [header, sep, ...lines].join("\n");
}
