/* Relation fields that api records expose, and the resource each one points at.
 * A relation value is either a single id (`homeworld`) or a list of ids
 * (`films`, `pilots`, ...); `fetchWithCache`'s `expand` option turns those ids
 * into the records they refer to.
 */
export const relations = {
  characters: "people",
  films: "films",
  homeworld: "planets",
  pilots: "people",
  planets: "planets",
  residents: "people",
  species: "species",
  starships: "starships",
  vehicles: "vehicles",
};

export function assertExpandable(expand) {
  if (!Array.isArray(expand)) {
    throw new Error(
      `fetchWithCache: 'expand' must be an array of relation names, got ${typeof expand}`
    );
  }
  const unknown = expand.filter((name) => !relations[name]);
  if (unknown.length > 0) {
    throw new Error(
      `fetchWithCache: cannot expand unknown relation(s) '${unknown.join(
        "', '"
      )}'. Expandable relations are: ${Object.keys(relations).join(", ")}.`
    );
  }
}
