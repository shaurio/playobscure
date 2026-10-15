
export type CommonNameEntry = {
  name: string;
  aliases: string[];
  category: "ocean" | "fungi";
  scientificName?: string;
};

export const commonNames: CommonNameEntry[] = [
  {
    name: "Salmon",
    aliases: ["salmon fish"],
    category: "ocean",
  },
  {
    name: "Octopus",
    aliases: ["octopuses"],
    category: "ocean",
    scientificName: "Octopoda",
  },
  {
    name: "Jellyfish",
    aliases: ["sea jelly", "sea jellies"],
    category: "ocean",
    scientificName: "Scyphozoa",
  },
  {
    name: "Seal",
    aliases: ["true seal", "earless seal"],
    category: "ocean",
    scientificName: "Phocidae",
  },
  {
    name: "Tuna",
    aliases: ["tunas"],
    category: "ocean",
  },
  {
    name: "Swordfish",
    aliases: [],
    category: "ocean",
    scientificName: "Xiphias gladius",
  },
  {
    name: "Stingray",
    aliases: ["stingrays"],
    category: "ocean",
  },
  {
    name: "Manta ray",
    aliases: ["manta"],
    category: "ocean",
  },
  {
    name: "Shiitake",
    aliases: ["shiitake mushroom"],
    category: "fungi",
    scientificName: "Lentinula edodes",
  },
  {
    name: "Lion's mane",
    aliases: ["lion's mane mushroom"],
    category: "fungi",
    scientificName: "Hericium erinaceus",
  },
  {
    name: "Button mushroom",
    aliases: ["white button mushroom"],
    category: "fungi",
    scientificName: "Agaricus bisporus",
  },
];

export function normalizeAnswer(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function findCommonName(
  input: string,
  category: CommonNameEntry["category"]
) {
  const normalized = normalizeAnswer(input);

  return commonNames.find(
    (entry) =>
      entry.category === category &&
      [entry.name, ...entry.aliases].some(
        (name) => normalizeAnswer(name) === normalized
      )
  );
}
