import type { QueryRequest, QueryFilter } from "@datachat/shared-types";

function matchesFilter(
  row: Record<string, unknown>,
  filter: QueryFilter
): boolean {
  const val = row[filter.field];
  const target = filter.value;

  switch (filter.operator) {
    case "eq":
      return val == target;
    case "neq":
      return val != target;
    case "gt":
      return Number(val) > Number(target);
    case "gte":
      return Number(val) >= Number(target);
    case "lt":
      return Number(val) < Number(target);
    case "lte":
      return Number(val) <= Number(target);
    case "contains":
      return String(val).toLowerCase().includes(String(target).toLowerCase());
    case "in":
      return Array.isArray(target) && target.includes(val);
    default:
      return true;
  }
}

export function executeQuery(
  data: Record<string, unknown>[],
  query: QueryRequest
): Record<string, unknown>[] {
  let result = [...data];

  // Apply filters
  if (query.filter && query.filter.length > 0) {
    result = result.filter((row) =>
      query.filter!.every((f) => matchesFilter(row, f))
    );
  }

  // Apply groupBy + aggregation
  if (query.groupBy && query.aggregate && query.aggregate.length > 0) {
    const groups = new Map<string, Record<string, unknown>[]>();
    for (const row of result) {
      const key = String(row[query.groupBy] ?? "null");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    result = Array.from(groups.entries()).map(([key, rows]) => {
      const grouped: Record<string, unknown> = { [query.groupBy!]: key };

      for (const agg of query.aggregate!) {
        const values = rows
          .map((r) => Number(r[agg.field]))
          .filter((n) => !isNaN(n));
        const alias = agg.alias || `${agg.fn}_${agg.field}`;

        switch (agg.fn) {
          case "sum":
            grouped[alias] = values.reduce((a, b) => a + b, 0);
            break;
          case "avg":
            grouped[alias] =
              values.length > 0
                ? Math.round(
                    (values.reduce((a, b) => a + b, 0) / values.length) * 100
                  ) / 100
                : 0;
            break;
          case "count":
            grouped[alias] = rows.length;
            break;
          case "min":
            grouped[alias] = values.length > 0 ? Math.min(...values) : 0;
            break;
          case "max":
            grouped[alias] = values.length > 0 ? Math.max(...values) : 0;
            break;
        }
      }

      return grouped;
    });
  }

  // Apply sort
  if (query.sort) {
    const { field, order } = query.sort;
    result.sort((a, b) => {
      const aVal = a[field];
      const bVal = b[field];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      const comparison =
        typeof aVal === "number" && typeof bVal === "number"
          ? aVal - bVal
          : String(aVal).localeCompare(String(bVal));

      return order === "desc" ? -comparison : comparison;
    });
  }

  // Apply limit
  if (query.limit) {
    result = result.slice(0, Math.min(query.limit, 50));
  } else {
    result = result.slice(0, 20);
  }

  return result;
}
