import { firstValueFrom } from "rxjs";
import { fetchWithCache } from "./fetchWithCache.js";

describe("fetchWithCache", () => {
  it("returns relations as bare ids when nothing is expanded", async () => {
    const person = await firstValueFrom(fetchWithCache("people/1/"));

    expect(person.name).toBe("Luke Skywalker");
    expect(person.homeworld).toBe("1");
    expect(person.films.every((film) => typeof film === "string")).toBe(true);
  });

  it("resolves the requested relations of a single record", async () => {
    const person = await firstValueFrom(
      fetchWithCache("people/1/", { expand: ["homeworld", "films"] })
    );

    expect(person.name).toBe("Luke Skywalker");
    expect(person.homeworld.name).toBe("Tatooine");
    expect(person.films.length).toBeGreaterThan(0);
    person.films.forEach((film) => expect(typeof film.title).toBe("string"));
  });

  it("only resolves the relations that were asked for", async () => {
    const person = await firstValueFrom(
      fetchWithCache("people/1/", { expand: ["homeworld"] })
    );

    expect(person.homeworld.name).toBe("Tatooine");
    expect(person.films.every((film) => typeof film === "string")).toBe(true);
  });

  it("resolves relations for every record of a list response", async () => {
    const page = await firstValueFrom(
      fetchWithCache("people/?page=1", { expand: ["homeworld"] })
    );

    expect(page.results.length).toBeGreaterThan(1);
    page.results.forEach((person) =>
      expect(typeof person.homeworld.name).toBe("string")
    );
    expect(page.next).toBe(true);
  });

  it("resolves relations of resources other than people", async () => {
    const starship = await firstValueFrom(
      fetchWithCache("starships/1/", { expand: ["pilots"] })
    );

    expect(starship.name).toBe("X-wing");
    expect(starship.pilots.map((pilot) => pilot.name)).toEqual([
      "Luke Skywalker",
      "Biggs Darklighter",
    ]);
  });

  it("keeps the cached response unexpanded", async () => {
    await firstValueFrom(
      fetchWithCache("planets/2/", { expand: ["residents"] })
    );
    const planet = await firstValueFrom(fetchWithCache("planets/2/"));

    expect(planet.residents.every((id) => typeof id === "string")).toBe(true);
  });

  it("rejects relations it does not know how to resolve", () => {
    expect(() => fetchWithCache("people/1/", { expand: ["nemesis"] })).toThrow(
      /unknown relation/
    );
  });
});
