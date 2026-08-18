import { StorageProvider, StorageDeviceEvent } from '../providers/StorageProvider';
import { DemoStorageProvider } from '../providers/DemoStorageProvider';
import { NativeLinuxStorageProvider } from '../providers/NativeLinuxStorageProvider';

export class StorageEventService {
  private static instance: StorageEventService;
  private currentProvider: StorageProvider;
  private demoProvider: DemoStorageProvider;
  private nativeProvider: NativeLinuxStorageProvider;
  private unsubscribeNative?: () => void;
  private unsubscribeDemo?: () => void;
  private listeners: Set<(event: StorageDeviceEvent) => void> = new Set();

  private constructor() {
    this.demoProvider = new DemoStorageProvider();
    this.nativeProvider = new NativeLinuxStorageProvider();

    // Default to native if available, otherwise demo
    if (this.nativeProvider.isAvailable()) {
      this.currentProvider = this.nativeProvider;
    } else {
      this.currentProvider = this.demoProvider;
    }

    this.bindProviderEvents();
  }

  public static getInstance(): StorageEventService {
    if (!StorageEventService.instance) {
      StorageEventService.instance = new StorageEventService();
    }
    return StorageEventService.instance;
  }

  public getProvider(): StorageProvider {
    return this.currentProvider;
  }

  public setProvider(provider: 'demo' | 'native') {
    if (provider === 'native') {
      this.currentProvider = this.nativeProvider;
    } else {
      this.currentProvider = this.demoProvider;
    }
    this.bindProviderEvents();
  }

  public subscribe(callback: (event: StorageDeviceEvent) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private bindProviderEvents() {
    if (this.unsubscribeNative) this.unsubscribeNative();
    if (this.unsubscribeDemo) this.unsubscribeDemo();

    const handler = (event: StorageDeviceEvent) => {
      this.listeners.forEach((l) => l(event));
    };

    if (this.currentProvider === this.nativeProvider) {
      this.unsubscribeNative = this.nativeProvider.subscribeToDeviceChanges(handler);
    } else {
      this.unsubscribeDemo = this.demoProvider.subscribeToDeviceChanges(handler);
    }
  }
}
