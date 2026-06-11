import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('hostAPI', {
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  sendInput: (event: unknown) => ipcRenderer.send('input-event', event),
  getScreenMeta: () => ipcRenderer.invoke('get-screen-meta'),
  getSignalingUrl: () => ipcRenderer.invoke('get-signaling-url'),
  getIceConfig: () => ipcRenderer.invoke('get-ice-config'),
  onPinUpdate: (cb: (pin: string) => void) => {
    ipcRenderer.on('pin-update', (_e, pin: string) => cb(pin));
  },
  onStopSharing: (cb: () => void) => {
    ipcRenderer.on('stop-sharing', () => cb());
  },
  notifyStatus: (status: string) => ipcRenderer.send('status-update', status),
  setPin: (pin: string) => ipcRenderer.send('pin-update', pin),
  getHostPin: () => ipcRenderer.invoke('get-host-pin') as Promise<string | undefined>,
  saveHostPin: (pin: string) =>
    ipcRenderer.invoke('save-host-pin', pin) as Promise<{ ok: true } | { ok: false; error: string }>,
});
