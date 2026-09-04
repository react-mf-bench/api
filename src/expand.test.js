import { of, firstValueFrom } from "rxjs";
import { expandResponse } from "./expand.js";

const records = {
  "people/1/": { id: "1", name: "Luke Skywalker" },
  "people/9/": { id: "9", name: "Biggs Darklighter" },
  "planets/1/": { id: "1", name: "Tatooine" },
  "planets/2/": { id: "2", name: "Alderaan" },
};

describe("expandResponse", () => {
  let fetchResource;

  beforeEach(() => {
    fetchResource = jest.fn((url) => of(records[url]));
  });

  it("replaces a single-id relation with the record it points at", async () => {
    const expanded = await firstValueFrom(
      expandResponse({ id: "5", homeworld: 2 }, ["homeworld"], fetchResource)
    );

    expect(expanded.homeworld).toEqual({ id: "2", name: "Alderaan" });
    expect(fetchResource).toHaveBeenCalledWith("planets/2/");
  });

  it("replaces a list relation, keeping the original order", async () => {
    const expanded = await firstValueFrom(
      expandResponse({ id: "1", pilots: [9, 1] }, ["pilots"], fetchResource)
    );

    expect(expanded.pilots.map((pilot) => pilot.name)).toEqual([
      "Biggs Darklighter",
      "Luke Skywalker",
    ]);
  });

  it("accepts relation values given as full swapi urls", async () => {
    const expanded = await firstValueFrom(
      expandResponse(
        { id: "1", residents: ["https://swapi.co/api/people/1/"] },
        ["residents"],
        fetchResource
      )
    );

    expect(expanded.residents.map((person) => person.name)).toEqual([
      "Luke Skywalker",
    ]);
    expect(fetchResource).toHaveBeenCalledWith("people/1/");
  });

  it("expands every record of a list response and keeps the envelope", async () => {
    const expanded = await firstValueFrom(
      expandResponse(
        {
          next: true,
          results: [
            { id: "1", homeworld: 1 },
            { id: "2", homeworld: 2 },
          ],
        },
        ["homeworld"],
        fetchResource
      )
    );

    expect(expanded.next).toBe(true);
    expect(expanded.results.map((record) => record.homeworld.name)).toEqual([
      "Tatooine",
      "Alderaan",
    ]);
  });

  it("leaves the source record untouched", async () => {
    const record = { id: "5", homeworld: 2 };

    await firstValueFrom(expandResponse(record, ["homeworld"], fetchResource));

    expect(record.homeworld).toBe(2);
  });

  it("passes through empty and missing relations without fetching", async () => {
    const expanded = await firstValueFrom(
      expandResponse(
        { id: "3", pilots: [], homeworld: null },
        ["pilots", "homeworld", "films"],
        fetchResource
      )
    );

    expect(expanded).toEqual({ id: "3", pilots: [], homeworld: null });
    expect(fetchResource).not.toHaveBeenCalled();
  });

  it("passes through an empty list response", async () => {
    const expanded = await firstValueFrom(
      expandResponse({ results: [], next: false }, ["pilots"], fetchResource)
    );

    expect(expanded).toEqual({ results: [], next: false });
    expect(fetchResource).not.toHaveBeenCalled();
  });
});
