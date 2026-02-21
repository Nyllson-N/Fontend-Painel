// queryKeys.ts
export const queryKeys = {
  user: (id?: string) => ["user", id],
  servers: {
    all: () => ["servers"],
    byId: (id: string) => ["servers", id],
    console: (id: string) => ["servers", id, "console"],
    files: (id: string) => ["servers", id, "files"],
    schedules: (id: string) => ["servers", id, "schedules"],
    databases: (id: string) => ["servers", id, "databases"],
    users: (id: string) => ["servers", id, "users"],
    network: (id: string) => ["servers", id, "network"],
    config: (id: string) => ["servers", id, "settings"],
  },
  minecraft: {
    byId: (id: string) => ["minecraft", id],
    players: (id: string) => ["minecraft", id, "players"],
    config: (id: string) => ["minecraft", id, "settings"],
  },
  images: () => ["images"],
  monitoring: () => ["monitoring"],
  settings: () => ["settings"],
};
