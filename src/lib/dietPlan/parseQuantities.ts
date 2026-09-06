export type Unit = "g" | "ml" | "ud";

export interface ParsedIngredient {
  name: string;
  quantity: number;
  unit: Unit;
}

export class UnparsableQuantityError extends Error {
  constructor(segment: string) {
    super(`No se pudo interpretar el segmento de cantidad: "${segment}"`);
    this.name = "UnparsableQuantityError";
  }
}

function parseNumber(raw: string): number {
  return parseFloat(raw.replace(",", "."));
}

function parseSegment(rawSegment: string): ParsedIngredient {
  const segment = rawSegment.trim();

  // "<n> <name> (<n2> g|ml)" — parenthetical weight override, e.g. "2 tortillas (120 g)".
  const parenMatch = segment.match(
    /^\d+(?:[.,]\d+)?\s+(.+?)\s*\((\d+(?:[.,]\d+)?)\s*(g|ml)\)$/
  );
  if (parenMatch) {
    return { name: parenMatch[1].trim(), quantity: parseNumber(parenMatch[2]), unit: parenMatch[3] as Unit };
  }

  // "<n>/<m> <name>" — fraction, e.g. "1/2 aguacate compartido".
  const fractionMatch = segment.match(/^(\d+)\/(\d+)\s+(.+)$/);
  if (fractionMatch) {
    const quantity = parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
    const name = fractionMatch[3].replace(/\s*compartido\s*$/i, "").trim();
    return { name, quantity, unit: "ud" };
  }

  // "<n> g|ml <name>" — explicit weight/volume, e.g. "90 g pan integral".
  const weightMatch = segment.match(/^(\d+(?:[.,]\d+)?)\s*(g|ml)\s+(.+)$/);
  if (weightMatch) {
    return { name: weightMatch[3].trim(), quantity: parseNumber(weightMatch[1]), unit: weightMatch[2] as Unit };
  }

  // "<n> <name>" — bare count, e.g. "2 huevos".
  const countMatch = segment.match(/^(\d+(?:[.,]\d+)?)\s+(.+)$/);
  if (countMatch) {
    return { name: countMatch[2].trim(), quantity: parseNumber(countMatch[1]), unit: "ud" };
  }

  throw new UnparsableQuantityError(rawSegment);
}

export function parseQuantityString(quantities: string): ParsedIngredient[] {
  return quantities.split(/\s*\+\s*/).map(parseSegment);
}
