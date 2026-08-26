import type { DesktopApi } from './lib/contracts';

declare global {
  interface Window {
    asyncDesktop: DesktopApi;
  }
}
