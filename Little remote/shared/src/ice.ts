export interface IceConfig {
  turnUrl?: string;
  turnUser?: string;
  turnPass?: string;
}

export function buildIceServers(config: IceConfig = {}): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  if (config.turnUrl && config.turnUser && config.turnPass) {
    servers.push({
      urls: config.turnUrl,
      username: config.turnUser,
      credential: config.turnPass,
    });
  }

  return servers;
}
