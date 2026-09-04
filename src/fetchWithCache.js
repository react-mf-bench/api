import { tap, from, mergeMap } from "rxjs";
import { fakeAPIFetch } from "./fake-backend/fake-backend.js";
import { assertExpandable } from "./relations.js";
import { expandResponse } from "./expand.js";

/* assuming you were hitting an actual api you'd do something like this
 * because we're not actually hitting an API now that swapi is down https://github.com/phalt/swapi/issues/147
 * we're going to fake it instead of using axios
 */
// const baseURL = "https://swapi.co/api/";
//
// const axiosInstance = axios.create({
//   baseURL,
//   timeout: 20000
// });

const tenMin = 1000 /* ms */ * 60 /* sec */ * 10;

/**
 * Fetches `url` through the shared cache.
 *
 * Records reference related records by id (a person's `homeworld`, a
 * starship's `pilots`, ...). Pass `expand` to get those relations back as
 * whole records instead of ids, so callers never have to make the follow-up
 * requests themselves:
 *
 *   fetchWithCache("people/1/", { expand: ["homeworld", "films"] })
 *
 * Expansion works on single records and on list/search responses alike, is
 * one level deep, and leaves the cached response untouched — the expanded
 * copy is built fresh on every emission while the related records themselves
 * come from the same cache.
 */
export function fetchWithCache(url, { expand, ...axiosOptions } = {}) {
  const response$ = fetchRaw(url, axiosOptions);
  if (expand === undefined) {
    return response$;
  }
  assertExpandable(expand);
  if (expand.length === 0) {
    return response$;
  }
  return response$.pipe(
    mergeMap((response) =>
      expandResponse(response, expand, (relationUrl) =>
        fetchWithCache(relationUrl)
      )
    )
  );
}

function fetchRaw(url, axiosOptions) {
  const options = { ...axiosOptions, ...{ method: "get" }, ...{ url } };
  if (cache[url] != undefined) {
    const diff = Date.now() - cache[url].lastPulled;
    if (diff < tenMin) {
      return from(
        Promise.resolve().then(() => {
          return cache[url].value;
        })
      );
    }
  }
  return from(fakeAPIFetch(options)).pipe(
    tap((response) => {
      cache[options.url] = {
        lastPulled: Date.now(),
        value: response,
      };
      if (response.results && Array.isArray(response.results)) {
        response.results.forEach((item) => {
          if (item.url) {
            cache[item.url] = {
              lastPulled: Date.now(),
              value: item,
            };
          }
        });
      }
    })
  );
}

const cache = {};
