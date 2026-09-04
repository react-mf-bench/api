import { of, forkJoin, map } from "rxjs";
import { relations } from "./relations.js";

/* Resolves relation ids into the records they point at. `fetchResource` is
 * passed in (rather than imported) so this module stays independent of the
 * cache in fetchWithCache.js — every related record is fetched through the
 * same cached pipeline, so shared relations are only requested once.
 */
export function expandResponse(response, expand, fetchResource) {
  if (response && Array.isArray(response.results)) {
    if (response.results.length === 0) {
      return of(response);
    }
    return forkJoin(
      response.results.map((record) =>
        expandRecord(record, expand, fetchResource)
      )
    ).pipe(map((results) => ({ ...response, results })));
  }
  return expandRecord(response, expand, fetchResource);
}

function expandRecord(record, expand, fetchResource) {
  const fields = expand.filter(
    (name) => record && record[name] !== undefined && record[name] !== null
  );
  if (fields.length === 0) {
    return of(record);
  }
  return forkJoin(
    fields.map((name) =>
      resolveRelation(record[name], relations[name], fetchResource).pipe(
        map((value) => [name, value])
      )
    )
  ).pipe(
    map((entries) =>
      entries.reduce(
        (expanded, [name, value]) => {
          expanded[name] = value;
          return expanded;
        },
        { ...record }
      )
    )
  );
}

function resolveRelation(value, resource, fetchResource) {
  if (Array.isArray(value)) {
    return value.length === 0
      ? of([])
      : forkJoin(value.map((ref) => fetchOne(ref, resource, fetchResource)));
  }
  return fetchOne(value, resource, fetchResource);
}

function fetchOne(ref, resource, fetchResource) {
  const id = idFromRef(ref);
  return id === null ? of(null) : fetchResource(`${resource}/${id}/`);
}

/* Relation values come through either as bare ids (1, "1") or as the full
 * urls the real swapi returned ("https://swapi.co/api/people/1/").
 */
function idFromRef(ref) {
  const match = String(ref).match(/[0-9]+/);
  return match ? match[0] : null;
}
