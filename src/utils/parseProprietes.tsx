// utils/parseProperties.ts
export function parseProperties(content: string) {
  const lines = content.split("\n");
  const props = lines
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#")) // ignora comentários
    .map((line) => {
      const [key, rawValue] = line.split("=");
      let value: string | boolean = rawValue;
      if (rawValue === "true") value = true;
      else if (rawValue === "false") value = false;
      return { key, value };
    });
  return props;
}
