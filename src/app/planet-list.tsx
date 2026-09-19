"use client";

import { client } from "@/lib/orpc";
import { useEffect, useState } from "react";

type Planet = { id: number; name: string };

export default function Planets() {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await client.planet.create({ name });
    setName("");
    const result = await client.planet.list();
    setPlanets(result);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const result = await client.planet.list();
      if (!cancelled) {
        setPlanets(result);
        setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="max-w-md mx-auto mt-16 space-y-8 p-4">
      <h1 className="text-2xl font-bold">Planets</h1>

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          className="flex-1 border rounded px-3 py-2 text-sm"
          placeholder="Planet name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          className="bg-black text-white rounded px-4 py-2 text-sm hover:bg-gray-800"
        >
          Add
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : planets.length === 0 ? (
        <p className="text-sm text-gray-500">No planets yet.</p>
      ) : (
        <ul className="space-y-2">
          {planets.map((planet) => (
            <li
              key={planet.id}
              className="flex items-center gap-3 border rounded px-4 py-2 text-sm"
            >
              <span className="text-gray-400">#{planet.id}</span>
              <span>{planet.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
